// Additional heating components share the original Heat Pump Hydraulic Card SVG.
// The first heat source, first buffer, first DHW tank and up to six heating circuits
// reuse their original renderer. All other components are ADDED to that same SVG.
const HPC_INTEGRATED = (() => {
  const sources = new Set(['wood_gasifier','oil_boiler','pellet_boiler','wood_chip_boiler','gas_boiler','heat_pump']);
  const isSource = (node) => sources.has(node.type);
  const isTank = node => node.type==='buffer'||node.type==='dhw_tank';
  function layout(plan, hcCount=1) {
    const p=HPC_FREE.normalize(plan), anchored=new Map();
    const firstSource=p.components.find(isSource);
    const firstBuffer=p.components.find(c=>c.type==='buffer');
    const firstDhw=p.components.find(c=>c.type==='dhw_tank');
    if(firstSource)anchored.set(firstSource.id,{x:50,y:190,w:240,h:235,type:'source'});
    if(firstBuffer)anchored.set(firstBuffer.id,{x:520,y:320,w:120,h:200,type:'buffer'});
    if(firstDhw)anchored.set(firstDhw.id,{x:520,y:40,w:120,h:200,type:'dhw_tank'});
    p.components.filter(c=>c.type==='heating_circuit').slice(0,Math.min(hcCount,6))
      .forEach((c,index)=>anchored.set(c.id,{x:815,y:330+index*250,w:155,h:140,type:'heating_circuit'}));
    // Deterministic automatic layout: no manual X/Y placement is required.
    // Keep the original Heat Pump Hydraulic Card positions for its main units,
    // and arrange additional equipment in distinct, non-overlapping lanes.
    // Connection order and type determine the visual grouping, not stored X/Y.
    const extras=p.components.filter(c=>!anchored.has(c.id));
    const byGroup={source:[],storage:[],control:[],load:[]};
    for(const node of extras)byGroup[HPC_FREE.byType[node.type].group].push(node);
    const points=new Map();
    // A column has no more than four items; add further columns automatically.
    const placeColumn=(items,startX,startY,stepX,stepY,wCount=4)=>{
      for(const [idx,node] of items.entries()){
        const [w,h]=HPC_FREE.dimension(node.type);
        const column=Math.floor(idx/wCount),row=idx%wCount;
        points.set(node.id,{x:startX+column*stepX,y:startY+row*stepY,w,h,type:node.type});
      }
      return startX+Math.max(1,Math.ceil(items.length/wCount))*stepX;
    };
    // All generators have the exact 240 x 235 footprint of the original
    // primary source. The diagram grows by rows, without custom-sized tiles
    // that looked like unrelated cards.
    for(const [index,node] of byGroup.source.entries()){
      points.set(node.id,{x:50+Math.floor(index/4)*265,
        y:475+(index%4)*260,w:240,h:235,type:node.type});
    }
    // Discover the buffer sequence from the user's directed pipe connections.
    // This works regardless of the order in which buffers were added.
    const orderedBuffers=byGroup.storage.filter(c=>c.type==='buffer');
    const adjacency=new Map();
    for(const edge of p.connections){
      if(!adjacency.has(edge.from))adjacency.set(edge.from,[]);
      adjacency.get(edge.from).push(edge.to);
    }
    const distances=new Map(),queue=firstBuffer?[firstBuffer.id]:[];
    if(firstBuffer)distances.set(firstBuffer.id,0);
    while(queue.length){
      const from=queue.shift(),depth=distances.get(from);
      for(const to of adjacency.get(from)||[]){
        if(distances.has(to))continue;
        distances.set(to,depth+1);
        queue.push(to);
      }
    }
    orderedBuffers.sort((a,b)=>(distances.get(a.id)??Infinity)-(distances.get(b.id)??Infinity));
    const extraDhw=byGroup.storage.filter(c=>c.type==='dhw_tank');
    const storageStart=520;
    // Continue the original storage bank directly underneath the native
    // 120 x 200 buffer. Two more tanks fit between the source and radiator
    // columns, avoiding both overlap and a 300 px empty gap.
    const bufferStartY=555;
    orderedBuffers.forEach((node,index)=>{
      points.set(node.id,{x:520+(index%2)*160,
        y:bufferStartY+Math.floor(index/2)*225,w:120,h:200,type:node.type});
    });
    // Preserve the original DHW proportions as well.
    extraDhw.forEach((node,index)=>{
      points.set(node.id,{x:680+(index%2)*160,
        y:40+Math.floor(index/2)*220,w:120,h:200,type:node.type});
    });
    const controlStart=Math.max(1190,storageStart+530);
    const controlEnd=placeColumn(byGroup.control,controlStart,90,205,150);
    placeColumn(byGroup.load,controlEnd+90,115,230,225,3);
    const maxX=Math.max(1000,...[...points.values()].map(n=>n.x+n.w+70));
    const maxY=Math.max(560+(hcCount-1)*250,...[...points.values()].map(n=>n.y+n.h+70));
    return {plan:p,anchored,points,extras,width:maxX,height:maxY};
  }
  function coreConfig(config) {
    const p=HPC_FREE.normalize(config.plan),src=p.components.find(isSource);
    const buffer=p.components.find(c=>c.type==='buffer');
    const dhw=p.components.find(c=>c.type==='dhw_tank');
    const circuits=p.components.filter(c=>c.type==='heating_circuit').slice(0,6);
    const types={wood_gasifier:'wood_gasifier',oil_boiler:'oil',pellet_boiler:'pellet',wood_chip_boiler:'pellet',
      gas_boiler:'gas',heat_pump:'heat_pump'};
    const entities={};
    const set=(target,source,key)=>{if(source?.sensors?.[key])entities[target]=source.sensors[key];};
    if(src){
      if(src.type==='heat_pump'){
        [['flow','flow'],['return','return'],['power','power'],['state','mode']].forEach(([from,to])=>set(to,src,from));
      }else {
        [['state','boiler_state'],['flow','boiler_flow'],['return','boiler_return'],['power','boiler_power'],
        ['exhaust','boiler_exhaust'],['oxygen','boiler_o2'],['fan','boiler_fan'],['pump','boiler_pump'],
        ['fuel_level','boiler_fuel_level']].forEach(([from,to])=>set(to,src,from));
      }
    }
    if(src?.type==='wood_gasifier'&&src.options?.return_lift)set('boiler_mixer',src,'mixer');
    for(const [node,prefix] of [[buffer,'buffer'],[dhw,'dhw']])
      for(const key of ['top','middle','bottom'])set(prefix+'_'+key,node,key);
    circuits.forEach((node,index)=>{
      const prefix=index?'hc'+(index+1)+'_':'hc_';
      for(const key of ['flow','return','target','pump','mixer'])set(prefix+ (key==='target'?'setpoint':key),node,key);
    });
    // Legacy entities intentionally win over auto-mappings; existing heat pump
    // users retain precisely their previous presets/overrides.
    const derived={...config};
    if(p.components.length)derived.generator_type=src?types[src.type]:'heat_pump';
    else if(src)derived.generator_type=types[src.type];
    if(src&&src.type!=='heat_pump')derived.boiler_name=src.name;
    if(src?.type==='heat_pump'){
      // Original Heat Pump Hydraulic Card artwork renderer reads these exact
      // top-level settings. The component editor exposes the entire gallery.
      // Auto inherits a pre-existing classic setting when one is available.
      const o=src.options||{};
      if(o.unit_style&&o.unit_style!=='auto')derived.unit_style=o.unit_style;
      else derived.unit_style=config.unit_style||'auto';
      if(o.unit_size)derived.unit_size=o.unit_size;
      else if(config.unit_size)derived.unit_size=config.unit_size;
      else delete derived.unit_size;
      derived.source_type=o.source_type||config.source_type||'air';
    }
    if(p.components.length){
      // Free plan is authoritative: old dashboard role keys must not draw
      // tanks, hot-water branches or a different heat source.
      const clean={...(config.entities||{})};
      for(const key of Object.keys(clean)){
        if(/^(boiler_|buffer_|dhw_|hc(?:[1-6])?_|mode$|flow$|return$|power$|compressor$)/.test(key))delete clean[key];
      }
      derived.entities={...clean,...entities};
      derived.buffer=!!buffer;
      derived.series_buffer=false;
      derived.storage='separate';
      derived.hc_count=Math.max(1,circuits.length);
      derived.preset='none';
    }else derived.entities={...entities,...(config.entities||{})};
    derived.power_sources=derived.power_sources||'manual';
    return derived;
  }
  function port(node,shape,key) {
    if(shape.type==='source') {
      if(key==='return')return{x:290,y:380};
      if(key==='dhw')return{x:290,y:310};
      return{x:290,y:250};
    }
    if(shape.type==='buffer'){
      const y=key.includes('bottom')?495:key.includes('mid')?428:360;
      return{x:key.includes('out')?640:520,y};
    }
    if(shape.type==='dhw_tank'){
      // The heat-exchanger circuit is on the LEFT. Domestic hot and cold
      // outlets belong on the RIGHT; never intersect the vessel internally.
      const positions={
        coil_in:{x:520,y:80},coil_out:{x:520,y:215},
        hot_out:{x:640,y:80},cold_in:{x:640,y:215}
      };
      return positions[key]||{x:520,y:80};
    }
    if(shape.type==='heating_circuit')return{x:shape.x,y:key==='return_out'?shape.y+135:shape.y+30};
    const def=HPC_FREE.ports(node.type).find(p=>p.id===key);
    return{x:shape.x+(def?.side==='R'?shape.w:0),y:shape.y+(def?.y??.5)*shape.h};
  }
  function portSide(node,shape,key) {
    if(shape.type==='source')return 'R';
    if(shape.type==='buffer')return key.endsWith('_out')?'R':'L';
    if(shape.type==='dhw_tank')return key.startsWith('coil_')?'L':'R';
    if(shape.type==='heating_circuit')return 'L';
    return HPC_FREE.ports(node.type).find(p=>p.id===key)?.side||'R';
  }
  function tankPoints(node,hass) {
    const points=[['top',0],['middle',50],['bottom',100]]
      .filter(([key])=>!!node.sensors[key]).map(([key,position])=>({position,entity:node.sensors[key]}));
    for(const p of node.level_sensors||[])points.push(p);
    return points.filter(p=> {
      const s=HPC_FREE.state(hass,p.entity);
      return s && s.number!==null && ['°c','c','°f','k'].includes(s.unit.toLowerCase());
    }).sort((a,b)=>a.position-b.position);
  }
  function stops(node,hass) {
    const values=tankPoints(node,hass);
    if(!values.length)return '<stop offset="0%" stop-color="#7e8a95"/><stop offset="100%" stop-color="#7e8a95"/>';
    const a=[];
    if(values[0].position>0)a.push('<stop offset="0%" stop-color="#7e8a95"/>');
    for(const point of values){
      const col=HPC_FREE.color(HPC_FREE.state(hass,point.entity));
      a.push('<stop offset="'+point.position+'%" stop-color="'+col+'"/>');
    }
    if(values.at(-1).position<100)a.push('<stop offset="100%" stop-color="#7e8a95"/>');
    return a.join('');
  }
  function flowStates(plan,hass) {
    // Pipe animation is a *circuit* state, not an independent property of
    // every line. An off DHW charging pump closes the supply AND the return of
    // its coil, even when an unrelated heating pump is running elsewhere.
    const nodes=Object.fromEntries(plan.components.map(c=>[c.id,c]));
    const adjacent=new Map(plan.components.map(c=>[c.id,[]]));
    const incoming=new Map(plan.components.map(c=>[c.id,[]]));
    const outgoing=new Map(plan.components.map(c=>[c.id,[]]));
    const flowing=new Set();
    const mappedFlow=edge=>{
      if(!edge.flow_entity)return null;
      const state=HPC_FREE.state(hass,edge.flow_entity);
      return state?HPC_FREE.active(state):null;
    };
    for(const edge of plan.connections){
      adjacent.get(edge.from)?.push({edge,neighbor:edge.to});
      adjacent.get(edge.to)?.push({edge,neighbor:edge.from});
      incoming.get(edge.to)?.push(edge);
      outgoing.get(edge.from)?.push(edge);
    }
    const pumpEntity=node=>{
      if(node.type==='pump')return node.sensors.state||node.sensors.pump||node.sensors.volume;
      if(isSource(node)||node.type==='heating_circuit')return node.sensors.pump;
      return null;
    };
    const pumpState=node=>{
      const id=pumpEntity(node);
      const state=id&&HPC_FREE.state(hass,id);
      return state?HPC_FREE.active(state):null;
    };
    const blocked=node=>pumpState(node)===false;
    const stoppedChargeCircuits=new Set();
    const stoppedReturnEdges=new Set();

    for(const tank of plan.components.filter(node=>node.type==='dhw_tank')){
      // Inspect *directed supply* going into the heating coil. Never walk
      // backwards through the DHW return to find an unrelated source pump.
      const feeders=(incoming.get(tank.id)||[]).filter(e=>e.to_port==='coil_in');
      const visited=new Set();
      const hasStoppedFeed=id=>{
        if(visited.has(id))return false;
        visited.add(id);
        const node=nodes[id];
        if(!node||node.type==='dhw_tank')return false;
        if(blocked(node))return true;
        // Heat sources are the beginning of the charging route. Other
        // circuits sharing a return manifold must not influence the feed.
        if(isSource(node)||node.type==='heating_circuit')return false;
        return (incoming.get(id)||[]).some(edge=>hasStoppedFeed(edge.from));
      };
      if(!feeders.some(edge=>hasStoppedFeed(edge.from)))continue;
      stoppedChargeCircuits.add(tank.id);
      // Suppress the return leg until it rejoins a larger circuit. Pipes
      // after a shared manifold may still correctly animate for heating.
      const traceReturn=(id,seen=new Set())=>{
        if(seen.has(id))return;
        seen.add(id);
        for(const edge of outgoing.get(id)||[]){
          if(id===tank.id&&edge.from_port!=='coil_out')continue;
          const next=nodes[edge.to];
          if(!next)continue;
          stoppedReturnEdges.add(edge.id);
          const branches=(adjacent.get(next.id)||[]).length;
          if(!isSource(next)&&next.type!=='dhw_tank'&&
            next.type!=='heating_circuit'&&branches<=2)traceReturn(next.id,seen);
        }
      };
      traceReturn(tank.id);
    }

    for(const edge of plan.connections){
      if(mappedFlow(edge)===true&&!stoppedReturnEdges.has(edge.id)&&
        !stoppedChargeCircuits.has(edge.from)&&
        !stoppedChargeCircuits.has(edge.to))flowing.add(edge.id);
    }
    const activePumps=plan.components.filter(node=>pumpState(node)===true);
    for(const pump of activePumps){
      const queue=[pump.id],visited=new Set();
      while(queue.length){
        const id=queue.shift();
        if(visited.has(id))continue;
        visited.add(id);
        for(const {edge,neighbor} of adjacent.get(id)||[]){
          if(mappedFlow(edge)===false||stoppedReturnEdges.has(edge.id)||
            stoppedChargeCircuits.has(edge.from)||stoppedChargeCircuits.has(edge.to))continue;
          const next=nodes[neighbor];
          if(!next||blocked(next))continue;
          flowing.add(edge.id);
          // Avoid treating a different heat generator or heating zone as
          // evidence that its whole branch is flowing.
          const unknownSource=(isSource(next)||next.type==='heating_circuit')
            && pumpEntity(next)==null&&next.id!==pump.id;
          if(!unknownSource&&!visited.has(neighbor))queue.push(neighbor);
        }
      }
    }
    return flowing;
  }


  // SVG artwork in the same coordinates and visual language as the original
  // heat-source/puffer drawings. All geometry is our own, no ETA image assets.
  function chipArt(x,y,width,height,node,on) {
    const d=(v)=>Math.round(v*10)/10;
    const frontX=d(x+width*.29),frontW=d(width*.65);
    const frontY=d(y+height*.085),frontH=d(height*.78);
    const feedY=d(y+height*.72);
    const model={ehack:'eHACK',hack:'HACK',hack_vr:'HACK VR'}[node.options?.eta_model]||'eHACK';
    const primary=width<160;
    return '<g class="hpi-chip-art'+(on?' on':'')+'">'
      +'<rect class="hpi-chip-body" x="'+x+'" y="'+y+'" width="'+width+'" height="'+height+'" rx="11"/>'
      +'<rect class="hpi-chip-face" x="'+frontX+'" y="'+frontY+'" width="'+frontW+'" height="'+frontH+'" rx="5"/>'
      +'<rect class="hpi-chip-plinth" x="'+(x+3)+'" y="'+d(y+height*.86)+'" width="'+(width-6)+'" height="'+d(height*.12)+'" rx="3"/>'
      // Side-mounted fuel auger is the distinguishing sign of a chip boiler.
      +'<path class="hpi-chip-feed" d="M'+(x-26)+' '+feedY+' L'+(x+15)+' '+d(feedY-7)+' L'+(x+21)+' '+d(feedY+4)+' L'+(x-23)+' '+d(feedY+12)+' Z"/>'
      +'<path class="hpi-chip-screw" d="M'+(x-20)+' '+d(feedY+3)+' l9 -8 l9 7 l9 -8 l8 6"/>'
      +'<circle class="hpi-chip-motor" cx="'+(x-26)+'" cy="'+d(feedY+6)+'" r="6"/>'
      +'<rect class="hpi-chip-screen" x="'+(x+6)+'" y="'+d(y+height*.16)+'" width="'+d(width*.20)+'" height="'+d(height*.19)+'" rx="3"/>'
      +'<path class="hpi-chip-divider" d="M'+frontX+' '+d(y+height*.18)+' v'+d(height*.56)+'"/>'
      +'<text class="hpi-chip-brand" x="'+d(frontX+frontW*.5)+'" y="'+d(y+height*.37)+'" text-anchor="middle">ETA</text>'
      +'<text class="hpi-chip-model'+(primary?' is-compact':'')+'" x="'+d(frontX+frontW*.5)+'" y="'+d(y+height*.62)+'" text-anchor="middle">'+HPC_FREE.esc(model)+'</text>'
      +'<circle class="hpi-chip-light" cx="'+d(x+width*.15)+'" cy="'+d(y+height*.57)+'" r="4"/>'
      +'</g>';
  }

  // One shared, scale-independent drawing for a floor-standing oil boiler.
  // A front-mounted pressure-jet burner is deliberately separate from the
  // boiler casing: no generic flame inside the cabinet or misleading pipework.
  function oilArt(x,y,width,height,on,kind='standard') {
    const sx=Math.round(width/170*10000)/10000;
    const sy=Math.round(height/100*10000)/10000;
    const variant=['standard','low_temp','condensing'].includes(kind)?kind:'standard';
    return '<g class="hpi-oil-art hpi-oil-'+variant+(on?' on':'')+'" aria-hidden="true" transform="translate('+x+' '+y+') scale('+sx+' '+sy+')">'
      // Slight three-quarter view: side and hood make it recognizable as a
      // freestanding boiler, not another flat control box.
      +'<path class="hpi-oil-side" d="M34 14 L49 7 V87 L34 82 Z"/>'
      +'<rect class="hpi-oil-casing" x="48" y="7" width="112" height="82" rx="6"/>'
      +'<path class="hpi-oil-top" d="M34 14 L49 7 H158 L143 14 Z"/>'
      +'<rect class="hpi-oil-plinth" x="43" y="89" width="122" height="7" rx="2"/>'
      // Insulated cleaning door, hinges and a genuine burner flange.
      +'<rect class="hpi-oil-door" x="56" y="34" width="96" height="47" rx="5"/>'
      +'<path class="hpi-oil-seam" d="M62 38 H146 M62 77 H146"/>'
      +'<circle class="hpi-oil-hinge" cx="61" cy="45" r="2.2"/>'
      +'<circle class="hpi-oil-hinge" cx="61" cy="72" r="2.2"/>'
      +'<circle class="hpi-oil-flange" cx="100" cy="63" r="18"/>'
      +'<circle class="hpi-oil-flange-inner" cx="100" cy="63" r="12"/>'
      +'<circle class="hpi-oil-bolt" cx="100" cy="48" r="1.8"/>'
      +'<circle class="hpi-oil-bolt" cx="100" cy="78" r="1.8"/>'
      // Externally mounted oil burner: motor, blower housing, combustion tube
      // and the flexible oil line remain visible, even in the compact view.
      +'<rect class="hpi-oil-burner-neck" x="78" y="57" width="21" height="13" rx="4"/>'
      +'<rect class="hpi-oil-burner" x="17" y="51" width="67" height="28" rx="12"/>'
      +'<rect class="hpi-oil-motor" x="29" y="46" width="38" height="7" rx="3"/>'
      +'<circle class="hpi-oil-fan" cx="32" cy="65" r="13"/>'
      +'<circle class="hpi-oil-fan-hub" cx="32" cy="65" r="3"/>'
      +'<path class="hpi-oil-fan-blades" d="M32 62 C24 50 39 52 35 64 M35 65 C46 59 43 72 33 68 M31 68 C22 77 21 62 31 62"/>'
      +'<path class="hpi-oil-hose" d="M54 79 C53 87 73 88 78 77"/>'
      // Small, practical control strip and oil-drop identifier.
      +'<rect class="hpi-oil-control" x="56" y="14" width="96" height="16" rx="3"/>'
      +'<path class="hpi-oil-mark" d="M68 16 C66 20 63 23 63 25 A5 5 0 0 0 73 25 C73 22 70 19 68 16Z"/>'
      +'<rect class="hpi-oil-display" x="122" y="17" width="24" height="11" rx="2"/>'
      +'<path class="hpi-oil-display-line" d="M126 21 H142 M126 24 H136"/>'
      +'<circle class="hpi-oil-led" cx="113" cy="22" r="3.2"/>'
      +'</g>';
  }

  // The existing heat pump, hot-water and buffer drawings remain in the upstream
  // SVG. These original-style outlines extend its vocabulary for further
  // heating sources instead of displaying a generic flame in an empty box.
  function additionalSourceArt(type, box, on, node) {
    const x=box.x+35, y=box.y+43;
    if(type==='wood_chip_boiler')return chipArt(x,y,170,89,node,on);
    const casing='<rect class="hpi-source-case" x="'+x+'" y="'+y+'" width="170" height="89" rx="12"/>';
    const panel='<rect class="hpi-source-panel" x="'+(x+126)+'" y="'+(y+12)+'" width="33" height="59" rx="5"/>'
      +'<rect class="hpi-source-display" x="'+(x+132)+'" y="'+(y+19)+'" width="21" height="13" rx="3"/>'
      +'<circle class="hpi-source-led'+(on?' on':'')+'" cx="'+(x+142.5)+'" cy="'+(y+49)+'" r="4"/>';
    const flame='<path class="hpi-source-flame'+(on?' on':'')+'" d="M'+(x+76)+' '+(y+69)+' C'+(x+52)+' '+(y+55)+' '+(x+70)+' '+(y+32)+' '+(x+78)+' '+(y+22)+' C'+(x+78)+' '+(y+38)+' '+(x+96)+' '+(y+44)+' '+(x+92)+' '+(y+57)+' Q'+(x+90)+' '+(y+70)+' '+(x+76)+' '+(y+69)+'Z"/>';
    if(type==='wood_gasifier') {
      return casing
        +'<rect class="hpi-source-door" x="'+(x+11)+'" y="'+(y+10)+'" width="101" height="68" rx="6"/>'
        +'<path class="hpi-source-seam" d="M'+(x+13)+' '+(y+54)+' h97 M'+(x+20)+' '+(y+17)+' h82"/>'
        +'<rect class="hpi-source-handle" x="'+(x+20)+'" y="'+(y+29)+'" width="6" height="20" rx="2"/>'
        +flame+panel;
    }
    if(type==='pellet_boiler') {
      return casing
        +'<rect class="hpi-source-door" x="'+(x+7)+'" y="'+(y+12)+'" width="60" height="64" rx="8"/>'
        +'<path class="hpi-source-seam" d="M'+(x+11)+' '+(y+32)+' h52 M'+(x+12)+' '+(y+70)+' h50"/>'
        +'<rect class="hpi-source-hopper" x="'+(x+70)+'" y="'+(y+8)+'" width="48" height="69" rx="7"/>'
        +'<path class="hpi-source-seam" d="M'+(x+72)+' '+(y+37)+' h44 M'+(x+79)+' '+(y+60)+' h30"/>'
        +'<circle class="hpi-source-pellet" cx="'+(x+85)+'" cy="'+(y+19)+'" r="3"/>'
        +'<circle class="hpi-source-pellet" cx="'+(x+96)+'" cy="'+(y+23)+'" r="3"/>'
        +'<circle class="hpi-source-pellet" cx="'+(x+106)+'" cy="'+(y+17)+'" r="3"/>'
        +panel;
    }
    if(type==='gas_boiler') {
      return '<rect class="hpi-source-case" x="'+(x+23)+'" y="'+(y+1)+'" width="123" height="87" rx="13"/>'
        +'<rect class="hpi-source-door" x="'+(x+33)+'" y="'+(y+10)+'" width="103" height="66" rx="8"/>'
        +'<path class="hpi-source-seam" d="M'+(x+36)+' '+(y+62)+' h97"/>'
        +flame
        +'<rect class="hpi-source-display" x="'+(x+108)+'" y="'+(y+16)+'" width="20" height="12" rx="2"/>';
    }
    if(type==='heat_pump') {
      return casing
        +'<rect class="hpi-source-door" x="'+(x+9)+'" y="'+(y+10)+'" width="118" height="68" rx="8"/>'
        +'<circle class="hpi-source-fan-ring" cx="'+(x+67)+'" cy="'+(y+44)+'" r="29"/>'
        +'<circle class="hpi-source-fan-hub" cx="'+(x+67)+'" cy="'+(y+44)+'" r="6"/>'
        +'<path class="hpi-source-blades" d="M'+(x+67)+' '+(y+38)+' C'+(x+42)+' '+(y+12)+' '+(x+86)+' '+(y+12)+' '+(x+73)+' '+(y+40)+' M'+(x+73)+' '+(y+44)+' C'+(x+100)+' '+(y+26)+' '+(x+105)+' '+(y+68)+' '+(x+69)+' '+(y+50)+' M'+(x+65)+' '+(y+50)+' C'+(x+54)+' '+(y+78)+' '+(x+24)+' '+(y+52)+' '+(x+61)+' '+(y+44)+'"/>'
        +panel;
    }
    return '';
  }

  function svg(model,hass) {
    const {plan,anchored,points,extras}=model;
    const all=Object.fromEntries(plan.components.map(c=>[c.id,c]));
    const loc=id=>anchored.get(id)||points.get(id);
    const defs=plan.components.filter(isTank).map(c=>'<linearGradient id="hpi-'+c.id+'" x1="0" y1="0" x2="0" y2="1">'+stops(c,hass)+'</linearGradient>').join('');
    const flowing=flowStates(plan,hass);
    const links=plan.connections.map(edge=>{
      // The core pipe path already connects legacy core units. Only draw extra
      // paths for links crossing into or between added components.
      // Every user-defined link is drawn, even between primary SVG parts.
      const fromShape=loc(edge.from),toShape=loc(edge.to);
      const p=port(all[edge.from],fromShape,edge.from_port);
      const q=port(all[edge.to],toShape,edge.to_port);
      let d;
      const fromSide=portSide(all[edge.from],fromShape,edge.from_port);
      const toSide=portSide(all[edge.to],toShape,edge.to_port);
      if(p.x>q.x+8||fromSide==='L'||toSide==='R'){
        // Always leave and enter a vessel on the physical port side.
        // A heat-exchanger outlet on the LEFT must not traverse the tank.
        const farX=p.x+(fromSide==='L'?-36:38);
        const entryX=q.x+(toSide==='R'?36:-36);
        const laneY=p.y<q.y-120
          ?Math.max(fromShape.y+fromShape.h+32,toShape.y-32)
          :p.y>q.y+120
          ?Math.min(fromShape.y-32,toShape.y+toShape.h+32)
          :Math.max(fromShape.y+fromShape.h,toShape.y+toShape.h)+38;
        d='M'+p.x+' '+p.y+' H'+farX+' V'+laneY+' H'+entryX+' V'+q.y+' H'+q.x;
      }else{
        const mid=(p.x+q.x)/2;
        d='M'+p.x+' '+p.y+' H'+mid+' V'+q.y+' H'+q.x;
      }
      const inferred=(()=>{
        const node=all[edge.from],field=edge.from_port;
        if(field==="flow")return node.sensors.flow;
        if(field==="top_out")return node.sensors.top;
        if(field==="mid_out")return node.sensors.middle;
        if(field==="bottom_out")return node.sensors.bottom;
        return "";
      })();
      const s=HPC_FREE.state(hass,edge.temperature_entity||inferred);
      const color=s?HPC_FREE.color(s):null;
      const on=flowing.has(edge.id);
      return '<g class="hpi-link" data-hpi-edge="'+HPC_FREE.esc(edge.id)+'"><title>'+HPC_FREE.esc(all[edge.from].name+' → '+all[edge.to].name)+'</title>'
        +'<path class="pipe'+(on?' on':'')+'" d="'+d+'"'+(color?' style="--pc:'+color+'"':'')+'/>'
        +'<path class="flow'+(on?' on':'')+'" d="'+d+'"/></g>';
    }).join('');
    const nodes=extras.map(node=>{
      const b=points.get(node.id);if(!b)return '';
      const s=HPC_FREE.state(hass,node.sensors.state||node.sensors.pump);
      const on=HPC_FREE.active(s);
      const title=HPC_FREE.esc(node.name);
      const isStore=isTank(node);
      if(isStore){
        const allPoints=tankPoints(node,hass);
        const row=allPoints.slice(0,5).map((p,index)=> {
          const temp=HPC_FREE.format(HPC_FREE.state(hass,p.entity));
          return '<text class="'+(index?'tank-sub':'tank-temp')+'" x="'+(b.x+b.w/2)+'" y="'+(b.y+45+index*23)+'" text-anchor="middle">'+HPC_FREE.esc(temp)+'</text>';
        }).join('');
        return '<g class="tap hpi-component" data-hpi-node="'+node.id+'" data-entity="'+HPC_FREE.esc(node.sensors.top||'')+'">'
          +'<text class="tank-title" x="'+(b.x+b.w/2)+'" y="'+(b.y-12)+'" text-anchor="middle">'+title+'</text>'
          +'<rect class="tank" x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'" rx="25" fill="url(#hpi-'+node.id+')"/>'
          +row+'</g>';
      }
      const cx=b.x+b.w/2,cy=b.y+b.h*.53;
      const type=node.type;
      if(type==='oil_boiler'){
        const burner=HPC_FREE.state(hass,node.sensors.state);
        const running=!!burner&&HPC_FREE.active(burner);
        const de=String(hass?.locale?.language||'de').startsWith('de');
        const label=(german,english)=>de?german:english;
        const kind=node.options?.boiler_kind||'standard';
        const variant=kind==='condensing'?label('Brennwert','Condensing')
          :kind==='low_temp'?label('Niedertemperatur','Low temperature')
          :label('Standardkessel','Standard boiler');
        const reading=(key,short)=>node.sensors[key]
          ?short+' '+HPC_FREE.esc(HPC_FREE.format(HPC_FREE.state(hass,node.sensors[key])))
          :'';
        const flow=reading('flow',label('VL','Flow'));
        const ret=reading('return',label('RL','Return'));
        const temps=[flow,ret].filter(Boolean).join(' · ');
        const status=burner?(running?label('Brenner läuft','Burner running')
          :label('Brenner aus','Burner off')):'';
        return '<g class="tap hpi-component hpi-oil'+(running?' on':'')+'" data-hpi-node="'+node.id+'" data-entity="'+HPC_FREE.esc(node.sensors.state||node.sensors.flow||'')+'">'
          +'<title>'+title+'</title>'
          +'<rect class="unit'+(running?' on':'')+'" x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'" rx="20"/>'
          +'<text class="unit-title" x="'+cx+'" y="'+(b.y+23)+'" text-anchor="middle">'+title+'</text>'
          +'<text class="hpi-oil-kind" x="'+cx+'" y="'+(b.y+39)+'" text-anchor="middle">'+HPC_FREE.esc(variant)+'</text>'
          +oilArt(b.x+35,b.y+44,170,96,running,kind)
          +(status?'<text class="unit-status hpi-oil-status" x="'+cx+'" y="'+(b.y+176)+'" text-anchor="middle">'+HPC_FREE.esc(status)+'</text>':'')
          +(temps?'<text class="unit-val hpi-oil-reading" x="'+cx+'" y="'+(b.y+205)+'" text-anchor="middle">'+temps+'</text>':'')
          +'</g>';
      }
      const icon=isSource(node)?additionalSourceArt(type,b,on,node):
        type==='pump'?'<circle class="pump" cx="'+cx+'" cy="'+cy+'" r="23"/><path class="imp" d="M'+(cx-7)+' '+(cy-12)+' L'+(cx+12)+' '+cy+' L'+(cx-7)+' '+(cy+12)+'Z"/>':
        type==='mixer'||type==='diverter'?'<circle class="valve" cx="'+cx+'" cy="'+cy+'" r="21"/><path class="valve-arrow" d="M'+(cx-13)+' '+(cy-9)+' L'+cx+' '+(cy+7)+' L'+(cx+13)+' '+(cy-9)+'"/>':
        type==='electric_heater'?'<path class="heater" d="M'+(cx-26)+' '+cy+' h12 l10 -15 l11 30 l10 -15 h12"/>':
        type==='heating_circuit'?'<path class="rib" d="M'+(cx-30)+' '+(cy-18)+' v36 M'+(cx-17)+' '+(cy-18)+' v36 M'+(cx-4)+' '+(cy-18)+' v36 M'+(cx+9)+' '+(cy-18)+' v36 M'+(cx+22)+' '+(cy-18)+' v36"/>':
        '<path class="boiler-flame" d="M'+cx+' '+(cy+17)+' C'+(cx-23)+' '+(cy-2)+' '+(cx-9)+' '+(cy-17)+' '+(cx-2)+' '+(cy-28)+' C'+(cx-3)+' '+(cy-11)+' '+(cx+23)+' '+(cy-13)+' '+(cx+13)+' '+(cy+10)+' Z"/>';
      const sensorEntries=Object.entries(node.sensors||{}).filter(([k,v])=>v && k!=='state').slice(0,2);
      const labels=sensorEntries.map(([key,id],i)=>'<text class="unit-val hpi-source-value" text-anchor="middle" x="'+cx+'" y="'+(b.y+202+i*19)+'">'+
        HPC_FREE.esc(HPC_FREE.fieldLabel(key))+' '+HPC_FREE.esc(HPC_FREE.format(HPC_FREE.state(hass,id)))+'</text>').join('');
      const sourceState=isSource(node)&&node.sensors.state?HPC_FREE.state(hass,node.sensors.state):null;
      const stateLabel=sourceState?(HPC_FREE.active(sourceState)
        ?(String(hass?.locale?.language||'de').startsWith('de')?'In Betrieb':'Running')
        :(String(hass?.locale?.language||'de').startsWith('de')?'Aus':'Off')):'';
      return '<g class="tap hpi-component" data-hpi-node="'+node.id+'" data-entity="'+HPC_FREE.esc(node.sensors.state||node.sensors.flow||'')+'">'
        +'<rect class="unit'+(on?' on':'')+'" x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'" rx="20"/>'
        +'<text class="unit-title" x="'+cx+'" y="'+(b.y+27)+'" text-anchor="middle">'+title+'</text>'
        +icon+(stateLabel?'<text class="unit-status hpi-source-status" x="'+cx+'" y="'+(b.y+176)+'" text-anchor="middle">'+HPC_FREE.esc(stateLabel)+'</text>':'')+labels+'</g>';
    }).join('');
    const lift=plan.components.filter(node=>node.type==='wood_gasifier'&&node.options?.return_lift)
      .map(node=>{
        const b=loc(node.id);
        if(!b)return '';
        const isCore=anchored.has(node.id);
        const outletX=b.x+b.w;
        const supplyY=isCore?250:b.y+57;
        const returnY=isCore?380:b.y+b.h-34;
        const valveX=outletX+42;
        const fromX=outletX;
        // Attached RLA loop: two real attachment points at the boiler flow
        // and return; the visual branch must not end in mid-air.
        const returnX=isCore?outletX:b.x;
        const bypass=isCore
          ?'M'+fromX+' '+supplyY+' H'+valveX+' V'+returnY+' H'+returnX
          :'M'+fromX+' '+supplyY+' H'+valveX+' V'+returnY+
            ' V'+(b.y+b.h+22)+' H'+(b.x-22)+' V'+returnY+' H'+returnX;
        const state=HPC_FREE.state(hass,node.sensors.pump);
        const flowing=state!==null&&HPC_FREE.active(state);
        const position=HPC_FREE.state(hass,node.sensors.mixer);
        const percentage=position?.number!==null&&Number.isFinite(position?.number)
          ?' '+Math.round(position.number)+' %':'';
        const label=String(hass?.locale?.language||'de').startsWith('de')?'RLA':'RLT';
        return '<g class="hpi-rla" data-hpi-rla="'+HPC_FREE.esc(node.id)+'">'
          +'<title>'+HPC_FREE.esc('Rücklaufanhebung / Return-temperature lift – '+node.name)+'</title>'
          +'<path class="hpi-rla-bypass" d="'+bypass+'"/>'
          +(flowing?'<path class="hpi-rla-flow" d="'+bypass+'"/>':'')
          +'<circle class="hpi-rla-valve" cx="'+valveX+'" cy="'+returnY+'" r="14"/>'
          +'<path class="hpi-rla-symbol" d="M'+(valveX-8)+' '+(returnY-7)+' L'+valveX+' '+returnY+' L'+(valveX+8)+' '+(returnY-7)+' M'+valveX+' '+returnY+' v10"/>'
          +'<text class="hpi-rla-label" x="'+(valveX+20)+'" y="'+(returnY-10)+'">'+HPC_FREE.esc(label+percentage)+'</text>'
          +'</g>';
      }).join('');
    const firstSource=plan.components.find(isSource);
    const sourceStatus=firstSource&&HPC_FREE.state(hass,firstSource.sensors.state);
    const primaryChip=firstSource?.type==='wood_chip_boiler'
      ?'<g class="tap hpi-chip-primary" data-hpi-node="'+HPC_FREE.esc(firstSource.id)+'" data-entity="'+HPC_FREE.esc(firstSource.sensors.state||firstSource.sensors.flow||'')+'">'
        +chipArt(92,238,156,102,firstSource,HPC_FREE.active(sourceStatus))+'</g>'
      :'';
    // Keep the upstream source labels, sensor drawer and hydraulic ports,
    // but replace its schematic artwork with the same oil-boiler illustration
    // used for every additional oil boiler.
    const primaryOil=firstSource?.type==='oil_boiler'
      ?'<g class="tap hpi-oil-primary" data-hpi-node="'+HPC_FREE.esc(firstSource.id)+'" data-entity="'+HPC_FREE.esc(firstSource.sensors.state||firstSource.sensors.flow||'')+'">'
        +oilArt(92,238,156,102,!!sourceStatus&&HPC_FREE.active(sourceStatus),firstSource.options?.boiler_kind)+'</g>'
      :'';
    const primaryGas=firstSource?.type==='gas_boiler'
      ?'<g class="tap hpi-gas-primary" data-hpi-node="'+HPC_FREE.esc(firstSource.id)+'" data-entity="'+HPC_FREE.esc(firstSource.sensors.state||firstSource.sensors.flow||'')+'">'
        +additionalSourceArt('gas_boiler',{x:50,y:195},!!sourceStatus&&HPC_FREE.active(sourceStatus),firstSource)+'</g>'
      :'';
    const firstBuffer=plan.components.find(c=>c.type==='buffer');
    const firstDhw=plan.components.find(c=>c.type==='dhw_tank');
    return {defs,body:'<g id="hpc-integrated">'+links+nodes+lift+primaryChip+primaryOil+primaryGas+'</g>',
      firstBuffer:firstBuffer?.id,firstDhw:firstDhw?.id};
  }
  return {layout,coreConfig,svg,tankPoints,flowStates,isSource};
})();
