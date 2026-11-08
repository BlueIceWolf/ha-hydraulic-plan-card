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
    // WW charging devices sit next to their coil, not in a disconnected
    // column at the other end of the schematic. They are still real
    // components and keep their own pump/valve entity.
    const chargeControls=byGroup.control.filter(n=>
      p.connections.some(e=>e.from===n.id&&
        p.components.some(t=>t.id===e.to&&t.type==='dhw_tank'&&e.to_port==='coil_in')));
    chargeControls.forEach((node,index)=>{
      if(node.type==='pump'){
        // A DHW charging pump belongs ON the coil supply pipe. Place its
        // 40px-wide symbol immediately before the coil inlet, not in a
        // separate 157×96px control tile overlapping the hot-water tank.
        const edge=p.connections.find(e=>e.from===node.id&&e.to_port==='coil_in');
        const tank=edge&&p.components.find(c=>c.id===edge.to&&c.type==='dhw_tank');
        const tankBox=tank&&(anchored.get(tank.id)||points.get(tank.id));
        if(tankBox){
          const inletY=tankBox.y+40;
          points.set(node.id,{x:tankBox.x-90,y:inletY-20,w:40,h:40,type:'pump',inline:true});
          return;
        }
      }
      const [w,h]=HPC_FREE.dimension(node.type);
      points.set(node.id,{x:320,y:72+index*242,w,h,type:node.type});
    });
    const controlStart=Math.max(1190,storageStart+530);
    const controlEnd=placeColumn(
      byGroup.control.filter(n=>!chargeControls.includes(n)),
      controlStart,90,265,260);
    // Tall standalone separator uses the same native-sized container as the
    // other pieces of equipment without colliding with a following control.
    for(const node of byGroup.control.filter(c=>c.type==='particle_separator')){
      const box=points.get(node.id);
      if(box){box.w=240;box.h=235;}
    }
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
      for(const key of ['flow','return','target','pump','mixer','mixer_opening','mixer_closing']){
        if(key.startsWith('mixer')&&node.options?.mixed===false)continue;
        set(prefix+(key==='target'?'setpoint':key),node,key);
      }
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
      circuits.forEach((c,index)=>{
        const key=index?'hc'+(index+1)+'_type':'hc_type';
        // Use the original Heat Pump Hydraulic Card emitter artwork.
        // Each heating circuit can independently display floor, panel or
        // column radiators; existing choices remain unchanged if not set.
        derived[key]=c.options?.emitter||config[key]||'radiator';
      });
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
      // The boiler/storage charge enters from the LEFT; all heating loads
      // take their flow and return from the RIGHT of the buffer tank.
      const y=shape.y+shape.h*(key.includes('bottom')||key==='return_in'?.875:
        key.includes('mid')?.54:.20);
      const right=key.includes('out')||key==='return_in';
      return{x:shape.x+(right?shape.w:0),y};
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
    if(shape.type==='buffer')return key.endsWith('_out')||key==='return_in'?'R':'L';
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
    // Original SVG artwork inspired by the supplied ETA reference: a silver
    // left service body, yellow door with recessed dark viewing chamber and
    // an angled auger/feed assembly at lower left. No bitmap or remote asset.
    const model={ehack:'eHACK',hack:'HACK',hack_vr:'HACK VR'}[node.options?.eta_model]||'eHACK';
    const sx=(width/180).toFixed(5),sy=(height/110).toFixed(5);
    return '<g class="hpi-chip-art'+(on?' on':'')+'" transform="translate('+x+' '+y+') scale('+sx+' '+sy+')">'
      +'<path class="hpi-chip-side" d="M43 14 L68 6 L68 91 L43 81Z"/>'
      +'<rect class="hpi-chip-body" x="55" y="8" width="117" height="87" rx="3"/>'
      +'<path class="hpi-chip-plinth" d="M55 90 H175 V106 H68 L55 96Z"/>'
      +'<rect class="hpi-chip-face" x="77" y="10" width="92" height="80" rx="2"/>'
      +'<path class="hpi-chip-window" d="M87 81 V49 Q88 27 113 24 H159 V78 Q145 77 132 80 Z"/>'
      +'<path class="hpi-chip-window-rim" d="M94 75 V49 Q98 34 116 33 H151 V70 Q134 69 123 75Z"/>'
      +'<path class="hpi-chip-divider" d="M114 33 V72 M130 33 V71 M151 33 V71"/>'
      +'<path class="hpi-chip-feed" d="M56 65 L31 49 L17 62 L44 87Z"/>'
      +'<path class="hpi-chip-screw" d="M22 64 l7 -7 l8 10 l7 -3 l7 10"/>'
      +'<circle class="hpi-chip-motor" cx="26" cy="58" r="14"/>'
      +'<circle class="hpi-chip-motor-ring" cx="26" cy="58" r="8"/>'
      +'<path class="hpi-chip-motor-grille" d="M19 53l13 10M18 59h16M23 49l6 18"/>'
      +'<path class="hpi-chip-auger" d="M34 47 L58 60 L62 72 L43 67 Z"/>'
      +'<rect class="hpi-chip-screen" x="62" y="17" width="10" height="12" rx="2"/>'
      +'<text class="hpi-chip-brand" x="146" y="22" text-anchor="middle">ETA</text>'
      +'<text class="hpi-chip-model" x="126" y="94" text-anchor="middle">'+HPC_FREE.esc(model)+'</text>'
      +'<circle class="hpi-chip-light" cx="67" cy="44" r="3"/>'
      +(node.options?.particle_separator?
        '<path class="hpi-particle-duct" d="M161 36H173V28"/>'
        +particleArt(151,0,29,39,false):'')
      +'</g>';
  }

  function particleArt(x,y,width,height,on) {
    // Dry electrostatic flue-gas separator: horizontal exhaust direction,
    // collector chamber and electrodes, bottom ash, top HV symbol.
    // It must never be mistaken for a hydronic circulation component.
    const sx=(width/170).toFixed(5),sy=(height/115).toFixed(5);
    return '<g class="hpi-particle-art'+(on?' on':'')+'" transform="translate('+x+' '+y+') scale('+sx+' '+sy+')">'
      +'<path class="hpi-particle-duct" d="M2 48H25V38H145V48H168V66H145V90H25V66H2Z"/>'
      +'<rect class="hpi-particle-chamber" x="27" y="35" width="116" height="62" rx="2"/>'
      +'<path class="hpi-particle-inner" d="M35 39V88H135V39"/>'
      +'<path class="hpi-particle-electrodes" d="M43 39V77M60 39V77M77 39V77M94 39V77M111 39V77M128 39V77"/>'
      +'<path class="hpi-particle-ash" d="M40 90 Q48 79 56 89 Q68 79 77 90 Q88 80 97 89 Q113 80 129 90Z"/>'
      +'<path class="hpi-particle-arrow" d="M5 51H20M13 44L20 51L13 58 M149 51H165M158 44L165 51L158 58"/>'
      +'<circle class="hpi-particle-badge" cx="85" cy="28" r="24"/>'
      +'<path class="hpi-particle-bolt" d="M90 6L75 30H86L81 48L101 22H89Z"/>'
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
    // The WW coil is a selectable consumer of the shared heating supply
    // and return. Mark branch junctions without creating fake components.
    const branchTankIds=new Set(plan.components.filter(n=>
      n.type==='dhw_tank'&&n.options?.connection_style==='branch').map(n=>n.id));
    const branchFeedEdges=new Set(plan.connections.filter(e=>
      e.to_port==='coil_in'&&branchTankIds.has(e.to)).map(e=>e.id));
    const branchReturnEdges=new Set(plan.connections.filter(e=>
      e.from_port==='coil_out'&&branchTankIds.has(e.from)).map(e=>e.id));
    // For each coil, reuse the EXISTING heating-circuit supply/return
    // headers if the same storage/source already feeds a heating circuit.
    // Do not manufacture a shared header when no heating circuit is wired.
    const supplyTees=new Map(),returnTees=new Map();
    for(const tankId of branchTankIds){
      const coilFeed=plan.connections.find(e=>e.to===tankId&&e.to_port==='coil_in');
      const coilReturn=plan.connections.find(e=>e.from===tankId&&e.from_port==='coil_out');
      if(!coilFeed||!coilReturn)continue;
      const prior=plan.connections.find(e=>e.to===coilFeed.from&&e.to_port==='in')||
        plan.connections.find(e=>e.to===coilFeed.from&&e.to_port==='ab');
      const supply=prior||coilFeed;
      const sourceId=supply.from;
      if(coilReturn.to!==sourceId)continue;
      const heatFeed=plan.connections.find(e=>e.from===sourceId&&
        all[e.to]?.type==='heating_circuit'&&e.to_port==='flow_in');
      const heatReturn=plan.connections.find(e=>e.to===sourceId&&
        all[e.from]?.type==='heating_circuit'&&e.from_port==='return_out');
      if(!heatFeed||!heatReturn)continue;
      const sourceShape=loc(sourceId);
      const source=all[sourceId];
      if(!sourceShape||!source)continue;
      const hot=port(source,sourceShape,supply.from_port);
      const cold=port(source,sourceShape,coilReturn.to_port);
      const hx=loc(heatFeed.to);
      if(!hx)continue;
      const teeX=Math.min(hx.x-55,Math.max(sourceShape.x+sourceShape.w+55,735));
      supplyTees.set(supply.id,{x:teeX,y:hot.y});
      returnTees.set(coilReturn.id,{x:teeX,y:cold.y});
    }
    const links=plan.connections.map(edge=>{
      // Original heating circuits own their valve, emitter and shared risers.
      // Do not draw duplicate pipes over those native routes. Connections to
      // additional (non-native) components still have to be drawn normally.
      if((all[edge.from]?.type==='heating_circuit'||
          all[edge.to]?.type==='heating_circuit')&&
          anchored.has(edge.from)&&anchored.has(edge.to))return '';
      // Draw only routes not already owned by the original heating circuits.
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
      // Take the WW branch off the common header at a T fitting, just
      // like another heating circuit. The coil inlet/outlet remain on the
      // left; no pipe may cross the tank or create a second parallel header.
      const supplyTee=supplyTees.get(edge.id);
      const returnTee=returnTees.get(edge.id);
      if(supplyTee){
        const entryX=q.x-34;
        const above=Math.min(20,q.y-42);
        d='M'+supplyTee.x+' '+supplyTee.y+' V'+above+
          ' H'+entryX+' V'+q.y+' H'+q.x;
      }else if(returnTee){
        // From the LEFT side of the coil, travel around the storage bank
        // before joining the heating return header, never through the tank.
        const exitX=p.x-70,below=Math.max(555,fromShape.y+fromShape.h+35);
        d='M'+p.x+' '+p.y+' H'+exitX+' V'+below+
          ' H'+returnTee.x+' V'+returnTee.y;
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
      // A visible T junction at both coil legs identifies this as a branch
      // of the heating distribution. Do not animate it independently:
      // the edge flow state still controls both legs.
      const branch=branchFeedEdges.has(edge.id)||branchReturnEdges.has(edge.id);
      const junction=supplyTee||returnTee;
      const tee=junction?'<circle class="hpi-coil-branch" cx="'+junction.x+'" cy="'+junction.y+'" r="5" fill="var(--card-background-color,#fff)" stroke="'+(on?'var(--hfc-hot,#ff7043)':'var(--divider-color,#7e8790)')+'" stroke-width="2"/>':'';
      return '<g class="hpi-link" data-hpi-edge="'+HPC_FREE.esc(edge.id)+'"><title>'+HPC_FREE.esc(all[edge.from].name+' → '+all[edge.to].name)+'</title>'
        +'<path class="pipe'+(on?' on':'')+'" d="'+d+'"'+(color?' style="--pc:'+color+'"':'')+'/>'
        +'<path class="flow'+(on?' on':'')+'" d="'+d+'"/>'+tee+'</g>';
    }).join('');
    const nodes=extras.map(node=>{
      const b=points.get(node.id);if(!b)return '';
      const s=HPC_FREE.state(hass,node.sensors.state||node.sensors.pump);
      const on=HPC_FREE.active(s);
      const title=HPC_FREE.esc(node.name);
      if(node.type==='pump'&&b.inline){
        const cx=b.x+b.w/2,cy=b.y+b.h/2;
        // Keep the device interactive, including entity details, but do not
        // draw a unit rectangle, giant heading or oversized generic icon.
        // The pump has the same centreline as the pipe's in/out ports.
        return '<g class="tap hpi-inline-pump" data-hpi-node="'+HPC_FREE.esc(node.id)+'" data-entity="'+HPC_FREE.esc(node.sensors.state||'')+'">'
          +'<title>'+title+'</title>'
          +'<circle class="pump" cx="'+cx+'" cy="'+cy+'" r="20"/>'
          +'<path class="imp" d="M'+(cx-7)+' '+(cy-11)+' L'+(cx+11)+' '+cy+' L'+(cx-7)+' '+(cy+11)+'Z"/>'
          +'</g>';
      }
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
      if(node.type==='particle_separator'){
        const status=node.sensors.state?HPC_FREE.state(hass,node.sensors.state):null;
        const running=status?HPC_FREE.active(status):false;
        const cx=b.x+b.w/2;
        const unit=(key,u)=>{
          const val=HPC_FREE.state(hass,node.sensors[key]);
          if(!val)return '';
          const formatted=HPC_FREE.format(val);
          return HPC_FREE.esc(formatted+(val.unit?'':' '+u));
        };
        const voltage=unit('voltage','kV');
        const current=unit('current','mA');
        return '<g class="tap hpi-component hpi-particle-separator" data-hpi-node="'+HPC_FREE.esc(node.id)+'">'
          +'<rect class="unit" x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'" rx="20"/>'
          +'<text class="unit-title" x="'+cx+'" y="'+(b.y+25)+'" text-anchor="middle">'+title+'</text>'
          +particleArt(b.x+36,b.y+39,b.w-72,125,running)
          +(voltage?'<text class="unit-val hpi-particle-reading" x="'+(b.x+65)+'" y="'+(b.y+189)+'" text-anchor="middle">'+voltage+'</text>':'')
          +(current?'<text class="unit-val hpi-particle-reading" x="'+(b.x+b.w-60)+'" y="'+(b.y+189)+'" text-anchor="middle">'+current+'</text>':'')
          +(status?'<text class="unit-status" x="'+cx+'" y="'+(b.y+215)+'" text-anchor="middle">'
            +(running?'Aktiv':'Aus')+'</text>':'')
          +'</g>';
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
