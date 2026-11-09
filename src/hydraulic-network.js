// Shared hydraulic topology, pipe routing and flow-state evaluation.
// The original card still owns its artwork. This module owns hydraulic decisions.
const HPC_NETWORK = (() => {
  const isSource = node => HPC_FREE.byType[node?.type]?.group === 'source';

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

  function flowStates(plan, hass) {
    const { nodes, incoming, outgoing, adjacent } = graph(plan);
    const flowing = new Set();
    const state = id => id ? HPC_FREE.state(hass, id) : null;
    const measured = id => {
      const reading = state(id);
      if (!reading) return null;
      if (reading.number !== null) return reading.number > 0;
      return HPC_FREE.active(reading);
    };
    const mappedFlow = edge => edge.flow_entity ? measured(edge.flow_entity) : null;
    const valvePortOpen = edge => {
      for (const [id,port] of [[edge.from,edge.from_port],[edge.to,edge.to_port]]) {
        const node=nodes.get(id);
        if (node?.type !== 'diverter' || port === 'ab') continue;
        if (port !== 'a' && port !== 'b') continue;
        if (diverterActivePort(node,hass) !== port) return false;
      }
      return true;
    };
    const pumpEntity = node => {
      if (node.type === 'pump') return node.sensors?.state || node.sensors?.pump;
      if (isSource(node) || node.type === 'heating_circuit') return node.sensors?.pump;
      return null;
    };
    const pumpState = node => {
      // A measured zero is stronger evidence than an on-command.
      const volumeId = node.sensors?.volume;
      const volumeState = state(volumeId);
      if (volumeState?.number !== null && volumeState?.number <= 0) return false;
      const reading = state(pumpEntity(node));
      if (reading) return HPC_FREE.active(reading);
      if (volumeState?.number > 0) return true;
      return null;
    };
    const blocked = node => pumpState(node) === false;
    const stoppedCharge = new Set(), stoppedReturn = new Set();

    for (const tank of plan.components.filter(n => n.type === 'dhw_tank')) {
      const feeders = (incoming.get(tank.id) || []).filter(e => e.to_port === 'coil_in');
      const returns = (outgoing.get(tank.id) || []).filter(e => e.from_port === 'coil_out');
      if (!feeders.length || !returns.length) continue;
      const seen = new Set();
      const stoppedSupply = id => {
        if (seen.has(id)) return false;
        seen.add(id);
        const n = nodes.get(id);
        if (!n || n.type === 'dhw_tank') return false;
        if (blocked(n)) return true;
        if (isSource(n) || n.type === 'heating_circuit') return false;
        return (incoming.get(id) || []).some(e =>
          !valvePortOpen(e) || mappedFlow(e) === false || stoppedSupply(e.from));
      };
      const stopped = feeders.some(e => !valvePortOpen(e) ||
        mappedFlow(e) === false || stoppedSupply(e.from)) ||
        returns.some(e => !valvePortOpen(e) || mappedFlow(e) === false);
      if (!stopped) continue;
      stoppedCharge.add(tank.id);
      // Stop the coil's dedicated return only, not a shared heating collector.
      const visit = (id, visited = new Set()) => {
        if (visited.has(id)) return;
        visited.add(id);
        for (const edge of outgoing.get(id) || []) {
          if (id === tank.id && edge.from_port !== 'coil_out') continue;
          const next = nodes.get(edge.to);
          if (!next) continue;
          stoppedReturn.add(edge.id);
          if (!isSource(next) && next.type !== 'dhw_tank' &&
              next.type !== 'heating_circuit' &&
              (adjacent.get(next.id) || []).length <= 2) visit(next.id, visited);
        }
      };
      visit(tank.id);
    }

    const allowed = edge => valvePortOpen(edge) && mappedFlow(edge) !== false &&
      !stoppedReturn.has(edge.id) &&
      !stoppedCharge.has(edge.from) && !stoppedCharge.has(edge.to);

    for (const edge of plan.connections)
      if (mappedFlow(edge) === true && allowed(edge)) flowing.add(edge.id);

    // A WW charging pump drives its own heating-coil loop. It is NOT proof
    // that a parallel radiator without a running circuit pump also flows.
    // Build the dedicated loop from the actual two coil ports, stopping at
    // the reservoir/heat source instead of crossing into unrelated branches.
    const chargingEdges = pump => {
      if (pump.type !== 'pump') return null;
      const out = outgoing.get(pump.id) || [];
      const coils = out.filter(edge =>
        edge.to_port === 'coil_in' && nodes.get(edge.to)?.type === 'dhw_tank');
      if (!coils.length || coils.length !== out.length) return null;
      const selected = new Set(coils.map(edge => edge.id));
      const upstream = (id, seen = new Set()) => {
        if (seen.has(id)) return;
        seen.add(id);
        for (const edge of incoming.get(id) || []) {
          selected.add(edge.id);
          const prev=nodes.get(edge.from);
          if (prev && !isSource(prev) && prev.type !== 'buffer')
            upstream(prev.id,seen);
        }
      };
      const downstream = (id, seen = new Set()) => {
        if (seen.has(id)) return;
        seen.add(id);
        for (const edge of outgoing.get(id) || []) {
          if (id !== pump.id && nodes.get(id)?.type === 'dhw_tank' &&
              edge.from_port !== 'coil_out') continue;
          selected.add(edge.id);
          const next=nodes.get(edge.to);
          if (next && !isSource(next) && next.type !== 'buffer' &&
              next.type !== 'dhw_tank')
            downstream(next.id,seen);
        }
      };
      upstream(pump.id);
      for (const coil of coils) downstream(coil.to);
      return selected;
    };

    for (const pump of plan.components.filter(n => pumpState(n) === true)) {
      const queue = [pump.id], visited = new Set();
      const dedicatedCircuit = chargingEdges(pump);
      while (queue.length) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        for (const { edge, neighbor } of adjacent.get(id) || []) {
          if (!allowed(edge) || dedicatedCircuit && !dedicatedCircuit.has(edge.id)) continue;
          const next = nodes.get(neighbor);
          if (!next || blocked(next)) continue;
          flowing.add(edge.id);
          // One pump is not evidence that an unrelated zone or boiler flows.
          const otherUnmeteredCircuit = (isSource(next) || next.type === 'heating_circuit') &&
            !pumpEntity(next) && !next.sensors?.volume && next.id !== pump.id;
          if (!otherUnmeteredCircuit && !visited.has(neighbor)) queue.push(neighbor);
        }
      }
    }
    return flowing;
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
      if(node?.type!=='diverter'||!['a','b'].includes(port))return false;
      return diverterActivePort(node,hass)!==port;
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
        state='stopped';basis='valve';
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

  // One orthogonal router for every non-native SVG pipe. It uses actual ports,
  // not the stored legacy X/Y values or assumptions based on a component name.
  function route({ edge, fromNode, toNode, fromShape, toShape, p, q,
                   fromSide, toSide, supplyTee = null, returnTee = null }) {
    const h = (x, y) => String(x) + ' ' + String(y);
    let d;
    if (p.x > q.x + 8 || fromSide === 'L' || toSide === 'R') {
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
      const below = Math.max(toShape.y + toShape.h + 32, fromShape.y + fromShape.h + 34);
      d = 'M' + h(p.x, p.y) + ' H' + (p.x - 70) + ' V' + below +
        ' H' + (q.x - 35) + ' V' + q.y + ' H' + q.x;
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
    return d;
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
        const role = /^(?:return_out|coil_out|bottom_out|return)$/.test(route.edge.from_port) ||
          /^(?:return|return_in|bottom_in)$/.test(route.edge.to_port) ? 'return' : 'flow';
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
        owners.sort((a,b)=>a.routeIndex-b.routeIndex||a.segmentIndex-b.segmentIndex);
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

  return { graph, orderedBuffers, diverterActivePort, flowStates, flowEvidence, route, mergeRoutes };
})();
