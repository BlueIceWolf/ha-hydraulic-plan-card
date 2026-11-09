(() => {
  const CASES=1200,BASE_SEED=0x5eed2000;
  const sourceTypes=['heat_pump','oil_boiler','gas_boiler','wood_gasifier',
    'pellet_boiler','wood_chip_boiler'];
  const failures=[],failureCategories=new Map(),failedSeeds=new Set(),
    fingerprints=new Map(),counts={valid:0,invalid:0};
  let failureCount=0;
  const started=performance.now();
  const randomFor=seed=>{
    let state=seed>>>0;
    return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;
      t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
      return((t^(t>>>14))>>>0)/4294967296;};
  };
  const pick=(random,list)=>list[Math.floor(random()*list.length)];
  const recordFailure=(seed,category,detail,config)=>{
    failureCount++;
    failedSeeds.add(seed);
    failureCategories.set(category,(failureCategories.get(category)||0)+1);
    if(failures.length<30)failures.push({seed,category,detail,config});
  };
  const plant=(seed,index)=>{
    const random=randomFor(seed),components=[],connections=[];
    const addNode=(type,id,options={},sensors={})=>{
      components.push({id,type,name:id,sensors,options});
      return id;
    };
    const addEdge=(from,from_port,to,to_port)=>{
      connections.push({id:'edge_'+connections.length,from,from_port,to,to_port});
    };
    const sourceCount=1+Math.floor(random()*4);
    const bufferCount=Math.floor(random()*5);
    const circuitCount=1+Math.floor(random()*6);
    const topology=pick(random,['series','parallel','hybrid']);
    const tankEnabled=random()<.62;
    const diverterEnabled=tankEnabled&&random()<.45;
    const externalMixerEnabled=random()<.48;
    const sourceIds=Array.from({length:sourceCount},(_,i)=>
      addNode(pick(random,sourceTypes),'s'+(i+1),{},
        {pump:'switch.src'+(i+1)}));
    const bufferIds=Array.from({length:bufferCount},(_,i)=>
      addNode('buffer','b'+(i+1)));
    const circuitIds=Array.from({length:circuitCount},(_,i)=>{
      const mixed=random()<.55;
      return addNode('heating_circuit','h'+(i+1),
        {mixed,emitter:pick(random,HFC_EMITTERS)},
        {pump:'switch.hc'+(i+1)});
    });
    const mixerIds=new Map();
    const pumpIds=[];
    if(tankEnabled){
      addNode('dhw_tank','w1');
      if(diverterEnabled)addNode('diverter','v1',
        {dhw_port:random()<.5?'a':'b',dhw_state:'DHW',heating_state:'HEAT'},
        {position:'sensor.v1'});
      addNode('pump','p1',{}, {state:'switch.dhw1'});
      pumpIds.push('p1');
    }
    if(externalMixerEnabled&&circuitCount>0){
      for(let i=0;i<circuitCount;i++)if(random()<.36){
        const id='m'+(mixerIds.size+1);
        addNode('mixer',id,{}, {position:'sensor.'+id});
        mixerIds.set('h'+(i+1),id);
      }
    }
    const sourceFeeds=(sourceIndex)=>{
      const source=sourceIds[sourceIndex];
      if(diverterEnabled&&sourceIndex===0){
        addEdge(source,'flow','v1','ab');
        const heatingPort=components.find(n=>n.id==='v1').options.dhw_port==='a'?'b':'a';
        const dhwPort=heatingPort==='a'?'b':'a';
        if(bufferCount){
          const inlet=pick(random,['top_in','mid_in']);
          addEdge('v1',heatingPort,bufferIds[0],inlet);
        }else if(circuitCount){
          const firstMixer=mixerIds.get('h1');
          if(firstMixer){
            addEdge('v1',heatingPort,firstMixer,'a');
            addEdge(firstMixer,'ab','h1','flow_in');
          }else addEdge('v1',heatingPort,'h1','flow_in');
        }
        addEdge('v1',dhwPort,'p1','in');
        addEdge('w1','coil_out',source,'return');
        addEdge('p1','out','w1','coil_in');
        return true;
      }
      return false;
    };
    if(bufferCount){
      const diverted=sourceFeeds(0);
      for(let i=0;i<sourceCount;i++){
        if(diverted&&i===0)continue;
        const target=topology==='parallel'
          ?bufferIds[Math.floor(random()*bufferCount)]
          :bufferIds[i%bufferCount];
        addEdge(sourceIds[i],'flow',target,
          pick(random,['top_in','mid_in']));
        addEdge(target,'bottom_out',sourceIds[i],'return');
      }
      if(topology==='series'||topology==='hybrid'){
        for(let i=0;i<bufferCount-1;i++){
          addEdge(bufferIds[i],'top_out',bufferIds[i+1],'top_in');
          if(topology==='series'||random()<.7)
            addEdge(bufferIds[i+1],'bottom_out',bufferIds[i],'bottom_in');
        }
      }
      if(topology==='parallel'&&bufferCount>1){
        for(let i=1;i<bufferCount;i++){
          if(random()<.45)addEdge(bufferIds[i-1],'mid_out',bufferIds[i],'mid_in');
        }
      }
      circuitIds.forEach((circuit,i)=>{
        const buffer=bufferIds[Math.floor(random()*bufferCount)];
        const mixer=mixerIds.get(circuit);
        if(mixer){
          addEdge(buffer,'top_out',mixer,'a');
          addEdge(circuit,'return_out',mixer,'b');
          addEdge(mixer,'ab',circuit,'flow_in');
          if(random()<.5)addEdge(mixer,'b',buffer,'bottom_in');
          else addEdge(circuit,'return_out',buffer,'bottom_in');
        }else{
          addEdge(buffer,pick(random,['top_out','mid_out']),circuit,'flow_in');
          addEdge(circuit,'return_out',buffer,'bottom_in');
        }
      });
      if(tankEnabled&&!diverterEnabled){
        const buffer=bufferIds[Math.floor(random()*bufferCount)];
        addEdge(buffer,'top_out','p1','in');
        addEdge('p1','out','w1','coil_in');
        addEdge('w1','coil_out',buffer,'bottom_in');
      }
    }else{
      if(diverterEnabled){
        const heatingPort=components.find(n=>n.id==='v1').options.dhw_port==='a'?'b':'a';
        const dhwPort=heatingPort==='a'?'b':'a';
        addEdge(sourceIds[0],'flow','v1','ab');
        addEdge('v1',dhwPort,'p1','in');
        addEdge('p1','out','w1','coil_in');
        addEdge('w1','coil_out',sourceIds[0],'return');
        if(circuitCount){
          const mixer=mixerIds.get('h1');
          if(mixer){
            addEdge('v1',heatingPort,mixer,'a');
            addEdge(mixer,'ab','h1','flow_in');
          }else addEdge('v1',heatingPort,'h1','flow_in');
        }
      }else if(tankEnabled){
        addEdge(sourceIds[0],'flow','p1','in');
        addEdge('p1','out','w1','coil_in');
        addEdge('w1','coil_out',sourceIds[0],'return');
      }
      const source=sourceIds[0];
      circuitIds.forEach((circuit,i)=>{
        const selected=sourceIds[i%sourceIds.length];
        const mixer=mixerIds.get(circuit);
        if(diverterEnabled&&i===0)return;
        if(mixer){
          addEdge(selected,'flow',mixer,'a');
          addEdge(circuit,'return_out',mixer,'b');
          addEdge(mixer,'ab',circuit,'flow_in');
        }else addEdge(selected,'flow',circuit,'flow_in');
        addEdge(circuit,'return_out',selected,'return');
      });
    }
    for(const node of components)
      if(node.type==='wood_gasifier'&&random()<.4)node.options.return_lift=true;
    const invalid=index%10===0;
    if(invalid){
      if(index%20===0)connections.push({
        id:'invalid_'+index,from:sourceIds[0],from_port:'not_a_port',
        to:sourceIds[0],to_port:'return'
      });
      else connections.push({
        id:'invalid_'+index,from:sourceIds[0],from_port:'return',
        to:circuitIds[0],to_port:'flow_in'
      });
    }
    return {seed,index,invalid,raw:{components,connections}};
  };
  const signature=plan=>{
    const typeIndex=new Map(),canonical=new Map();
    for(const node of plan.components){
      const key=node.type;
      const number=(typeIndex.get(key)||0)+1;typeIndex.set(key,number);
      canonical.set(node.id,node.type+'#'+number);
    }
    const nodes=plan.components.map(node=>[
      canonical.get(node.id),node.options?.mixed??null,
      node.options?.emitter??null,node.options?.return_lift??false,
      node.options?.dhw_port??null
    ]).sort((a,b)=>a[0].localeCompare(b[0]));
    const edges=plan.connections.map(edge=>[
      canonical.get(edge.from),edge.from_port,canonical.get(edge.to),edge.to_port
    ]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return JSON.stringify({nodes,edges});
  };
  const addDistinctPump=(config,variant)=>{
    const source=config.components.find(node=>
      HPC_FREE.byType[node.type]?.group==='source');
    const supply=config.connections.find(edge=>
      edge.from===source?.id&&edge.from_port==='flow');
    if(!source||!supply)return false;
    const pumpId='variant_pump_'+variant;
    config.components.push({id:pumpId,type:'pump',name:pumpId,
      sensors:{state:'switch.'+pumpId},options:{}});
    const oldTarget=supply.to,oldPort=supply.to_port;
    supply.to=pumpId;supply.to_port='in';
    const nextId='variant_edge_'+variant;
    config.connections.push({id:nextId,from:pumpId,from_port:'out',
      to:oldTarget,to_port:oldPort});
    return true;
  };
  const parseSegments=d=>{
    const tokens=(d||'').match(/[MHV]|-?\d+(?:\.\d+)?/g)||[];
    const result=[];let x=0,y=0;
    for(let i=0;i<tokens.length;){
      const op=tokens[i++];
      if(op==='M'){x=Number(tokens[i++]);y=Number(tokens[i++]);continue;}
      if(op!=='H'&&op!=='V')throw Error('unsupported path command '+op);
      const nx=op==='H'?Number(tokens[i++]):x;
      const ny=op==='V'?Number(tokens[i++]):y;
      if(![x,y,nx,ny].every(Number.isFinite)||
        Math.abs(nx-x)+Math.abs(ny-y)<.001)
        throw Error('non-finite or zero-length route segment');
      result.push({x,y,nx,ny,axis:op==='H'?'h':'v',
        fixed:op==='H'?y:x,low:Math.min(op==='H'?x:y,op==='H'?nx:ny),
        high:Math.max(op==='H'?x:y,op==='H'?nx:ny)});
      x=nx;y=ny;
    }
    return result;
  };
  const crossesBox=(segment,box)=>{
    const pad=9,left=box.x-pad,right=box.x+box.w+pad;
    const top=box.y-pad,bottom=box.y+box.h+pad;
    return segment.x===segment.nx
      ?segment.x>left&&segment.x<right&&
        Math.max(segment.y,segment.ny)>top&&Math.min(segment.y,segment.ny)<bottom
      :segment.y>top&&segment.y<bottom&&
        Math.max(segment.x,segment.nx)>left&&Math.min(segment.nx,segment.x)<right;
  };
  const requestedSeed=Number(new URLSearchParams(location.search).get('seed'));
  const requestedIndex=(requestedSeed-BASE_SEED)/7919-1;
  const indices=Number.isInteger(requestedIndex)&&requestedIndex>=0&&requestedIndex<CASES
    ?[requestedIndex]:Array.from({length:CASES},(_,i)=>i);
  for(const index of indices){
    const seed=(BASE_SEED+Math.imul(index+1,7919))>>>0;
    const generated=plant(seed,index),config=generated.raw;
    const normalized=HPC_FREE.normalize(config);
    const label='seed '+seed;
    try{
      if(generated.invalid){
        counts.invalid++;
        const warnings=HPC_MIGRATION.check(config);
        if(!warnings.length)recordFailure(seed,'validation',
          'Invalid topology was not rejected by migration validation',config);
        if(normalized.connections.length!==config.connections.length-1)
          recordFailure(seed,'normalization',
            'Invalid edge was not excluded without changing valid edges',config);
      }else{
        counts.valid++;
        if(normalized.connections.length!==config.connections.length)
          recordFailure(seed,'normalization','A valid edge was discarded',config);
        if(HPC_MIGRATION.check(normalized).length)
          recordFailure(seed,'validation','A valid generated topology was rejected',
            {config,warnings:HPC_MIGRATION.check(normalized)});
      }
      const fingerprint=signature(normalized);
      let variant=0,currentFingerprint=fingerprint;
      while(fingerprints.has(currentFingerprint)&&variant<20){
        if(!addDistinctPump(config,variant)){
          recordFailure(seed,'diversity',
            'Topology duplicates seed '+fingerprints.get(currentFingerprint)+
            ' and has no supply edge to vary',config);
          break;
        }
        variant++;
        const varied=HPC_FREE.normalize(config);
        currentFingerprint=signature(varied);
        normalized.components=varied.components;
        normalized.connections=varied.connections;
      }
      if(fingerprints.has(currentFingerprint))
        recordFailure(seed,'diversity',
          'Topology duplicates seed '+fingerprints.get(currentFingerprint),config);
      else fingerprints.set(currentFingerprint,seed);
      const model=HPC_INTEGRATED.layout(normalized,
        normalized.components.filter(n=>n.type==='heating_circuit').length||1);
      const boxes=[...model.anchored,...model.points].map(([id,box])=>({id,...box}));
      if(boxes.length!==normalized.components.length)
        recordFailure(seed,'layout','A component has no automatic position',config);
      if(boxes.some(box=>![box.x,box.y,box.w,box.h].every(Number.isFinite)||
          box.x<0||box.y<0||box.w<=0||box.h<=0||box.x>12000||box.y>12000))
        recordFailure(seed,'layout','Invalid or extreme component bounds',config);
      for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++){
        const x=boxes[a],y=boxes[b];
        if(x.x<y.x+y.w-6&&x.x+x.w>y.x+6&&
          x.y<y.y+y.h-6&&x.y+x.h>y.y+6)
          recordFailure(seed,'layout','Component overlap: '+x.id+' × '+y.id,config);
      }
      const byId=new Map(normalized.components.map(node=>[node.id,node]));
      const obstacles=boxes;
      const routedPaths=[];
      const routes=[...normalized.connections,...HPC_NETWORK.auxiliaryEdges(normalized,{states:{}})]
        .map(edge=>{
          const from=byId.get(edge.from),to=byId.get(edge.to);
          const fromShape=model.anchored.get(edge.from)||model.points.get(edge.from);
          const toShape=model.anchored.get(edge.to)||model.points.get(edge.to);
          if(!fromShape||!toShape)throw Error('missing endpoint shape for '+edge.id);
          const p=HPC_INTEGRATED.port(from,fromShape,edge.from_port);
          const q=HPC_INTEGRATED.port(to,toShape,edge.to_port);
          const d=HPC_NETWORK.route({edge,fromNode:from,toNode:to,
            fromShape,toShape,p,q,
            fromSide:HPC_INTEGRATED.portSide(from,fromShape,edge.from_port),
            toSide:HPC_INTEGRATED.portSide(to,toShape,edge.to_port),
            obstacles,routedPaths});
          routedPaths.push({edge,d});
          return{edge,d,on:false};
        });
      const segments=[];
      for(const route of routes){
        const parsed=parseSegments(route.d);
        if(!parsed.length)recordFailure(seed,'routing',
          'Connection has no geometric route: '+route.edge.id,config);
        const fromShape=model.anchored.get(route.edge.from)||model.points.get(route.edge.from);
        const toShape=model.anchored.get(route.edge.to)||model.points.get(route.edge.to);
        const start=HPC_INTEGRATED.port(byId.get(route.edge.from),fromShape,route.edge.from_port);
        const end=HPC_INTEGRATED.port(byId.get(route.edge.to),toShape,route.edge.to_port);
        if(parsed.length&&(parsed[0].x!==start.x||parsed[0].y!==start.y||
          parsed[parsed.length-1].nx!==end.x||parsed[parsed.length-1].ny!==end.y))
          recordFailure(seed,'endpoints',
            'Route does not terminate at its declared ports: '+route.edge.id,config);
        for(const segment of parsed){
          for(const box of obstacles){
            if(box.id!==route.edge.from&&box.id!==route.edge.to&&
              crossesBox(segment,box))
              recordFailure(seed,'collision',
                'Route '+route.edge.id+' crosses component '+box.id+
                ' ('+route.d+'); bounds='+JSON.stringify(box),config);
          }
          segments.push(segment);
        }
      }
      const physical=HPC_NETWORK.mergeRoutes(routes);
      const uniqueSegments=[];
      const routeById=new Map(routes.map(route=>[route.edge.id,route]));
      const edgeRole=edge=>edge.kind==='return_lift'?'mixed':
        (/^(?:return_out|coil_out|bottom_out|return)$/.test(edge.from_port)||
         /^(?:return|return_in|bottom_in)$/.test(edge.to_port)?'return':'flow');
      for(const [edgeId,parts] of physical){
        for(const segment of parseSegments(parts.pipe))
          uniqueSegments.push({...segment,edgeId,role:edgeRole(routeById.get(edgeId).edge)});
        if(!routes.some(route=>route.edge.id===edgeId))
          recordFailure(seed,'segments','Router emitted an unknown connection',config);
      }
      for(let i=0;i<uniqueSegments.length;i++)for(let j=i+1;j<uniqueSegments.length;j++){
        const a=uniqueSegments[i],b=uniqueSegments[j];
        if(a.axis===b.axis&&Math.abs(a.fixed-b.fixed)<.001&&
          Math.min(a.high,b.high)-Math.max(a.low,b.low)>.01)
          recordFailure(seed,'duplicate-segments',
            'Merged physical pipes overlap: '+a.edgeId+' / '+b.edgeId+
            ' ('+a.role+'/'+b.role+')'+
            ' at '+a.axis+':'+a.fixed+' ['+a.low+','+a.high+'] / ['+
            b.low+','+b.high+']',config);
      }
      const svg=HPC_INTEGRATED.svg(model,{states:{},locale:{language:'en'}});
      if(typeof svg.body!=='string'||!/id="hpc-integrated"/.test(svg.body)||
        /(?:NaN|Infinity)/.test(svg.body))
        recordFailure(seed,'render','SVG output is invalid',config);
      if(HPC_INTEGRATED.svg(model,{states:{},locale:{language:'en'}}).body!==svg.body)
        recordFailure(seed,'determinism','Identical configuration rendered different SVG',config);
      if(segments.length>2500||model.width>12000||model.height>12000)
        recordFailure(seed,'bounds','Unexpected drawing size or segment count',config);
      const emptyState=HPC_NETWORK.flowStates(normalized,{states:{}});
      if(emptyState.size)
        recordFailure(seed,'unknown-flow','Missing sensors activated a pipe',config);
      const sensorIds=new Set(normalized.components.flatMap(node=>
        Object.values(node.sensors||{}).filter(value=>
          typeof value==='string'&&value.includes('.'))));
      const allStates=values=>({states:Object.fromEntries([...sensorIds].map(id=>
        [id,{state:values,attributes:{}}]))});
      const offState=HPC_NETWORK.flowStates(normalized,allStates('off'));
      if(offState.size)
        recordFailure(seed,'pump-off','All stopped pumps left active routes',config);
      const onState=allStates('on');
      const onEdges=HPC_NETWORK.flowStates(normalized,onState);
      const validEdgeIds=new Set(normalized.connections.map(edge=>edge.id));
      if([...onEdges].some(edgeId=>!validEdgeIds.has(edgeId)))
        recordFailure(seed,'flow-graph','Flow solver activated an unconfigured edge',config);
      if(normalized.connections.length){
        const measuredPlan=structuredClone(normalized);
        const measuredEdge=measuredPlan.connections[0];
        measuredEdge.flow_entity='sensor.topology_meter';
        const measuredHass=allStates('on');
        measuredHass.states['sensor.topology_meter']={state:'12',attributes:{unit_of_measurement:'l/min'}};
        const measured=HPC_NETWORK.flowEvidence(measuredPlan,measuredHass);
        if(measured.get(measuredEdge.id)?.state!=='measured')
          recordFailure(seed,'measured-flow',
            'Positive volumetric sensor was not classified as measured',config);
        measuredHass.states['sensor.topology_meter'].state='0';
        const zero=HPC_NETWORK.flowEvidence(measuredPlan,measuredHass);
        if(zero.get(measuredEdge.id)?.state!=='stopped')
          recordFailure(seed,'zero-flow','Measured zero did not stop its pipe',config);
      }
    }catch(error){
      recordFailure(seed,'exception',String(error?.stack||error),config);
    }
  }
  const summary={cases:indices.length,valid:counts.valid, intentionallyInvalid:counts.invalid,
    structurallyDistinct:fingerprints.size,failed:failureCount,
    failedSeeds:[...failedSeeds],
    failureRecords:failures.length,failuresTruncated:failureCount>failures.length,
    failureCategories:Object.fromEntries(failureCategories),
    runtimeMs:Math.round(performance.now()-started),baseSeed:BASE_SEED,
    seedFormula:'(0x5eed2000 + Math.imul(index + 1, 7919)) >>> 0',
    failures};
  window.topologyTestSummary=summary;
  document.querySelector('#result').textContent=summary.failed?'FAIL':'PASS';
  document.querySelector('#report').textContent=JSON.stringify(summary,null,2);
})();
