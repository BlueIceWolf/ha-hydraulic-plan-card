// Shared hydraulic topology, pipe routing and flow-state evaluation.
// The original card still owns its artwork. This module owns hydraulic decisions.
const HPC_NETWORK = (() => {
  const isSource = node => HPC_FREE.byType[node?.type]?.group === 'source';
  const hasCircuitMixer = node=>node.options?.mixed===true||
    ['mixer','mixer_opening','mixer_closing'].some(port=>!!node.sensors?.[port]);

  function graph(plan) {
    const nodes = new Map(plan.components.map(node => [node.id, node]));
    const incoming = new Map(plan.components.map(node => [node.id, []]));
    const outgoing = new Map(plan.components.map(node => [node.id, []]));
    const adjacent = new Map(plan.components.map(node => [node.id, []]));
    for (const edge of plan.connections) {
      if (!nodes.has(edge.from) || !nodes.has(edge.to)) continue;
      incoming.get(edge.to).push(edge);
      outgoing.get(edge.from).push(edge);
      adjacent.get(edge.from).push({ edge, neighbor: edge.to });
      adjacent.get(edge.to).push({ edge, neighbor: edge.from });
    }
    return { nodes, incoming, outgoing, adjacent };
  }

  // A physically connected top outlet -> top inlet establishes buffer order.
  // The lower return runs in the opposite direction and must not reorder tanks.
  function orderedBuffers(plan) {
    const buffers = plan.components.filter(n => n.type === 'buffer');
    const bufferIds = new Set(buffers.map(n => n.id));
    const next = new Map(buffers.map(n => [n.id, []]));
    const indegree = new Map(buffers.map(n => [n.id, 0]));
    for (const e of plan.connections) {
      if (!bufferIds.has(e.from) || !bufferIds.has(e.to) ||
          e.from_port !== 'top_out' || e.to_port !== 'top_in') continue;
      if (next.get(e.from).includes(e.to)) continue;
      next.get(e.from).push(e.to);
      indegree.set(e.to, indegree.get(e.to) + 1);
    }
    const order = new Map(buffers.map((n, i) => [n.id, i]));
    const sorted = [], queue = buffers.filter(n => indegree.get(n.id) === 0);
    while (queue.length) {
      queue.sort((a, b) => order.get(a.id) - order.get(b.id));
      const current = queue.shift();
      sorted.push(current);
      for (const id of next.get(current.id)) {
        indegree.set(id, indegree.get(id) - 1);
        if (indegree.get(id) === 0) queue.push(buffers.find(n => n.id === id));
      }
    }
    // A cycle is invalid as a series, but it must never lose a tank.
    return [...sorted, ...buffers.filter(n => !sorted.includes(n))];
  }


  function bufferTopology(plan) {
    const buffers=orderedBuffers(plan);
    if(buffers.length<2)return {mode:'single',sourceId:null,buffers};
    const ids=new Set(buffers.map(n=>n.id));
    const serial=plan.connections.some(e=>ids.has(e.from)&&ids.has(e.to));
    const sourceCandidates=plan.components.filter(isSource).filter(source=>
      buffers.every(tank=>
        plan.connections.some(e=>e.from===source.id&&e.from_port==='flow'&&
          e.to===tank.id&&e.to_port==='top_in')&&
        plan.connections.some(e=>e.from===tank.id&&e.from_port==='bottom_out'&&
          e.to===source.id&&e.to_port==='return')));
    if(!serial&&sourceCandidates.length)
      return {mode:'parallel',sourceId:sourceCandidates[0].id,buffers};
    return {mode:serial?'series':'independent',sourceId:null,buffers};
  }

  // The state of a three-way changeover valve is not a pump signal.
  // 0%/100% is manufacturer-specific, so it is only interpreted when the
  // installer explicitly configures its corresponding text/value.
  function diverterActivePort(node, hass) {
    if (node?.type !== 'diverter') return null;
    const sensor=node.sensors?.position;
    const reading=sensor?HPC_FREE.state(hass,sensor):null;
    if (!reading) return null;
    const value=reading.text.trim().toLowerCase();
    const dhwPort=node.options?.dhw_port==='b'?'b':'a';
    const other=dhwPort==='a'?'b':'a';
    const dhwState=String(node.options?.dhw_state||'').trim().toLowerCase();
    const heatingState=String(node.options?.heating_state||'').trim().toLowerCase();
    if (dhwState && value===dhwState) return dhwPort;
    if (heatingState && value===heatingState) return other;
    if (['dhw','ww','warmwasser','hot water','domestic hot water'].includes(value))
      return dhwPort;
    if (['heat','heating','heizen','heizkreis','heizbetrieb'].includes(value))
      return other;
    return null;
  }

  function mixerClosedPorts(node,hass) {
    if(node?.type!=='mixer')return new Set();
    const options=node.options||{},closed=new Set();
    if(Array.isArray(options.closed_ports))
      for(const port of options.closed_ports)
        if(port==='a'||port==='b')closed.add(port);
    const state=node.sensors?.state?HPC_FREE.state(hass,node.sensors.state):null;
    const stateValue=state?.text?.trim().toLowerCase();
    for(const port of ['a','b']){
      const closedState=String(options[port+'_closed_state']||'').trim().toLowerCase();
      if(closedState&&stateValue===closedState)closed.add(port);
      const rawThreshold=options[port+'_closed_at'];
      const threshold=rawThreshold===''||rawThreshold===undefined||rawThreshold===null
        ?NaN:Number(rawThreshold);
      const position=node.sensors?.position
        ?HPC_FREE.state(hass,node.sensors.position):null;
      if(Number.isFinite(threshold)&&threshold>=0&&threshold<=100&&
        position?.number!==null&&
        Math.abs(position.number-threshold)<=0.5)closed.add(port);
    }
    return closed;
  }

  // Every inferred active pipe belongs to a closed, directed hydraulic loop
  // through a running pump. Each port is a vertex, including component internals.
  function flowStates(plan,hass) {
    const active=new Set(),nodes=new Map(plan.components.map(n=>[n.id,n]));
    const connections=[],forward=new Map(),reverse=new Map();
    const key=(id,port)=>id+'::'+port;
    const read=id=>id?HPC_FREE.state(hass,id):null;
    const signal=id=>{
      const r=read(id);
      if(!r)return null;
      if(r.number!==null)return r.number>0;
      const value=r.text.toLowerCase();
      if(['on','open','active','running','ein','an','aktiv'].includes(value))return true;
      if(['off','closed','idle','standby','aus'].includes(value))return false;
      return null;
    };
    const pumpSensor=n=>n.type==='pump'?(n.sensors?.state||n.sensors?.pump):
      isSource(n)||n.type==='heating_circuit'?n.sensors?.pump:null;
    const pumpStatus=n=>{
      const volume=signal(n.sensors?.volume);
      if(volume===false)return false;
      const pump=signal(pumpSensor(n));
      return pump===null?volume:pump;
    };
    const isPump=n=>n.type==='pump'||n.type==='heating_circuit'||isSource(n);
    const blocked=n=>isPump(n)&&(
      pumpStatus(n)===false||
      !!pumpSensor(n)&&pumpStatus(n)===null||
      n.type==='pump'&&pumpStatus(n)!==true);
    const add=(a,b,edge=null)=>{
      const arc={from:a,to:b,edge};
      if(!forward.has(a))forward.set(a,[]);
      if(!reverse.has(b))reverse.set(b,[]);
      forward.get(a).push(arc);reverse.get(b).push(arc);
      connections.push(arc);
    };
    for(const e of plan.connections){
      const from=nodes.get(e.from),to=nodes.get(e.to);
      if(!from||!to||blocked(from)||blocked(to)||signal(e.flow_entity)===false)continue;
      const selected=(n,port)=>n.type!=='diverter'||port==='ab'||
        diverterActivePort(n,hass)===port;
      const open=(n,port)=>selected(n,port)&&
        (n.type!=='mixer'||!mixerClosedPorts(n,hass).has(port));
      if(open(from,e.from_port)&&open(to,e.to_port)){
        const fromPort=from.type==='heating_circuit'&&e.from_port==='flow_in'
          ?'emitter_in':e.from_port;
        const toPort=to.type==='heating_circuit'&&e.to_port==='flow_in'
          ?'pump_in':e.to_port;
        add(key(e.from,fromPort),key(e.to,toPort),e);
      }
    }
    for(const n of plan.components){
      if(blocked(n))continue;
      const connect=(a,b)=>add(key(n.id,a),key(n.id,b));
      switch(n.type){
        case 'pump':connect('in','out');break;
        case 'heating_circuit':{
          connect('pump_in','pump_out');
          if(hasCircuitMixer(n)){
            connect('pump_out','mixer_hot');
            connect('return_out','mixer_bypass_in');
            connect('mixer_bypass_in','mixer_return');
            connect('mixer_hot','mixer_out');
            connect('mixer_return','mixer_out');
            connect('mixer_out','emitter_in');
          }else connect('pump_out','emitter_in');
          connect('emitter_in','return_out');
          break;
        }
        case 'dhw_tank':connect('coil_in','coil_out');break;
        case 'diverter':{
          const selected=diverterActivePort(n,hass);
          if(selected){connect('ab',selected);connect(selected,'ab');}
          break;
        }
        case 'mixer':
          for(const port of ['a','b']){
            if(mixerClosedPorts(n,hass).has(port))continue;
            connect(port,'ab');connect('ab',port);
          }
          break;
        case 'buffer':
          for(const inlet of ['top_in','mid_in','bottom_in','return_in'])
            for(const outlet of ['top_out','mid_out','bottom_out'])
              connect(inlet,outlet);
          break;
        case 'manifold':
          for(const a of ['a','b','c'])for(const z of ['d','e','f']){
            connect(a,z);connect(z,a);
          }
          break;
        case 'electric_heater':connect('in','out');break;
        case 'particle_separator':break;
        default:
          if(isSource(n)){
            connect('return','flow');
            if(n.type==='oil_boiler')connect('return','dhw');
          }
      }
    }
    const scan=(seeds,adj,stops,accept)=>{
      const visited=new Set(seeds),queue=[...seeds];
      while(queue.length){
        const vertex=queue.shift();
        if(stops.has(vertex))continue;
        for(const arc of adj.get(vertex)||[]){
          if(!accept(arc))continue;
          const next=adj===forward?arc.to:arc.from;
          if(!visited.has(next)){visited.add(next);queue.push(next);}
        }
      }
      return visited;
    };
    for(const pump of plan.components.filter(n=>isPump(n)&&pumpStatus(n)===true)){
      const outlets=pump.type==='pump'?['out']:
        pump.type==='heating_circuit'?['pump_out']:
        pump.type==='oil_boiler'?['flow','dhw']:['flow'];
      const inlets=pump.type==='pump'?['in']:
        pump.type==='heating_circuit'?['pump_in']:['return'];
      const start=outlets.map(p=>key(pump.id,p)),end=inlets.map(p=>key(pump.id,p));
      const coilBranches=plan.connections.filter(e=>e.from===pump.id &&
        e.from_port==='out'&&e.to_port==='coil_in'&&nodes.get(e.to)?.type==='dhw_tank');
      const exclusiveCoil=pump.type==='pump'&&coilBranches.length>0&&
        plan.connections.filter(e=>e.from===pump.id&&e.from_port==='out').length===coilBranches.length;
      const coilIds=new Set(coilBranches.map(e=>e.to));
      // A pump dedicated to a WW coil cannot prove circulation in a radiator.
      // Conversely, an individual radiator pump cannot energise a WW charger.
      const accept=arc=>{
        for(const vertex of [arc.from,arc.to]){
          const id=vertex.slice(0,vertex.indexOf('::')),node=nodes.get(id);
          if(!node)continue;
          if(exclusiveCoil&&(node.type==='heating_circuit'||
            node.type==='dhw_tank'&&!coilIds.has(id)))return false;
          if(pump.type==='heating_circuit'&&
            (node.type==='dhw_tank'||node.type==='heating_circuit'&&id!==pump.id))
            return false;
        }
        return true;
      };
      const reachable=scan(start,forward,new Set(end),accept);
      if(!end.some(vertex=>reachable.has(vertex)))continue;
      const toReturn=scan(end,reverse,new Set(start),accept);
      for(const arc of connections)
        if(arc.edge&&accept(arc)&&reachable.has(arc.from)&&toReturn.has(arc.to))
          active.add(arc.edge.id);
    }
    // A genuine volumetric reading > 0 proves flow in that particular edge
    // only, never in its unmetered neighbours. A switch alone is not a meter.
    for(const arc of connections){
      if(!arc.edge?.flow_entity)continue;
      const reading=read(arc.edge.flow_entity);
      if(reading?.number>0)active.add(arc.edge.id);
    }
    return active;
  }

  // Evidence is a separate property of the hydraulic edge. Consumers may
  // animate inferred circulation, but must never present it as a flow reading.
  // This is based on the same active-edge set as the renderer, not a second
  // independent hydraulic solver.
  function flowEvidence(plan, hass) {
    const active=flowStates(plan,hass);
    const {nodes,incoming,outgoing}=graph(plan);
    const read=id=>id?HPC_FREE.state(hass,id):null;
    const asFlow=id=>{
      const value=read(id);
      // Textual switch states may be an explicit pipe activity signal, not
      // an actual volumetric measurement.
      if(!value)return {state:'unknown',measured:false};
      if(value.number!==null)
        return {state:value.number>0?'active':'stopped',measured:true};
      const word=value.text.trim().toLowerCase();
      if(['on','open','active','running','ein','an','aktiv'].includes(word))
        return {state:'active',measured:false};
      if(['off','closed','idle','standby','aus'].includes(word))
        return {state:'stopped',measured:false};
      return {state:'unknown',measured:false};
    };
    const atPort=(node,port)=>{
      if(node?.type==='diverter'&&['a','b'].includes(port))
        return diverterActivePort(node,hass)!==port;
      return node?.type==='mixer'&&mixerClosedPorts(node,hass).has(port);
    };
    const pumpOff=node=>{
      if(!node||!['pump','heating_circuit','wood_gasifier','oil_boiler',
        'gas_boiler','wood_chip_boiler','pellet_boiler','heat_pump'].includes(node.type))
        return false;
      const volume=asFlow(node.sensors?.volume);
      if(volume.measured&&volume.state==='stopped')return true;
      const pump=read(node.type==='pump'?node.sensors?.state:node.sensors?.pump);
      if(!pump)return false;
      const status=pump.text.trim().toLowerCase();
      return ['off','closed','idle','standby','aus'].includes(status)||
        pump.number===0;
    };
    const tankCoilStopped=new Set();
    const blockedUpstream=(nodeId,visited=new Set())=>{
      if(visited.has(nodeId))return false;
      visited.add(nodeId);
      const node=nodes.get(nodeId);
      if(!node)return false;
      if(pumpOff(node))return true;
      if(isSource(node)||node.type==='buffer')return false;
      return (incoming.get(nodeId)||[]).some(edge=>
        asFlow(edge.flow_entity).state==='stopped'||
        atPort(nodes.get(edge.from),edge.from_port)||
        atPort(node,edge.to_port)||
        blockedUpstream(edge.from,visited));
    };
    for(const tank of plan.components.filter(node=>node.type==='dhw_tank')){
      const feed=(incoming.get(tank.id)||[]).filter(edge=>edge.to_port==='coil_in');
      if(feed.some(edge=>
        asFlow(edge.flow_entity).state==='stopped'||
        atPort(nodes.get(edge.from),edge.from_port)||
        blockedUpstream(edge.from))){
        tankCoilStopped.add(tank.id);
      }
    }
    const result=new Map();
    for(const edge of plan.connections){
      const source=nodes.get(edge.from),destination=nodes.get(edge.to);
      const reported=asFlow(edge.flow_entity);
      let state='unknown',basis='none';
      if(reported.state==='stopped'){
        state='stopped';basis=reported.measured?'meter':'switch';
      }else if(atPort(source,edge.from_port)||atPort(destination,edge.to_port)){
        state='stopped';basis=source?.type==='mixer'||destination?.type==='mixer'
          ?'mixer':'valve';
      }else if(pumpOff(source)||pumpOff(destination)||
        tankCoilStopped.has(edge.from)&&edge.from_port==='coil_out'){
        state='stopped';basis='pump';
      }else if(active.has(edge.id)){
        const adjacentPumps=[source,destination].filter(n=>n?.type==='pump');
        const measuredPump=adjacentPumps.some(n=>
          asFlow(n.sensors?.volume).measured&&asFlow(n.sensors?.volume).state==='active');
        state=reported.state==='active'&&reported.measured||measuredPump
          ?'measured':'inferred';
        basis=state==='measured'?'meter':'state';
      }
      result.set(edge.id,{state,basis,active:active.has(edge.id)});
    }
    // Inferred flow on a shared return header remains inferred even if a
    // different branch has a measured value; measurement never leaks across
    // devices. Keep edge identity stable for SVG and editor diagnostics.
    return result;
  }

  // A checked return-temperature lift implies an internal boiler bypass.
  // Represent that visible bypass as a virtual hydraulic edge, routed by the
  // same graph/segment renderer as every other water pipe. Never persist
  // synthetic plumbing and never overlay an explicitly connected mixer.
  function auxiliaryEdges(plan,hass) {
    const edges=[];
    for(const node of plan.components){
      if(node.type!=='wood_gasifier'||node.options?.return_lift!==true)continue;
      if(plan.connections.some(edge=>
        edge.to===node.id&&edge.to_port==='return'&&
        plan.components.some(candidate=>candidate.id===edge.from&&
          candidate.type==='mixer')))continue;
      const pump=HPC_FREE.state(hass,node.sensors?.pump);
      const volume=HPC_FREE.state(hass,node.sensors?.volume);
      const stopped=volume?.number!==null&&volume?.number<=0||
        pump?.text?.toLowerCase()==='off';
      const position=HPC_FREE.state(hass,node.sensors?.mixer);
      // A known position controls illustrative bypass intensity, never
      // inventing a measured volume flow from a percentage.
      const hot=position&&Number.isFinite(position.number)&&
        position.number>=0&&position.number<=100?
        (node.options?.mixer_inverted?100-position.number:position.number)/100:null;
      const active=!stopped&&(volume?.number>0||
        pump!==null&&HPC_FREE.active(pump))&&(hot===null||hot>0);
      edges.push({
        id:'rla_'+node.id,kind:'return_lift',
        from:node.id,from_port:'flow',to:node.id,to_port:'return',
        active,mix:hot,flow_entity:'',temperature_entity:''
      });
    }
    return edges;
  }

  // The card's built-in pump is a real hydraulic boundary: supply reaches
  // its inlet, and only its own outlet can feed that circuit's emitter.
  function heatingCircuitEdges(plan) {
    return plan.components.filter(node=>node.type==='heating_circuit').flatMap(node=>{
      const hasFeed=plan.connections.some(edge=>
        edge.to===node.id&&edge.to_port==='flow_in');
      const hasReturn=plan.connections.some(edge=>
        edge.from===node.id&&edge.from_port==='return_out');
      if(!hasFeed||!hasReturn)return [];
      const base={flow_entity:'',temperature_entity:''};
      const edge=(suffix,kind,from_port,to_port)=>({
        ...base,id:'internal_'+node.id+'_'+suffix,kind,
        from:node.id,from_port,to:node.id,to_port
      });
      return hasCircuitMixer(node)?[
        edge('pump_to_mixer','heating_circuit_internal','pump_out','mixer_hot'),
        edge('mixer_to_emitter','heating_circuit_internal','mixer_out','emitter_in'),
        edge('return_to_mixer_bypass','heating_circuit_internal_return',
          'return_out','mixer_bypass_in'),
        edge('mixer_bypass','heating_circuit_mixer_bypass',
          'mixer_bypass_in','mixer_return')
      ]:[edge('pump_to_emitter','heating_circuit_internal','pump_out','emitter_in')];
    });
  }

  // Check physical component bounds after routing, including label clearance.
  // Routes without obstructions retain their original geometry and proportions.
  function avoidComponents(original,p,q,fromSide,toSide,obstacles,fromId,toId,pipeObstacles=[]) {
    const blockers=obstacles.map(box=>({...box,endpoint:box.id===fromId||box.id===toId}));
    const facing=(fromSide==='R'&&toSide==='L'&&q.x>=p.x)||
      (fromSide==='L'&&toSide==='R'&&q.x<=p.x);
    const portGap=Math.abs(q.x-p.x);
    const fromBox=blockers.find(box=>box.id===fromId);
    const toBox=blockers.find(box=>box.id===toId);
    const inset=(point,side,box)=>!box?0:side==='L'
      ?Math.max(0,point.x-box.x):Math.max(0,box.x+box.w-point.x);
    const fromInset=inset(p,fromSide,fromBox),toInset=inset(q,toSide,toBox);
    const available=portGap-fromInset-toInset;
    // The connection can be inset from an oversized legacy source box.
    // Leave its real cabinet before searching for orthogonal routes.
    const fromStub=Math.max(18,fromInset+12);
    const toStub=Math.max(18,toInset+12);
    const pieces=d=>{
      const tokens=(d||'').match(/[MHV]|-?\d+(?:\.\d+)?/g)||[];
      const segments=[];let x=0,y=0;
      for(let i=0;i<tokens.length;){
        const op=tokens[i++];
        if(op==='M'){x=+tokens[i++];y=+tokens[i++];continue;}
        const nx=op==='H'?+tokens[i++]:x,ny=op==='V'?+tokens[i++]:y;
        segments.push({x,y,nx,ny});x=nx;y=ny;
      }
      return segments;
    };
    const segmentCrosses=(s,box)=>{
      const padding=box.endpoint?0:9,l=box.x-padding,r=box.x+box.w+padding;
      const top=box.y-padding,bottom=box.y+box.h+padding;
      return s.x===s.nx?s.x>l&&s.x<r&&
        Math.max(s.y,s.ny)>top&&Math.min(s.y,s.ny)<bottom:
        s.y>top&&s.y<bottom&&
        Math.max(s.x,s.nx)>l&&Math.min(s.x,s.nx)<r;
    };
    const overlapsPipe=segment=>pipeObstacles.some(pipe=>{
      const vertical=segment.x===segment.nx;
      const pipeVertical=pipe.x===pipe.nx;
      if(vertical===pipeVertical){
        const fixed=vertical?segment.x:segment.y;
        const pipeFixed=vertical?pipe.x:pipe.y;
        if(Math.abs(fixed-pipeFixed)>.001)return false;
        const start=vertical?segment.y:segment.x,end=vertical?segment.ny:segment.nx;
        const pipeStart=vertical?pipe.y:pipe.x,pipeEnd=vertical?pipe.ny:pipe.nx;
        return Math.min(Math.max(start,end),Math.max(pipeStart,pipeEnd))-
          Math.max(Math.min(start,end),Math.min(pipeStart,pipeEnd))>.001;
      }
      return false;
    });
    const crosses=path=>{
      const segments=pieces(path);
      return segments.some((segment,index)=>
        blockers.some(box=>!(box.endpoint&&
          (index===0||index===segments.length-1))&&segmentCrosses(segment,box))||
        overlapsPipe(segment));
    };
    if(!crosses(original))return original;
    const a={x:p.x+(fromSide==='L'?-fromStub:fromStub),y:p.y};
    const b={x:q.x+(toSide==='L'?-toStub:toStub),y:q.y};
    const minX=Math.min(a.x,b.x,...blockers.map(box=>box.x),
      ...pipeObstacles.flatMap(pipe=>[Math.min(pipe.x,pipe.nx)]))-60;
    const maxX=Math.max(a.x,b.x,...blockers.map(box=>box.x+box.w),
      ...pipeObstacles.flatMap(pipe=>[Math.max(pipe.x,pipe.nx)]))+60;
    const minY=Math.min(a.y,b.y,...blockers.map(box=>box.y),
      ...pipeObstacles.flatMap(pipe=>[Math.min(pipe.y,pipe.ny)]))-60;
    const maxY=Math.max(a.y,b.y,...blockers.map(box=>box.y+box.h),
      ...pipeObstacles.flatMap(pipe=>[Math.max(pipe.y,pipe.ny)]))+60;
    const unique=values=>[...new Set(values.map(value=>Number(value.toFixed(3))))]
      .sort((x,y)=>x-y);
    const xs=unique([a.x,b.x,minX,maxX,...blockers.flatMap(box=>
      [box.x-10,box.x+box.w+10]),...pipeObstacles.flatMap(pipe=>
      [pipe.x-10,pipe.x+10,pipe.nx-10,pipe.nx+10])]);
    const ys=unique([a.y,b.y,minY,maxY,...blockers.flatMap(box=>
      [box.y-10,box.y+box.h+10]),...pipeObstacles.flatMap(pipe=>
      [pipe.y-10,pipe.y+10,pipe.ny-10,pipe.ny+10])]);
    const xIndex=xs.indexOf(Number(a.x.toFixed(3)));
    const yIndex=ys.indexOf(Number(a.y.toFixed(3)));
    const endX=xs.indexOf(Number(b.x.toFixed(3)));
    const endY=ys.indexOf(Number(b.y.toFixed(3)));
    const pointBlocked=(x,y)=>blockers.some(box=>{
      const padding=box.endpoint?0:9;
      return x>box.x-padding&&x<box.x+box.w+padding&&
        y>box.y-padding&&y<box.y+box.h+padding;
    });
    const clear=(from,to)=>!blockers.some(box=>segmentCrosses({
      x:from.x,y:from.y,nx:to.x,ny:to.y
    },box));
    const count=xs.length*ys.length;
    const scores=new Float64Array(count*2).fill(Infinity);
    const previous=new Int32Array(count*2).fill(-1);
    const heap=[];
    const push=(state,cost)=>{
      let index=heap.length;heap.push({state,cost});
      while(index){
        const parent=(index-1)>>1;
        if(heap[parent].cost<=cost)break;
        heap[index]=heap[parent];index=parent;
      }
      heap[index]={state,cost};
    };
    const pop=()=>{
      const first=heap[0],last=heap.pop();
      if(heap.length){
        let index=0;
        while(true){
          const left=index*2+1,right=left+1;
          if(left>=heap.length)break;
          const child=right<heap.length&&heap[right].cost<heap[left].cost?right:left;
          if(heap[child].cost>=last.cost)break;
          heap[index]=heap[child];index=child;
        }
        heap[index]=last;
      }
      return first;
    };
    const vertex=(x,y)=>x*ys.length+y;
    const start=vertex(xIndex,yIndex)*2;
    scores[start]=0;push(start,0);
    let finish=-1;
    while(heap.length){
      const current=pop(),state=current.state;
      if(current.cost!==scores[state])continue;
      const node=Math.floor(state/2),direction=state%2;
      const xi=Math.floor(node/ys.length),yi=node%ys.length;
      if(xi===endX&&yi===endY&&direction===0){finish=state;break;}
      const here={x:xs[xi],y:ys[yi]};
      for(const axis of [0,1])for(const step of [-1,1]){
        const nx=xi+(axis===0?step:0),ny=yi+(axis===1?step:0);
        if(nx<0||nx>=xs.length||ny<0||ny>=ys.length)continue;
        const there={x:xs[nx],y:ys[ny]};
        if(pointBlocked(there.x,there.y)||!clear(here,there))continue;
        const next=vertex(nx,ny)*2+axis;
        const distance=Math.abs(there.x-here.x)+Math.abs(there.y-here.y);
        const segment={x:here.x,y:here.y,nx:there.x,ny:there.y};
        const cost=current.cost+distance+(axis===direction?0:24)+
          (overlapsPipe(segment)?100000:0);
        if(cost>=scores[next])continue;
        scores[next]=cost;previous[next]=state;push(next,cost);
      }
    }
    if(finish<0)throw new Error('No collision-free orthogonal route for '+fromId+' → '+toId+
      ' from '+JSON.stringify(p)+' to '+JSON.stringify(q)+
      ' (sides '+fromSide+'/'+toSide+')');
    const path=[];
    for(let state=finish;state>=0;state=previous[state]){
      const node=Math.floor(state/2),xi=Math.floor(node/ys.length),yi=node%ys.length;
      path.push({x:xs[xi],y:ys[yi]});
      if(state===start)break;
    }
    path.reverse();
    const points=[p,a,...path.slice(1,-1),b,q];
    const compact=[];
    for(const point of points){
      if(compact.length&&point.x===compact[compact.length-1].x&&
        point.y===compact[compact.length-1].y)continue;
      while(compact.length>1){
        const before=compact[compact.length-2],last=compact[compact.length-1];
        if((before.x===last.x&&last.x===point.x)||
          (before.y===last.y&&last.y===point.y))compact.pop();
        else break;
      }
      compact.push(point);
    }
    let routed='M'+compact[0].x+' '+compact[0].y;
    for(let i=1;i<compact.length;i++){
      const from=compact[i-1],to=compact[i];
      routed+=' '+(from.x===to.x?'V'+to.y:'H'+to.x);
    }
    if(crosses(routed))
      throw new Error('Orthogonal route intersects an obstacle for '+fromId+' → '+toId+
        ': '+routed);
    return routed;
  }

  function compactPath(path) {
    const tokens=(path||'').match(/[MHV]|-?\d+(?:\.\d+)?/g)||[];
    let x=null,y=null;
    const segments=[];
    for(let i=0;i<tokens.length;){
      const op=tokens[i++];
      if(op==='M'){
        x=Number(tokens[i++]);y=Number(tokens[i++]);
        if(!Number.isFinite(x)||!Number.isFinite(y))
          throw new Error('Hydraulic route has a non-finite start point');
        continue;
      }
      if((op!=='H'&&op!=='V')||x===null||y===null)
        throw new Error('Hydraulic route contains an unsupported path command');
      const nx=op==='H'?Number(tokens[i++]):x;
      const ny=op==='V'?Number(tokens[i++]):y;
      if(!Number.isFinite(nx)||!Number.isFinite(ny))
        throw new Error('Hydraulic route has a non-finite segment');
      if(Math.abs(nx-x)+Math.abs(ny-y)>0.001)
        segments.push({op,value:op==='H'?nx:ny});
      x=nx;y=ny;
    }
    return 'M'+tokens[1]+' '+tokens[2]+segments.map(s=>' '+s.op+s.value).join('');
  }

  // One orthogonal router for every non-native SVG pipe. It uses actual ports,
  // not the stored legacy X/Y values or assumptions based on a component name.
  function route({ edge, fromNode, toNode, fromShape, toShape, p, q,
                   fromSide, toSide, supplyTee = null, returnTee = null,
                   obstacles = [], routedPaths = [] }) {
    const h = (x, y) => String(x) + ' ' + String(y);
    const role=connection=>connection.edge.kind==='return_lift'?'flow':
      ['heating_circuit_internal_return','heating_circuit_mixer_bypass']
        .includes(connection.edge.kind)?'return':
      (/^(?:return_out|coil_out|bottom_out|return)$/.test(connection.edge.from_port)||
       /^(?:return|return_in|bottom_in|mixer_bypass_in|mixer_return)$/.test(connection.edge.to_port)
        ?'return':'flow');
    const pipeObstacles=[];
    if(edge.kind!=='return_lift'){
      const currentRole=role({edge});
      for(const previous of routedPaths){
        if(role(previous)===currentRole)continue;
        const tokens=previous.d.match(/[MHV]|-?\d+(?:\.\d+)?/g)||[];
        let x=0,y=0;
        for(let i=0;i<tokens.length;){
          const op=tokens[i++];
          if(op==='M'){x=Number(tokens[i++]);y=Number(tokens[i++]);continue;}
          const nx=op==='H'?Number(tokens[i++]):x;
          const ny=op==='V'?Number(tokens[i++]):y;
          pipeObstacles.push({x,y,nx,ny});x=nx;y=ny;
        }
      }
    }
    if(edge.kind==='return_lift'){
      // Fröling S3: this is a HOT bypass from the jacket supply to the
      // return-lift mixer, not a second pipe passing behind the cabinet.
      // The final horizontal leg is the mixed return into the boiler.
      const s3=fromNode.type==='wood_gasifier'&&fromNode.options?.froeling_view!=='classic';
      const x=Math.max(p.x,q.x)+(s3?95:42);
      const d='M'+h(p.x,p.y)+' H'+x+' V'+q.y+' H'+q.x;
      return compactPath(s3?d:
        avoidComponents(d,p,q,fromSide,toSide,obstacles,edge.from,edge.to,pipeObstacles));
    }
    if(edge.kind==='heating_circuit_mixer_bypass'){
      const d='M'+h(p.x,p.y)+' V'+q.y;
      return compactPath(avoidComponents(d,p,q,fromSide,toSide,obstacles,edge.from,edge.to,pipeObstacles));
    }
    // The native heating circuit already draws the radiator-to-return
    // elbow up to its left port. Continue from that exact port without
    // doubling back into the circuit or producing a rectangular loop.
    if(fromNode.type==='heating_circuit'&&
       fromShape.type==='heating_circuit'&&edge.from_port==='return_out'){
      if(Math.abs(p.x-q.x)<1)return compactPath('M'+h(p.x,p.y)+' V'+q.y);
      const railX=Math.min(p.x-36,q.x+36);
      const d='M'+h(p.x,p.y)+' H'+railX+' V'+q.y+' H'+q.x;
      return compactPath(avoidComponents(d,p,q,fromSide,toSide,obstacles,edge.from,edge.to,pipeObstacles));
    }
    let d;
    // A consumer/storage return approaches the Fröling's RIGHT-hand water
    // socket directly. An overhead detour could run visually through its
    // fan/flue area and falsely suggest a chimney-water connection.
    if (toNode.type==='wood_gasifier' && toNode.options?.froeling_view!=='classic' &&
        edge.to_port==='return' && p.x>q.x+8) {
      // Return from the storage system comes in on the RIGHT of the
      // return-lift valve. Joining behind the boiler or across its heading
      // is not a real water connection.
      const mixerX=q.x+(toNode.options?.return_lift?95:54);
      const inletX=Math.max(p.x-20,mixerX+35);
      d='M'+h(p.x,p.y)+' H'+inletX+' V'+q.y+' H'+q.x;
    } else if (fromNode.type==='buffer'&&
        ['wood_gasifier','oil_boiler','gas_boiler','pellet_boiler',
          'wood_chip_boiler','heat_pump'].includes(toNode.type)&&
        edge.to_port==='return'&&p.x>q.x+45) {
      // Shared storage return collector. Keep the S3's preceding dedicated
      // RLA branch untouched, including its mixed-temperature outlet.
      const railX=Math.max(q.x+45,p.x-80);
      d='M'+h(p.x,p.y)+' H'+railX+' V'+q.y+' H'+q.x;
    } else if (p.x > q.x + 8 || fromSide === 'L' || toSide === 'R') {
      const farX = p.x + (fromSide === 'L' ? -36 : 38);
      const entryX = q.x + (toSide === 'R' ? 36 : -36);
      const laneY = p.y < q.y - 120
        ? Math.max(fromShape.y + fromShape.h + 32, toShape.y - 32)
        : p.y > q.y + 120
        ? Math.min(fromShape.y - 32, toShape.y + toShape.h + 32)
        : Math.max(fromShape.y + fromShape.h, toShape.y + toShape.h) + 38;
      d = 'M' + h(p.x, p.y) + ' H' + farX + ' V' + laneY +
        ' H' + entryX + ' V' + q.y + ' H' + q.x;
    } else {
      const mid = (p.x + q.x) / 2;
      d = 'M' + h(p.x, p.y) + ' H' + mid + ' V' + q.y + ' H' + q.x;
    }
    // A direct left-to-right coil connection is routed on the existing
    // supply level. The overhead bypass is needed only when approaching
    // the physical left-hand coil inlet from the wrong side.
    if (toNode.type === 'dhw_tank' && edge.to_port === 'coil_in' &&
        (p.x >= q.x || fromSide === 'L')) {
      const outsideX = Math.max(p.x + 36, toShape.x + toShape.w + 42);
      const aboveY = Math.max(10, Math.min(toShape.y - 24, fromShape.y - 25, 16));
      d = 'M' + h(p.x, p.y) + ' H' + outsideX + ' V' + aboveY +
        ' H' + (q.x - 34) + ' V' + q.y + ' H' + q.x;
    }
    const bufferCoilReturn = fromNode.type === 'dhw_tank' &&
      edge.from_port === 'coil_out' && toNode.type === 'buffer' &&
      edge.to_port === 'bottom_in';
    const bufferCoilSupply = fromNode.type === 'buffer' &&
      toNode.type === 'pump' && toShape.inline &&
      edge.from_port === 'top_out' && edge.to_port === 'in';
    if (bufferCoilReturn && !returnTee) {
      const leftOfTank=fromShape.x-36;
      const belowTank=fromShape.y+fromShape.h+32;
      const rightOfBuffer=toShape.x+toShape.w+36;
      d = 'M' + h(p.x, p.y) + ' H' + leftOfTank + ' V' + belowTank +
        ' H' + rightOfBuffer + ' V' + q.y + ' H' + q.x;
    } else if (bufferCoilSupply && !supplyTee) {
      const laneX = Math.min(q.x - 30, p.x + 35);
      d = 'M' + h(p.x, p.y) + ' H' + laneX + ' V' + q.y + ' H' + q.x;
    }
    if (supplyTee) {
      const viaX = Math.max(supplyTee.x, p.x + 20);
      d = 'M' + h(p.x, p.y) + ' H' + viaX + ' V' + q.y +
        ' H' + (q.x - 30) + ' H' + q.x;
    } else if (returnTee) {
      const below = toNode.type === 'buffer'
        ? Math.max(toShape.y + toShape.h + 32, fromShape.y + fromShape.h + 34)
        : Math.max(555, fromShape.y + fromShape.h + 35);
      d = 'M' + h(p.x, p.y) + ' H' + (p.x - 70) + ' V' + below +
        ' H' + (q.x - 35) + ' V' + q.y + ' H' + q.x;
    }
    return compactPath(avoidComponents(d,p,q,fromSide,toSide,obstacles,edge.from,edge.to,pipeObstacles));
  }


  // Split collinear routes into physical pipe segments. Shared supply and
  // return headers are drawn exactly once; active branches illuminate only
  // those segments for which a valid circulation path exists.
  function mergeRoutes(routes) {
    const all = [], grouped = new Map();
    for (const [routeIndex, route] of routes.entries()) {
      const tokens = route.d.match(/[MHV]|-?\d+(?:\.\d+)?/g) || [];
      let x = 0, y = 0, segmentIndex = 0;
      for (let i = 0; i < tokens.length;) {
        const op = tokens[i++];
        if (op === 'M') { x = Number(tokens[i++]); y = Number(tokens[i++]); continue; }
        if (op !== 'H' && op !== 'V') throw Error('Unsupported pipe routing command');
        const nx = op === 'H' ? Number(tokens[i++]) : x;
        const ny = op === 'V' ? Number(tokens[i++]) : y;
        // The bypass borrows the real hot supply until the mixing leg, and
          // rejoins the real return. A single edge can therefore own both
          // hydraulic roles; otherwise two different-coloured copies of the
          // same physical pipe appear beside the wood gasifier.
          const role = route.edge.kind === 'return_lift'
            ? (segmentIndex < 2 ? 'flow' : 'return')
            : ['heating_circuit_internal_return','heating_circuit_mixer_bypass']
              .includes(route.edge.kind)?'return'
            : (/^(?:return_out|coil_out|bottom_out|return)$/.test(route.edge.from_port) ||
              /^(?:return|return_in|bottom_in|mixer_bypass_in|mixer_return)$/.test(route.edge.to_port)
              ? 'return' : 'flow');
        if (Number.isFinite(nx) && Number.isFinite(ny) &&
            Math.abs(nx-x)+Math.abs(ny-y)>0.001) {
          const axis=op==='H'?'h':'v',fixed=op==='H'?y:x;
          const from=op==='H'?x:y,to=op==='H'?nx:ny;
          const key=role+'|'+axis+'|'+fixed.toFixed(3);
          const segment={key,role,axis,fixed,from,to,low:Math.min(from,to),
            high:Math.max(from,to),routeIndex,segmentIndex:segmentIndex++,active:route.on};
          if (!grouped.has(key)) grouped.set(key,[]);
          grouped.get(key).push(segment);
          all.push(segment);
        }
        x=nx;y=ny;
      }
    }
    // A hot flow line may CROSS a cool return line without joining it.
    // Leave a small drafting gap only in the flow at true interior crossings.
    // Real same-temperature T junctions stay continuous.
    const gaps=new Map();
    const horizontal=all.filter(segment=>segment.axis==='h');
    const vertical=all.filter(segment=>segment.axis==='v');
    const addGap=(segment,at)=>{
      if(!gaps.has(segment.key))gaps.set(segment.key,[]);
      gaps.get(segment.key).push(at);
    };
    for(const h of horizontal)for(const v of vertical){
      if(h.role===v.role||h.routeIndex===v.routeIndex)continue;
      if(v.fixed<=h.low+9||v.fixed>=h.high-9||
        h.fixed<=v.low+9||h.fixed>=v.high-9)continue;
      if(h.role==='flow')addGap(h,v.fixed);
      else if(v.role==='flow')addGap(v,h.fixed);
    }
    const pieces=routes.map(()=>[]);
    for (const [key,segments] of grouped) {
      const base=segments.flatMap(s=>[s.low,s.high]);
      const ranges=segments.flatMap(s=>gaps.get(key)||[])
        .flatMap(at=>[at-6,at+6]);
      const boundaries=[...new Set([...base,...ranges])].sort((a,b)=>a-b);
      for (let i=1;i<boundaries.length;i++) {
        const a=boundaries[i-1],b=boundaries[i];
        if (b-a<0.001) continue;
        const owners=segments.filter(s=>s.low<=a+0.001&&s.high>=b-0.001);
        if (!owners.length) continue;
        if((gaps.get(key)||[]).some(cross=>a>=cross-6-0.001&&
          b<=cross+6+0.001))continue;
        // The first user-defined connection owns the shared line segment.
        // A hot and a cold header never share a physical segment identity.
        owners.sort((a,b)=>Number(b.active)-Number(a.active)||
          a.routeIndex-b.routeIndex||a.segmentIndex-b.segmentIndex);
        const owner=owners[0], forward=owner.to>=owner.from;
        const start=forward?a:b, finish=forward?b:a;
        const d=owner.axis==='h'
          ?'M'+start+' '+owner.fixed+' H'+finish
          :'M'+owner.fixed+' '+start+' V'+finish;
        pieces[owner.routeIndex].push({
          segmentIndex:owner.segmentIndex,
          distance:Math.abs(start-owner.from),
          d,active:owners.some(s=>s.active)
        });
      }
    }
    return new Map(routes.map((route,index)=>{
      const sorted=pieces[index].sort((a,b)=>
        a.segmentIndex-b.segmentIndex||a.distance-b.distance);
      return [route.edge.id,{
        pipe:sorted.map(s=>s.d).join(' '),
        flow:sorted.filter(s=>s.active).map(s=>s.d).join(' ')
      }];
    }));
  }

  return { graph, orderedBuffers, bufferTopology, diverterActivePort, mixerClosedPorts,
    flowStates, flowEvidence, auxiliaryEdges, heatingCircuitEdges, route, mergeRoutes };
})();
