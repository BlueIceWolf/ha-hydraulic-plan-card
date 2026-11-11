// Additional heating components share the original Heat Pump Hydraulic Card SVG.
// The first heat source, first buffer, first DHW tank and up to six heating circuits
// reuse their original renderer. All other components are ADDED to that same SVG.
const HPC_INTEGRATED = (() => {
  const sources = new Set(['wood_gasifier','oil_boiler','pellet_boiler','wood_chip_boiler','gas_boiler','heat_pump']);
  const isSource = (node) => sources.has(node.type);
  const isTank = node => node.type==='buffer'||node.type==='dhw_tank';
  // Keep the user's complete name in the plan. The original 240px boiler
  // and 155px radiator drawings only have room for a short display caption.
  const caption = (name,max=25) => {
    const value=String(name||'').trim();
    return value.length>max?value.slice(0,max-1).trimEnd()+'…':value;
  };
  function layout(plan, hcCount=1, primaryPump=false) {
    const p=HPC_FREE.normalize(plan), anchored=new Map();
    const firstSource=p.components.find(isSource);
    const firstBuffer=HPC_NETWORK.orderedBuffers(p)[0];
    const firstDhw=p.components.find(c=>c.type==='dhw_tank');
    const dhwTanks=p.components.filter(c=>c.type==='dhw_tank');
    // Keep the first directly charged tank on the original SVG anchor.
    // Buffer-fed and additional tanks use the same artwork in the storage row.
    const bufferFedTanks=new Set();
    for(const tank of p.components.filter(n=>n.type==='dhw_tank')){
      const feed=p.connections.find(e=>e.to===tank.id&&e.to_port==='coil_in');
      const feeder=feed&&p.components.find(n=>n.id===feed.from);
      const source=feeder&&['pump','diverter'].includes(feeder.type)
        ?p.connections.find(e=>e.to===feeder.id)
        :feed;
      if(source&&p.components.some(n=>n.id===source.from&&n.type==='buffer'))
        bufferFedTanks.add(tank.id);
    }
    if(firstSource)anchored.set(firstSource.id,{x:50,y:190,w:240,h:235,type:'source'});
    if(firstBuffer)anchored.set(firstBuffer.id,{x:520,y:320,w:120,h:200,type:'buffer'});
    if(firstDhw&&!bufferFedTanks.has(firstDhw.id))anchored.set(firstDhw.id,{x:520,y:40,w:120,h:200,type:'dhw_tank'});
    const circuitCount=Math.min(6,p.components.filter(c=>
      c.type==='heating_circuit').length);
    p.components.filter(c=>c.type==='heating_circuit').slice(0,circuitCount)
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
      // All additional heat sources remain left of the buffer. A new
      // column after source #5 would overlap the first native tank.
      points.set(node.id,{x:50,y:475+index*260,w:240,h:235,type:node.type});
    }
    // Discover the buffer sequence from the user's directed pipe connections.
    // This works regardless of the order in which buffers were added.
    const orderedBuffers=HPC_NETWORK.orderedBuffers(p).filter(n=>!anchored.has(n.id));
    const extraDhw=byGroup.storage.filter(c=>c.type==='dhw_tank');
    const storageStart=520;
    // Keep a true left-to-right tank sequence: the hot outlet of a previous
    // buffer must face the next tank's left inlet. Position this extension
    // below original heating circuits, otherwise the third tank could
    // overlap an original radiator or its mixer.
    const bottomHeating=330+(Math.max(1,circuitCount)-1)*250+140;
    const bufferMode=HPC_NETWORK.bufferTopology(p).mode;
    const bufferStartY=bufferMode==='parallel'?555:
      Math.max(555,bottomHeating+65);
    orderedBuffers.forEach((node,index)=>{
      // True parallel tanks are in one vertical bank; directed serial
      // connections are laid left-to-right with facing hot-water ports.
      points.set(node.id,bufferMode==='parallel'
        ?{x:520,y:bufferStartY+index*225,w:120,h:200,type:node.type}
        :{x:680+index*160,y:bufferStartY,w:120,h:200,type:node.type});
    });
    // Keep every DHW tank in the storage zone above the first buffer. The
    // native tank remains in use for the first directly charged tank.
    const lastBufferRight=orderedBuffers.length
      ?Math.max(...orderedBuffers.map(n=>points.get(n.id).x+120))
      :firstBuffer?640:0;
    extraDhw.forEach(node=>{
      const index=dhwTanks.findIndex(tank=>tank.id===node.id);
      points.set(node.id,{x:storageStart+index*160,y:40,w:120,h:200,type:node.type});
    });
    // WW charging devices sit next to their coil, not in a disconnected
    // column at the other end of the schematic. They are still real
    // components and keep their own pump/valve entity.
    const chargeControls=byGroup.control.filter(n=>
      p.connections.some(e=>e.from===n.id&&
        p.components.some(t=>t.id===e.to&&t.type==='dhw_tank'&&e.to_port==='coil_in')));
    chargeControls.forEach((node,index)=>{
      if(['pump','diverter'].includes(node.type)){
        // A DHW loading device belongs ON the coil supply pipe. Place its
        // 40px-wide symbol immediately before the coil inlet, not in a
        // separate 157×96px control tile overlapping the hot-water tank.
        const edge=p.connections.find(e=>e.from===node.id&&e.to_port==='coil_in');
        const tank=edge&&p.components.find(c=>c.id===edge.to&&c.type==='dhw_tank');
        const tankBox=tank&&(anchored.get(tank.id)||points.get(tank.id));
        if(tankBox){
          // Place the configured charging device immediately before the
          // coil inlet, inside the storage zone rather than beyond consumers.
          const laneX=tankBox.x-60;
          const preferredLaneY=tankBox.y+20;
          const occupied=[...anchored,...points];
          const laneIsClear=laneY=>{
            const pump={x:laneX,y:laneY,w:40,h:40};
            const supplyY=laneY+20;
            const input={x:laneX,y:supplyY};
            return occupied.every(([,box])=>{
              const overlaps=pump.x<box.x+box.w&&pump.x+pump.w>box.x&&
                pump.y<box.y+box.h&&pump.y+pump.h>box.y;
              const inputBlocked=input.x>box.x-9&&input.x<box.x+box.w+9&&
                input.y>box.y-9&&input.y<box.y+box.h+9;
              return !overlaps&&!inputBlocked;
            });
          };
          const maxOffset=Math.max(1000,...occupied.map(([,box])=>box.y+box.h));
          let laneY=laneIsClear(preferredLaneY)?preferredLaneY:undefined;
          for(let offset=20;laneY===undefined&&offset<=maxOffset;offset+=20){
            const lower=preferredLaneY+offset;
            const upper=preferredLaneY-offset;
            if(laneIsClear(lower))laneY=lower;
            else if(upper>=0&&laneIsClear(upper))laneY=upper;
          }
          if(laneY===undefined)
            throw new Error('No collision-free loading-pump position for '+node.id);
          points.set(node.id,{x:laneX,y:laneY,w:40,h:40,type:node.type,inline:true});
          return;
        }
      }
      const [w,h]=HPC_FREE.dimension(node.type);
      points.set(node.id,{x:320,y:72+index*242,w,h,type:node.type});
    });
    const extraTankEnd=Math.max(0,...extraDhw.map(n=>
      points.get(n.id).x+points.get(n.id).w));
    const controlStart=Math.max(1190,storageStart+530,
      lastBufferRight+70,extraTankEnd+60);
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
    const maxY=Math.max(560+(Math.max(1,circuitCount)-1)*250,
      ...[...points.values()].map(n=>n.y+n.h+70));
    return {plan:p,anchored,points,extras,width:maxX,height:maxY,primaryPump};
  }
  function coreConfig(config) {
    const p=HPC_FREE.normalize(config.plan),src=p.components.find(isSource);
    const buffer=HPC_NETWORK.orderedBuffers(p)[0];
    const dhw=p.components.find(c=>c.type==='dhw_tank');
    const circuits=p.components.filter(c=>c.type==='heating_circuit').slice(0,6);
    const types={wood_gasifier:'wood_gasifier',oil_boiler:'oil',pellet_boiler:'pellet',wood_chip_boiler:'pellet',
      gas_boiler:'gas',heat_pump:'heat_pump'};
    const entities={};
    const set=(target,source,key)=>{if(source?.sensors?.[key])entities[target]=source.sensors[key];};
    if(src){
      if(src.type==='heat_pump'){
        [['flow','flow'],['return','return'],['power','power'],['state','mode'],
         ['compressor','compressor'],['compressor_speed','compressor_speed'],
         ['fan_speed','fan_speed'],['defrost','defrost'],['fault','error']].forEach(([from,to])=>set(to,src,from));
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
    if(src&&src.type!=='heat_pump')derived.boiler_name=caption(src.name,25);
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
        // The original circuit SVG reads hc_name, hc2_name, ... directly.
        // Always use the names from the component editor, not a stock
        // "Heizkreis 1" label left over from the legacy configuration.
        const nameKey=index?'hc'+(index+1)+'_name':'hc_name';
        if(c.name)derived[nameKey]=caption(c.name,22);
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
  function port(node,shape,key,circuitPump=true) {
    if(shape.type==='source') {
      // Primary and additional heat sources share the original 240x235
      // pictogram, but never the same absolute pipe ports. Otherwise all
      // supplemental boilers accidentally connect at the first boiler.
      const x=shape.x+shape.w;
      if(key==='return')return{x,y:shape.y+190};
      if(key==='dhw')return{x,y:shape.y+120};
      return{x,y:shape.y+60};
    }
    if(shape.type==='buffer'){
      // The port definitions encode the physical side; consumer bottom_in
      // stays on the right regardless of the return's flow direction.
      const def=HPC_FREE.ports(node.type).find(p=>p.id===key);
      const y=shape.y+shape.h*(key.includes('bottom')||key==='return_in'?.875:
        key.includes('mid')?.54:.20);
      const right=def?.side==='R';
      return{x:shape.x+(right?shape.w:0),y};
    }
    if(shape.type==='dhw_tank'){
      // The heat-exchanger circuit is on the LEFT. Domestic hot and cold
      // outlets belong on the RIGHT; never intersect the vessel internally.
      const positions={
        coil_in:{x:shape.x,y:shape.y+40},coil_out:{x:shape.x,y:shape.y+175},
        hot_out:{x:shape.x+shape.w,y:shape.y+40},cold_in:{x:shape.x+shape.w,y:shape.y+175}
      };
      return positions[key]||{x:shape.x,y:shape.y+40};
    }
    // The saved supply edge enters before the native pump when that pump is
    // present; otherwise the unpumped circuit joins at the same coordinate.
    if(shape.type==='heating_circuit'){
      const y=shape.y+30;
      if(key==='flow_in')return{x:shape.x-(circuitPump?111:79),y};
      if(key==='pump_out')return{x:shape.x-79,y};
      if(key==='emitter_in')return{x:shape.x+11,y};
      if(key==='mixer_hot'||key==='mixer_out')return{x:760,y};
      if(key==='mixer_bypass_in')return{x:760,y:shape.y+165};
      if(key==='mixer_return')return{x:760,y:shape.y+44};
      return{x:shape.x+11,y:key==='return_out'?shape.y+125:y};
    }
    const def=HPC_FREE.ports(node.type).find(p=>p.id===key);
    return{x:shape.x+(def?.side==='R'?shape.w:0),y:shape.y+(def?.y??.5)*shape.h};
  }
  function portSide(node,shape,key) {
    if(shape.type==='source')return 'R';
    if(shape.type==='buffer')
      return HPC_FREE.ports(node.type).find(p=>p.id===key)?.side||'L';
    if(shape.type==='dhw_tank')return key.startsWith('coil_')?'L':'R';
    if(shape.type==='heating_circuit')
      return ['pump_out','mixer_out'].includes(key)?'R':'L';
    return HPC_FREE.ports(node.type).find(p=>p.id===key)?.side||'R';
  }
  function pipeSegments(path) {
    const tokens=(path||'').match(/[MHV]|-?\d+(?:\.\d+)?/g)||[];
    const segments=[];
    let x,y;
    for(let i=0;i<tokens.length;){
      const command=tokens[i++];
      if(command==='M'){x=Number(tokens[i++]);y=Number(tokens[i++]);}
      else if(command==='H'){
        const next=Number(tokens[i++]);
        if(Number.isFinite(x)&&Number.isFinite(y)&&next!==x)
          segments.push({x1:x,y1:y,x2:next,y2:y});
        x=next;
      }else if(command==='V'){
        const next=Number(tokens[i++]);
        if(Number.isFinite(x)&&Number.isFinite(y)&&next!==y)
          segments.push({x1:x,y1:y,x2:x,y2:next});
        y=next;
      }
    }
    return segments;
  }
  function segmentIdentity(segment) {
    const values=[segment.x1,segment.y1,segment.x2,segment.y2].map(value=>Number(value.toFixed(2)));
    const forward=values.join(',');
    const reverse=[values[2],values[3],values[0],values[1]].join(',');
    return forward<reverse?forward:reverse;
  }
  function pipeLabelPosition(path,sourcePoint,role,text,obstacles,occupied,allPipeSegments) {
    const width=Math.max(60,text.length*7.2+8);
    const candidates=pipeSegments(path).map(segment=>{
      const distance=Math.min(
        Math.abs(segment.x1-sourcePoint.x)+Math.abs(segment.y1-sourcePoint.y),
        Math.abs(segment.x2-sourcePoint.x)+Math.abs(segment.y2-sourcePoint.y));
      return {segment,distance,length:Math.abs(segment.x2-segment.x1)+Math.abs(segment.y2-segment.y1)};
    }).sort((a,b)=>a.distance-b.distance||b.length-a.length);
    const overlaps=(a,b,padding=0)=>a.left<b.right+padding&&a.right>b.left-padding&&
      a.top<b.bottom+padding&&a.bottom>b.top-padding;
    const clear=(box,ownSegment)=>{
      if(obstacles.some(obstacle=>overlaps(box,{
        left:obstacle.x,right:obstacle.x+obstacle.w,
        top:obstacle.y,bottom:obstacle.y+obstacle.h
      },7)))return false;
      if(occupied.some(other=>overlaps(box,other,7)))return false;
      for(const segment of allPipeSegments){
        if(segmentIdentity(segment)===segmentIdentity(ownSegment))continue;
        const left=Math.min(segment.x1,segment.x2),right=Math.max(segment.x1,segment.x2);
        const top=Math.min(segment.y1,segment.y2),bottom=Math.max(segment.y1,segment.y2);
        if(segment.y1===segment.y2&&segment.y1>=box.top-2&&segment.y1<=box.bottom+2&&
          left<box.right+2&&right>box.left-2)return false;
        if(segment.x1===segment.x2&&segment.x1>=box.left-2&&segment.x1<=box.right+2&&
          top<box.bottom+2&&bottom>box.top-2)return false;
      }
      return true;
    };
    for(const {segment} of candidates){
      if(segment.y1===segment.y2&&Math.abs(segment.x2-segment.x1)>=width+18){
        const x=(segment.x1+segment.x2)/2;
        const offsets=role==='flow'?[-18,-34]:[29,45];
        for(const offset of offsets){
          const y=segment.y1+offset;
          const box={left:x-width/2,right:x+width/2,top:y-12,bottom:y+4};
          if(clear(box,segment)){
            occupied.push(box);
            return {x,y,anchor:'middle'};
          }
        }
      }else if(segment.x1===segment.x2&&Math.abs(segment.y2-segment.y1)>=34){
        const y=(segment.y1+segment.y2)/2;
        for(const side of [1,-1]){
          const x=segment.x1+side*14;
          const box={left:side===1?x:x-width,right:side===1?x+width:x,top:y-9,bottom:y+7};
          if(clear(box,segment)){
            occupied.push(box);
            return {x,y,anchor:side===1?'start':'end'};
          }
        }
      }
    }
    return null;
  }
  function localizeCircuitPath(path,offsetY) {
    if(!offsetY)return path;
    // The original SVG translates each circuit group; routed points are global.
    const tokens=(path||'').match(/[MHV]|-?\d+(?:\.\d+)?/g)||[];
    const commands=[];
    for(let i=0;i<tokens.length;){
      const command=tokens[i++];
      if(command==='M')commands.push('M'+tokens[i++]+' '+(Number(tokens[i++])-offsetY));
      else if(command==='H')commands.push('H'+tokens[i++]);
      else if(command==='V')commands.push('V'+(Number(tokens[i++])-offsetY));
      else throw new Error('Unsupported native heating-circuit pipe command');
    }
    return commands.join(' ');
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
    return HPC_NETWORK.flowStates(plan,hass);
  }

  // ETA eHACK: original cabinet and feed assembly supplied as vector artwork.
  // Embedded here so the HACS JavaScript works offline without loading extra assets.
  const HPC_ETA_EHACK_ART = "\n <defs>\n  <style type=\"text/css\">\n   \n    .hpc-eta-fil9 {fill:none}\n    .hpc-eta-fil5 {fill:#2B2A29}\n    .hpc-eta-fil6 {fill:#2B2A29}\n    .hpc-eta-fil0 {fill:#FDC507}\n    .hpc-eta-fil10 {fill:#FDC507}\n    .hpc-eta-fil7 {fill:#90461F}\n    .hpc-eta-fil2 {fill:#B9B9B8}\n    .hpc-eta-fil8 {fill:#91908F}\n    .hpc-eta-fil3 {fill:#6C6B67}\n    .hpc-eta-fil4 {fill:#4C4D4B}\n    .hpc-eta-fil1 {fill:#262625}\n   \n  </style>\n </defs>\n <g id=\"Ebene_x0020_1\">\n  <metadata id=\"CorelCorpID_0Corel-Layer\"/>\n  <g id=\"_1633277206752\">\n   <path class=\"hpc-eta-fil0\" d=\"M7759.57 6923.06c19.9,-0.03 19.14,-6.23 31.47,-13.17 9.04,-5.09 27.9,-7.3 32.1,2.81 6.35,15.28 -28.08,37.35 -40.12,40.57 -9.07,2.43 -32.18,2.09 -42.6,2 -40.32,-0.36 -58.63,-34.32 -55.17,-70.03 4.79,-49.49 30.43,-86.28 75.59,-95.04 61.73,-11.98 82.44,29.92 77.66,88.16 -9.12,7.34 -8.64,7.7 -22.52,6.1 -15.6,-1.79 -82.46,-4.1 -88.34,5.47 -4.03,23.72 9.03,33.15 31.92,33.12zm551.7 -96.98c1.84,5.3 2.08,3.67 -3.38,2.01 1.33,5.29 1.98,3.91 -3.47,2.48 1.19,4.51 1.96,3.6 -2.58,2.45 1.31,5.02 2.42,3.91 -2.58,3.91 -2.22,10.28 -10.47,19.47 -14.05,39.86 -8.02,45.77 35.23,60.37 54.2,34.74 10.61,-14.34 25.68,-21.29 34.92,-14.31 9.12,2.28 11.19,4.99 6.89,17.76 -1.49,4.43 -6.43,10.23 -8.81,13.41l-7.92 8.12c-21.09,18.63 -51.31,25.8 -75.59,19.21 -11.23,-3.05 -5.41,-1.24 -9.83,-4.89 -12.09,-2.12 -27.82,-15.71 -29.05,-28.58 -9.4,-13.21 -9.04,-46.61 0.15,-60.61 -0.88,-11.57 4.34,-18.6 10.14,-24.84 4.48,-25.63 39.57,-47.82 73.03,-48.26 71.37,-0.93 66.32,50.94 62.66,54.21 -8.76,4.01 -20.77,3.42 -32.68,2.9 -5.36,-9.51 -10.27,-20.31 -17.61,-23.35 -14.87,-6.15 -25.09,2.27 -34.44,3.78zm-157.33 -37.38c52.48,0 76.65,9.67 66.33,66.62 -3.53,19.44 -8.91,35.53 -12.29,53.07 -8.9,46.21 9.89,45.55 -29.56,45.56 -8.92,0 -9.76,-7.44 -16.32,-12.96 -11.45,5.66 -14.29,12.17 -27.08,13.73 -9.78,1.2 -33.93,1.9 -42.58,-1.1 -18.4,-6.38 -30.36,-32.37 -19.97,-59.01 12.08,-30.99 51.37,-38.52 84.22,-40.34 20.28,-1.12 20.06,-1.88 29.47,-13.73 -5.56,-20.7 -26.28,-23.04 -40,-19.47 -15.19,3.95 -10.93,22.59 -40.76,18.36 -31.92,-4.53 7.36,-50.74 48.55,-50.74zm313.09 56.62c16.92,-6.47 46.76,-48.46 65.75,-52.96 12.03,-2.85 28.76,-2.79 36.72,2.07 -2.56,11.53 -52.4,50.42 -61.96,61.32l30.66 73.43c4.92,10.47 9.85,14.65 7.01,22.51 -8.89,3.74 -25.56,2.26 -37.97,2.26 -9.44,-12.3 -10.11,-16.89 -16.68,-33.97 -4.68,-12.15 -8.84,-28.5 -18.4,-34.25 -23.59,7.59 -22.88,46.62 -30.76,65.19 -53.14,17.41 -35.81,-11.81 -20.7,-94.51 3.94,-21.61 8.85,-41.71 13.53,-62.56 4.68,-20.86 7.45,-47.88 16.78,-61.72 45.8,-0.49 34.51,2 26.62,40.08 -2.74,13.23 -11.72,63.38 -10.6,73.1zm-457.46 -29.83c10.95,-11.45 12,-67.6 24.62,-78.83 8.29,-3.51 27.75,-2.49 35.38,0.75 3.95,9.89 -28.45,154.75 -34.39,188.47 -6.11,34.65 -5.11,29.84 -46.19,27.69 -4.78,-28.54 19.07,-75.13 13.33,-94.9 -11.54,-5.02 -33.81,-2.65 -49.63,-2.7 -21.26,-0.06 -35.76,-5.01 -40.6,11.99 -17.82,62.68 -1.36,94.22 -48.91,85.85 -0.77,-0.13 -1.51,-0.3 -2.2,-0.48 -15.24,-3.81 -6.36,-18.85 0.54,-55 6.25,-32.71 27.35,-146.93 37.41,-163.49 19.03,-0.51 41.2,-5.46 37.89,13.16 -14.88,83.81 -34.27,71.63 45.81,70.8l21.13 -0.97c6.5,-1.52 2.02,0.31 5.82,-2.36zm386.51 -6151.8c-4.61,0.81 -3.51,1.55 -2.28,-3.12 -4.96,1.12 -3.81,1.82 -2.26,-3.12 -5.29,1.39 -4.18,2.13 -2.39,-3.09 -5.45,1.65 -4.37,2.46 -2.64,-2.99 -5.5,1.7 -4.31,2.91 -4.31,-2.62l0.19 1.07c-6.23,-0.43 -5.44,1.49 -4.59,-3.84l-365.16 0.5c-6.65,4.35 -2.36,-0.78 -6.03,5.6 -6.93,12.04 3.74,176.8 -4.3,191.75 -4.91,9.13 -14.29,9.03 -27.8,8.93 -20,-0.14 -30.15,2.33 -36.71,-11.13 -8.73,-17.93 5.47,-166.18 -3.98,-195.09 -21.39,-5.15 -106.68,-2.63 -136.17,-2.94 -57.23,-0.6 -408.78,-6.68 -416.39,0.99 -4.3,7.31 -3.88,21.46 -1.1,31.21 26.39,12.85 286.98,-8.09 325.46,8.61 13.25,59.98 -6.79,58.06 -35.8,57.84l-277.38 0.03c-0.86,0.1 -1.65,0.25 -2.4,0.37 -16.62,2.65 -12.13,33.7 -7.16,39.16 5.56,6.61 12.02,4.43 23.02,4.28 63.84,-0.9 378.76,-2.26 386.3,2.43 11.13,8.6 8.07,14.3 8.02,32.94 -0.05,20.97 1.39,16.01 -8.72,29.13 -51.45,5.16 -127.4,0.58 -181.52,0.65l-274.09 -0.39c-27.27,-5.17 -19.27,-42.39 -19.27,-70.27 -0.02,-220.25 -19.63,-206.45 64.9,-206.64 328.33,-0.74 659.46,7.83 990.13,8.12 38.59,0.04 47.17,7.02 64.83,27.44 13.83,15.98 28.7,31.9 41.52,48.31 26.77,34.25 55.62,61 83.85,95.61 12.04,14.76 58.77,60.84 58.69,78.74 -0.13,30.33 -42.66,47.17 -81.29,1.08 -14.42,-17.2 -26.46,-32 -40.9,-48.87 -7.99,-9.33 -11.2,-18.75 -26.11,-20.28l-223.06 -1.61c-26.54,-0.19 -66.61,4.31 -85.6,-5.38 -2.53,-13.97 2.79,-18.27 9.43,-28.05 22.6,-33.27 23.1,-32.47 48.83,-32.14l197.04 0.13c-3.13,-17.77 -16.2,-19.28 -22.81,-33.35zm-3527.42 6252.74c0.14,55.87 0.88,477.12 6.96,495.75 19.92,5.71 276.09,-7.41 321.89,-7.92 106.45,-1.21 214.6,-10.47 320.93,-10.99 107.71,-0.52 216.32,-10.15 323.72,-10.85 106.6,-0.71 212.75,-10.62 320.87,-10.97 96.08,-0.38 194.25,-10.02 291.03,-10.81 79.94,-0.65 203.87,-7.89 288.28,-10.79 185.43,-6.37 400.57,-17.54 579.33,-19.23 135.55,-1.28 296.18,-13.43 432.41,-15.98 45.19,-0.84 102.7,0.39 145.72,-4.31 46.38,-5.06 97.89,-1.12 145.07,-4.97 46.45,-3.79 96.67,-1.77 144.39,-5.15 45.45,-3.22 96.95,-4.61 144.2,-4.89 47.24,-0.28 95.59,-5.31 144.14,-5.03l324.52 -12.13c3.96,-337.38 3.07,-674.3 3.08,-1011.75l0.12 -5134.97c0,-47.25 5.99,-749.27 -8.88,-754.17 -0.43,-0.14 -1.35,-0.6 -1.91,-0.76l-3610.63 -68.7c-39.02,-0.94 -291.15,-7.61 -306,-1.89 -10.69,24.14 -9.75,469.13 -9.96,534.49 -2.64,739.12 -0.94,1505.14 -0.34,2249.27 1.02,1275.62 -1.34,2551.11 1.05,3826.75z\"/>\n   <path class=\"hpc-eta-fil1\" d=\"M5535.2 9834.77c11.46,-7.58 12.08,-0.76 23.23,-11.7 56.31,-55.23 108.38,33.43 70.67,59.84 -10.37,7.26 -50.01,12.06 -63.01,10.72 -0.36,-0.76 -0.66,-2.78 -0.75,-2.41 -0.1,0.37 -0.55,-1.77 -0.66,-2.44 -0.12,-0.68 -0.39,-1.67 -0.5,-2.51l-2.7 -31.82c-3.95,-13.35 -16.28,-10.89 -26.29,-19.68zm-66.91 -5.44c-5.95,7.23 -13.64,20.84 -11.79,37.66 2.29,20.76 22.83,23.57 7.59,26.96 -21.57,4.8 -71.76,-6.52 -84.18,-18.55 -25.18,-24.39 -16.07,-50.98 12.26,-63.58 38.5,-17.13 57.4,1.08 76.12,17.51zm3058.03 -95.43c4.23,-17.84 44.37,-40.37 9.83,-52.72 0.34,6.09 1.84,7.15 2.64,13.47 4.31,34 -39.48,12.88 -49.64,0.76l-8.83 -16.29 -18.35 0.56c13.31,-12.95 70.31,-17.37 88.65,-7.85 14.9,7.73 15.84,21.2 7.75,39.69 -7.53,17.19 -11.2,20.09 -32.05,22.38zm-174.59 -33.01c-17.09,8.29 -42.65,8.1 -58.12,14.4 5.38,4.85 24.83,16.2 32.65,17.04 -40.18,7.66 -68.03,-24.58 -39.04,-55.28 27.05,-28.64 63.38,-19.07 87.51,1.99 -5,3.02 -9.61,2.15 -9.76,2.16 -4.14,0.24 -6.58,-1.23 -10.67,0.74 -8.64,4.15 -1.46,5.56 -2.57,18.95zm-2798.09 -88.01c14.76,-3.41 14.43,4.02 14.75,18.56 3.24,40.26 6.16,108.78 -6.23,146.73 -8.41,25.76 -23.24,22.11 -71.8,22.25 15.77,-53.76 -33.36,-128.39 -23.97,-187.11 15.88,0.59 26.6,3.62 43.91,3.3 15.49,-0.29 29.31,-3.34 43.35,-3.73zm2800.99 -125.9l-0.8 -25.91c2.92,-9.94 11.2,-10.83 22.23,-13.49 9.39,-2.26 20.4,-4.24 30.83,-4.35 19.63,-0.21 39.5,5.52 53.88,18.82 5.2,5.28 4.62,5.09 7.69,12.32 17.35,11 10.7,83.55 10.46,107.47 -0.23,21.84 -1.97,30.73 -11.45,46.98 -10.58,18.14 -13.37,21.27 -38.71,21.8 -19.03,0.4 -37.13,0.64 -53.21,-4.04 -22.85,-6.65 -21.55,-14.01 -21.98,-40.27 -0.59,-36.14 -2.57,-84.26 1.05,-119.34zm-6306.16 -361.98l1.02 5.2 -1.56 2.85c-12.34,25.47 -91.69,24.03 -109.75,6.52 -12.57,-12.18 -7.75,-113.29 0.17,-130.05l6.31 -8.68c0,-4.71 -1.31,-3.76 2.97,-3.76l5.99 -5c8.52,-9.13 25.26,-11.54 39.9,-12.12 7.49,-0.29 17.36,-0.04 24.83,0.6 12.5,1.07 13.34,0.26 17.27,9.92 2.85,1.69 3.17,-5.86 2.85,5.2l-1.37 4.12 1.7 2.72 3.28 19.74c3.99,5.21 4.82,14.08 6.13,21.79l-1.43 2.7c5.02,5.91 3.76,7.06 4.67,16.72 0.63,6.69 0.96,13.86 1.14,20.58 0.36,13.05 1.62,30.99 -4.11,40.95zm2934.54 570.92c-34.46,-11.04 -252.59,-160.2 -303.7,-194.23 -14.42,-9.6 -31.27,-18.03 -44.35,-28.65l8.53 -345.41c5.92,-348.08 0.27,-712.81 0.93,-1062.6 26.43,8.2 273.39,127.89 307.15,144.37 32.35,15.79 70.55,38.29 102.04,50.46 27.18,348.66 6.71,701.7 11.74,1052.13 1.9,131.83 34.54,100.86 -24.28,246.64 -16.44,40.76 -6.59,39.2 -27.64,70.23 -11.11,16.38 -28.93,41.73 -30.42,67.09zm-3924.4 -886.84c6.11,-7.54 12,-6.39 20.02,-11.4l0.09 -48.19c17.04,1.55 19.41,10.26 28.24,18.9l14.49 -27.8c4.31,4.49 6.08,-6.89 3.82,13.3 -2.09,18.63 -24.44,61.83 -66.65,55.19zm486.22 -105.96c13.79,-7.57 35.82,-35.24 64.02,-20.48 24.43,12.79 21.16,87.91 -7.37,98.53 -60.07,22.35 -55.27,-51.32 -56.65,-78.05zm173.54 -26.98c-1.73,11.45 -15.79,93.22 -19.92,99.11 -6.75,9.62 -28.52,14.79 -41.67,6.52 -25.34,-15.93 -23.86,-67.48 -16.24,-94.76 6.28,-22.48 7.8,-23.09 26.7,-32.3 23.96,-11.68 62.5,-53.73 51.13,21.44zm-716.81 7.33c-4.62,-7.7 -2.37,-9.92 -5.79,-15.84 -6.88,-11.9 -25.1,-8.4 17.14,-39.36 14.69,-10.77 12.26,-15.19 23.33,-27.44 7.24,12.76 15.14,41.17 7.78,55.79 -2.54,5.06 -3.3,4.4 -5.92,10.34 -1.87,4.23 -4.72,24.35 -36.53,16.51zm115.14 -100.07c11.9,3.26 4.48,-6.86 8.09,13.22 2.61,-13.86 3.86,-37.84 12.27,-47.85 4.22,13.3 7.23,78.21 6.31,95.17 -17.16,-5.66 -36.82,-39.27 -26.67,-60.54zm643 -85.5c14.9,13.36 24.64,99.98 12.91,119.86 -13.78,-6.38 -8.09,-13.91 -29.42,-19.93 0.77,-29.9 0.65,-84.24 16.51,-99.93zm-907.07 76.26c12.66,1.25 16.34,11.38 23.38,22.89 11.02,18.04 9.53,11.17 24.89,23.97 34.03,28.36 -2.28,25.77 7.24,68.37 -13.52,-4.43 -31.44,-37.02 -39.22,-50.03 -8.86,-14.82 -25.47,-47.4 -16.3,-65.21zm56.29 -71.59c5.26,-6.52 20.61,-11.62 30.75,-15.9 22.22,-9.36 58.84,29.69 65.66,68.2 6.65,37.54 -5.87,52.13 -34.47,59.28 -18.23,4.56 -48.74,14.8 -64.74,-20.19 -15.67,-22.99 -20.36,-75.89 2.79,-91.39zm120.25 19.73c-8.94,-12.02 -64.77,-82.35 -9.84,-71.98 16.07,3.03 34.33,15.29 36.84,30.14 3.42,20.24 -9.13,24.67 -21.5,36.57 -0.57,0.55 -1.19,1.16 -1.73,1.67l-3.76 3.59zm-163.29 -3.73c-5.29,-5.1 -5.2,-4.96 -7.63,-15.8 -1.18,1.8 0.74,11.34 -21.66,-5 -31.14,-22.7 3.86,-56.53 39.17,-56.69 10.95,-0.05 23.1,4.47 29.6,9.84 11.76,9.73 3.67,16.58 -4.51,24.54 -10.17,9.9 -29.71,26.79 -34.97,43.12zm1060.58 -205.06c31.71,96.56 1.62,300.27 12.73,420.22 81.36,16.91 202.22,-0.18 205.8,94.66 0.93,24.65 -7.82,68.87 -18.12,84.31 -52.23,-1.26 -233.41,9.37 -269.25,-0.33 -5.24,-13.1 0.82,-92.53 2.56,-116.66 5.98,-83 -151.01,-6.25 -108.23,-116.93 13.81,-35.72 77.52,6.58 50.05,-177.43l-11.8 -78.36c-7.24,-18.69 -23.69,-51.32 -12.47,-71.68 14.34,-26.02 56.53,-16.03 98.29,-23.97 19.19,-3.65 32.91,-9.1 50.44,-13.82zm-833.32 52.49c7.15,20.81 25.72,75.37 24.85,98.9 -2.24,-3.34 -0.33,2.76 -3.9,-7.84 -1.33,-3.96 -1.8,-7.89 -2.52,-11.92 -12.44,11.01 -19.07,11.14 -35.59,4.11 -4.53,-20.31 4.05,-28.98 13.18,-41.37 12.78,-17.34 -2.89,-27.71 3.99,-41.87zm1793.95 -386.77c10.73,-18.69 42.11,-39.65 73.71,-28.03 12.03,23.15 1.31,91.68 -17.49,107.36 2.19,6.51 4.42,6.32 -1.88,4.52l-2.98 4.42c2.25,6.62 3.28,4.82 -3.87,4.82 -16.3,8.66 -35.89,50.05 -97.81,50.51 -28.21,0.21 -46.03,1.98 -72.39,-4.83 -18.52,-4.78 -31.93,-22.48 -55.33,-15.28 -37.6,11.57 -78.06,26.39 -113.85,38.56l-225.75 78.85c-43.73,14.46 -195.66,71.02 -227.22,76.98 -28.22,5.33 -122.69,2.49 -143.58,-6.26 10.35,-13.07 93.56,-35.25 113.75,-43.19 62.42,-24.53 160.24,-54.81 230.04,-79.27 24.41,-8.55 126.15,-40.6 141.54,-51.92 28,-20.6 -9.13,-26.59 79.96,-37.74 98.67,-12.36 94.18,-51.25 182.4,-25.36 39.63,11.63 92.71,16.33 122.13,-19.92 18.34,-22.6 0.85,-35.61 18.64,-54.21zm-387.96 -67.37c-17.3,50.7 -42.82,6.89 -42.37,-10.78 0.73,-28.98 56.07,-29.35 42.37,10.78zm2563.24 308.17c-49.8,-4 -260.86,-120.34 -327.9,-149.74 -30.23,-13.25 -45.03,-14.67 -58.97,-60.73 -20.4,-67.38 -7.24,-152.56 -1.69,-222.46 3,-37.78 3.82,-77.8 7.02,-115.1 48.33,-3.46 166.51,48.32 200.47,64.18 57.58,26.87 120.92,52.96 185.12,80.45 0.6,31.13 -3.52,64.75 -3.9,97.94 -1.12,97.7 3.92,214.42 -0.14,305.45zm-3365.12 -544.51c49.2,-20.62 98.67,-41.27 150.89,-59.31 34.76,-12.01 453.84,-155.43 470.57,-157.72 30.44,89.33 93.28,402.54 119.27,531.47 5.41,26.83 13.26,54.03 13.79,83.66 -41.58,13.55 -100.85,39.6 -151.27,56.05l-462.01 158.33c-6.28,-23.77 -14.11,-47.41 -20,-72.84l-51.2 -232.88c-24.06,-99.52 -44.11,-211.08 -70.04,-306.76zm7366.83 -44.87c-27.75,6.65 -101.13,6.23 -135.11,7.42l-416.09 16.8c-182.98,5.47 -369.04,18.1 -551.97,21.89 -185.15,3.84 -371.75,16.61 -557.66,19.51 -184.85,2.88 -370.67,16.05 -557.58,19.07 -45.36,0.74 -92.63,4.31 -138.66,5.11 -95.45,1.65 -182.86,8.02 -277.3,10.04 -140.82,3.01 -279.28,10.94 -418.97,14.16 -91.83,2.12 -188.33,3.8 -279.91,9.57 -91.18,5.75 -185.31,7.35 -277.76,10.17 -91.92,2.81 -184.39,9.03 -277.31,10.8 -125.73,2.4 -214.81,-58.76 -323.09,-108.69 -26.19,-12.08 -74.86,-36.96 -102.92,-42.16l14.95 -5.1c3.86,-0.45 12.4,-0.38 16.74,-0.57 78.24,-3.55 163.73,-4.59 239.97,-9.51 45.08,-2.91 94.47,-4.69 137.98,-5.77 46.56,-1.15 93,-4.4 138.68,-5.52 92.96,-2.27 185.41,-8.73 277.45,-10.74 146.21,-3.2 277.16,-11.99 418.91,-14.51 47.12,-0.84 90.85,-4.27 138.71,-5.14 45.78,-0.83 95.11,-1.71 139.22,-4.83 45.42,-3.22 94.23,-1.89 138.92,-4.95 91.83,-6.3 188.43,-3.84 279.6,-8.92 91.45,-5.1 188.11,-6.82 280.06,-8.63 184.71,-3.65 372.89,-14.95 557.42,-18.38 187.37,-3.48 372.6,-13.7 560.39,-17.31 91.03,-1.75 185.7,-8.06 277.34,-10.08 23.31,-0.51 46.73,-1.15 68.28,-2.4 11.59,-0.67 23.68,-0.07 35.17,-0.8 12.46,-0.78 19.84,-3.8 32.56,-5.33 235.73,-28.31 376.19,88.75 561.99,144.79zm-7579.87 -56.96l8.31 -2.7c12.31,-5.62 15.57,-1.9 26.69,1.03l4.63 1.69c9.52,1.7 3.14,0.02 4.22,3.86 24.28,5.9 76.92,61.16 114.39,76.12 17.1,6.83 19.38,2.08 23.45,23.38 2.48,12.96 6.28,25.39 9.79,38.72 16.78,63.65 88.08,353.47 90.21,390.91 0.29,36.26 39.09,154.49 32.64,176.19 -8.51,2.45 -58.1,-19.67 -66.88,-24.83 -2.55,-9.98 -3.57,-22.93 -5.72,-32.79 -2.15,-9.87 -5.36,-19.38 -8.25,-29.86 -18.06,-65.43 -34.32,-112.35 -56.5,-177.38l-46.07 -108.71c-14.54,-31.9 -39.69,-74.84 -49.93,-106.52l-48.3 -97c-10.07,-21.24 -45.8,-85.39 -49.42,-103.21 -5.27,-7.09 -6.21,-7.31 -7.34,-17.12 6.2,-7.11 10.73,-11.25 24.1,-11.79zm3349.36 -121.7l2.62 8.26c9.82,18.86 7.62,67.87 4.42,92.31 -25.16,18.56 -138.48,11.28 -175.97,13.55 -73.85,4.47 -69.66,42.97 -69.78,114.57 -0.2,125.1 -1.5,250.24 -1.39,375.33l0.17 563c-0.05,59.85 1.88,127.95 -2.39,186.26 -25.24,2.97 -208.22,-20.28 -227.38,-28.51 -14.64,-95.19 1.83,-1495.61 1.93,-1694.43 0.04,-77.93 -4.23,-167.06 0.05,-243.54 74.07,-10.01 302.26,-2.48 404.67,-3.25 42.6,-0.32 36.99,-16.77 37.3,99.92 0.24,91.06 -2.05,181.17 -2.6,271.98 -0.14,23.54 1.67,179.66 7.68,197.51 7.2,21.38 18.08,30.82 20.67,47.05zm-3272.81 98.13c33.29,-72.57 -29.53,-87.11 106.98,-133.65l26 -8.22c16.72,-5.28 39.48,-10.64 59.62,-7.34 41.35,6.77 15.73,8.95 52.8,-3.41 74.99,-25.01 87.38,-22.71 155.05,-51.08 17.58,-7.37 32.02,-12.7 50.07,-18.82 38.24,-12.98 64.96,-30.29 105.76,-7.05 58.64,33.4 111.91,71.46 173.65,103.02 -0.47,0.64 -1.24,0.75 -1.54,1.82 -3.59,13.15 -175.11,67.98 -184.11,71l-383.67 130.45c-18.3,6.57 -30.07,14.29 -46.31,5.44 -14.7,-8.01 -26.13,-15.88 -40.29,-24.92 -24.77,-15.82 -62.99,-29.12 -74.02,-57.24zm2747.38 -126c-35.59,-2.06 -45,-6.96 -24.7,-34.65 13.7,-18.68 12.91,-78.7 31.24,-90.42 2.77,19.95 2.29,42.24 1.03,63.32l-5.38 56.86c-0.29,0.84 -0.79,1.76 -1.05,2.44 -0.27,0.7 -0.67,1.69 -1.14,2.45zm-1829.05 532.34c12.13,-9.88 37.89,-5.29 44.41,-36.68 5.23,-25.18 1.28,-52.47 -12.1,-66.05 -25.55,-1.56 -31.47,11.99 -58.56,3.51 -3.42,-7.73 -77.23,-358.46 -78.41,-380.53 -0.55,-10.24 0.22,-21.05 1.94,-30.62 1.54,-8.62 23.01,-39.3 -17.21,-65.48 -9.5,-6.19 -34.16,-1.42 -55.12,-10.35 -62.37,-26.58 -65.4,-32.61 -58.19,-70.39 3.5,-18.35 10.61,-35.71 24.31,-41.27 50.05,-20.33 101.48,35.25 127.23,70.14 72.53,98.31 127.43,223.8 160.39,370.31 17.71,78.7 40.62,210.9 5.06,292.79 -6.27,14.44 -13.61,37.7 -28.04,40.29 -66.77,12.01 -55.74,-75.56 -55.71,-75.66zm-138.23 -727.28c8.17,-18.51 41.32,-26.77 59.44,-34.58 69.96,-30.14 56.34,-40.07 122.45,14.11 86.31,70.74 143.28,192.39 181.12,292.31 34.54,91.22 59.46,201.23 61.37,315.63 0.84,50.05 -0.09,120.52 -34.3,155.21 -16.22,16.45 -40.67,21.63 -66.19,29.78 -17.36,5.55 -55.77,20.53 -72,22.15 2.08,-17.89 9.38,-33.27 12.91,-53.33 3.23,-18.38 4.58,-43.68 5.72,-61.76 2.6,-41.43 -3.37,-87.71 -8.02,-126.76 -8.94,-74.99 -29.68,-146.96 -53.35,-217.03 -23.4,-69.25 -53.9,-131.33 -84.76,-187.69 -13.87,-25.34 -37.48,-61.14 -54.89,-81.14 -10.7,-12.29 -21.83,-22.42 -33.44,-34.11 -20.77,-20.92 -12.4,-10.88 -26.89,-21.91 -7.09,-5.4 -5.67,-4.29 -9.15,-10.88zm-851.72 -146.87l4.01 6.12 1.83 3.45 4.11 3.87c17.58,19.66 23.72,43.38 37.16,60.57l92.81 73.01c84.93,57.9 123.83,24.17 143.55,49.6 7.32,9.43 11.87,39.74 14.71,52.49 -2.38,13.39 -5.77,16.33 -14.02,23.24l-17.17 0.56c-16.22,0.47 -34.79,-0.67 -50.37,0.58 -18.01,1.44 -26.63,6.56 -46.69,7.23 -13.61,-1.07 -28.73,4.63 -40.24,7.61 -9.15,6.94 -28.33,15.11 -30.49,24.07 -16.77,20.21 -5.89,0.73 -32.86,40.89l-24.31 38.35c-4.52,5.1 -2.01,2.56 -6.71,6.04 -14.75,32.24 -52.87,43.5 -85.63,50.91 -26.01,-43.67 -34.42,-53.09 -61.48,-104.7 -16.17,-30.84 -81.28,-169.32 -89,-194.28l0.83 -1.52c-9.62,-14.74 -5.45,-16.32 1.52,-31.71 16.47,-36.4 -6.95,-56.36 59.06,-78.33 23.38,-7.78 44.71,-14.57 67.88,-21.94 17.42,-5.53 49.11,-17.92 67.37,-21.38l4.15 5.29zm2013.94 625.58l-2.19 -0.03c-39.95,34.59 -436.4,159.36 -533.12,194.11 -30.59,11 -61.99,22.28 -90.76,31.91 -18.92,6.33 -77.95,26.37 -95.51,28.69 2.46,-26.32 18.53,-50.27 18.05,-121.33 -0.83,-124.75 -23.98,-238.44 -65.69,-351.21 -51.05,-138.04 -128.21,-268.14 -223.93,-335.68l3.24 -3.22c0.08,-0.06 4.81,-3.45 5.28,-3.71 3.1,-1.68 8.54,-3.21 12,-4.4 8.35,-2.88 15.53,-5.86 23.41,-8.91 103.92,-40.28 235.76,-81.17 340.64,-114.39 65.86,-20.86 128.74,-39.86 197.15,-60.45 34.63,-10.42 66.71,-19.45 99.39,-28.19 58.49,-15.65 51.57,-10.18 92.04,20.38 145.1,109.58 232.5,344.5 248.65,525.97 5.37,60.39 0.93,152.33 -14.76,211.81 -3.32,12.58 -2.88,14.93 -13.89,18.65zm1365.57 -791.49c-2.39,-1275.64 -0.03,-2551.12 -1.05,-3826.75 -0.59,-744.13 -2.3,-1510.15 0.34,-2249.27 0.21,-65.37 -0.73,-510.36 9.96,-534.49 14.85,-5.73 266.98,0.95 306,1.89l3610.63 68.7c0.56,0.16 1.47,0.62 1.91,0.76 14.87,4.9 8.88,706.92 8.88,754.17l-0.12 5134.97c-0.01,337.45 0.88,674.38 -3.08,1011.75l-324.52 12.13c-48.55,-0.28 -96.9,4.75 -144.14,5.03 -47.25,0.28 -98.75,1.66 -144.2,4.89 -47.72,3.38 -97.94,1.36 -144.39,5.15 -47.18,3.85 -98.69,-0.09 -145.07,4.97 -43.02,4.7 -100.53,3.46 -145.72,4.31 -136.22,2.54 -296.86,14.69 -432.41,15.98 -178.76,1.69 -393.89,12.86 -579.33,19.23 -84.41,2.9 -208.35,10.13 -288.28,10.79 -96.78,0.79 -194.94,10.43 -291.03,10.81 -108.12,0.34 -214.27,10.26 -320.87,10.97 -107.4,0.71 -216.01,10.33 -323.72,10.85 -106.34,0.52 -214.48,9.78 -320.93,10.99 -45.8,0.52 -301.97,13.63 -321.89,7.92 -6.08,-18.63 -6.83,-439.88 -6.96,-495.75zm-675.23 26.74l0.32 -1.15c5.54,0 4.2,-1.19 2.77,4.5 4.76,-0.85 3.01,-1.22 1.46,4l8.39 7.93c1.98,2.56 5.39,7.92 7.51,11.5 35.28,59.69 58.55,125.79 65.4,197.12 4.29,44.65 4.12,93.36 -3.94,137.96 -11.39,63.01 -13.72,62.6 -66.03,86.46 -101.91,46.48 -274.31,87 -398.2,126.73 -15.91,5.1 -42.46,15.76 -57.05,18.37 -8.07,-121.77 -6.87,-175.58 -39.28,-296.05 -15.62,-58.05 -40.84,-132.14 -68.74,-183.98 -10.03,-18.62 -21.99,-35.31 -30.83,-52.39 68.79,-40.95 362.84,-107.86 463.53,-140.25 23.02,-7.4 29.41,-5.99 66.21,25.35 10.05,8.56 17.71,15.65 25.18,23.74 9.8,10.62 18.32,15.14 23.28,30.16zm-892.06 -26.74c13.59,-16.43 36.79,-17.77 61.73,-23.87 30.02,-7.35 39.21,-8.33 68.83,2.63 109.14,40.35 179.83,186.93 217.18,293.48 31.77,90.66 53.44,183.86 50.31,290.76 -2.2,75.14 -18.72,135.71 -79.15,174.31 -11.3,7.22 -49.37,25.77 -59.11,26.9 3.73,-87.9 12.14,-153.85 -1.63,-242.49 -12.7,-81.77 -26.46,-135.28 -52.26,-207.78 -22.38,-62.89 -51.49,-123.12 -84.05,-174.68 -16.24,-25.71 -35.92,-53.12 -55.58,-74.71 -24.11,-26.48 -58.55,-55.79 -66.27,-64.54zm883.91 -144.14c58.77,8.86 107.11,73.53 124.52,129.99 2.94,19.39 10.26,38.1 12.46,61.5 2.75,29.3 -7.01,41.62 -7.27,66.77 -0.48,45.62 4.38,106.83 -0.82,150.28 0.17,-14.72 -28.35,-132.93 -41.07,-160.98 -5.23,-11.53 -6.24,-21.14 -10.33,-33.59 -7.34,-22.38 -19.78,-37.95 -31.05,-52.66 -4.29,0 -3.32,1.01 -2.57,-3.31l-1.73 -3.75c-8.67,-7.19 -14.74,-14.94 -23.73,-22.52 -8.87,-7.47 -15.25,-12.91 -25.11,-21.16 -14.27,-11.93 -41.61,-30.94 -49.8,-45.49l-10.1 -11.45 -3.06 -4.09 -0.56 -0.23c-4.34,1.03 -3.38,2.02 -3.4,-2.26 -3.48,-16.37 12.73,-25.94 24.17,-34.42 13.54,-10.05 28.93,-13.59 49.46,-12.64zm-2933.18 375.73c-9.44,-6.44 -16.67,-20.91 -22.1,-31.34l-52.62 -107.84c-23.61,-48.56 -45.49,-94.06 -70.15,-144.64l-105.8 -215.25c-5.98,-11.71 -37.59,-62.94 -15.46,-79.43 20.09,-14.98 103.28,76.14 113.72,90.29 89.38,121.19 162.22,334.89 152.41,488.22zm405.22 -176.88c-2.56,11 -20.88,12.34 -28.64,5.78 -30,2.76 -190.69,63.44 -237.64,77.46 -24.33,7.26 -53.31,21 -80.11,26.59 -0.43,-0.64 -0.98,-2.4 -1.15,-1.99l-9.12 -32.43c-20.91,-105.11 -24.22,-138.1 -66.49,-247.02 -17.24,-44.42 -36.49,-81.94 -58.63,-120.47 -11.05,-19.23 -22.98,-38.42 -35.04,-54.85 -5.8,-7.91 -13.18,-15.47 -19.97,-23.32l-22.16 -25.12c54.67,-27.81 26.89,-17.86 91.92,-38.73l246.51 -80.1c7.55,-2.28 17.45,-4.23 25.42,-7.13 9.65,-3.5 15.01,-8.85 22.77,-11.98 69.71,44.47 119.83,141.43 147.14,220.38 15.3,44.23 28.84,99.6 35.89,149.2 5.71,40.18 8.39,131.25 -10.71,163.71zm3146.58 -2492.38c9.18,29.25 4.32,1625.28 4.14,1735.97 -0.06,38.82 2.41,553.59 -2.93,578.2l-444.73 1.27c-9.01,-71.51 -4.92,-1316.14 -4.92,-1381.8 0.03,-300.32 3.1,-608.72 -0.01,-908.49 -0.34,-33.03 -10.32,-27.04 102.29,-27.38l304.61 -0.18c12.97,-0.11 26.88,-1.94 39.45,1.62 0.53,0.15 1.43,0.46 2.09,0.81zm-4688.32 1988.9l4.08 1.55 8.16 2.49 8.16 7.47 2.21 2.26 3.15 2.44c17.59,12.19 34.21,55.3 19.75,85.11 -8.96,18.47 -53.55,32.34 -75.21,18.99 -36.69,-22.62 -44.39,-87.84 -12.19,-111.86 12.06,-9 26.83,-13.54 34.67,-11.73 5.98,1.38 3.91,0.75 7.22,3.28zm753.16 42.7c7.92,13.33 31.7,44.75 29.84,67.15 -16.94,3.89 -28.21,-6.25 -35.45,-15.71 -7.4,-9.67 -12.53,-18.59 -5.22,-27.4l9.19 -8.06c-5.64,-12.44 -0.16,-14.05 1.64,-15.97zm-678.36 -74.68c14.13,5.97 39.06,70.33 44.31,89.1 -8.64,5.88 -12.82,-0.21 -20.92,26.17 -3.79,12.37 -7.16,25.16 -12.34,36.52 -9.8,21.48 -25.89,38.58 -57.39,37.92 14.75,-13.7 49.73,-36.67 58.34,-61.34 11,-31.52 -22.43,-57.73 -21.58,-97.49 13.19,1.93 9.65,3.06 19.32,6.22l-9.75 -37.1zm1704.17 -31.64c13.31,-6.25 24.81,-14.87 40.83,-21.77l142.79 -48c31.56,-10.54 62.74,-20.6 94.25,-30.86 27.35,-8.9 72.09,-27.37 96.13,-31.94 31.56,63.83 53.89,116.89 76.98,184.73l59.03 202.18c23.48,95.98 37.86,219.82 62.52,329.19 4.47,19.81 6.03,33.86 10.18,55.14l8.12 55.54c-36.84,23.44 -40.08,17.8 -52.96,26.08 -89.97,57.87 -215.92,50.81 -233.53,162.92 -4.41,28.08 1.06,23.48 -58.14,-12.02 -19.02,-11.41 -18.92,-7.02 -24.21,-29.96 -13.46,-58.35 -24.99,-116.57 -39.17,-173.92 -14.24,-57.64 -22.74,-117.57 -37.85,-174.41 -15.03,-56.51 -26.2,-112.85 -41.09,-170.91 -20.07,-78.26 -45.89,-167.11 -74.63,-243.45 -6.09,-16.18 -27.71,-62.15 -29.25,-78.51zm-343.76 654.08c32.71,-10.07 62.45,-9.62 100.87,-43.06 58.85,-51.24 61.2,-153.51 45.45,-226.6 -27.31,-126.76 -99.19,-406.59 -269.2,-381.26 -20.8,3.1 -41.33,15.51 -56.73,17.45 -20.42,-85.26 -13.79,-167.96 28.46,-227.39 23.54,-33.11 34.51,-36.66 91.22,-10.27 80.42,37.41 141.03,156.34 177.96,238.37 46.23,102.7 42.73,80.34 80.14,197.12 53.48,166.96 128.46,391.57 34.9,570.97 -10.76,20.63 -15.15,24.16 -43.15,24.62 -55.27,0.9 -99.98,-39.12 -132.1,-76.99 -13.16,-15.52 -49.6,-60.68 -57.82,-82.96zm-1464.76 -702.78c28.67,-3.42 64.49,30.15 76.05,44.34l-9.42 -0.44c-1.47,15.67 -5.97,21.21 -19.2,25.25 -7.94,2.43 -29.77,7.22 -33.86,0.72 -3.36,-5.35 -1.82,-23.92 -7.49,-36.01 -5.92,-12.62 -9.25,-19.41 -6.07,-33.86zm2225.58 -86.21c26.34,-25.16 153.67,-63.67 197.68,-77.61 36.12,-11.44 69.14,-21.83 105.1,-33.8 26.84,-8.93 80.26,-30.27 105.39,-33.49 40.78,49.41 117.25,312.08 134.11,386.58 16.52,73 29.46,144.94 42.33,218.99 11.04,63.52 35.85,169.76 42.05,220.3 -65.27,20.02 -130.66,46.39 -198.27,65.95 -68.28,19.75 -134.67,46.31 -199.73,67.58 -15.79,-24.99 -42.67,-172.91 -50.22,-209.96 -14.54,-71.35 -31,-142.73 -48.97,-212.12 -18.26,-70.49 -35.89,-134.4 -58.69,-202.2 -10.78,-32.07 -21.89,-68.67 -33.55,-97.17 -11.55,-28.24 -29.32,-64.97 -37.24,-93.06zm-1785.32 9.25l-6.01 2.25c-64.03,9.65 -120.99,23.2 -186.4,30.46 -35.26,3.91 -173.62,16.94 -201.68,13.92 10.84,-5.75 6.21,-9.86 48.46,-29.77 60.81,-28.66 120.45,-43.45 185.45,-65.22 20.77,-6.96 39.98,-14.67 59.97,-21.69 27.3,-9.59 34.1,-17.39 55.9,-27.96 45.05,-21.86 84.55,-25.24 140.5,-12.8 53.38,11.3 121.89,72.84 134.41,114.84 -17,-1.47 -41.16,1.8 -54.65,-5.5 -9.01,-4.87 -23.99,-24.43 -25.57,-36.07l31.39 -6.39c-3.03,-10.46 -3.08,-7.73 -9.66,-13.42 -16.92,3.33 -59.89,23.37 -81.74,31.15 -22.33,7.94 -67.74,23.31 -90.38,26.21zm2233.73 -161.56c20.41,-21.34 202.78,-75.69 254.3,-92.25 19.41,-6.24 73.27,-26.8 88.95,-27.89 43.47,55.44 110.03,318.42 123.5,397.08 18.65,108.98 40.38,225.56 55.5,336.36 2.57,18.85 4.47,38.99 8.09,56.76 3.9,19.16 7.46,38.27 7.14,58.84 -7.69,19.74 -67.79,21.38 -77.13,22.26 -14.12,1.35 -134.05,38.08 -155.62,45.31 -18.76,6.29 -63,23.47 -79.04,23.4 -15.27,-70.7 -33.65,-143.91 -47.78,-214.84 -37.63,-188.87 -75.81,-329.18 -140.44,-511.71 -11.77,-33.23 -24.84,-57.26 -37.47,-93.33zm546.61 411.73c-13.79,-59.23 -22.79,-121.3 -35.38,-180.45 -27.18,-127.68 -76.45,-291.26 -130.02,-408.37 -3.53,-7.73 -18.77,-31.85 -6.72,-39.61 7.46,-4.81 36.45,6.31 42.42,9.34 74.51,37.89 137.29,185.57 161.69,269.07 16.13,55.19 28.93,122.38 26.55,188.6 -1.79,49.83 -10.8,88.82 -32.21,131.68 -7.43,14.87 -10.71,26.26 -26.32,29.75zm-286.25 -2338.02c65.3,5.63 532.67,120.64 648.43,144.24 51.75,10.55 111.55,23.4 162.24,36.34 52.31,13.36 110.58,22.71 163.23,35.19l328.12 69.68c6.19,6.52 3.1,254.77 3.21,283.66 2.39,670.46 -0.56,1343.09 0.23,2013.82 -36.4,-3.05 -142.5,-57.95 -177.8,-74.71 -29.5,-14.01 -60.99,-26.21 -84.61,-40.96 -13.91,-8.68 -23.45,-15.37 -42.68,-19.93 -25.46,-6.04 -24.33,-13.5 -45.89,-0.22l-3.49 199.89c-52.66,20.55 -180.22,56.5 -243.29,73.66 -25.94,7.06 -55.93,13.73 -83.6,22.29 -48.43,14.99 -45.84,16.59 -74.77,-2.03 -25.91,-16.68 -80.77,-93.71 -169.97,-94.87 -20.53,-0.27 -32.28,5.71 -48.11,5.68 -3.38,-55.84 -17.19,-119.02 -26.07,-173.18 -4.21,-25.68 -14.75,-60.85 -0.82,-83.52 10.81,-17.59 34.2,-27.56 49.75,-50.52 56.68,-83.63 52.1,-222.45 24.67,-333.28 -31.05,-125.45 -108.63,-320.84 -240.62,-354.25 -11.68,-2.96 -56.11,-1.15 -76.96,-24.65 -10.46,-11.79 -28.21,-46.22 -38.85,-61.8 -23.22,-34 -18.78,-24.38 -20.02,-76.69 -5.29,-222.83 -2.63,-473.18 -2.53,-696.27 0.13,-265.86 0.41,-531.71 0.21,-797.57zm-1504.97 1482.4c7.62,-10.18 15.88,-2.48 31.48,0.16 124.25,21.09 152.31,23 289.01,20.77 86.68,-1.41 232.74,-20.44 318.47,-34.14 49.19,-7.86 98.49,-18.35 147.4,-29.56 92.82,-21.28 249.23,-66.26 330.58,-112.37 9.54,-5.41 18.53,-10.37 27.96,-15.59 11.23,-6.22 18.33,-14.85 28.89,-16.22 7.76,23.86 12.3,47.99 18.78,72.14l55.67 213.29c-18.81,13.57 -111.16,44.43 -139.87,54.09 -49.56,16.66 -100.81,30.35 -147.8,48.03 -46.47,17.48 -97.37,32.06 -145.21,48l-439.08 145.7c-26.77,8.9 -127.42,46.38 -148.48,46.33 -29.47,-0.06 -36.33,-12.11 -63.67,-30.58 -50.68,-34.23 -16.87,-0.53 -50.83,-45.05 -6.66,0 -5.61,1.56 -3.24,-4.65 -18.72,-16.24 -51.56,-155.9 -59.37,-165.82 -6.43,-8.17 1.99,3.39 -7.54,-3.73 -8.12,-6.06 -14.66,-20.73 -18.71,-30.23 -6.88,-16.15 -12.82,-32.17 -18.36,-49.73 -6.83,-21.7 -21.78,-80.34 -11.24,-103.49 4.72,-10.36 0.59,-3.08 5.15,-7.36zm466.76 1141.65c3.54,4.79 -0.42,-3.98 3.7,6.36l9.69 47.24c3.91,18.17 7.51,36.52 10.96,53.73 16.59,82.64 30.83,177.97 46.49,252.58 2.1,10.01 5.73,14.74 9.25,23.64 6.13,15.51 10.53,40.21 -1.17,54.16 -9.19,8.68 -121.11,50.99 -139.07,51.48 -8.16,9.04 -11.89,4.52 -30.11,11.37 -11.22,4.22 -19.5,7.8 -28.19,12.52 -25.72,13.97 -37.52,-11.19 -44.76,-29.4 -6.97,-17.53 -12.76,-47.08 -11.82,-68.75 0.53,-12.18 12.25,-26.52 21.46,-62.51 17.96,-70.16 26.5,-153.26 19.95,-228.1l-8.01 -77.89c0.33,-37.52 -26.68,-134.91 -37.35,-171.06 -32.67,-110.6 -66.91,-198.73 -118.07,-300.45 -20.38,-40.53 -49.88,-98.61 -78.19,-132l-23.84 -29.44c-9.34,-10.98 -13.56,-16.63 -24.78,-26.85 -55.03,-50.14 -142.8,-95.55 -189.51,-15.65 -2.02,3.45 -3.5,6.53 -4.98,8.69l-6.9 7.89c-2.53,-18.56 -0.67,-27.64 8.76,-38.21 8.97,-10.04 15.27,-14.34 24.4,-22.32l79.05 -59.66c3.2,-2 2.38,-1.31 6.6,-4.25 19.76,-13.76 63.89,-47.52 85.56,-37.43l9.8 3.28c38.46,25.84 57.24,78.88 102.71,104.53 7.84,4.43 14.29,4.92 20.47,9.8 15.71,1.24 22.84,9.38 35.7,5.16 11.04,-3.63 19.69,-8.66 33.26,-13.14 23.93,-7.91 45.97,-15.34 69.35,-23.14 90.95,-30.35 193.57,-66.11 282.97,-92.92 48.53,-14.56 90.11,-31.42 140.53,-46.84 133.68,-40.89 291.16,-100.03 423.28,-138.74 27.98,-8.2 117.66,-37.31 137.21,-50.63 5.38,-86.71 -15.75,-95.51 -26.62,-132.19 52.63,-8.55 81.25,-0.23 115,23.94 59.44,42.56 100.16,103.12 137.17,168.03 12.92,22.66 44.1,79.79 50.8,101.84 -48.94,15.53 -102.15,37.44 -152.6,54.58l-782.31 259.82c-37.63,12.38 -281.54,89.48 -310.3,104.7 -2.16,18.7 29.93,85.3 37.16,103.16 23.43,57.85 91.28,278.63 97.29,333.11zm746.82 -1451.14c-8.92,56.8 -50.86,84.13 -98.96,114.05 -166.02,103.27 -480.4,156.71 -682.78,176.47 -69.84,6.82 -141.38,5.47 -212.04,4.98 -73.36,-0.51 -128.76,-7.23 -190.92,-25.17 -32.23,-9.3 -48.81,-17.25 -76.36,-29.79 -21.28,-9.69 -45.81,-32.19 -47.83,-61.12 -4.1,-58.71 59.91,-89.14 99.94,-111.56 45.31,-25.37 93.98,-48.89 147.96,-67.44 108.66,-37.33 226.64,-63.22 345.26,-84.58 127.3,-22.92 264.3,-27.03 401.88,-26.96 79.08,0.04 205.65,8.76 272.14,48.23 18.82,11.17 46.09,34.92 41.7,62.9zm1647.13 -2958.67l5.8 2.26 422.24 -7.05c6.27,340.51 2.42,683.87 2.69,1024.26 0.02,23 4.04,995.86 -1.98,1021.71l-222.05 3.01c-74.09,-0.45 -149.39,1.05 -223.24,-0.59 -5.56,-167.91 -4.21,-341.41 -4.29,-510.09l0.75 -1278.3c-0.03,-83.35 -3.05,-171.8 0.1,-254.62l19.98 -0.58zm434.02 -37.79c-52.03,2.21 -96.61,-9.11 -148.45,-6.68 -46.45,2.17 -92.55,8.02 -138.6,11.28 -59.2,4.18 -151.35,11.33 -166.94,-58.93 -30.59,-137.9 30.3,-184.33 180.44,-178.68 65.24,2.46 78,18.29 115.64,-21.95 8.05,-8.61 24.77,-34.74 42.91,-29.61 13.57,3.84 27.65,26.21 33.77,38.96 25.34,-7.98 50.55,-23.41 71.43,0.22 35.16,39.8 2.67,166.86 9.79,245.4zm-1318.17 -1104.52c47.21,-3.96 105.73,-3.26 154.33,-4.17 52,-0.98 103.93,-2.3 155.94,-3.05 295.55,-4.28 568.87,-0.98 862.22,3.01 26.71,0.37 47.25,-2.62 75.4,1.72 -1.13,25.37 -13.24,72.23 -18.01,100.12 -5.67,33.15 -11.53,66.67 -17.17,100.1 -11.42,67.64 -21.67,135.32 -33.38,203.26 -17.37,100.86 -34.69,198.28 -58.47,297.44 -7.23,30.14 -17.93,63.34 -23.85,93.1 -431.84,6.82 -861.26,3.27 -1292.91,5.23 2.11,-54.75 77.96,-350.86 92.57,-405.56 17.38,-65.03 35.36,-129.33 52.87,-194.88l50.46 -196.32zm-470.77 -666.69c51.73,-14.14 274.45,-52.69 330.4,-62.95l660.25 -122.97c23.8,-4.33 311.19,-60.36 328.55,-59.24l1.83 761.79c0.07,100.52 7.43,88.85 -34.11,89.28 -207.07,2.16 -419.73,0.44 -628.28,0.53 -258.86,0.11 -222.26,-16.14 -267.51,150.92 -21.08,77.82 -40.8,156.2 -59.15,231.22 -19.16,78.32 -40.34,156.33 -59.79,233.91 -12.61,50.28 -57,192.84 -57,235.2 0,20.81 7.05,24.82 16.86,38.11 35.73,48.46 6.39,45.75 108.38,45.98 318.07,0.72 648.94,-2.78 963.44,0.45l0.59 1743.16c-0.14,178.58 2.82,385.86 -0.8,560.75 -23.11,0.15 -62.7,-11.19 -85.12,-15.95l-244.08 -52.16c-108.18,-20.69 -217.96,-49.22 -325.27,-71.86 -180.53,-38.08 -385.96,-86.79 -566.33,-129.66 -26.23,-6.23 -52.69,-13.46 -80.14,-18.08l-3.83 -3066.27c-0.01,-40.72 -2.5,-454.84 1.11,-492.16zm1785.17 624.42l-2.06 51.33c-0.12,-0.36 -0.79,1.24 -1.19,1.85 -2.61,-2.24 -1.78,-0.73 -4.52,-4.38l-6.86 -15.7c-20.57,-31.45 -21.37,-48.53 -67.4,-49.17 -39.44,-0.55 -73.71,-6.4 -113.75,-3.75 -73.49,4.88 -156.88,5.76 -231.75,3.37 -3.74,-4.4 -2.34,6.29 -3.36,-7.02l0.65 -14.67c-7.06,-23.21 -4,-169.93 -4,-205.64l0.03 -622.83c4.75,-7.9 -4.78,-2.58 10.93,-6.64 19.18,-4.96 74.83,-5.36 93.66,-5.54l336.89 0.98c0.15,29.03 -4.36,28.86 -7.38,49.31 -2,13.55 -0.49,39.51 -0.49,54.37 0,37.16 0.16,74.35 0.01,111.51 -0.89,218.86 4.57,446.89 0.58,662.63zm-835.92 -855.75c-48.1,11.9 -114.58,22.91 -167.93,31.47 -54.88,8.8 -111.3,20.97 -167.63,30.94 -180.34,31.94 -397.83,70.96 -581.91,108.62 -29.03,5.94 -55.54,5.77 -71.82,25.08 -18.19,21.58 -12.15,51.18 -12.15,86.77l-0.47 4634.53c0,65.39 -2.42,133.73 -1.05,198.55 0.69,32.81 1.52,65.04 1.51,97.91 -0,36.95 5.71,74.94 -12.63,86.45 -11.06,-2.86 -39.31,-26.12 -54.03,-34.84 -63.5,-37.62 -89.9,-17.04 -111.15,-24.77 -27.82,-10.12 -34.1,-65.8 -40.7,-91.25 -23.22,-89.45 24,-84.52 27.25,-136.85 4.15,-66.66 -16.19,-92.77 -58.2,-116.57 -79.4,-44.98 -187.7,-58.16 -296.35,-61.07 -57.58,-1.54 -116.24,-3.72 -173.73,1.11 -54.14,4.55 -106.44,10.62 -161.1,15.95 -35.13,7.77 -80.74,13.41 -117.7,18.94 -48.16,7.21 -172.78,36.27 -219.64,49.63 -26.4,7.53 -76.6,27.43 -102.87,31.71l-0.01 -2.26c-19.08,18.17 -115.13,38.51 -192.94,92.83 -22.25,15.53 -57.21,47.72 -70.14,70.33 -38.94,68.08 -12.33,123.02 47.08,160.93 29.53,18.84 34.51,64.17 46.44,96.91l12.46 39.14c11.01,31.65 15,60.41 33.63,89.92 9.55,15.11 16.92,30.12 22.52,47.77 4.98,15.71 4.68,27.88 1.2,44.95l-6.32 14.21c-3.65,3.67 -1.05,0.28 -4.22,6.62 -19.3,28.17 -16.13,19.04 -50.47,35.57 -66.69,32.12 -69.06,54.59 -101.42,71.89 -19.21,10.27 -36.89,22.89 -50.56,36.69 -33.64,33.97 -30.67,81.27 -27.62,141.48 1.42,28.03 3.97,54.67 3.54,84.25 -0.45,31.08 4.07,54.36 4.34,84.31l-0.37 2.72c-0.29,8.83 4.96,6.66 -18.01,13.64 -7.37,2.24 -15.45,5.05 -22.29,7.54 -14.95,5.43 -29.95,10.43 -45.24,15.36 -46.34,14.93 -139.79,51.84 -182.94,55.03 -16.95,1.25 -29.17,-7.38 -48.61,-9.15 -19.52,-1.78 -43.48,-0.51 -63.54,-0.46l-58.59 -117.95c-36.29,-75.19 -69.85,-173.29 -134.85,-220.9 -71.29,-52.22 -45.51,-31.36 -114.06,-65.12 -28.65,-14.11 -41.12,-12.19 -70.65,-2.38 -22.93,7.61 -45.36,12.59 -68.61,20.57l-131.07 49.25c-88.61,30.14 -182.45,55.42 -263.59,95.59 -39.31,19.46 -69.4,49.71 -54.9,110.37 17.12,71.65 -35.43,65.67 -32.12,141.1 1.32,30.08 5.24,46.77 20.57,68.5 7.06,10.02 13.66,15.44 18.92,24.28 18.35,30.88 480.12,1272.91 551.89,1457.64 8.84,22.76 15.56,43.7 24.97,65.77 9.44,22.15 15.61,43.14 25.06,64.88 16.33,37.57 37.06,91.48 49.65,129.83 6.91,21.04 16.37,42.62 23.89,62.96l73.01 196.63c29.52,73.52 95.46,174.71 144.6,213.61 17,13.45 29.36,25.6 49.97,36.74 55.21,29.85 86.12,20.21 142.69,-1.2 21.87,-8.28 43.64,-14.52 66.99,-22.21 44.8,-14.75 88.87,-31.77 132.4,-47.9 27.32,-10.12 107.53,-42.75 133.64,-45.47l26.55 -12.05c1.69,43.1 14.18,76.94 36.66,96.14 23.69,20.24 75.75,15.37 112.71,12.21l4.81 -1.63c38.25,-10.66 98.65,-26.58 134.91,0.52 10.61,7.93 20.36,22.25 25.43,36.32l33.97 91.64 33.79 7.1c11.21,7.2 16.43,4.69 16.33,20.06 -0.6,21.32 -0.19,42.79 -0.16,64.16 0.04,30.61 -4.13,30.91 -12.62,51.11 -4.53,13.62 -20.06,23.73 -31.66,31.78 -15.65,10.86 -26.99,14.77 -48.92,16.29 -9.5,21.33 -7.84,29 -15.03,37.66 -3.47,28.35 -3.59,31.25 0.67,59.11 4.57,29.89 4.12,26.83 21.46,43.28 43.5,41.25 158.55,45.69 220.13,43.37 34.1,-1.28 91.26,-3.31 116.71,-16.11 25.36,-12.76 62.03,-34.42 63.9,-65.2 4.61,-75.56 6.59,-122.25 -84.49,-144.32 -28.88,-7 -23.82,-6.94 -24.06,-78.73 -0.3,-89.75 15.9,-47.11 57.1,-67.05 9.55,-4.62 21.81,-19.03 24.26,-31.63l5.16 -110.75c-0.46,-33.48 0.66,-76.49 -17,-95.33 -36.96,-39.43 -115.48,-11.14 -141.45,-16.03 -52.18,-9.83 -37.26,-70.36 -37.15,-136.14 0.06,-37.48 -0.85,-75.34 3.78,-112.51 8.13,-65.24 1.78,-55.12 -1.67,-105.14 26.43,-1.52 67.59,2.53 94.72,3.58 46.34,1.79 51.59,-6.69 89.78,-13.71 14.57,4.25 14.38,0.75 41.51,-8.12l140.72 -46.94c39.65,-11.98 79.48,-30.88 121.6,-41.58 5.65,-1.44 4.24,-1.55 9.58,-4.02l88.62 -31.05c10.61,-2.29 7.46,-4.11 19.74,-7.45l70.79 -24.4c26.31,-8.09 39.13,-14.81 80.71,-7.86 21.17,3.54 1.04,7.77 46.82,7.57 17.57,-0.08 35.17,-0.01 52.74,-0.01 0.76,-0.4 1.93,-1.66 2.4,-0.95l58.57 -16.44c53.36,-21.9 94.02,-82.8 96.97,-133.16 4.17,-21.49 7.13,-47.54 10.54,-77l58.92 -26.38 99.95 -35.87c0.54,-0.66 1.43,-2.39 1.78,-1.82 0.34,0.54 1.3,-1.35 1.78,-1.71l17.55 -7.98c8.07,-2.72 16.12,-5.83 24.07,-8.36 58.92,-18.74 265.99,-90.46 319.24,-118.18 10.29,-5.36 3.15,-2.61 11.98,-4.94 16.55,-3.75 77.52,-36.58 93.41,-44.77 90.92,-46.85 59.61,-79 105.94,-103.18 15.71,-8.2 36.9,-12.65 53.34,-17.97l213.41 -66.93c43.13,-13.81 68.14,-29.18 109.64,-8.64l184.19 96.03c16.12,21.04 13.53,623.35 13.79,716.96 0.13,45.71 -2.39,100.75 1.03,145.19 2.18,28.41 3.82,275.3 0.14,291.6 -66.81,-32.96 -437.25,-301.31 -526.21,-362.02 -34.52,-23.56 -70.02,-48.11 -105.76,-73.77l-367.54 -257.92c-11.62,-7.99 -40.57,-32.76 -56.75,-29.07 -7.65,1.74 -24.47,10.6 -27.63,15.27 -4.42,6.55 -9.65,100.91 -7.89,121.96 3.06,36.52 -3.67,152.18 6.14,174.18 9.42,21.13 67.6,58.97 95.02,80.98 33.13,26.6 67.4,53 100.89,78.82 98.66,76.06 197.96,161.27 298.82,236.98 34.15,25.64 67.38,53.42 100.26,79.32 98.47,77.53 202.77,154.76 299.92,232.88 54.69,43.98 153.04,117.97 199.71,159.62 20.76,18.53 24.72,23.09 49.71,40.06 57.14,38.81 98.52,71.07 152.64,113.57 16.2,12.72 30.63,25.09 39.48,50.35 9.06,25.87 -2.11,59.2 7.96,81.99 7.69,17.38 31.25,29.86 48.14,41.2 86.01,57.72 186.69,121.24 268.07,178.16 18.77,13.13 28.78,26.98 49.39,40.62 19.51,12.91 40.29,18.76 58.72,30.49 28.06,17.87 34.8,14.97 73.22,11.81 27.65,-2.27 56.52,-3.22 84.02,-4.81 55.75,-3.23 112.22,-8.48 169.26,-11.98 -4.94,14.85 -12.11,18.18 -16.17,33.8 -3.95,15.19 -3.3,32.11 -2.63,48.43 3.99,97.05 143.27,88.48 211.24,88.27 35.31,-0.11 61.74,6.12 93.6,-5.42 18.91,-6.85 53.38,-24.96 63.79,-37.06 17.51,-20.36 17.4,-62.74 13.81,-86.74 -4.76,-31.81 -37.62,-47.08 -43.05,-52.03 -3.44,-3.13 -1.71,-1.53 -4.22,-4.79 53,-2.06 109.51,-8.04 163.24,-12.34 160.51,-12.85 338.27,-21.46 498.7,-30.89 108.62,-6.38 219.22,-14.33 329.16,-20.65l1158.32 -68.48c55.41,-3.71 112.33,-4.76 167.31,-9.55 54.34,-4.74 113.66,-7.51 167.71,-9.58 34.36,-1.31 133.34,-16.89 159.95,-3.8 -7.51,5.04 -18.1,7.56 -27.32,13.41 -5.75,3.66 -17.33,13.61 -21.8,18.69 -13.49,15.33 -20.4,36.38 -20.24,63.12 0.21,33.49 7.09,42.95 23.6,59.79 14.76,15.05 35.34,19.91 51.97,32.66 6.43,1.59 7.47,2.45 15.98,3.06 21.49,2.39 41.42,0.65 62.63,2.58 19.01,1.73 39.17,3.34 59.32,1.86 54.83,-4.02 165.38,-11.64 169.32,-80.77 6.17,-108.09 -55.48,-92.04 -70.11,-117.76 -6.79,-11.93 -8.98,-39.29 -4.38,-54.71 2.13,-7.15 36.15,-66.3 44.4,-80.2 18.95,-31.96 51.03,-28.35 95.02,-30.86l356.42 -17.74c210.31,-10.47 188.35,3.45 188.34,-185.75 0,-41.7 -0.04,-83.41 -0.04,-125.11l-0.46 -1376.21c-0.03,-45.18 6.54,-76.29 -21.24,-101.35 -17.68,-15.94 -141.98,-61.39 -175.59,-74.81 -91.87,-36.69 -180.61,-67.24 -270.95,-103.55 -31.04,-12.47 -59.93,-21.38 -92.68,-33.08l-27.75 -7.25c-5.2,-17.45 -6.16,-51.43 -1.73,-71.23 34.11,-17.58 117.65,-10.92 160.09,-13.2 35.8,-1.92 45.2,-6.19 60.55,-26.79 13.09,-17.57 9.39,-50.1 9.39,-74.61l0.23 -5866.59c-0,-229.06 -4.35,-462.3 0.02,-690.83l0.02 -261.1c-0.7,-67.2 -8.41,-84.44 -83.9,-85.79 -28.57,-0.51 -56.09,-1.42 -84.3,-1.68 -56.5,-0.53 -113.02,-2.15 -168.64,-2.8 -225.55,-2.62 -450.52,-11.22 -674.42,-13.52 -227.75,-2.34 -456.08,-6.39 -682.86,-11.37 -224.72,-4.93 -447.7,-11.45 -671.7,-13.41 -112.92,-1 -226.41,-4.48 -337.44,-7.46 -113.3,-3.04 -229.13,0.29 -340.7,-5.32l-594.57 -11.15c-15.03,-2.76 -28.72,-32.05 -29.7,-51.64 -7.94,-12.03 -5.76,-24.36 -7.06,-43.69 -2.71,-40.22 -1.51,-100.96 -9.13,-135.66 -18.72,-10.97 -124.17,-14.73 -158.29,-15.96l-18.3 -2.19c-0.59,-0.16 -1.79,0.05 -2.21,-0.87 -0.41,-0.91 -1.48,-0.55 -2.16,-0.94 -37.34,2.79 -85.48,0.03 -124.15,0.06l-500.59 0.23c-53.15,6.39 -55.75,33.43 -60.41,65.46 -5.68,39.1 -8.44,73.37 -10.45,114.76l-12.03 112.82c-3.93,5.57 -26.48,8.31 -37.55,10.98 -60.83,14.68 -222.03,44.57 -276.92,52.88z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M3021.23 595.76c-3.61,37.32 -1.12,451.44 -1.11,492.16l3.83 3066.27c27.45,4.62 53.91,11.84 80.14,18.08 180.36,42.88 385.79,91.58 566.33,129.66 107.32,22.63 217.09,51.17 325.27,71.86l244.08 52.16c22.42,4.76 62.01,16.1 85.12,15.95 3.62,-174.89 0.66,-382.16 0.8,-560.75l-0.59 -1743.16c-314.5,-3.23 -645.37,0.27 -963.44,-0.45 -101.99,-0.23 -72.64,2.48 -108.38,-45.98 -9.8,-13.29 -16.86,-17.3 -16.86,-38.11 0,-42.36 44.39,-184.92 57,-235.2 19.45,-77.58 40.63,-155.59 59.79,-233.91 18.35,-75.01 38.07,-153.39 59.15,-231.22 45.25,-167.05 8.65,-150.8 267.51,-150.92 208.55,-0.09 421.21,1.63 628.28,-0.53 41.54,-0.43 34.18,11.23 34.11,-89.28l-1.83 -761.79c-17.36,-1.11 -304.75,54.92 -328.55,59.24l-660.25 122.97c-55.95,10.26 -278.68,48.81 -330.4,62.95z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M3020.4 4190.53c0.2,265.86 -0.08,531.71 -0.21,797.57 -0.11,223.09 -2.76,473.44 2.53,696.27 1.24,52.31 -3.2,42.7 20.02,76.69 10.64,15.58 28.39,50.01 38.85,61.8 20.86,23.5 65.29,21.69 76.96,24.65 132,33.41 209.57,228.79 240.62,354.25 27.43,110.83 32.01,249.65 -24.67,333.28 -15.56,22.96 -38.95,32.93 -49.75,50.52 -13.93,22.66 -3.39,57.84 0.82,83.52 8.89,54.16 22.69,117.34 26.07,173.18 15.83,0.04 27.57,-5.94 48.11,-5.68 89.19,1.16 144.05,78.19 169.97,94.87 28.93,18.62 26.34,17.03 74.77,2.03 27.67,-8.56 57.66,-15.24 83.6,-22.29 63.07,-17.16 190.63,-53.11 243.29,-73.66l3.49 -199.89c21.55,-13.28 20.43,-5.82 45.89,0.22 19.22,4.56 28.77,11.25 42.68,19.93 23.62,14.74 55.11,26.95 84.61,40.96 35.3,16.76 141.4,71.67 177.8,74.71 -0.8,-670.73 2.15,-1343.36 -0.23,-2013.82 -0.1,-28.89 2.99,-277.13 -3.21,-283.66l-328.12 -69.68c-52.64,-12.48 -110.91,-21.84 -163.23,-35.19 -50.68,-12.94 -110.49,-25.79 -162.24,-36.34 -115.76,-23.6 -583.13,-138.61 -648.43,-144.24z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M4384.31 5134.97l5.44 0 0 21.76 -5.44 0 0 -21.76zm0 -427.01l5.44 0 0 24.48 -5.44 0 0 -24.48zm399.81 -152.31l-2.72 32.64c0,-17.59 -2.77,-15.04 -3.86,-18.52 -4.29,-13.74 -2.12,-9.52 6.58,-14.12zm-233.9 -51.68l78.87 0 0 2.72c-17.13,0 -24.76,2.9 -38.08,2.9 -13.47,0 -23.15,-2.9 -40.8,-2.9l0 -2.72zm-168.63 0l24.48 0 0 2.72 -24.48 0 0 -2.72zm-13.6 -10.88c1.75,16 -1.2,0.83 8.16,13.6l-8.16 0 0 2211.19c0,37.33 -6.48,65.28 10.88,65.28 12.89,0 -3.62,-9.1 35.63,-10.38l22.23 4.19c16.57,7.51 -5.28,6.19 31.9,6.19 20.85,0 41.71,-0.03 62.56,0 24.92,0.03 39.08,-2.86 62.53,-2.74 45.98,0.24 82.45,2.74 127.85,2.74l-356.29 5.44c0,-54.74 -2.72,-100.14 -2.72,-155.03l0 -2148.64 437.89 0c0,51.13 2.72,92.85 2.72,144.15l-8.16 2156.79c0.27,-12.3 2.72,-10.81 2.72,-24.48l0 -2262.87c0,-6.27 -1.89,-8.16 -8.16,-8.16l-304.62 0c-42.34,0 -74.81,2.72 -116.95,2.72zm435.91 -14.34c-0.66,-0.35 -1.57,-0.66 -2.09,-0.81 -12.57,-3.56 -26.48,-1.73 -39.45,-1.62l-304.61 0.18c-112.61,0.33 -102.63,-5.65 -102.29,27.38 3.11,299.77 0.04,608.17 0.01,908.49 -0.01,65.66 -4.09,1310.3 4.92,1381.8l444.73 -1.27c5.34,-24.61 2.87,-539.38 2.93,-578.2 0.19,-110.69 5.04,-1706.72 -4.14,-1735.97z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M4387.03 4414.22c24.96,2.18 -4.64,5.44 -10.88,5.44 0,-28.35 2.52,-13.85 8.16,-38.08l5.44 0c0,13.64 -2.72,16.75 -2.72,32.64zm2.72 -76.15l-5.44 0 0 -40.8 5.44 0 0 16.32 8.16 0 0 8.16c-11.16,2.98 -8.16,2.03 -8.16,16.32zm-7.8 -1931.05l418.48 0c0,169.9 -2.72,332.1 -2.72,500.44 0,86.41 2.72,163.81 2.72,250.22l-5.44 516.76c0,-85.49 -2.72,-164.23 -2.72,-247.5l2.72 -873.05c0,-137.17 0,-58.43 0,-133.27l-99.89 -6.18c-39.97,-5.47 -121.5,3.59 -161.21,3.59l-81.69 -2.75c-13,-0.03 -18.54,-2.53 -27.1,-2.53l-54.4 2.43c-6.51,27.94 -2.72,251.49 -2.72,299.18l0 1659.07c-0,63.75 -5.4,55.4 18.4,57.75 41.44,4.09 179.18,2.08 226.38,2.08 28.37,0 46.89,-2.74 73.43,-2.74 29.44,0 43.84,5.46 70.72,5.46l0 2.72c-14.42,0 -27.44,2.77 -46.23,2.72 -60.39,-0.14 -332.66,-4.71 -348.14,2.72l0 -2034.41c19.69,0 9.01,0.35 13.6,-4.98l-19.98 0.58c-3.15,82.82 -0.13,171.27 -0.1,254.62l-0.75 1278.3c0.08,168.68 -1.27,342.17 4.29,510.09 73.85,1.65 149.15,0.14 223.24,0.59l222.05 -3.01c6.02,-25.85 1.99,-998.71 1.98,-1021.71 -0.27,-340.38 3.58,-683.75 -2.69,-1024.26l-422.24 7.05z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M3549.72 7742.9c-10.5,11.23 -10.98,14.3 -28.11,21.25 -12.23,4.96 -24.42,8.98 -35.77,13.07 -12.43,4.48 -25.25,8.89 -36.43,12.67 -6.45,2.18 -12.4,4.31 -18.21,6.24l-153.81 58.58c-4.25,47.13 -0.34,56.97 -36.1,75.33 -16.57,8.5 -62.66,24.59 -83.36,28.39 -39.21,7.2 -27.42,7.46 -44.42,12.2 -7.63,2.13 -15.58,2.35 -23.08,4.54 -11.35,3.32 -8.53,5.18 -17.05,9.95 -13.55,7.58 -28.07,3.33 -38.86,15.78 -7.01,8.08 -0.79,8.71 -12.67,14.23 -12.31,5.72 -6.36,-0.52 -17.94,10.04 -2.96,50.36 -43.61,111.26 -96.97,133.16l-58.57 16.44c-0.47,-0.72 -1.64,0.55 -2.4,0.95 60.99,0 91,-22.83 128.89,-63.15 12.9,-13.73 18.7,-33.41 25.06,-51.1 5.02,-13.98 9.52,-14.27 16.34,-24.46 9.98,2.33 34.58,5.19 46.15,5.53 8.04,0.23 16.61,-0.41 24.65,-0.18 13.01,0.38 12.42,2.17 24.38,2.82 35.68,1.92 66.62,2.71 103.37,2.71 3.58,13.41 17.24,24.19 16.01,43.04 -1.02,15.7 -6.68,36.04 -5.02,54.7 3.25,36.81 2.61,78.96 2.61,119.85 0,12.34 -2.56,51.57 -1.74,55.96 8.01,42.96 40.32,55.42 72.48,80 6.59,5.03 10.8,8.9 18.23,14.41 23.67,17.56 43.53,34.59 67.25,52.43l55.58 42.32c0.31,0.23 3.36,2.55 4.63,3.53 0.45,0.35 1.11,0.81 1.56,1.16 0.45,0.35 1.1,0.83 1.54,1.18l55.87 44.76c117.28,97.05 239.73,188.19 358.69,283.19l468.53 366.45c0.48,0.33 1.16,0.75 1.62,1.11 0.45,0.34 1.09,0.83 1.52,1.2l5.17 5.7c23.7,28.57 71.57,55.08 103.29,78.93 12.06,9.07 21.67,17.03 33.31,26.53 32.43,26.48 78.78,46.66 93.51,88.72 5.26,15 1.57,40.65 2.47,60.09 0.75,16.21 8.93,33.04 17.89,41.94 7.28,7.23 27.54,19 37.12,25.43 13.02,8.73 23.01,14.47 35.97,23.86 12.65,9.16 22.26,15.86 35.28,24.56l201.82 132.71c7.27,5.43 10.26,10.19 17,15.64 16.09,13.01 34.35,27.28 53.98,35.77 67.68,29.3 33.98,35.9 120.66,29.25 20.97,-1.61 35.77,-2.6 57.05,-2.78l86.77 -5.7c7.92,-0.56 16.85,-2.87 25.69,-4.22 19.52,-2.99 41.38,-1.05 61.5,-1.05 -7,26.23 -18.66,14.82 -13.54,84.25 1.63,22.02 13.37,35.49 27.71,48.45 9.02,8.16 6.97,4.03 17.47,9.72l15.3 9.18c7.41,3.59 10.91,5.12 19.28,7.92 42.75,14.27 49.88,3.08 91.39,6.52 20.63,1.71 28.28,3.65 49.88,0.57 28.28,-4.04 67.89,21.04 141.8,-29.47 17.49,-11.96 31.33,-24.6 31.62,-47.26 0.61,-47.34 8.1,-66.07 -24.14,-101.24l-16.79 -10.41c22.83,-0.51 52.5,-5.66 78.9,-5.41 29.51,0.28 50.54,-5.66 81.56,-5.47 28.45,0.17 51.22,-2.25 81.71,-2.61 14.07,-0.16 27.52,-3.4 38.68,-4.84 13.99,-1.81 28.51,0.32 42.67,-0.85 22.15,-1.83 58.24,-1.55 79.01,-5.3 33.1,-5.97 94.33,-2.19 124.03,-6.52 14.31,-2.09 23.74,-4.48 39.08,-4.44 18.13,0.04 26.68,-1.88 40.87,-2.65 28.96,-1.56 49.98,0 80,-4.31l205.58 -12c15.05,0.06 27.97,0.48 41.97,-1.55l77.6 -6.71c14.13,-0.18 29.7,0.87 43.64,0.12 24.83,-1.34 54.94,-6.05 79,-8.03 13.41,-1.1 29.72,0.13 43.48,-0.04l160.76 -10.59c14.04,-1.57 27.68,0.58 41.98,-1.54l123.59 -6.96c11.94,-0.28 28.79,-3.47 38.75,-4.77l83.56 -3.47c28.33,0.28 50.66,-5.73 78.9,-5.41l163.93 -10.13c26.31,-3.61 55.63,-0.69 82.76,-4.27 31.47,-4.15 96.32,-2 122.06,-5.77 11.32,-1.66 29.25,-3.78 39.2,-4.31 49,-2.62 72.84,-2.28 122.8,-7.75l81.21 -3.11c17.93,0.11 26.71,-1.86 40.87,-2.64 28.71,-1.6 50.86,-5.59 81.51,-5.52l81.99 -5.04c16.74,-1.73 69.83,-5.85 81.2,-0.4 -11.05,15.08 -38.13,19.61 -44.06,70.17 -1.21,10.35 -3.65,23.93 -1.93,38.37 1.28,10.78 6.24,18.98 10.87,27.21 0.3,0.53 0.67,1.22 0.97,1.75 0.3,0.52 0.66,1.23 0.96,1.76 0.3,0.52 0.67,1.23 0.98,1.74 14.1,23.68 51.22,39.91 67.91,41.23 -16.63,-12.75 -37.21,-17.61 -51.97,-32.66 -16.51,-16.84 -23.4,-26.3 -23.6,-59.79 -0.16,-26.74 6.75,-47.78 20.24,-63.12 4.47,-5.08 16.05,-15.03 21.8,-18.69 9.22,-5.86 19.81,-8.38 27.32,-13.41 -26.6,-13.09 -125.59,2.49 -159.95,3.8 -54.05,2.07 -113.37,4.84 -167.71,9.58 -54.98,4.79 -111.9,5.84 -167.31,9.55l-1158.32 68.48c-109.94,6.32 -220.54,14.27 -329.16,20.65 -160.43,9.43 -338.19,18.03 -498.7,30.89 -53.73,4.3 -110.24,10.28 -163.24,12.34 2.52,3.26 0.79,1.66 4.22,4.79 5.43,4.95 38.29,20.22 43.05,52.03 3.59,24 3.7,66.39 -13.81,86.74 -10.41,12.1 -44.88,30.21 -63.79,37.06 -31.86,11.54 -58.29,5.31 -93.6,5.42 -67.97,0.21 -207.25,8.78 -211.24,-88.27 -0.67,-16.32 -1.32,-33.24 2.63,-48.43 4.07,-15.62 11.24,-18.96 16.17,-33.8 -57.04,3.5 -113.51,8.75 -169.26,11.98 -27.49,1.59 -56.37,2.54 -84.02,4.81 -38.42,3.16 -45.16,6.06 -73.22,-11.81 -18.43,-11.73 -39.21,-17.58 -58.72,-30.49 -20.61,-13.64 -30.62,-27.49 -49.39,-40.62 -81.38,-56.91 -182.06,-120.44 -268.07,-178.16 -16.9,-11.34 -40.46,-23.82 -48.14,-41.2 -10.08,-22.79 1.1,-56.12 -7.96,-81.99 -8.85,-25.27 -23.28,-37.63 -39.48,-50.35 -54.12,-42.5 -95.5,-74.76 -152.64,-113.57 -24.99,-16.97 -28.96,-21.53 -49.71,-40.06 -46.66,-41.65 -145.02,-115.64 -199.71,-159.62 -97.14,-78.12 -201.44,-155.35 -299.92,-232.88 -32.88,-25.89 -66.11,-53.68 -100.26,-79.32 -100.86,-75.71 -200.16,-160.92 -298.82,-236.98 -33.49,-25.82 -67.76,-52.23 -100.89,-78.82 -27.41,-22 -85.59,-59.84 -95.02,-80.98 -9.81,-22 -3.08,-137.66 -6.14,-174.18 -1.76,-21.05 3.46,-115.41 7.89,-121.96 3.15,-4.67 19.98,-13.53 27.63,-15.27 16.18,-3.69 45.14,21.09 56.75,29.07l367.54 257.92c35.75,25.67 71.25,50.22 105.76,73.77 88.96,60.72 459.4,329.06 526.21,362.02 3.68,-16.3 2.05,-263.19 -0.14,-291.6 -3.41,-44.44 -0.9,-99.48 -1.03,-145.19 -0.26,-93.61 2.33,-695.92 -13.79,-716.96l-184.19 -96.03c-41.49,-20.54 -66.51,-5.18 -109.64,8.64l-213.41 66.93c-16.44,5.32 -37.62,9.77 -53.34,17.97 -46.33,24.17 -15.02,56.33 -105.94,103.18 -15.89,8.19 -76.85,41.02 -93.41,44.77z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M9064.08 7630.67c-185.81,-56.03 -326.26,-173.1 -561.99,-144.79 -12.72,1.53 -20.1,4.54 -32.56,5.33 -11.49,0.72 -23.58,0.13 -35.17,0.8 -21.55,1.25 -44.97,1.89 -68.28,2.4 -91.64,2.02 -186.3,8.33 -277.34,10.08 -187.79,3.61 -373.02,13.84 -560.39,17.31 -184.53,3.42 -372.71,14.73 -557.42,18.38 -91.95,1.81 -188.61,3.53 -280.06,8.63 -91.17,5.09 -187.78,2.62 -279.6,8.92 -44.68,3.06 -93.5,1.74 -138.92,4.95 -44.12,3.12 -93.44,4.01 -139.22,4.83 -47.86,0.87 -91.59,4.3 -138.71,5.14 -141.75,2.52 -272.71,11.31 -418.91,14.51 -92.04,2.01 -184.49,8.47 -277.45,10.74 -45.68,1.12 -92.12,4.37 -138.68,5.52 -43.51,1.08 -92.9,2.86 -137.98,5.77 -76.24,4.92 -161.73,5.97 -239.97,9.51 -4.34,0.2 -12.87,0.12 -16.74,0.57l-14.95 5.1c28.06,5.2 76.73,30.08 102.92,42.16 108.28,49.93 197.36,111.09 323.09,108.69 92.92,-1.77 185.39,-8 277.31,-10.8 92.45,-2.83 186.58,-4.42 277.76,-10.17 91.58,-5.77 188.07,-7.45 279.91,-9.57 139.7,-3.22 278.15,-11.15 418.97,-14.16 94.43,-2.02 181.85,-8.39 277.3,-10.04 46.04,-0.8 93.3,-4.38 138.66,-5.11 186.91,-3.03 372.73,-16.19 557.58,-19.07 185.91,-2.9 372.5,-15.67 557.66,-19.51 182.93,-3.8 368.98,-16.42 551.97,-21.89l416.09 -16.8c33.97,-1.19 107.35,-0.78 135.11,-7.42z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M2793.23 7949.96c0.27,-0.27 0.81,0.43 0.81,0.81 -0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm125.11 -40.8c-3.21,2.79 -3.69,3.28 -8.11,5.48 -4.22,2.11 -6.44,2.49 -11.92,4.39 -22.57,7.83 -44.94,17.75 -72.44,20.04l92.47 -29.92zm2.72 -2.72l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-114.23 -32.64l5.24 -8.36c-2.69,12.03 -4.67,7.1 -5.24,8.36zm247.5 -10.88c7.58,-6.59 17.04,-7.96 28.89,-11.9 10.5,-3.49 23,-8.97 33.67,-9.85 -8.21,7.13 -53.51,21.01 -62.55,21.76zm87.03 -29.92c-4.75,4.13 -3.37,3.69 -10.88,5.44 4.82,-4.19 3.35,-3.64 10.88,-5.44zm89.75 -29.92c0.49,-0.43 1.31,-1.66 1.55,-1.17l18.32 -8.88c8.49,-3.56 14.81,-4.22 23.64,-6.28 -7.67,6.67 -34.63,15.39 -43.52,16.32zm46.24 -19.04c2.89,-2.89 10.32,4.32 3.03,1.41 -0.06,-0.03 -7.58,3.14 -3.03,-1.41zm48.5 -15.87c-0.3,-1.2 8.62,-2.94 11.33,-3.17l-8.56 4.29 -2.77 -1.12zm16.32 -5.44c-0.91,-1.82 50.23,-21.38 60.29,-22.21 -8.27,7.19 -16.97,8.89 -28.22,12.58 -6.51,2.14 -7.83,2.49 -14.37,4.67 -0.16,0.05 -7.41,2.66 -7.95,2.93 -6.58,3.23 -3.48,1.62 -6.57,4.3l-3.17 -2.26zm-543.5 -63.01l2.72 0 0 24.48 -2.72 0 0 -24.48zm704.43 8.19c11.01,-3.72 10.57,-6.07 13.89,-18.65 15.7,-59.48 20.14,-151.42 14.76,-211.81 -16.15,-181.47 -103.55,-416.39 -248.65,-525.97 -40.46,-30.56 -33.55,-36.04 -92.04,-20.38 -32.68,8.75 -64.77,17.77 -99.39,28.19 -68.4,20.59 -131.29,39.59 -197.15,60.45 -104.88,33.22 -236.72,74.11 -340.64,114.39 -9.43,3.66 -27.45,8.99 -35.4,13.31 -0.48,0.26 -5.2,3.66 -5.28,3.71l-3.24 3.22c95.72,67.54 172.88,197.64 223.93,335.68 41.7,112.77 64.85,226.46 65.69,351.21 0.47,71.06 -15.6,95.01 -18.05,121.33 17.56,-2.32 76.59,-22.36 95.51,-28.69 28.77,-9.63 60.16,-20.91 90.76,-31.91 96.72,-34.76 493.17,-159.52 533.12,-194.11l-6.34 -1.42c8.33,-3.2 4.29,-0.95 8.54,-6.74l3.17 2.27 -3.17 5.92zm2.72 -13.62c-0.97,-5.15 3.42,-9.67 1.72,-1.72 -0.04,0.19 0.08,11.22 -1.72,1.72zm-718.03 -38.08c8.19,-9.1 8.16,18.42 8.16,27.2l-8.16 -27.2zm731.63 -13.6c-2.24,9.59 -2.72,8.94 -2.72,21.76l-2.72 0c0,-11.44 -1.01,-14.35 5.44,-21.76zm-737.07 -24.48c1.42,2.05 1.47,1.27 3.07,5.2 5.25,12.89 2.54,17.44 -0.35,22 -2.6,-11.14 -2.72,-12.77 -2.72,-27.2zm737.07 -5.44l2.72 0 0 16.32 -2.72 0 0 -16.32zm2.72 -38.08l2.72 0 0 27.2 -2.72 0 0 -27.2zm-747.94 13.6l2.72 0 0 13.6 -2.72 0 0 -13.6zm-8.16 -21.76c-0.98,-5.15 3.42,-9.67 1.72,-1.72 -0.04,0.18 0.08,11.21 -1.72,1.72zm-8.16 -27.2c-0.98,-5.15 3.42,-9.67 1.72,-1.72 -0.04,0.19 0.08,11.22 -1.72,1.72zm-8.16 -24.48c-0.98,-5.15 3.42,-9.67 1.72,-1.72 -0.04,0.19 0.08,11.22 -1.72,1.72zm-8.16 -29.92l2.72 0 0 13.6 -2.72 0 0 -13.6zm777.86 -24.48l2.72 48.96c0,-20.66 -2.72,-29.58 -2.72,-48.96zm-2.72 -16.32l-783.3 19.04zm-8.16 -13.6l791.46 -5.44zm-791.46 5.44c0,-6.96 4.31,-0.44 1.62,0 -0.03,0.01 -1.62,7.59 -1.62,0zm788.74 -32.64l2.72 0 0 21.76 -2.72 0 0 -21.76zm-796.9 16.32c-0.98,-5.15 3.42,-9.67 1.72,-1.72 -0.04,0.19 0.08,11.22 -1.72,1.72zm-10.88 -24.48c0,-6.96 4.31,-0.44 1.62,0 -0.03,0.01 -1.62,7.59 -1.62,0zm-8.16 -16.32c0,-8.3 4.22,-1.66 3.99,2.1 -0.57,9.34 -3.99,-0.96 -3.99,-2.1zm807.78 -16.32l2.72 0 0 16.32 -2.72 0 0 -16.32zm-815.94 -5.44c3.29,3.62 2.95,3.45 5.44,8.16 -7.15,-2.67 -4.04,0.05 -5.44,-8.16zm-8.16 -16.32c3.29,3.62 2.95,3.45 5.44,8.16 -7.15,-2.67 -4.04,0.05 -5.44,-8.16zm815.94 -10.88c0,-6.96 4.31,-0.44 1.62,0 -0.03,0.01 -1.62,7.59 -1.62,0zm-824.1 -5.44c6.01,4.18 3.38,0.44 5.44,8.16l-5.44 0 0 -8.16zm-8.16 -13.6c6.01,4.18 3.38,0.45 5.44,8.16l-5.44 0 0 -8.16zm-8.16 -10.88c0,-8.3 4.22,-1.66 3.99,2.1 -0.57,9.34 -3.99,-0.96 -3.99,-2.1zm829.54 -10.88c8.25,6.05 5.44,4.7 5.44,19.04l-5.44 -19.04zm-837.7 -2.72c-1.44,-7.77 6.6,1.02 2.14,0.44 -4.92,-0.64 -1,5.74 -2.14,-0.44zm832.26 -10.88c-0.97,-5.15 3.42,-9.67 1.72,-1.72 -0.04,0.18 0.08,11.21 -1.72,1.72zm-840.42 -2.72c0,-6.96 4.31,-0.44 1.62,0 -0.03,0.01 -1.62,7.59 -1.62,0zm-8.16 -13.6c0.27,-0.27 0.81,0.43 0.81,0.81 -0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm840.42 -10.88c0,-6.96 4.31,-0.44 1.62,0 -0.03,0.01 -1.62,7.59 -1.62,0zm-848.58 0l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm845.86 -8.16c0.27,-0.27 0.81,0.43 0.81,0.81l0 -0c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-854.02 -5.44c0.27,-0.27 0.81,0.43 0.81,0.81 -0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm848.58 -10.88c-2.78,-3.43 -4.67,-9.37 0.44,-2.55 2.92,3.9 4.67,8.85 -0.44,2.55zm-10.88 -27.2c8.36,6.12 4.39,-1.75 5.44,10.88 -8.93,-6.54 -3.79,1.97 -5.44,-10.88zm-10.88 -21.76c5.24,-6.15 7.44,4.94 8.16,13.6 -6.64,-4.87 -2.32,-1.83 -4.77,-6.11l-3.39 -7.49zm-21.76 -51.68c7.26,8.35 21.55,37.12 21.76,46.24 -11.01,-8.07 1.52,3.53 -11.22,-21.42 -4.22,-8.27 -8.35,-15.42 -10.54,-24.82zm-8.16 -16.32c3.28,3.63 2.95,3.45 5.44,8.16 -7.14,-2.66 -4.04,0.05 -5.44,-8.16zm-8.16 -13.6c0,-6.96 4.3,-0.44 1.62,0 -0.03,0.01 -1.62,7.59 -1.62,0zm-563 -59.84l-78.88 21.76zm78.88 -21.76c3.21,-4.38 0.66,-3.44 6.31,-4.76 11.88,-2.77 9.11,1.47 10.01,2.05 -6.41,1.49 -8.03,2.52 -16.32,2.72zm24.48 -10.88c6.2,-1.45 6.25,-2.11 13.6,-2.72l-13.6 2.72zm24.48 -8.16c3.15,-3.15 15.5,4.6 3.4,1.11 -0.33,-0.09 -8.12,3.61 -3.4,-1.11zm27.2 -5.44c3.21,-4.38 0.66,-3.44 6.31,-4.76 11.88,-2.77 9.11,1.47 10.01,2.05 -6.41,1.49 -8.03,2.52 -16.32,2.72zm24.48 -8.16c7.51,-10.25 9.56,-2.14 19.04,-8.16 0.89,0.64 8.36,3.86 -6.16,7.44 -4.59,1.13 -8.13,0.72 -12.88,0.72zm27.2 -8.16c6.05,-8.25 4.7,-5.44 19.04,-5.44 -6.05,8.26 -4.7,5.44 -19.04,5.44zm30.05 -7.75c5.65,-8.31 -0.52,-5.53 13.46,-5.85l-13.46 5.85zm111.38 -38.48c1.51,0 4.44,-0.05 5.26,0.18 4.92,1.42 2.91,0.75 5.62,2.54 -1.51,0 -4.44,0.05 -5.26,-0.18 -4.81,-1.38 -3.02,-0.89 -5.62,-2.54zm27.2 -8.16l13.6 -2.72c6.68,4.77 -1.5,5.44 -13.6,5.44l0 -2.72z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M4983.02 9695.92c1.48,-25.36 19.3,-50.7 30.42,-67.09 21.05,-31.02 11.19,-29.47 27.64,-70.23 58.82,-145.77 26.18,-114.8 24.28,-246.64 -5.03,-350.43 15.45,-703.47 -11.74,-1052.13 -31.49,-12.17 -69.69,-34.67 -102.04,-50.46 -33.76,-16.48 -280.72,-136.17 -307.15,-144.37 -0.66,349.79 5,714.52 -0.93,1062.6l-8.53 345.41c13.08,10.62 29.93,19.05 44.35,28.65 51.11,34.03 269.24,183.19 303.7,194.23z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M4833.58 7452.01c-1.19,13.97 -0.66,5.3 2.62,8.26 -1.34,23.6 5.06,70.1 -3.13,87.15l-0.47 -2.65c-5.09,-34.28 0.41,-54.7 -2.17,-79.03 -2.06,-19.45 -12.97,-7.7 -25.1,-42.89 -4.54,-13.18 -5.36,-8.77 -7.18,-17.3l2.24 -434.69c-0.1,17.48 2.41,23.49 2.85,37.95 1.72,57.5 -2.93,108.4 -2.81,157.84 0.06,26.29 0.02,52.59 0,78.88 -0.02,28.92 2.74,47.24 2.72,76.16 -0.03,53.68 -10.64,87.76 27.64,127.5 0.35,0.36 1.11,1.11 1.39,1.41 0.29,0.3 0.91,0.96 1.39,1.42zm-427.51 70.94c8.36,3.03 2.72,-4.25 7.12,6.48l1.04 39.75c-13.97,1.16 -4.75,6.04 -19.04,13.6 -7.66,-15.97 -2.72,-68.17 -2.72,-92.47l8.16 0 0 8.16 10.88 0 -5.44 24.48zm410.74 -62.05c-6.74,-0.41 0,0 0,0zm-437.94 -549.91l0 70.71c0,24.37 4.94,51.73 3.73,69.29 -1.78,25.57 -3.79,46.88 -3.73,72.14 0.21,90.37 3.14,260.69 -2.4,343.18 -0.97,14.38 5.93,18.12 7.57,29.71 2.59,18.24 0.27,58.09 0.27,78.6 -0.01,0.07 -10.88,19.45 -10.88,43.51l0 1145.03c39.12,0 -7.12,6.33 51.82,10.74 24.28,1.81 16.54,8.68 46.02,8.37 44.97,-0.48 46.09,8.09 108.86,8.09l0 -1131.43c0,-23.03 -2.72,-34.61 -2.72,-57.12 -12.58,3.36 -8.16,10.77 -8.16,27.2l-5.44 0c0,-46.92 6.05,-21.5 8.16,-40.8l5.44 0c0.18,8.28 1.23,9.92 2.72,16.32l5.44 0c3.89,-16.69 17.24,-29.86 30.73,-39.98 27.87,-20.92 26.07,-8.1 60.17,-13.26 34.62,-5.24 106.82,-1.15 145.72,-1.15 -11.53,8.01 -21.4,5.57 -40.81,5.42 -19.12,-0.14 -27.11,2.64 -43.39,2.84 -32.84,0.4 -57.37,2.4 -90.01,2.46 -22.02,0.04 -29.96,9.06 -44.17,23.83 -14.59,15.16 -15.66,33.68 -15.53,55.18 0.81,139.8 -2.7,275.05 -2.7,416.15 0,248.41 0,496.81 0,745.22 -18.12,-1.51 -33.32,-4.55 -54.36,-5.47l-108.78 -16.33c-23.21,-0.45 -35.51,-3.7 -54.44,-8.11 0,-15.52 -2.72,-18.81 -2.72,-35.36l2.72 -1022.64c0,-144.55 2.72,-285.55 2.72,-432.45l2.72 -378.05c-0.01,-8.4 -0.7,-19.49 -0.27,-27.47 0.75,-14.28 1.79,-11.09 11.15,-16.05 -3.49,14.96 -5.44,33.13 -5.44,51.68zm59.84 -70.71l217.58 2.72c27.35,-0 45.72,2.84 70.7,2.74 27.83,-0.11 45.29,-2.74 73.45,-2.74l-394.37 5.44c7.87,-5.47 20.63,-8.16 32.64,-8.16zm397.49 619.99l-2.62 -8.26c-2.58,-16.24 -13.47,-25.68 -20.67,-47.05 -6.01,-17.85 -7.82,-173.97 -7.68,-197.51 0.55,-90.81 2.84,-180.92 2.6,-271.98 -0.31,-116.69 5.29,-100.24 -37.3,-99.92 -102.4,0.77 -330.6,-6.76 -404.67,3.25 -4.29,76.47 -0.02,165.6 -0.05,243.54 -0.11,198.82 -16.57,1599.24 -1.93,1694.43 19.17,8.23 202.14,31.48 227.38,28.51 4.26,-58.3 2.34,-126.41 2.39,-186.26l-0.17 -563c-0.1,-125.1 1.19,-250.23 1.39,-375.33 0.12,-71.6 -4.07,-110.09 69.78,-114.57 37.49,-2.27 150.81,5.01 175.97,-13.55 3.21,-24.43 5.4,-73.45 -4.42,-92.31z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M3492 1262.46l-50.46 196.32c-17.51,65.55 -35.5,129.85 -52.87,194.88 -14.61,54.69 -90.46,350.81 -92.57,405.56 431.66,-1.96 861.08,1.59 1292.91,-5.23 5.91,-29.76 16.62,-62.95 23.85,-93.1 23.79,-99.16 41.1,-196.58 58.47,-297.44 11.7,-67.93 21.95,-135.62 33.38,-203.26 5.65,-33.44 11.5,-66.96 17.17,-100.1 4.77,-27.89 16.87,-74.75 18.01,-100.12 -28.15,-4.35 -48.69,-1.36 -75.4,-1.72 -293.35,-3.99 -566.67,-7.29 -862.22,-3.01 -52.01,0.75 -103.94,2.07 -155.94,3.05 -48.61,0.91 -107.13,0.21 -154.33,4.17z\"/>\n   <rect class=\"hpc-eta-fil5\" transform=\"matrix(1 -0 -0.175482 1 3601.38 1389.64)\" width=\"941.67\" height=\"515.8\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1694.32 6157.85l-4.22 1.53c10.12,4.64 7.26,0.94 9.04,9.11 -19.38,9.78 -40.5,19.11 -61.38,27.64 -10.22,4.17 -39.68,18.26 -51.08,15.27l-15.48 -8.81c0.39,0.73 0.89,1.63 1.19,2.17 13.67,24.16 8.19,17.48 25.53,38.29l9.06 14.43c28.32,33.39 57.81,91.47 78.19,132 51.15,101.72 85.4,189.85 118.07,300.45 10.68,36.15 37.68,133.54 37.35,171.06 4.68,7.42 5.19,13.4 7.11,30.74 1.22,11.08 2.56,15.36 3.88,28.93 5.57,57.38 2.92,150.33 11.07,184.53l35.85 159.25c9.14,36.27 2.82,40.82 23.56,39.32 17.96,-0.49 129.88,-42.8 139.07,-51.48l-3.16 -8.55c-14.73,4.52 3.33,9.74 -22.63,8 -7.31,-121.23 14.19,-60.46 -16.45,-225 -6.47,-34.74 -11.91,-69.56 -17.98,-104.43l-18.7 -107.72c-6.01,-54.48 -73.86,-275.26 -97.29,-333.11 -7.23,-17.86 -39.32,-84.46 -37.16,-103.16 28.76,-15.22 272.67,-92.31 310.3,-104.7l782.31 -259.82c50.45,-17.14 103.66,-39.05 152.6,-54.58 -6.7,-22.05 -37.88,-79.18 -50.8,-101.84 -37,-64.91 -77.73,-125.47 -137.17,-168.03 -33.76,-24.17 -62.37,-32.49 -115,-23.94 10.87,36.69 32.01,45.48 26.62,132.19 -19.55,13.32 -109.23,42.43 -137.21,50.63 -132.12,38.72 -289.6,97.85 -423.28,138.74 -50.42,15.42 -92,32.28 -140.53,46.84 -89.4,26.82 -192.02,62.58 -282.97,92.92 -23.38,7.8 -45.42,15.23 -69.35,23.14 -13.56,4.48 -22.21,9.52 -33.26,13.14 -12.86,4.22 -19.99,-3.92 -35.7,-5.16z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1697.25 7675.54c25.93,95.68 45.98,207.24 70.04,306.76l51.2 232.88c5.89,25.43 13.72,49.07 20,72.84l462.01 -158.33c50.42,-16.45 109.69,-42.5 151.27,-56.05 -0.53,-29.64 -8.38,-56.83 -13.79,-83.66 -25.99,-128.93 -88.83,-442.14 -119.27,-531.47 -16.74,2.29 -435.81,145.71 -470.57,157.72 -52.22,18.04 -101.69,38.69 -150.89,59.31z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M2731.9 5756.25c8.98,-2.05 4.43,-3 12.46,1.56 -0.52,2.72 1,10.36 -7.57,7.96 -4.54,-1.28 -3.93,-2.43 -4.89,-9.51zm-1216.47 -83.32l29.23 99.66c8.89,12.53 46,91.68 45.39,106.44l-7.81 -6.24c-0.43,-0.33 -1.35,-0.98 -1.71,-1.25l-3.68 -2.4 -1.88 -2.61 1.88 2.61c2.1,20.2 16.56,62.16 23.05,83.46 5.75,18.85 25.41,65.66 25.6,80.69 4.88,-1.01 2.9,-1.5 3.24,4.65 33.95,44.52 0.14,10.82 50.83,45.05 27.34,18.46 34.2,30.51 63.67,30.58 21.06,0.04 121.7,-37.43 148.48,-46.33l439.08 -145.7c47.84,-15.94 98.75,-30.51 145.21,-48 46.99,-17.69 98.23,-31.37 147.8,-48.03 28.71,-9.65 121.06,-40.52 139.87,-54.09l-55.67 -213.29c-6.48,-24.15 -11.02,-48.27 -18.78,-72.14 -10.56,1.37 -17.66,10 -28.89,16.22 -9.43,5.22 -18.42,10.18 -27.96,15.59 -81.35,46.11 -237.76,91.1 -330.58,112.37 -48.91,11.21 -98.21,21.7 -147.4,29.56 -85.73,13.7 -231.79,32.72 -318.47,34.14 -136.7,2.23 -164.76,0.31 -289.01,-20.77 -15.6,-2.65 -23.86,-10.34 -31.48,-0.16z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M2311.62 6269.12c7.92,28.09 25.68,64.82 37.24,93.06 11.67,28.51 22.77,65.1 33.55,97.17 22.8,67.8 40.43,131.71 58.69,202.2 17.97,69.39 34.43,140.77 48.97,212.12 7.55,37.04 34.42,184.97 50.22,209.96 65.06,-21.28 131.45,-47.83 199.73,-67.58 67.61,-19.56 133,-45.93 198.27,-65.95 -6.2,-50.54 -31.02,-156.78 -42.05,-220.3 -12.87,-74.04 -25.81,-145.99 -42.33,-218.99 -16.86,-74.5 -93.33,-337.18 -134.11,-386.58 -25.13,3.21 -78.55,24.56 -105.39,33.49 -35.96,11.97 -68.98,22.36 -105.1,33.8 -44.01,13.94 -171.33,52.45 -197.68,77.61z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M4773.24 388.93l2.72 0 0 13.6 -2.72 0 0 -13.6zm-375.33 57.12l-2.72 -54.39c6.67,7.67 2.72,29.55 2.72,54.39zm410.69 -97.91l0 8.16 -390.74 -1.81c18.2,-7.17 117.84,-3.67 143.31,-3.56 19.31,0.08 28.17,-2.91 48.87,-2.8 16.31,0.08 32.68,0.08 48.99,0 20.71,-0.11 29.56,2.88 48.88,2.8 17.29,-0.07 34.56,0.05 51.83,0.03 17.96,-0.03 28.28,-2.81 48.86,-2.81zm-432.44 833.91l-0.26 -793.37c-0.02,-18.14 -2.37,-13.07 8.42,-18.78l-0 780.58c-0.08,48.93 -6.92,35.21 38.07,35.35l231.19 2.73c51.3,0 87.76,-8.37 120.04,15.95 7.89,5.94 2.63,5.7 13.23,8.53 10.12,-21.09 5.36,-305.73 5.44,-372.61 0.03,-21.05 -2.61,-34.26 -2.83,-51.57l1.89 -398.14c5,-13.39 6.44,-19.6 11.82,-23.54 2.69,6.52 0.13,11 -2.41,19.2 -3.19,10.31 -3.16,10.68 -3.13,24.21l0.1 777.97c0.03,26.8 -0.59,30.88 -5.44,51.67 -0.42,-0.49 -1.02,-1.95 -1.18,-1.54 -0.16,0.41 -0.93,-1.23 -1.15,-1.57 -2.45,-3.82 -1.13,-1.67 -3.07,-5.09 -15.42,-27.04 -33.12,-38.36 -65.27,-38.09 -39.19,0.33 -72.78,-4.01 -114.36,-2.77 -15.37,0.46 -36.95,4.17 -51.73,5.39l-180.01 0.14c1.02,13.31 -0.37,2.62 3.36,7.02 74.87,2.39 158.26,1.51 231.75,-3.37 40.04,-2.66 74.31,3.19 113.75,3.75 46.03,0.64 46.84,17.72 67.4,49.17l11.32 -26.97c2.33,-5.66 1.98,-4.04 3.31,-6.13 4,-215.74 -1.47,-443.76 -0.58,-662.63 0.15,-37.16 -0.01,-74.35 -0.01,-111.51 0,-14.85 -1.52,-40.82 0.49,-54.37 3.02,-20.45 7.52,-20.28 7.38,-49.31l-336.89 -0.98c-18.83,0.18 -74.48,0.58 -93.66,5.54 -15.71,4.06 -6.18,-1.26 -10.93,6.64l-0.03 622.83c-0.01,35.71 -3.06,182.42 4,205.64z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1894.56 6404.04c1.55,16.37 23.16,62.33 29.25,78.51 28.73,76.34 54.55,165.2 74.63,243.45 14.89,58.06 26.07,114.4 41.09,170.91 15.11,56.85 23.61,116.78 37.85,174.41 14.18,57.35 25.71,115.57 39.17,173.92 5.29,22.95 5.19,18.56 24.21,29.96 59.21,35.51 53.73,40.1 58.14,12.02 17.61,-112.11 143.56,-105.05 233.53,-162.92 12.87,-8.28 16.11,-2.64 52.96,-26.08l-8.12 -55.54c-4.15,-21.28 -5.72,-35.34 -10.18,-55.14 -24.65,-109.37 -39.04,-233.2 -62.52,-329.19l-59.03 -202.18c-23.09,-67.84 -45.42,-120.9 -76.98,-184.73 -24.03,4.58 -68.77,23.04 -96.13,31.94 -31.51,10.26 -62.69,20.32 -94.25,30.86l-142.79 48c-16.03,6.9 -27.53,15.53 -40.83,21.77z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M2760.04 6116.82c12.63,36.07 25.71,60.1 37.47,93.33 64.63,182.53 102.81,322.84 140.44,511.71 14.13,70.93 32.51,144.14 47.78,214.84 16.04,0.07 60.28,-17.11 79.04,-23.4 21.57,-7.23 141.5,-43.96 155.62,-45.31 9.34,-0.89 69.44,-2.53 77.13,-22.26 0.32,-20.57 -3.25,-39.69 -7.14,-58.84 -3.62,-17.76 -5.51,-37.91 -8.09,-56.76 -15.13,-110.8 -36.85,-227.38 -55.5,-336.36 -13.46,-78.66 -80.02,-341.63 -123.5,-397.08 -15.68,1.08 -69.54,21.65 -88.95,27.89 -51.52,16.56 -233.89,70.9 -254.3,92.25z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1628.69 6976.92c4.33,-2.38 8.28,-4.19 14.42,-6.05 1.08,-0.32 6.16,-1.71 6.38,-1.72 7.15,-0.49 4.33,-0.25 7.84,1.99 19.1,-32.46 16.42,-123.53 10.71,-163.71 -7.04,-49.6 -20.59,-104.97 -35.89,-149.2 -27.31,-78.95 -77.43,-175.92 -147.14,-220.38 -7.76,3.13 -13.13,8.48 -22.77,11.98 -7.97,2.89 -17.87,4.84 -25.42,7.13l-246.51 80.1c-65.03,20.87 -37.25,10.92 -91.92,38.73l22.16 25.12c6.79,7.84 14.17,15.41 19.97,23.32 12.06,16.43 23.99,35.62 35.04,54.85 22.14,38.53 41.39,76.05 58.63,120.47 42.27,108.92 45.58,141.91 66.49,247.02l9.12 32.43c0.17,-0.41 0.73,1.35 1.15,1.99 26.8,-5.59 55.78,-19.32 80.11,-26.59 46.95,-14.02 207.63,-74.69 237.64,-77.46z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M2625.96 5370.33c-20.38,24.04 -77.52,50.04 -106.75,64.08 -38.45,18.47 -86.83,32.33 -127.72,46.13 -40.47,13.66 -93.25,26.74 -134.95,36.17 -142.17,32.17 -325.02,47.9 -472.35,46.65 -52.07,-0.44 -297.27,-9.98 -261.65,-72.83 19.38,-34.19 188.59,-95.14 236.74,-107.78 219.37,-57.62 211.64,-52.72 434.19,-81.99l170.03 -5.08c56.11,-0.1 108.33,4.45 160.22,11.56 27.29,3.74 79.21,12.4 98.64,31.25 5.97,5.8 11.68,22.32 3.61,31.84zm103.06 -6.89c4.4,-27.98 -22.88,-51.73 -41.7,-62.9 -66.49,-39.47 -193.06,-48.19 -272.14,-48.23 -137.58,-0.06 -274.59,4.05 -401.88,26.96 -118.63,21.36 -236.6,47.25 -345.26,84.58 -53.98,18.55 -102.65,42.07 -147.96,67.44 -40.03,22.42 -104.04,52.85 -99.94,111.56 2.02,28.93 26.55,51.43 47.83,61.12 27.55,12.54 44.12,20.49 76.36,29.79 62.16,17.94 117.56,24.66 190.92,25.17 70.67,0.49 142.21,1.84 212.04,-4.98 202.38,-19.76 516.76,-73.19 682.78,-176.47 48.1,-29.92 90.04,-57.25 98.96,-114.05z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M4193.43 6943.17c-4.96,-15.02 -13.48,-19.54 -23.28,-30.16 -7.47,-8.09 -15.13,-15.17 -25.18,-23.74 -36.8,-31.34 -43.19,-32.75 -66.21,-25.35 -100.69,32.39 -394.74,99.3 -463.53,140.25 8.83,17.08 20.8,33.77 30.83,52.39 27.9,51.84 53.13,125.93 68.74,183.98 32.41,120.48 31.21,174.29 39.28,296.05 14.59,-2.61 41.13,-13.27 57.05,-18.37 123.89,-39.73 296.29,-80.25 398.2,-126.73 52.31,-23.86 54.65,-23.45 66.03,-86.46 8.06,-44.6 8.23,-93.31 3.94,-137.96 -6.85,-71.33 -30.12,-137.43 -65.4,-197.12 -2.12,-3.58 -5.53,-8.94 -7.51,-11.5l-8.39 -7.93c1.55,-5.22 3.3,-4.86 -1.46,-4 1.43,-5.68 2.78,-4.5 -2.77,-4.5 0.18,5.78 -1.69,5.35 2.77,4.5 -1.29,5.39 -3.2,5.32 1.46,4 3.63,10.02 26.09,44.32 38.26,75.7 8.76,22.59 24.61,66.03 26.82,90.54 -128.03,56.16 -259.2,83.24 -391.86,126.94 -189.73,62.5 -122.98,56.11 -172.84,-76.46 -8.18,-21.74 -11.38,-37.02 -18.25,-55.92 -7.07,-19.49 -17.95,-23.07 -18.09,-41.62 31.8,2.84 226.18,-61.08 267.59,-74.82l199.07 -59.34c35.31,-9.46 40.87,-15.46 64.75,7.63z\"/>\n   <path class=\"hpc-eta-fil6\" d=\"M8382.39 649.82l-0.19 -1.07c0,5.53 -1.19,4.32 4.31,2.62 -1.73,5.45 -2.8,4.65 2.64,2.99 -1.79,5.22 -2.91,4.48 2.39,3.09 -1.55,4.94 -2.69,4.24 2.26,3.12 -1.23,4.67 -2.33,3.93 2.28,3.12 6.61,14.07 19.68,15.57 22.81,33.35l-197.04 -0.13c-25.73,-0.33 -26.23,-1.13 -48.83,32.14 -6.65,9.78 -11.96,14.08 -9.43,28.05 18.99,9.7 59.06,5.2 85.6,5.38l223.06 1.61c14.91,1.54 18.11,10.95 26.11,20.28 14.44,16.86 26.49,31.67 40.9,48.87 38.63,46.09 81.16,29.25 81.29,-1.08 0.08,-17.9 -46.65,-63.99 -58.69,-78.74 -28.24,-34.61 -57.08,-61.36 -83.85,-95.61 -12.82,-16.41 -27.69,-32.33 -41.52,-48.31 -17.66,-20.41 -26.25,-27.4 -64.83,-27.44 -330.67,-0.29 -661.8,-8.86 -990.13,-8.12 -84.53,0.19 -64.92,-13.61 -64.9,206.64 0,27.88 -8,65.1 19.27,70.27l274.09 0.39c54.13,-0.06 130.07,4.51 181.52,-0.65 10.12,-13.12 8.67,-8.16 8.72,-29.13 0.05,-18.64 3.1,-24.34 -8.02,-32.94 -7.54,-4.69 -322.46,-3.33 -386.3,-2.43 -10.99,0.15 -17.46,2.34 -23.02,-4.28 -4.96,-5.46 -9.46,-36.51 7.16,-39.16 0.75,-0.12 1.54,-0.27 2.4,-0.37l277.38 -0.03c29.01,0.22 49.05,2.13 35.8,-57.84 -38.49,-16.7 -299.07,4.24 -325.46,-8.61 -2.78,-9.74 -3.2,-23.9 1.1,-31.21 7.61,-7.67 359.15,-1.59 416.39,-0.99 29.49,0.31 114.78,-2.21 136.17,2.94 9.44,28.91 -4.76,177.16 3.98,195.09 6.55,13.46 16.7,10.99 36.71,11.13 13.51,0.1 22.88,0.2 27.8,-8.93 8.04,-14.95 -2.62,-179.71 4.3,-191.75 3.67,-6.38 -0.62,-1.25 6.03,-5.6l365.16 -0.5c-0.85,5.33 -1.64,3.41 4.59,3.84z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M3970.48 364.44c-19.16,-5.57 -69.44,4.87 -86.87,10.64l-83.16 14.75c-14.24,4.01 -30.62,3.38 -42.14,6.82 -36,10.75 -23.25,3.09 -41.38,7.57 -8.11,2 -9.51,3.26 -19.47,5 -8.28,1.45 -14.39,0.82 -22.36,2.12 -6.8,1.11 -11.93,4.69 -18.19,6.29 -11.07,2.84 -15.24,-0.98 -44.61,7.06 -9.72,2.66 -9.86,1.52 -22.02,2.46 -9.72,0.75 -12.16,2.65 -19.45,5.02l-186.3 34c-13.36,3.11 -29.39,3.26 -41.14,7.82l-104.79 20.32c-53.28,7.52 -103.74,19.72 -146.07,25.28 -16.42,2.15 -22.45,6.12 -40.45,8.51 -15.2,2.02 -23.86,5.63 -40.88,8.07 -23.55,3.37 -46.55,27.59 -49.04,51.59l-0.28 4976.94c0,45.82 6.93,73.29 -13.6,87.04l-22.89 -15.19c-106.17,-76.87 -137.15,-1.75 -154.55,-68.47l-17.63 -72.14c-5.76,-17.73 -8.76,-12.41 -2.43,-33.47 13.98,-46.52 47.69,-76.52 30,-138.24 -1.51,-5.28 -12.41,-24.7 -15.81,-30.43 -22.69,-38.19 -105.02,-71.36 -141.48,-78.82 -7.34,-1.5 -12.1,-0.79 -19.46,-2.3 -7.47,-1.54 -10.54,-3.68 -18.98,-5.5l-80.12 -9.64c-16.38,-0.68 -22.68,-2.88 -40.74,-2.78l-130.59 -2.68c-32.99,0 -93.18,1.83 -127.07,6.2 -10.51,1.35 -30.4,3.32 -41.81,4.43 -16.23,1.57 -22.94,2.58 -40.61,2.9l-27.96 4.67c-10.06,3.99 -5.47,-3.26 -7.72,6.17 -27.69,-7.74 -39.55,0.81 -60.5,4.49 -12.17,2.14 -18.76,0.49 -29.26,3.37 -10.59,2.9 -17.16,4.85 -29.59,5.77 -14.01,1.03 -16.71,2.05 -27.36,5.27 -12.82,3.88 -18.26,1.32 -31.31,4.05 -11.04,2.31 -13.03,5.8 -25.76,6.88 -29.3,2.49 -14.14,3.34 -28.23,7.13l-107.73 25.54c-21.03,3.43 -9.78,4.88 -24.62,8.01 -7.35,1.55 -7.45,0.71 -13.68,2.64l-50.81 17.02c-12.13,4.44 -6.67,-0.45 -11.37,10.09 26.27,-4.28 76.46,-24.19 102.87,-31.71 46.86,-13.36 171.48,-42.42 219.64,-49.63 36.96,-5.53 82.57,-11.17 117.7,-18.94 54.66,-5.33 106.96,-11.4 161.1,-15.95 57.49,-4.82 116.16,-2.64 173.73,-1.11 108.65,2.9 216.95,16.08 296.35,61.07 42,23.8 62.34,49.91 58.2,116.57 -3.26,52.33 -50.47,47.4 -27.25,136.85 6.61,25.45 12.88,81.13 40.7,91.25 21.25,7.73 47.66,-12.86 111.15,24.77 14.72,8.72 42.97,31.98 54.03,34.84 18.35,-11.51 12.63,-49.5 12.63,-86.45 0,-32.88 -0.82,-65.1 -1.51,-97.91 -1.37,-64.82 1.05,-133.16 1.05,-198.55l0.47 -4634.53c0,-35.59 -6.04,-65.19 12.15,-86.77 16.27,-19.31 42.79,-19.14 71.82,-25.08 184.08,-37.65 401.57,-76.68 581.91,-108.62 56.33,-9.97 112.74,-22.14 167.63,-30.94 53.34,-8.56 119.83,-19.58 167.93,-31.47 54.89,-8.3 216.09,-38.19 276.92,-52.88 11.07,-2.67 33.62,-5.41 37.55,-10.98l12.03 -112.82c2.01,-41.39 4.77,-75.66 10.45,-114.76 4.65,-32.03 7.25,-59.08 60.41,-65.46l500.59 -0.23c38.66,-0.03 86.81,2.72 124.15,-0.06 31.42,-1.58 66.94,0.12 98.88,0.15 34.55,0.04 62.16,-5.38 83.42,15.31 20.4,19.85 14.74,49.17 14.54,83.37 -0.19,33.58 0.1,66.94 0.31,100.48 0.99,19.59 14.67,48.88 29.7,51.64l594.57 11.15c111.57,5.61 227.4,2.28 340.7,5.32 111.04,2.98 224.52,6.46 337.44,7.46 224,1.97 446.98,8.48 671.7,13.41 226.77,4.98 455.11,9.03 682.86,11.37 223.89,2.3 448.87,10.89 674.42,13.52 55.62,0.65 112.14,2.27 168.64,2.8 28.2,0.27 55.72,1.18 84.3,1.68 75.49,1.35 83.2,18.59 83.9,85.79l-0.02 261.1c-4.37,228.52 -0.02,461.77 -0.02,690.83l-0.23 5866.59c0,24.52 3.69,57.05 -9.39,74.61 -15.35,20.6 -24.75,24.87 -60.55,26.79 -42.45,2.28 -125.99,-4.38 -160.09,13.2 -4.43,19.8 -3.47,53.78 1.73,71.23l27.75 7.25c32.75,11.7 61.64,20.6 92.68,33.08 90.34,36.31 179.08,66.86 270.95,103.55 33.61,13.42 157.91,58.87 175.59,74.81 27.79,25.06 21.22,56.18 21.24,101.35l0.46 1376.21c0,41.7 0.04,83.41 0.04,125.11 0.01,189.19 21.97,175.28 -188.34,185.75l-356.42 17.74c-43.98,2.51 -76.06,-1.1 -95.02,30.86 -8.25,13.9 -42.27,73.04 -44.4,80.2 -4.6,15.43 -2.41,42.78 4.38,54.71 14.63,25.72 76.28,9.67 70.11,117.76 -3.94,69.13 -114.49,76.76 -169.32,80.77 -20.14,1.47 -40.31,-0.13 -59.32,-1.86 -21.21,-1.93 -41.14,-0.19 -62.63,-2.58 34.88,19.38 132.82,6.22 171.36,5.11l75.44 -17.03c38.69,-15.25 59.71,-52.22 51.2,-98.72 -2.42,-13.21 -1.23,-31 -17.07,-48.22 -21.99,-23.93 -53.42,-26.35 -60.07,-65.11 -4.52,-26.34 7.63,-31.6 15.7,-45.7 20,-34.93 27.99,-63.21 53.59,-74.23 33.79,-14.55 140.4,-8.46 176.92,-13.46l207.34 -12.96c11.57,-0.12 20.4,0.68 31.63,-1.08 25.42,-3.99 45.55,7.58 114.11,-5.49 28.95,-5.52 27.48,3.89 53.01,-9.54 22.9,-12.04 32,-34.94 35.26,-61.66l0 -93.47 0 -1517.65 0 -53.66c-0.89,-12.11 -2.96,-23.84 -7.39,-34.14 -6.72,-15.64 -15.22,-24.33 -29.13,-33.43 -11.8,-7.72 -86.97,-36.11 -107.35,-42.24l-29.05 -11.74c-8.56,-3.22 -15.87,-6.78 -22.97,-9.67l-187.29 -71.09c-0.7,-0.21 -1.45,-0.37 -2.13,-0.59l-128.35 -51.16c-14.91,-6.01 -33.33,-16.57 -54.76,-10.5 -2.2,-12.44 -9.47,-10.08 -24.5,-13.59l0 -57.12c10.27,-6.88 9.88,-9.68 35.33,-10.9l95.22 -2.69c46.79,0.17 81.93,0.15 98.32,-48.55 8.14,-24.2 5.03,-64.57 5.03,-92.89l0 -6628.14c-0.02,-32.84 2.64,-58 2.72,-92.47 0.04,-19.52 -2.35,-30.51 -2.81,-46.15 -1.6,-53.52 9.64,-111.84 -84.22,-111.6l-97.92 0.01c-19.51,0.04 -30.5,-2.35 -46.14,-2.81 -15.97,-0.48 -33.24,0.95 -49.06,0.1 -124.86,-6.74 -257.75,-6.08 -383.5,-5.43 -19.92,0.1 -28.35,-2.81 -46.12,-2.83l-144.24 -2.62c-19.35,0.02 -30.97,-1.91 -46.22,-2.73 -61.17,-3.31 -133.5,-0.13 -195.84,0.02 -32.13,0.07 -60.31,-2.58 -95.28,-2.63 -17.78,-0.02 -26.2,-2.93 -46.13,-2.83l-239.36 -2.7c-16.34,0 -32.68,-0 -49.02,0.06 -18.97,0.08 -26.42,-2.93 -46.14,-2.82 -16.34,0.09 -32.68,-0.03 -49.01,0.05 -19.92,0.1 -28.35,-2.81 -46.13,-2.83l-291.11 -2.63c-56.27,0.03 -131.06,-5.64 -187.68,-5.43 -19.76,0.07 -29.58,-2.63 -46.12,-2.84l-288.41 -2.6c-19.76,0.07 -29.58,-2.63 -46.12,-2.84 -16.2,-0.2 -33.03,0.68 -49.15,0.2 -15.64,-0.47 -26.63,-2.86 -46.15,-2.81 -65.08,0.15 -130.95,0.92 -195.94,0.11 -16.23,-0.2 -24.31,-2.95 -43.39,-2.85l-144.28 -2.6c-16.53,-0.2 -26.36,-2.91 -46.12,-2.84l-291.06 -2.67c-19.72,0.11 -27.18,-2.91 -46.14,-2.82 -33.5,0.16 -59.89,-2.66 -95.26,-2.66l-144.23 0.07c-23.07,0.25 -24.84,0.66 -33.53,-15.43 -14.87,-27.5 -12.63,-45.53 -12.63,-85.28 0,-23.84 5.34,-101.07 -4.06,-118.33 -3.43,-6.29 -5.63,-9.63 -10.07,-14.4 -36.5,-39.21 -134.87,-4.09 -226.78,-18.01 -4.1,-0.62 -8.35,-1.14 -12.74,-1.57l-104.28 0c-26.93,1.27 -52.94,2.75 -74.51,2.72 -129.57,-0.16 -259.45,1.01 -388.97,-0.04 -18.64,-0.15 -29.25,1.78 -40.69,8.27 -34.36,19.48 -29.2,47.72 -32.29,65.63 -9.87,57.2 -5.5,80.97 -12.84,134.03 -13.49,97.41 4.38,88.63 -28.19,91.48 -10.08,0.88 -11.86,2.5 -19.49,4.99l-133.7 26.77c-8.07,1.34 -14.38,0.27 -22.75,1.73 -13.33,2.33 -23.76,7.34 -37.14,9.09l-69.13 12.45c-8.28,4.51 -4.66,-1.23 -6.7,7.32z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M1550.8 7058.12c8.23,22.28 44.66,67.44 57.82,82.96 32.12,37.87 76.83,77.89 132.1,76.99 28.01,-0.46 32.39,-3.99 43.15,-24.62 93.56,-179.4 18.58,-404.01 -34.9,-570.97 -37.4,-116.79 -33.9,-94.42 -80.14,-197.12 -36.93,-82.03 -97.54,-200.96 -177.96,-238.37 -56.71,-26.38 -67.68,-22.83 -91.22,10.27 -42.26,59.43 -48.89,142.13 -28.46,227.39 15.4,-1.94 35.93,-14.35 56.73,-17.45 170.01,-25.33 241.9,254.5 269.2,381.26 15.75,73.1 13.4,175.36 -45.45,226.6 -38.42,33.44 -68.16,32.99 -100.87,43.06z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M2602.84 8015.23c2.24,-26.87 13.6,-19.69 13.6,-97.91l2.72 0c0,14.26 1.49,38.66 0.01,51.69 -1.78,15.57 -3.77,5.25 -6.98,17.52 -2.11,8.07 1.53,11.14 1.53,23.26 -5.65,1.51 -7.47,2.1 -10.88,5.44zm19.04 -10.88c0.69,-5.59 14.36,0.67 2.54,0.26 -1.04,-0.04 -3.3,5.84 -2.54,-0.26zm122.39 -87.03l2.72 0 0 19.04 -2.72 0 0 -19.04zm8.16 -51.68l2.72 0 0 32.64 -2.72 0 0 -32.64zm-135.99 -59.84l2.72 0 0 46.24 -2.72 0 0 -46.24zm-10.88 -70.71c4.77,5.49 4.64,4.12 5.52,13.52 0.54,5.79 -0.08,15.6 -0.08,21.84l-2.72 0c0,-13.57 -2.72,-18.84 -2.72,-35.36zm144.15 -19.04l5.44 57.12c0,19.95 0,39.89 0,59.84l-2.72 0c0,-19.95 -0.09,-39.91 0.02,-59.85 0.12,-22.44 -2.74,-34.04 -2.74,-57.1zm-8.16 -43.51c7.65,8.8 4.37,5 5.77,18.7 0.9,8.83 2.39,11.82 2.39,22.09 -12.32,-9.03 -0.67,-8.65 -8.16,-40.8zm-152.31 -13.6c12.36,14.23 -2.5,3.5 10.73,32.79 2.85,6.31 5.59,31.55 5.59,40.65l-6.57 -15.19c-1.94,-8.03 -0.84,-11.67 -2.36,-19.4 -3.15,-15.93 -7.39,-5.24 -7.39,-38.85zm146.87 -16.32l2.72 0 0 13.6 -2.72 0 0 -13.6zm-152.31 -8.16c1.32,5.67 2,5.63 2.17,8.9 0.07,1.39 1.56,4.25 -2.17,10.14 -2,-8.59 -4.68,-11.92 0,-19.04zm-8.16 -27.2c1.49,6.4 2.53,8.03 2.72,16.32 -4.38,-3.21 -3.44,-0.66 -4.76,-6.31 -2.74,-11.74 1.38,-9 2.04,-10.01zm133.27 -59.84l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-171.35 -38.08c4.51,3.02 3.74,1.07 6.65,6.95 2.26,4.59 0.65,2.35 1.93,6.23l10.34 27.74c10.26,21.34 2.83,8.32 7.58,22.33 4.77,14.05 6.14,6.01 6.14,26.5 -6.72,-4.92 -3.86,-7.66 -12.87,-30.65l-11.24 -35c-3.73,-10.18 -7.59,-12.81 -8.53,-24.11zm163.19 10.88c4.87,5.61 4.65,4.09 5.44,13.6 -8,-5.86 -5.05,0.41 -5.44,-13.6zm-5.44 -13.6c0.27,-0.27 0.81,0.43 0.81,0.81l-0.81 -0.81zm-2.72 -5.44c0,-6.96 4.31,-0.44 1.62,0 -0.03,0 -1.62,7.59 -1.62,0zm-163.19 -8.16c9.8,2.62 7.28,0.25 8.16,10.88l-5.44 0c-0.72,-8.42 0.03,-5.14 -2.72,-10.88zm155.03 -10.88c-0.98,-5.15 3.42,-9.67 1.72,-1.72 -0.04,0.19 0.08,11.22 -1.72,1.72zm-163.19 -10.88c8.36,6.12 4.39,-1.75 5.44,10.88 -1.81,-2.09 -1.77,-0.77 -3.55,-4.61 -2.31,-4.99 -0.97,-4.21 -1.89,-6.27zm157.75 -16.32l3.05 10.77 -5.77 0.11c0,-1.51 -0.05,-4.44 0.18,-5.26 1.5,-5.2 0.39,-2.66 2.54,-5.62zm-223.02 -111.51l26.37 41.63c2.05,3.51 1.31,1.99 4.04,6.84l25.66 55.94c6.01,12.29 6.1,0.76 6.49,17.99l-54.57 -105.9c-5.73,-8.98 -6.96,-4.21 -7.98,-16.5zm212.14 92.47c6.01,4.18 3.38,0.44 5.44,8.16l-5.44 0 0 -8.16zm-8.16 -13.6c-0.98,-5.15 3.42,-9.67 1.72,-1.72 -0.04,0.18 0.08,11.21 -1.72,1.72zm-8.16 -16.32c-0.98,-5.15 3.42,-9.67 1.72,-1.72 -0.04,0.18 0.08,11.21 -1.72,1.72zm-8.16 -16.32c-0.98,-5.15 3.42,-9.67 1.72,-1.72 -0.04,0.18 0.08,11.21 -1.72,1.72zm-8.16 -19.04c-0.98,-5.15 3.42,-9.67 1.72,-1.72 -0.04,0.18 0.08,11.21 -1.72,1.72zm-8.16 -16.32c0,-6.96 4.31,-0.44 1.62,0 -0.03,0 -1.62,7.59 -1.62,0zm-179.51 -19.04c0,-6.96 4.31,-0.44 1.62,0 -0.03,0.01 -1.62,7.59 -1.62,0zm-8.16 -13.6c0.27,-0.27 0.81,0.43 0.81,0.81l0 0c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-8.16 -10.88l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-24.48 -32.64l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-8.16 -8.16l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm160.47 -16.32c0,-6.96 4.31,-0.44 1.62,0 -0.03,0.01 -1.62,7.59 -1.62,0zm-195.83 -16.32l11.33 14.05c-1.09,0.19 -1.43,-1.7 -2.95,-3.4 -10.31,-11.58 -4.39,0.39 -8.39,-10.65zm187.67 5.44l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-13.06 -11.42l1.72 -2.63 5.35 6.44 -1.73 2.63 -5.35 -6.44zm-188.21 -4.9c4.58,2.27 4.78,2.5 8.16,5.44 -16.81,-1.43 -4.31,-1.1 -8.16,-5.44zm70.71 -32.64c2.94,-2.94 14.85,4.08 4.48,1.4 -2.41,-0.62 -9.07,3.19 -4.48,-1.4zm13.6 -2.72c5.79,-7.9 -0.38,-5.13 13.6,-5.44 -5.87,5.11 -3.96,4.43 -13.6,5.44zm21.76 -13.6c1.51,0 4.44,-0.05 5.26,0.18 4.93,1.42 2.91,0.75 5.62,2.54l-10.88 -2.72zm-115.1 51.68c3.48,6.59 2.06,5.48 9.15,10.88 14.49,11.03 6.12,0.99 26.89,21.91 11.61,11.69 22.74,21.82 33.44,34.11 17.41,20 41.02,55.8 54.89,81.14 30.86,56.36 61.37,118.44 84.76,187.69 23.68,70.07 44.42,142.04 53.35,217.03 4.65,39.05 10.62,85.33 8.02,126.76 -1.14,18.09 -2.48,43.39 -5.72,61.76 -3.53,20.06 -10.84,35.45 -12.91,53.33 16.24,-1.62 54.64,-16.6 72,-22.15 25.52,-8.16 49.97,-13.34 66.19,-29.78 34.21,-34.69 35.14,-105.16 34.3,-155.21 -1.91,-114.4 -26.83,-224.41 -61.37,-315.63 -37.83,-99.92 -94.81,-221.58 -181.12,-292.31 -66.1,-54.18 -52.49,-44.26 -122.45,-14.11 -18.13,7.81 -51.28,16.07 -59.44,34.58z\"/>\n   <path class=\"hpc-eta-fil7\" d=\"M1566.84 5499.42c49.11,32.04 206.4,33.39 274.46,32.81 93.85,-0.8 195.08,-10.75 286.76,-23.49 87.65,-12.18 173.48,-30.73 253.56,-56.41 48.09,-15.42 179.59,-66.59 210.26,-99.47 -203.31,-32.31 -361.73,-33.63 -561.06,-2.09 -89.35,14.14 -164.87,31.1 -247.99,57.54 -40.17,12.78 -197.42,71.99 -215.98,91.12z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1708.03 7411.44l13.6 0 0 2.72 -13.6 0 0 -2.72zm24.48 -2.72c2.89,-2.89 10.31,4.32 3.03,1.41 -0.06,-0.03 -7.58,3.14 -3.03,-1.41zm-171.74 141.43c11.03,28.11 49.25,41.41 74.02,57.24 14.16,9.04 25.59,16.91 40.29,24.92 16.24,8.85 28.01,1.13 46.31,-5.44l383.67 -130.45c9,-3.01 180.52,-57.84 184.11,-71 0.29,-1.08 1.07,-1.18 1.54,-1.82 -61.74,-31.56 -115.01,-69.62 -173.65,-103.02 -40.8,-23.23 -67.52,-5.93 -105.76,7.05 -18.04,6.12 -32.49,11.45 -50.07,18.82 -67.67,28.37 -80.06,26.07 -155.05,51.08 -37.07,12.36 -11.45,10.18 -52.8,3.41 -20.14,-3.3 -42.9,2.06 -59.62,7.34l-26 8.22c-136.51,46.54 -73.69,61.08 -106.98,133.65z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M4197.99 6950.52c-4.67,1.32 -2.75,1.39 -1.46,-4 -4.46,0.85 -2.59,1.28 -2.77,-4.5l-0.32 1.15c-23.88,-23.09 -29.44,-17.09 -64.75,-7.63l-199.07 59.34c-41.41,13.74 -235.79,77.66 -267.59,74.82 0.14,18.54 11.01,22.13 18.09,41.62 6.86,18.9 10.07,34.18 18.25,55.92 49.87,132.57 -16.89,138.96 172.84,76.46 132.67,-43.7 263.83,-70.78 391.86,-126.94 -2.21,-24.51 -18.06,-67.96 -26.82,-90.54 -12.17,-31.38 -34.63,-65.68 -38.26,-75.7z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M3565.65 7672.54c0.24,-10.69 -0.75,-6.38 2.72,-13.6l10.77 3.05c-5.82,8.51 -4.38,5.72 -13.49,10.55zm16.32 -10.88l40.8 -21.76c4.73,3.38 4.63,2.46 -16.26,13.65 -7.82,4.19 -12.49,7.83 -24.53,8.1zm-8.16 -8.16l-2.72 0c0,-27.96 5.44,-48.19 5.44,-76.16l2.72 0c0,12.67 0.83,28.39 -0.11,40.69 -0.99,13.04 -5.33,20.68 -5.33,35.46zm97.91 -73.43l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm8.16 -29.92l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm2.72 -13.6c0,-6.95 4.3,-0.44 1.62,0 -0.03,0.01 -1.62,7.59 -1.62,0zm-119.67 -138.71l1.76 3.68c0.17,0.45 11.84,41.39 11.84,86.07l-2.72 0c0,-31.27 -10.37,-66.65 -10.88,-89.75zm127.83 108.79l2.72 -46.24c0,19.69 -2.72,27.24 -2.72,46.24zm-149.59 -201.26l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-2.72 -8.16c0,-6.96 4.31,-0.44 1.62,0 -0.03,0 -1.62,7.59 -1.62,0zm-5.44 -29.92c1.9,8.16 4.69,15.49 5.44,24.48l-5.85 -10.87c-4.2,-11.53 -0.96,-11.45 0.41,-13.61zm130.55 0l5.44 16.32c-6.04,-6.95 -5.18,-4.62 -5.44,-16.32zm-10.88 -32.64l2.27 -3.17c1.52,-0.61 8.21,28.26 8.61,33.09l-10.88 -29.92zm-5.44 -24.48l5.85 13.46c-5.3,-5.5 -5.04,-3.94 -5.85,-13.46zm-8.16 -19.04c0,-6.96 4.3,-0.44 1.62,0 -0.03,0 -1.62,7.59 -1.62,0zm-8.16 -21.76c-0.98,-5.15 3.42,-9.67 1.72,-1.72 -0.04,0.18 0.08,11.21 -1.72,1.72zm-144.15 -13.6l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-32.64 -65.28c8.42,6.17 29.59,49.48 32.64,62.55 -3.06,-3.52 -1.27,-0.9 -4.51,-6.37 -1.35,-2.27 -2.79,-5.35 -3.7,-7.18l-24.42 -49.01zm163.19 48.96c5.24,-6.15 7.44,4.94 8.16,13.6 -5.15,-5.93 -4.05,-9.58 -8.16,-13.6zm-19.04 -48.96c7.84,9.02 18.78,31.99 19.04,43.52 -8.29,-6.08 -1.51,1.05 -6.33,-9.99l-4 -9.6c-4.34,-9.74 -7.26,-12.63 -8.71,-23.93zm-10.88 -16.32c4.7,-4.7 9.12,7.36 2.42,2.08 -0.23,-0.19 -6.42,1.91 -2.42,-2.08zm-5.44 -13.6c-7.85,-7.85 7.85,7.85 0,0zm-10.88 -13.6c-1.46,-7.93 5.81,0.7 2.78,0.51 -0.03,-0 -0.59,-0.06 -0.64,-0.07 -4.92,-0.64 -1,5.75 -2.14,-0.44zm-27.2 -43.51c6.25,2.26 3.89,1.46 7.7,5.9l16.78 29.46c-7.45,-5.46 -1.36,-0.47 -6.98,-9.34l-17.5 -26.02zm-2.72 -5.44c-2.78,-3.43 -4.67,-9.37 0.44,-2.54 2.93,3.9 4.68,8.85 -0.44,2.54zm-10.88 -16.32c-7.85,-7.85 7.85,7.85 0,0zm-8.16 -10.88l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-152.31 0l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-8.16 -10.88l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-8.16 -8.16l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-8.16 -5.44c0,-6.96 4.3,-0.44 1.62,0 -0.03,0 -1.62,7.59 -1.62,0zm-15.78 -14.14l1.72 -2.63 5.35 6.43 -1.73 2.63 -5.35 -6.44zm-11.42 -10.33l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-5.44 -8.16l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm138.71 -2.72l0.81 0.81c-0.05,-0.05 -1.08,-0.54 -0.81,-0.81zm-127.83 -2.72zm97.91 -8.16l-97.91 8.16zm97.91 -8.16l2.26 -3.17 13.92 6.3c-3.17,1.69 5.92,3.32 -7.79,1.81 -15.89,-1.74 1.72,-1.02 -8.39,-4.94zm-70.72 2.72c6.04,-1.41 9.26,-3.97 18.4,-2.28 6.1,1.12 2.78,0.18 6.08,2.28 -6.92,1.61 -15.73,5.55 -24.48,0zm62.56 -8.16l0 2.72 -29.92 0c4.92,-4.28 4.19,-5.14 12.78,-4.78 4.03,0.17 7.68,2.06 17.14,2.06zm-111.96 21.76c7.72,8.76 42.16,38.06 66.27,64.54 19.67,21.59 39.34,48.99 55.58,74.71 32.56,51.56 61.68,111.79 84.05,174.68 25.8,72.5 39.56,126.01 52.26,207.78 13.76,88.64 5.35,154.59 1.63,242.49 9.74,-1.13 47.8,-19.68 59.11,-26.9 60.43,-38.6 76.95,-99.16 79.15,-174.31 3.14,-106.9 -18.53,-200.11 -50.31,-290.76 -37.35,-106.55 -108.04,-253.12 -217.18,-293.48 -29.63,-10.96 -38.82,-9.98 -68.83,-2.63 -24.94,6.1 -48.13,7.44 -61.73,23.87z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M4810.17 2366.97c-7.12,-78.55 25.36,-205.6 -9.79,-245.4 -20.88,-23.64 -46.1,-8.2 -71.43,-0.22 -6.12,-12.75 -20.2,-35.12 -33.77,-38.96 -18.14,-5.13 -34.86,21.01 -42.91,29.61 -37.65,40.24 -50.4,24.41 -115.64,21.95 -150.14,-5.65 -211.03,40.78 -180.44,178.68 15.59,70.26 107.74,63.11 166.94,58.93 46.06,-3.25 92.16,-9.1 138.6,-11.28 51.84,-2.43 96.42,8.89 148.45,6.68z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M1926.47 8313.52c-17.52,4.72 -31.24,10.17 -50.44,13.82 -41.76,7.95 -83.95,-2.05 -98.29,23.97 -11.22,20.36 5.22,53 12.47,71.68l11.8 78.36c27.47,184.01 -36.25,141.7 -50.05,177.43 -42.78,110.68 114.21,33.93 108.23,116.93 -1.74,24.13 -7.8,103.56 -2.56,116.66 35.84,9.7 217.02,-0.93 269.25,0.33 10.31,-15.44 19.05,-59.66 18.12,-84.31 -3.58,-94.84 -124.44,-77.75 -205.8,-94.66 -11.11,-119.95 18.98,-323.66 -12.73,-420.22z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M2534.81 8032.16c14.42,-2.59 21.76,-25.85 28.04,-40.29 35.56,-81.89 12.64,-214.09 -5.06,-292.79 -32.96,-146.52 -87.85,-272 -160.39,-370.31 -25.74,-34.88 -77.17,-90.46 -127.23,-70.14 -13.7,5.57 -20.8,22.93 -24.31,41.27 -7.22,37.78 -4.19,43.81 58.19,70.39 20.96,8.93 45.62,4.16 55.12,10.35 40.22,26.18 18.75,56.86 17.21,65.48 -1.71,9.58 -2.49,20.38 -1.94,30.62 1.19,22.08 74.99,372.81 78.41,380.53 27.09,8.48 33.01,-5.07 58.56,-3.51 13.38,13.58 17.33,40.87 12.1,66.05 -6.52,31.39 -32.28,26.79 -44.41,36.68 -0.03,0.1 -11.06,87.67 55.71,75.66z\"/>\n   <path class=\"hpc-eta-fil1\" d=\"M5021.08 8126.87c9.34,-13.52 7.88,-17.71 7.2,-38.21 -0.43,-12.93 2.08,-27.65 3.5,-40.67 25.45,-233.72 -128.91,-213.52 -183.23,-249.51 -24.65,-16.33 -85.89,-65.16 -122.25,-31.47 -30.17,27.95 -26.89,101.47 -23.2,152.61 0.91,12.58 2.46,26.27 3.57,39.02 1.85,21.2 2.23,18.75 16.28,28.27 68.21,46.2 160.7,79.92 234.83,116.2 17.38,8.51 40.5,27.15 63.3,23.76z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M5021.08 8126.87c-22.79,3.39 -45.92,-15.26 -63.3,-23.76 -74.13,-36.28 -166.62,-70 -234.83,-116.2 -14.05,-9.52 -14.43,-7.07 -16.28,-28.27 -1.11,-12.75 -2.67,-26.44 -3.57,-39.02 -3.69,-51.14 -6.97,-124.66 23.2,-152.61 36.37,-33.69 97.6,15.14 122.25,31.47 54.32,35.99 208.67,15.79 183.23,249.51 -1.42,13.03 -3.94,27.74 -3.5,40.67 0.69,20.5 2.15,24.7 -7.2,38.21zm41.29 93.18c4.06,-91.03 -0.98,-207.74 0.14,-305.45 0.38,-33.2 4.5,-66.81 3.9,-97.94 -64.21,-27.5 -127.55,-53.58 -185.12,-80.45 -33.96,-15.85 -152.14,-67.64 -200.47,-64.18 -3.2,37.3 -4.02,77.31 -7.02,115.1 -5.55,69.9 -18.71,155.08 1.69,222.46 13.94,46.05 28.75,47.48 58.97,60.73 67.04,29.4 278.1,145.73 327.9,149.74z\"/>\n   <path class=\"hpc-eta-fil1\" d=\"M1566.84 5499.42c18.56,-19.12 175.81,-78.34 215.98,-91.12 83.12,-26.44 158.65,-43.4 247.99,-57.54 199.34,-31.54 357.75,-30.22 561.06,2.09 -30.67,32.88 -162.17,84.05 -210.26,99.47 -80.08,25.68 -165.91,44.23 -253.56,56.41 -91.68,12.74 -192.91,22.7 -286.76,23.49 -68.06,0.58 -225.35,-0.77 -274.46,-32.81zm1059.12 -129.09c8.07,-9.52 2.37,-26.05 -3.61,-31.84 -19.43,-18.84 -71.34,-27.5 -98.64,-31.25 -51.89,-7.11 -104.1,-11.65 -160.22,-11.56l-170.03 5.08c-222.55,29.26 -214.82,24.37 -434.19,81.99 -48.15,12.64 -217.36,73.59 -236.74,107.78 -35.63,62.85 209.58,72.39 261.65,72.83 147.33,1.25 330.18,-14.48 472.35,-46.65 41.7,-9.43 94.49,-22.51 134.95,-36.17 40.89,-13.8 89.28,-27.66 127.72,-46.13 29.23,-14.04 86.37,-40.04 106.75,-64.08z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M2885.7 7990.75c3.17,-11.89 6.81,-7.51 30.26,-15.98 11,-3.97 22.14,-10.15 35.01,-11.22 -3.58,13.43 -3.59,8.09 -10.83,9.69l-54.44 17.51zm1.39 -11.51c-17.79,18.61 -0.3,31.62 -18.64,54.21 -29.42,36.25 -82.5,31.55 -122.13,19.92 -88.21,-25.89 -83.73,13 -182.4,25.36 -89.09,11.16 -51.96,17.14 -79.96,37.74 -15.39,11.32 -117.13,43.37 -141.54,51.92 -69.8,24.46 -167.62,54.75 -230.04,79.27 -20.19,7.93 -103.39,30.12 -113.75,43.19 20.89,8.75 115.36,11.59 143.58,6.26 31.55,-5.96 183.49,-62.52 227.22,-76.98l225.75 -78.85c35.79,-12.18 76.25,-27 113.85,-38.56 23.41,-7.2 36.82,10.5 55.33,15.28 26.36,6.81 44.18,5.04 72.39,4.83 61.91,-0.46 81.51,-41.85 97.81,-50.51 0.39,-6.35 -1.55,-5.47 3.87,-4.82 -0.75,-8.26 -1.56,-4.12 2.98,-4.42 -1.61,-5.88 -3.48,-5.33 1.88,-4.52 0.15,-16.25 6.67,-33.38 8.01,-51.5 2.96,-39.68 8.43,-37.62 9.16,-53.06 -14.45,1.82 -59.11,17.8 -73.4,25.24z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M3141.24 5939.72c53.57,117.12 102.85,280.7 130.02,408.37 12.59,59.16 21.6,121.23 35.38,180.45 15.61,-3.48 18.89,-14.88 26.32,-29.75 21.42,-42.86 30.42,-81.85 32.21,-131.68 2.38,-66.21 -10.41,-133.4 -26.55,-188.6 -24.4,-83.49 -87.18,-231.18 -161.69,-269.07 -5.97,-3.04 -34.95,-14.15 -42.42,-9.34 -12.05,7.76 3.18,31.88 6.72,39.61z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1484.22 7573.71c-9.22,13.46 -10.16,6.03 -16.76,28.91 3.61,17.82 39.35,81.96 49.42,103.21 10.77,9.38 47.01,59.29 59.35,76.83 4.91,6.98 16.87,19.22 12.13,27.46 -7.86,-0.38 -9.49,-4.41 -23.18,-7.3 10.24,31.67 35.39,74.62 49.93,106.52l46.07 108.71c22.18,65.03 38.45,111.95 56.5,177.38 2.89,10.49 6.1,20 8.25,29.86 2.15,9.86 3.17,22.81 5.72,32.79 8.79,5.16 58.37,27.28 66.88,24.83 6.46,-21.7 -32.35,-139.93 -32.64,-176.19l-6.64 -15.67c-1.22,-4.94 -2.18,-10.71 -3.23,-15.64 -23.19,-108.81 -31.34,-113.66 -69.92,-209.65 -16.14,-40.16 -32.7,-71.51 -52.27,-108.23l-56.86 -105.08 -2.03 -2.08 -2.64 -4.78 -5.44 -9 -24.98 -31.87c-9.58,-13.46 -19.71,-20.67 -25.89,-34.47l-23.49 0.76 -8.31 2.7z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1252.11 7148.02c9.81,-153.32 -63.03,-367.03 -152.41,-488.22 -10.44,-14.15 -93.63,-105.26 -113.72,-90.29 -22.13,16.49 9.48,67.72 15.46,79.43l105.8 215.25c24.65,50.58 46.54,96.08 70.15,144.64l52.62 107.84c5.44,10.42 12.67,24.89 22.1,31.34z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M520.3 6280.62c1.93,-4.58 -2.21,-2.73 6.01,-2.25 6.22,-6 70.82,-30.43 83.82,-35.56 14.47,-5.71 28.77,-11.21 43.38,-16.46 28.05,-10.08 36.23,-7.11 43.89,-15.63 -11.65,-7.14 -66.63,-32.96 -74.91,-43.17 -55.95,-12.44 -95.45,-9.06 -140.5,12.8 -21.8,10.58 -28.6,18.37 -55.9,27.96 -19.99,7.02 -39.2,14.74 -59.97,21.69 -65,21.77 -124.64,36.56 -185.45,65.22 -42.24,19.91 -37.62,24.01 -48.46,29.77 28.06,3.02 166.43,-10.01 201.68,-13.92 65.41,-7.25 122.37,-20.81 186.4,-30.46z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1472.43 8735.98c-3.05,-4.41 5.41,-1.87 -7.91,-4.41 -26.11,2.73 -106.32,35.35 -133.64,45.47 -43.53,16.13 -87.6,33.15 -132.4,47.9 -23.35,7.69 -45.12,13.93 -66.99,22.21 -56.57,21.41 -87.48,31.05 -142.69,1.2 -20.61,-11.14 -32.97,-23.29 -49.97,-36.74 -49.15,-38.89 -115.09,-140.08 -144.6,-213.61l-73.01 -196.63c-7.51,-20.34 -16.98,-41.91 -23.89,-62.96 -12.59,-38.35 -33.32,-92.26 -49.65,-129.83 -9.45,-21.74 -15.62,-42.73 -25.06,-64.88 -9.41,-22.07 -16.13,-43.02 -24.97,-65.77 -71.77,-184.73 -533.54,-1426.76 -551.89,-1457.64 -5.26,-8.85 -11.85,-14.26 -18.92,-24.28 -15.33,-21.73 -19.25,-38.42 -20.57,-68.5 -3.31,-75.44 49.24,-69.46 32.12,-141.1 -14.49,-60.66 15.59,-90.91 54.9,-110.37 81.14,-40.17 174.98,-65.45 263.59,-95.59l131.07 -49.25c23.25,-7.98 45.68,-12.95 68.61,-20.57 29.52,-9.8 42,-11.73 70.65,2.38 68.55,33.76 42.77,12.91 114.06,65.12 65,47.61 98.56,145.72 134.85,220.9l58.59 117.95c20.06,-0.05 44.02,-1.32 63.54,0.46 19.44,1.77 31.66,10.4 48.61,9.15 43.15,-3.2 136.6,-40.1 182.94,-55.03 15.29,-4.93 30.3,-9.93 45.24,-15.36 6.83,-2.48 14.91,-5.29 22.29,-7.54 22.97,-6.98 17.72,-4.81 18.01,-13.64 -37.84,6.8 -68.85,27.31 -106.23,36.88l-110.22 36.65c-20.41,8.08 -52.53,13.39 -72.83,7.39 -66.99,-19.79 -68.86,8.51 -91.29,-14.8 -10.03,-10.43 -76.52,-148.08 -83.12,-164.38 -12.95,-31.97 -28.17,-59.4 -43.51,-89.76l-20.1 -31.58c-29.77,-38.23 -51.42,-50.96 -96.33,-77.74 -20.14,-12 -38.46,-19.18 -59.8,-29.95 -42.49,-21.43 -60.7,-9.43 -105.25,2.64 -12.75,3.45 -22.7,7.73 -33.98,12.26 -87.51,35.11 -176.57,63.83 -266.61,92.41 -33.95,10.78 -65.55,23.07 -97.28,38.71 -34.61,17.05 -55.03,13.59 -84.21,51.78 -44.41,58.12 11.73,86.09 -20.19,142.99 -13.47,24.01 -23.65,29.8 -24.38,60.38l0 9.69c0.25,28.25 0.81,34.53 10.86,60.6l8.62 15.86c12.62,21.14 18.89,21.47 29.86,49.01 21.27,53.38 45.31,107.97 62.76,162.98 3.21,10.1 9.51,21.25 13.35,32.89l35.63 97.64c2.06,5.57 3.85,8.77 6.24,15.51l178.05 477.42c8.55,21.38 16.4,42.28 25.29,64.46 25.8,64.34 47.35,131.22 73.42,195.84 39.19,97.15 74.55,195.79 111.16,294.09l48.9 130.6c45.62,119.54 97.1,238.49 137.33,360.39 21.48,65.09 56.9,160.62 95.12,217.66 18.28,27.28 35.17,54.47 56.29,79.7 7.42,8.86 15.49,14.5 22.88,23.36 11.11,13.33 9.71,12.08 23.18,23.05 8.54,6.96 15.6,12.88 24.19,19.33 9.32,6.99 17.71,11.37 28.36,17.88 25.18,15.37 36.58,14.92 74.72,15.16 33.11,0.21 44.44,-11.51 69.96,-19.8 54.66,-17.75 164.31,-54.64 214.63,-76.39l31.79 -11.73c10.62,-3.31 9.75,-2.82 18.18,-6.3l71.65 -21.84z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M1694.32 6157.85c-6.18,-4.88 -12.62,-5.37 -20.47,-9.8 -45.46,-25.65 -64.24,-78.68 -102.71,-104.53 4.3,32.77 16.88,52.64 35.74,64.87 -7.75,-4.13 -23.08,-17.66 -27.79,-23.11 -8.76,-10.13 -12.83,-23.21 -14.91,-36.86 -34.72,9.41 -76.24,25.05 -104.69,51.26 -15.41,14.19 -20.11,16.46 -21.83,28.89 27.74,-7.25 33.18,4.03 51.76,11.43 -8.26,-3.32 -5.32,-3.67 -15.14,-5.41 -25.11,-4.47 -37.34,-1.74 -56.53,0.97 5.79,-16.32 47.36,-46.63 62.2,-56.48 34.53,-22.93 67.21,-29.55 81.4,-38.85 -21.67,-10.09 -65.81,23.68 -85.56,37.43 -4.22,2.94 -3.4,2.25 -6.6,4.25l-79.05 59.66c-9.12,7.98 -15.43,12.28 -24.4,22.32 -9.44,10.57 -11.3,19.65 -8.76,38.21l6.9 -7.89c1.48,-2.16 2.97,-5.24 4.98,-8.69 46.7,-79.89 134.47,-34.49 189.51,15.65 11.22,10.22 15.44,15.87 24.78,26.85l23.84 29.44 -9.06 -14.43c-17.34,-20.81 -11.85,-14.13 -25.53,-38.29 -0.3,-0.54 -0.81,-1.44 -1.19,-2.17l15.48 8.81c11.4,2.98 40.85,-11.1 51.08,-15.27 20.88,-8.53 42,-17.86 61.38,-27.64 -1.77,-8.17 1.08,-4.47 -9.04,-9.11l4.22 -1.53z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M8009.57 6815.49c-3.79,2.68 0.68,0.84 -5.82,2.36l-21.13 0.97c-80.08,0.83 -60.69,13.01 -45.81,-70.8 3.31,-18.62 -18.86,-13.67 -37.89,-13.16 -10.06,16.56 -31.16,130.78 -37.41,163.49 -6.9,36.15 -15.78,51.19 -0.54,55 0.69,0.17 1.43,0.34 2.2,0.48 47.55,8.37 31.09,-23.17 48.91,-85.85 4.83,-17 19.34,-12.05 40.6,-11.99 15.82,0.04 38.1,-2.32 49.63,2.7 5.74,19.77 -18.11,66.37 -13.33,94.9 41.09,2.15 40.08,6.96 46.19,-27.69 5.95,-33.72 38.35,-178.58 34.39,-188.47 -7.63,-3.24 -27.09,-4.26 -35.38,-0.75 -12.62,11.23 -13.67,67.38 -24.62,78.83z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M8468.46 9474.37zm-92.59 -10.26l92.59 10.26zm-92.59 -10.26c-4.11,4.04 -7.26,6 -11.05,10.46 -0.75,0.88 -3.52,4.88 -4.58,6.24 -3.66,4.72 -2.31,3.07 -5.61,6.17 -3.62,35.08 -1.65,83.2 -1.05,119.34 0.43,26.26 -0.87,33.62 21.98,40.27 16.08,4.68 34.18,4.44 53.21,4.04 25.33,-0.53 28.12,-3.67 38.71,-21.8 9.48,-16.25 11.22,-25.14 11.45,-46.98 0.25,-23.93 6.9,-96.47 -10.46,-107.47 -3.08,-7.23 -2.5,-7.04 -7.69,-12.32 -27.26,3.37 -56.36,5.54 -84.9,2.06z\"/>\n   <g>\n    <path class=\"hpc-eta-fil3\" d=\"M4115.06 6821.61l0.56 0.23 3.06 4.09 9.76 11.82c8.19,14.55 35.88,33.18 50.14,45.11 9.86,8.25 16.24,13.69 25.11,21.16 9,7.58 15.07,15.33 23.73,22.52l1.73 3.75c-0.75,4.32 -1.72,3.31 2.57,3.31 11.28,14.71 23.71,30.28 31.05,52.66 4.09,12.46 5.1,22.07 10.33,33.59 12.72,28.05 41.24,146.26 41.07,160.98 5.2,-43.45 0.35,-104.67 0.82,-150.28 0.26,-25.15 10.02,-37.47 7.27,-66.77 -2.2,-23.41 -9.52,-42.11 -12.46,-61.5 -17.41,-56.46 -65.75,-121.13 -124.52,-129.99 -20.53,-0.95 -35.92,2.59 -49.46,12.64 -11.44,8.48 -27.65,18.05 -24.17,34.42 0.02,4.28 -0.94,3.29 3.4,2.26zm114.09 108.68l2.57 3.31 -2.57 -3.31z\"/>\n   </g>\n   <path class=\"hpc-eta-fil4\" d=\"M8467.03 6845.32c-1.12,-9.72 7.86,-59.87 10.6,-73.1 7.89,-38.09 19.17,-40.58 -26.62,-40.08 -9.33,13.85 -12.1,40.86 -16.78,61.72 -4.68,20.85 -9.59,40.95 -13.53,62.56 -15.11,82.7 -32.43,111.92 20.7,94.51 7.87,-18.57 7.16,-57.6 30.76,-65.19 9.56,5.75 13.72,22.09 18.4,34.25 6.57,17.07 7.24,21.66 16.68,33.97 12.42,0 29.09,1.48 37.97,-2.26 2.84,-7.86 -2.08,-12.04 -7.01,-22.51l-30.66 -73.43c9.56,-10.9 59.4,-49.8 61.96,-61.32 -7.96,-4.86 -24.69,-4.92 -36.72,-2.07 -18.99,4.5 -48.83,46.48 -65.75,52.96z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M5568.39 9631.45l-14.75 -18.56c-14.04,0.4 -27.86,3.44 -43.35,3.73 -17.31,0.32 -28.03,-2.71 -43.91,-3.3 -9.39,58.72 39.74,133.35 23.97,187.11 48.56,-0.13 63.39,3.51 71.8,-22.25 12.4,-37.95 9.48,-106.47 6.23,-146.73z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M1922.05 7303.76c-20.73,1.49 -14.41,-3.05 -23.56,-39.32l-35.85 -159.25c-8.15,-34.2 -5.5,-127.15 -11.07,-184.53 -1.32,-13.57 -2.66,-17.86 -3.88,-28.93 -1.91,-17.34 -2.43,-23.31 -7.11,-30.74l8.01 77.89c6.55,74.84 -1.99,157.94 -19.95,228.1 -9.21,35.98 -20.94,50.33 -21.46,62.51 -0.94,21.67 4.86,51.22 11.82,68.75 7.24,18.21 19.04,43.37 44.76,29.4 8.69,-4.72 16.96,-8.3 28.19,-12.52 18.22,-6.85 21.95,-2.33 30.11,-11.37z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M1523.84 7573.73c1.25,4.39 -2.75,3.05 4.22,3.86 2.23,3.98 -0.24,0.84 3.45,4.82 9.5,10.24 29.32,19.83 35.36,54.18 1.44,1.82 0.01,-0.73 3.58,4.98 1.37,2.18 -0.01,-0.3 1.86,4.03l2.64 4.78 2.03 2.08 56.86 105.08c19.56,36.72 36.13,68.07 52.27,108.23 38.59,95.99 46.74,100.84 69.92,209.65 1.05,4.94 2.01,10.7 3.23,15.64l6.64 15.67c-2.13,-37.44 -73.42,-327.26 -90.21,-390.91 -3.52,-13.33 -7.32,-25.76 -9.79,-38.72 -4.07,-21.3 -6.35,-16.55 -23.45,-23.38 -37.47,-14.96 -90.12,-70.23 -114.39,-76.12 -1.08,-3.84 5.3,-2.16 -4.22,-3.86l-4.63 -1.69 4.63 1.69z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M7737.75 6854.6c-0.12,-41.58 66.84,-43.22 62.94,-8.7 -1.29,11.44 -4.14,8.83 -16.31,9.01 -15,0.22 -31.61,0.09 -46.63,-0.31zm21.82 68.46c-22.89,0.03 -35.95,-9.4 -31.92,-33.12 5.88,-9.58 72.74,-7.27 88.34,-5.47 13.87,1.6 13.4,1.23 22.52,-6.1 4.78,-58.25 -15.94,-100.14 -77.66,-88.16 -45.16,8.76 -70.8,45.55 -75.59,95.04 -3.46,35.71 14.84,69.66 55.17,70.03 10.41,0.09 33.52,0.43 42.6,-2 12.05,-3.22 46.47,-25.29 40.12,-40.57 -4.2,-10.11 -23.06,-7.91 -32.1,-2.81 -12.34,6.95 -11.58,13.15 -31.47,13.17z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M8110.42 6913.72c3.57,-26.11 21.77,-29.14 51.19,-33.89 31.43,-5.07 4.35,35.43 -11.54,41.18 -19.66,7.11 -30.72,4.62 -39.65,-7.29zm43.52 -125.02c-41.18,0 -80.47,46.22 -48.55,50.74 29.83,4.23 25.57,-14.41 40.76,-18.36 13.72,-3.57 34.44,-1.23 40,19.47 -9.41,11.85 -9.19,12.61 -29.47,13.73 -32.85,1.82 -72.13,9.35 -84.22,40.34 -10.39,26.64 1.57,52.63 19.97,59.01 8.65,3 32.79,2.3 42.58,1.1 12.79,-1.57 15.63,-8.07 27.08,-13.73 6.56,5.52 7.4,12.97 16.32,12.96 39.45,-0.01 20.66,0.65 29.56,-45.56 3.38,-17.54 8.76,-33.64 12.29,-53.07 10.33,-56.95 -13.85,-66.62 -66.33,-66.62z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1781.27 9182.87c5.68,-47.04 29.98,-62.14 78.5,-77.44l12.01 -4.5c0.55,-0.32 1.28,-0.85 1.76,-1.16 0.62,-0.4 2.66,-2.04 3.34,-2.62 8.49,-20.2 12.66,-20.49 12.62,-51.11 -0.02,-21.37 -0.44,-42.84 0.16,-64.16 -3.99,-3.29 -3.13,-1.66 -7.57,-3.83l-0.53 92.01c-2.44,12.37 -5.83,13.44 -15.79,11.33 1.78,21.35 2.63,11.75 -34.5,28.05 -33.11,14.53 -57.25,40.17 -57.99,78 -1.04,53.35 -8.55,68.96 27.83,105.48 46.49,46.66 194.64,44.47 263.35,38.83 26.66,-2.19 49.69,3.31 86.97,-16.38 23.14,-12.22 62.87,-43.68 62.57,-76.17 -0.11,-11.33 -2.89,-15.01 -2.91,-29.9 -0.05,-37.46 5.83,-50.41 -23.65,-79.7 -27.25,-27.07 -53.05,-27.19 -69.61,-33.74 -9.71,-3.84 -12.35,-10.17 -12.87,-22.49l-2.34 -65.99c-0.61,-10.91 12.07,-34.13 29.56,-37.64 60.49,-12.13 51.58,-55.85 55.67,-83.04 4.49,-29.84 1.36,-67.94 -1.01,-96.48 -1.53,-18.45 8.96,-80.98 -46.69,-92.01 -13.84,-2.74 -15.8,-4.12 -28.04,-7.31 -39.62,-10.37 -70.31,4.5 -88.72,4.62 -23.77,0.15 -30.05,-19.85 -29.91,-41.02l0.01 -171.57c0.25,-20.17 5.38,-42.14 5.66,-62.34 0.55,-40.61 -5.11,-45.61 -5.55,-65.38 15.18,0 34.11,-1.01 48.83,0.13 16.6,1.27 25.61,5.45 46.3,5.38 19.78,-0.07 59.67,-2.55 76.36,-13.44 7.94,-5.18 3.26,-0.98 8.02,-7.7 -38.19,7.02 -43.44,15.5 -89.78,13.71 -27.13,-1.05 -68.29,-5.1 -94.72,-3.58 3.45,50.02 9.8,39.91 1.67,105.14 -4.64,37.18 -3.72,75.03 -3.78,112.51 -0.11,65.78 -15.02,126.3 37.15,136.14 25.97,4.89 104.49,-23.4 141.45,16.03 17.66,18.84 16.54,61.85 17,95.33l-5.16 110.75c-2.45,12.59 -14.71,27 -24.26,31.63 -41.2,19.94 -57.4,-22.7 -57.1,67.05 0.24,71.79 -4.82,71.73 24.06,78.73 91.08,22.07 89.1,68.75 84.49,144.32 -1.88,30.77 -38.54,52.44 -63.9,65.2 -25.45,12.8 -82.62,14.83 -116.71,16.11 -61.58,2.32 -176.62,-2.12 -220.13,-43.37 -17.35,-16.45 -16.9,-13.39 -21.46,-43.28 -4.26,-27.86 -4.14,-30.76 -0.67,-59.11z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M3049.81 7946.25c8.89,-11.75 34.03,-12.79 53.06,-14.78 12.61,-1.32 49.96,-3.31 58.83,2.17 -13.82,18.88 -84.01,16.28 -111.89,12.61zm123.51 -60.35l37.53 -10.21c8.62,-4.78 9.44,-5.1 21.35,-4.94 0.16,12 -1.11,11.46 -7.09,18.74 -5.76,7.03 -3.02,6.03 -13.34,9.25l-4.59 2.93 -2.84 2.06c-39.52,15.45 -79.79,24.3 -128.26,25.35 -3.83,-3.76 -3.85,5.71 -2.72,-7.31l-58.92 26.38c-3.41,29.46 -6.37,55.51 -10.54,77 11.59,-10.56 5.63,-4.32 17.94,-10.04 11.87,-5.52 5.66,-6.15 12.67,-14.23 10.8,-12.44 25.31,-8.19 38.86,-15.78 8.53,-4.77 5.71,-6.62 17.05,-9.95 7.5,-2.2 15.45,-2.42 23.08,-4.54 17,-4.74 5.21,-5 44.42,-12.2 20.7,-3.8 66.79,-19.89 83.36,-28.39 35.75,-18.35 31.85,-28.2 36.1,-75.33l153.81 -58.58c5.81,-1.92 11.76,-4.05 18.21,-6.24 11.19,-3.78 24.01,-8.19 36.43,-12.67 11.35,-4.09 23.54,-8.11 35.77,-13.07 17.13,-6.95 17.61,-10.02 28.11,-21.25 -8.82,2.33 -1.69,-0.41 -11.98,4.94 -53.25,27.72 -260.33,99.44 -319.24,118.18 -7.96,2.53 -16,5.64 -24.07,8.36l-17.55 7.98c-0.48,0.36 -1.44,2.26 -1.78,1.71 -0.35,-0.56 -1.24,1.17 -1.78,1.82z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M4299.99 1756.19c-4.08,4.86 -2.56,2.94 -7.46,7.08 -2.72,2.3 -3.1,2.17 -5.62,5.04 -4.24,4.83 -4.34,7.08 -9.55,11.82 -26.25,80.87 -6.15,72.77 47.11,72.12 77.48,-0.93 63.31,13.14 77.6,-45.59 3.98,-16.37 11.22,-33.28 -2.14,-46.29 -18.07,-17.59 -74.13,-9.88 -99.95,-4.17z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M4327.63 1552.08c4.18,0 3.23,-0.96 2.37,3.26 23.43,5.36 89.52,0.8 118.18,1.26 4.68,-15.54 16.88,-70.77 14.65,-86.72 -23.17,-14.95 -12.96,-13.59 -51.4,-12.25l-46.32 1.52c-30.5,1.38 -18.53,11.58 -28.44,46.74 -2.31,8.2 -9.07,38.61 -9.04,46.19z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M4298.31 1701.38c20.22,4.33 52.27,2.96 75.12,2.98 59.68,0.07 45.91,5.53 55.76,-44.46 4.83,-24.5 17.56,-51.24 -33.96,-50.56 -36.49,0.48 -78.36,-6.19 -85.9,13.03 -6.78,17.29 -15.25,66.96 -11.02,79.01z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M8260.32 6836.79c-4.25,9.73 -8.49,15.44 -10.14,24.84 -2.97,15.13 -3.88,45.79 -0.15,60.61 4.87,12.91 16.59,23.89 29.05,28.58 15.35,4.72 35.51,4.4 51.74,1.79 18.55,-2.98 21.4,-10.59 33.68,-16.12l7.92 -8.12c4.09,-10.81 7.49,-10.05 8.38,-22.82l-4.58 -5.95c-0.33,-1.44 -1.2,-1.65 -1.88,-2.4 -9.24,-6.97 -24.31,-0.02 -34.92,14.31 -18.97,25.63 -62.22,11.04 -54.2,-34.74 3.58,-20.39 11.83,-29.58 14.05,-39.86 -1.42,-5.86 -3.01,-5.22 2.58,-3.91 -1.37,-4.82 -2.2,-3.98 2.58,-2.45 -1.25,-5.51 -2.02,-4.23 3.47,-2.48 -1.38,-5.17 -1.84,-3.71 3.38,-2.01 0,-0 -2.36,-6.77 14.65,-8.65 36.28,-4.02 30.01,22.61 41.36,24.83l27.4 -0.56c4.54,-11.34 -2.1,-23.94 -9.25,-34.01 -4.9,-6.89 -3.05,-5.88 -11.88,-10.35 -16.1,-8.15 -45.53,-5.06 -61.7,-0.41 -8.63,2.49 -22.22,8.55 -26.71,16.62 20.07,-0.17 8.55,-10.82 38.64,-7.05 -15.45,4.17 -38.1,32.78 -47.73,47.04l-2.46 3.07c-9.39,-14.05 7.63,-27.17 11.54,-43.07 -6.99,2.35 -1.29,-1.12 -8.83,4.97l-16.01 18.28z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M1718.37 8676.14c11.36,-75.17 -27.17,-33.12 -51.13,-21.44 -18.9,9.21 -20.42,9.83 -26.7,32.3 -7.62,27.29 -9.1,78.83 16.24,94.76 13.15,8.27 34.92,3.1 41.67,-6.52 4.13,-5.89 18.19,-87.66 19.92,-99.11z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M932.89 8578.23l0 8.16 -5.44 0c1.79,-7.46 -1.1,-4.24 5.44,-8.16zm0 -10.88l5.44 0 0 8.16c-10.42,-7.24 -1.15,0.01 -5.44,-8.16zm-9.38 -16.73l1.22 14.01 -5.44 0 4.22 -14.01zm39.3 -51.27zm-56.68 94.62l56.68 -94.62zm-56.68 94.62c4.33,-21.39 -9.2,-16.25 -4.8,-44.45 1.43,-9.2 0.67,-17.03 1.94,-25.4 2.65,-17.5 7.23,-4.97 5.66,-21.54 23.41,2.62 23.79,-9.79 43,-11.39l-27.29 16.23c-12.19,5.29 -16.08,8.2 -16.4,27.12 -0.22,12.89 -1.94,31.1 2.05,41.82 8.33,22.42 15.5,13.79 17.17,29.07 66.77,0 17.45,-8.16 59.84,-8.16l-5.92 -70.23c-0.28,-0.57 -0.62,-1.26 -0.87,-1.85l-4.09 -12.23c-5.32,-10.46 -0.45,5.67 -5.45,-8.15 27.12,7.24 31.56,72.8 22.22,90.22 -4.71,8.77 -8.68,8.96 -19.02,10.89 -40.14,7.51 -28.11,17.86 -56.72,-6.78 -8.89,-7.66 -1.54,-4.15 -11.31,-5.15zm2.79 -91.39c-23.15,15.5 -18.47,68.4 -2.79,91.39 16,34.99 46.51,24.74 64.74,20.19 28.6,-7.14 41.11,-21.73 34.47,-59.28 -6.82,-38.51 -43.44,-77.55 -65.66,-68.2 -10.14,4.28 -25.5,9.38 -30.75,15.9z\"/>\n   <path class=\"hpc-eta-fil8\" d=\"M1542.12 5971.48l6.32 -14.21c3.48,-17.07 3.78,-29.24 -1.2,-44.95 -5.59,-17.65 -12.97,-32.66 -22.52,-47.77 -18.64,-29.51 -22.62,-58.27 -33.63,-89.92l-12.46 -39.14c-11.93,-32.75 -16.92,-78.07 -46.44,-96.91 -59.41,-37.91 -86.02,-92.85 -47.08,-160.93 12.93,-22.61 47.89,-54.8 70.14,-70.33 77.81,-54.32 173.86,-74.66 192.94,-92.83 -14.72,0 -10.9,-0.83 -22.51,4.78 -4.6,2.23 -0.23,0.61 -5.59,2.48l-37.79 13.87c-44.92,21.39 -76.42,28.03 -129.91,65.91 -13.23,9.37 -25.34,20.12 -38.12,29.87 -39.78,30.35 -69.6,98.16 -46.25,149.68 16,35.31 25.54,33.14 31.67,39.04l5.9 7.69c3.05,3.76 5.6,6.19 9.77,9.27 8.57,6.34 14.79,7.25 20.78,14.57 11.73,14.34 23.6,38.9 27.23,59.8l73.32 228.58c2.74,7.02 4.85,22.56 5.44,31.45z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M5468.29 9829.33c-18.72,-16.43 -37.62,-34.64 -76.12,-17.51 -28.32,12.6 -37.43,39.18 -12.26,63.58 12.42,12.03 62.61,23.35 84.18,18.55 15.24,-3.39 -5.3,-6.2 -7.59,-26.96 -1.85,-16.82 5.84,-30.43 11.79,-37.66z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M1544.83 8703.12c1.38,26.73 -3.42,100.41 56.65,78.05 28.53,-10.62 31.8,-85.74 7.37,-98.53 -28.19,-14.76 -50.23,12.9 -64.02,20.48z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M130.55 6565.58c0,-6.95 4.31,-0.43 1.62,0 -0.03,0.01 -1.62,7.59 -1.62,0zm0 -8.16c-0.97,-5.15 3.42,-9.67 1.72,-1.72 -0.04,0.18 0.08,11.21 -1.72,1.72zm-2.72 -85.71l-8.16 -2.49c-10.39,2.75 -7.86,5.36 -17.31,8.38 -7.36,2.35 -19.87,2.14 -30.65,18.27 -0.32,0.48 -0.81,1.11 -1.09,1.63l-1.72 3.73c-1.13,3.58 -0.83,3.27 -1.13,7.09 -0.16,2.03 0,11.44 0.14,13.73 0.91,15.15 4.28,31.52 10.75,41.03 5.83,8.56 19.04,18.52 32.85,18.83 3.02,-11.31 0.99,-8.16 32.64,-8.16 0.7,-31.39 12.19,-35.75 -6.41,-77.89l-9.91 -24.14z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M5535.2 9834.77c10.01,8.8 22.34,6.33 26.29,19.68l2.7 31.82c0.12,0.84 0.39,1.83 0.5,2.51 0.11,0.67 0.57,2.81 0.66,2.44 0.09,-0.36 0.39,1.65 0.75,2.41 13,1.34 52.64,-3.46 63.01,-10.72 37.71,-26.41 -14.37,-115.07 -70.67,-59.84 -11.15,10.94 -11.77,4.12 -23.23,11.7z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M1625.5 6033.28c-2.37,6.21 -3.42,4.65 3.24,4.65 -0.34,-6.15 1.64,-5.65 -3.24,-4.65 -0.18,-15.03 -19.85,-61.83 -25.6,-80.69 -6.5,-21.3 -20.95,-63.26 -23.05,-83.46l-1.88 -2.61 -30.31 -93.94 -29.23 -99.66c-4.56,4.28 -0.44,-3 -5.15,7.36 -10.54,23.15 4.41,81.79 11.24,103.49 5.53,17.56 11.47,33.58 18.36,49.73 4.05,9.51 10.59,24.17 18.71,30.23 9.53,7.12 1.11,-4.44 7.54,3.73 7.81,9.92 40.65,149.58 59.37,165.82z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M526.31 6278.37c-8.22,-0.49 -4.07,-2.33 -6.01,2.25l6.01 -2.25c22.64,-2.9 68.05,-18.27 90.38,-26.21 21.85,-7.78 64.82,-27.82 81.74,-31.15 6.58,5.69 6.63,2.96 9.66,13.42l-31.39 6.39c1.58,11.64 16.56,31.2 25.57,36.07 13.48,7.3 37.65,4.03 54.65,5.5 -12.52,-42 -81.03,-103.53 -134.41,-114.84 8.27,10.21 63.25,36.03 74.91,43.17 -7.66,8.52 -15.83,5.55 -43.89,15.63 -14.62,5.25 -28.91,10.75 -43.38,16.46 -13.01,5.13 -77.61,29.55 -83.82,35.56z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M2061.12 7252.28c11.7,-13.94 7.3,-38.65 1.17,-54.16 -3.52,-8.9 -7.15,-13.62 -9.25,-23.64 -15.65,-74.6 -29.89,-169.94 -46.49,-252.58 -3.45,-17.21 -7.05,-35.56 -10.96,-53.73l-9.69 -47.24c-4.13,-10.34 -0.16,-1.57 -3.7,-6.36l18.7 107.72c6.07,34.87 11.51,69.69 17.98,104.43 30.64,164.54 9.13,103.77 16.45,225 25.97,1.75 7.9,-3.48 22.63,-8l3.16 8.55z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M2047.93 9133.05l1.56 -2.85 -1.56 2.85 -5.36 0c-4.36,1.97 -5.62,2.29 -8.52,5.45 -8.63,9.39 -1.3,3.5 -10.25,6.45 -0.42,0.14 -10.08,1.55 -11.54,1.7 -9.84,0.96 -19.6,1.41 -29.51,0.6 -52.1,-4.29 -49.19,-12.84 -45.71,-54.5 19.87,-12.01 46.47,3.89 92.4,-4.34 14.8,-6.73 18.48,-7.83 18.53,10.86l0.5 25.73c5.73,-9.96 4.46,-27.9 4.11,-40.95 -0.18,-6.72 -0.51,-13.9 -1.14,-20.58 -0.92,-9.66 0.34,-10.8 -4.67,-16.72 2.22,35.56 -21.02,30.26 -53.2,31.68 -35.45,1.56 -60.35,-0.05 -54.33,-32.27 15.48,-3.99 39.7,-2.43 59.83,-2.83 38.32,-0.76 35.28,-6.92 49.14,0.73 -1.3,-7.71 -2.14,-16.58 -6.13,-21.79 -9,13.72 -75.92,12.31 -92.26,10.57 -14.7,-1.57 -12.07,-7.2 -11.46,-23.31 -7.92,16.77 -12.74,117.87 -0.17,130.05 18.07,17.51 97.41,18.96 109.75,-6.52z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M865.88 8518.58c5.26,-16.33 24.81,-33.21 34.97,-43.12 8.17,-7.96 16.27,-14.8 4.51,-24.54 -6.5,-5.37 -18.64,-9.89 -29.6,-9.84 -35.31,0.17 -70.32,33.99 -39.17,56.69 22.41,16.33 20.48,6.8 21.66,5 2.43,10.84 2.34,10.7 7.63,15.8z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M234.7 6524.78c-5.26,-18.77 -30.18,-83.13 -44.31,-89.1l9.75 37.1c-9.67,-3.15 -6.14,-4.28 -19.32,-6.22 -0.85,39.77 32.57,65.98 21.58,97.49 -8.61,24.67 -43.58,47.64 -58.34,61.34 31.5,0.66 47.58,-16.44 57.39,-37.92 5.18,-11.36 8.55,-24.15 12.34,-36.52 8.09,-26.38 12.27,-20.29 20.92,-26.17z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M8351.74 9700.89c1.12,-13.39 -6.07,-14.8 2.57,-18.95 4.1,-1.97 6.53,-0.5 10.67,-0.74 0.14,-0.01 4.76,0.86 9.76,-2.16 -24.14,-21.07 -60.47,-30.63 -87.51,-1.99 -28.99,30.7 -1.13,62.94 39.04,55.28 -7.82,-0.84 -27.27,-12.19 -32.65,-17.04 15.46,-6.3 41.02,-6.11 58.12,-14.4z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M1640.43 8827.86l29.89 0.28 -10.44 8.46c24.52,0 102.41,-15.4 118.86,-5.44 0.57,0.31 1.38,0.28 1.57,1.12l9.01 18.22c18.22,57.14 0.13,51.98 14.68,80.5 24.47,47.95 52.2,33.31 78.09,47.04 4.44,2.17 3.58,0.54 7.57,3.83 0.11,-15.38 -5.11,-12.87 -16.33,-20.06 -11.4,-0.1 -28.63,-1.93 -35.71,-5.53l-28.98 -31.72c-2.28,-4.67 -2.86,-9.03 -2.88,-17.03 -0.04,-14.87 0.48,-29.57 -0.2,-44.45 -5.07,-14.08 -14.82,-28.39 -25.43,-36.32 -36.25,-27.1 -96.66,-11.18 -134.91,-0.52l-4.81 1.63z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1315.71 6432.31c-0.28,-29.96 -4.79,-53.24 -4.34,-84.31 0.42,-29.58 -2.12,-56.22 -3.54,-84.25 -3.05,-60.21 -6.02,-107.51 27.62,-141.48 13.67,-13.8 31.35,-26.42 50.56,-36.69 32.36,-17.29 34.73,-39.77 101.42,-71.89 34.33,-16.54 31.17,-7.41 50.47,-35.57 -11.2,8.19 -2.96,10.48 -24.58,17.43 -13.42,4.32 -20.36,6.39 -30.92,12.59 -29.41,17.28 -23.43,11.04 -52.97,34.06 -9.05,7.05 -14.6,15.16 -23.71,19.8 -28.08,14.3 -56.05,32.18 -76.16,57.1 -14.01,17.36 -26.18,30.31 -26.87,60.16 -0.56,24.23 1.19,215.76 5.37,234.11 0.58,2.52 1.78,7.94 2.07,8.81 2.91,8.53 0.21,5.3 5.59,10.13z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1947.63 8997.08l2.81 5.34 -5.79 -1.58 -6.31 8.68c-0.6,16.1 -3.24,21.74 11.46,23.31 16.34,1.74 83.26,3.15 92.26,-10.57l-3.28 -19.74c-5.18,-1.95 -6.05,-0.04 -1.7,-2.72l1.37 -4.12c-4.96,-1.3 -2.9,2.43 -2.85,-5.2 -12.85,5.9 -26.51,8.12 -41.99,8.39 -21.53,0.36 -22.98,-4.18 -40.01,-6.79l-5.99 5z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M133.47 6424.49c13.23,-4.04 17.74,-9.59 19.2,-25.25l9.42 0.44c-11.55,-14.19 -47.38,-47.76 -76.05,-44.34 -3.18,14.45 0.15,21.24 6.07,33.86 5.67,12.09 4.13,30.66 7.49,36.01 4.09,6.51 25.92,1.71 33.86,-0.72z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M2031.23 9062.8l2.93 -6.13c0.41,-2.47 0.24,-5.4 0.24,-7.92 15.9,4.25 5.8,7.65 0,16.32l-3.17 -2.27zm-86.58 -8.61c7.13,4.77 5.62,1.37 8.16,10.88 -16.98,0.22 -9,10.72 -8.16,-10.88zm102.1 -7.44l1.43 -2.7c-13.86,-7.65 -10.82,-1.49 -49.14,-0.73 -20.14,0.4 -44.35,-1.16 -59.83,2.83 -6.02,32.22 18.88,33.83 54.33,32.27 32.18,-1.42 55.42,3.88 53.2,-31.68z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1495 7091.91c2.21,7.38 -0.91,1.55 4.11,3.87 1.72,12.14 26.33,65.24 48.91,78.58 6.15,3.63 1.63,0.17 8.36,5.24 15.63,11.75 27.98,25.28 45,36.6 133.53,88.78 108.36,41.18 156.45,63.85 18.02,8.49 13.55,14.12 17.89,31.07 2.55,10 9.28,15 -16.34,32 -11.96,7.93 -16.45,5.99 -35.02,5.78 -23.19,-0.27 -44.97,1.32 -63.56,12.98 -0.38,0.24 -1.18,0.73 -1.72,1.17 20.06,-0.67 28.68,-5.79 46.69,-7.23 15.58,-1.25 34.15,-0.11 50.37,-0.58l31.2 -23.8c-2.84,-12.75 -7.39,-43.05 -14.71,-52.49 -19.72,-25.43 -58.63,8.31 -143.55,-49.6l-92.81 -73.01c-13.43,-17.18 -19.58,-40.91 -37.16,-60.57l-4.11 -3.87 -1.83 -3.45 1.83 3.45z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M8526.32 9733.9c20.84,-2.3 24.52,-5.19 32.05,-22.38 8.09,-18.48 7.15,-31.95 -7.75,-39.69 -18.34,-9.52 -75.34,-5.1 -88.65,7.85l18.35 -0.56 8.83 16.29c10.16,12.11 53.95,33.24 49.64,-0.76 -0.8,-6.31 -2.3,-7.37 -2.64,-13.47 34.55,12.36 -5.6,34.88 -9.83,52.72z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M908.15 8689.41c-9.53,-42.6 26.78,-40.02 -7.24,-68.37 -15.36,-12.8 -13.87,-5.93 -24.89,-23.97 -7.04,-11.51 -10.72,-21.64 -23.38,-22.89 -9.17,17.81 7.44,50.39 16.3,65.21 7.78,13.01 25.7,45.6 39.22,50.03z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M3173.32 7885.9l-99.95 35.87c-1.13,13.02 -1.11,3.54 2.72,7.31 48.47,-1.05 88.74,-9.9 128.26,-25.35l2.84 -2.06 4.59 -2.93c5.88,-10.77 6.34,-6.03 8.24,-17.26l-9.17 -5.79 -37.53 10.21z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1524.46 7480c1.75,-21.25 7.62,-41.53 18.36,-54.24 9.59,-11.36 30.53,-24.17 45.53,-31.05 2.16,-8.96 21.34,-17.13 30.49,-24.07 -34.34,12.64 -76.99,36.98 -92.28,71.46 -4.72,10.65 -3.97,21.09 -7.24,33.55 -9.13,34.83 -39.66,34.37 -45.26,36.34 -10.54,3.71 -20.82,8.22 -32.56,10.96 -22.23,-33.2 -20.69,-19.77 -37.71,-57.48 -3.32,-7.34 -0.91,-2.25 -4.67,-8.93l-106.72 -219.9c-2.62,-3.67 -1.32,-1.94 -4.03,-4.71 7.71,24.95 72.82,163.44 89,194.28 27.06,51.61 35.47,61.03 61.48,104.7 32.76,-7.41 70.88,-18.67 85.63,-50.91z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M1001.57 8683.48c31.82,7.84 34.66,-12.28 36.53,-16.51 2.62,-5.94 3.38,-5.29 5.92,-10.34 7.36,-14.62 -0.54,-43.03 -7.78,-55.79 -11.07,12.25 -8.63,16.67 -23.33,27.44 -42.24,30.96 -24.02,27.46 -17.14,39.36 3.42,5.92 1.17,8.14 5.79,15.84z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M1759.71 8497.91c-15.86,15.7 -15.74,70.03 -16.51,99.93 21.33,6.02 15.64,13.55 29.42,19.93 11.73,-19.88 1.99,-106.5 -12.91,-119.86z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M5189.73 206.55c-0.21,-33.54 -0.5,-66.9 -0.31,-100.48 0.19,-34.2 5.85,-63.52 -14.54,-83.37 -21.26,-20.69 -48.87,-15.27 -83.42,-15.31 -31.94,-0.03 -67.45,-1.73 -98.88,-0.15 0.68,0.4 1.74,0.04 2.16,0.94 0.42,0.92 1.62,0.71 2.21,0.87l18.3 2.19c34.11,1.23 139.57,4.98 158.29,15.96 7.62,34.7 6.42,95.44 9.13,135.66 1.3,19.33 -0.87,31.66 7.06,43.69z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M1034.67 8517.04c12.37,-11.9 24.92,-16.33 21.5,-36.57 -2.51,-14.85 -20.77,-27.11 -36.84,-30.14 -54.93,-10.36 0.91,59.96 9.84,71.98l3.76 -3.59c0.53,-0.52 1.16,-1.12 1.73,-1.67z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M4308.15 7424.15c0.47,-0.77 0.87,-1.76 1.14,-2.45 0.26,-0.68 0.76,-1.6 1.05,-2.44l5.38 -56.86c1.26,-21.08 1.73,-43.37 -1.03,-63.32 -18.33,11.73 -17.54,71.74 -31.24,90.42 -20.3,27.69 -10.89,32.59 24.7,34.65z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M8260.32 6836.79c-5.8,6.24 -11.02,13.27 -10.14,24.84 -9.19,14 -9.55,47.4 -0.15,60.61 1.23,12.88 16.95,26.47 29.05,28.58 4.42,3.65 -1.4,1.84 9.83,4.89 24.28,6.59 54.5,-0.58 75.59,-19.21l7.92 -8.12c2.38,-3.18 7.31,-8.98 8.81,-13.41 4.3,-12.77 2.23,-15.48 -6.89,-17.76 0.68,0.75 1.55,0.96 1.88,2.4l4.58 5.95c-0.89,12.77 -4.29,12.01 -8.38,22.82l-7.92 8.12c-12.28,5.52 -15.13,13.13 -33.68,16.12 -16.23,2.61 -36.39,2.93 -51.74,-1.79 -12.46,-4.7 -24.18,-15.67 -29.05,-28.58 -3.73,-14.83 -2.82,-45.48 0.15,-60.61 1.65,-9.4 5.89,-15.11 10.14,-24.84l16.01 -18.28c7.54,-6.09 1.84,-2.61 8.83,-4.97 -3.91,15.9 -20.93,29.02 -11.54,43.07l2.46 -3.07c9.62,-14.27 32.28,-42.87 47.73,-47.04 -30.1,-3.77 -18.58,6.88 -38.64,7.05 4.49,-8.07 18.08,-14.13 26.71,-16.62 16.17,-4.65 45.6,-7.74 61.7,0.41 8.82,4.47 6.98,3.46 11.88,10.35 7.15,10.07 13.79,22.67 9.25,34.01l-27.4 0.56c-11.35,-2.21 -5.08,-28.85 -41.36,-24.83 -17.01,1.88 -14.65,8.65 -14.65,8.65 -5.22,-1.71 -4.76,-3.16 -3.38,2.01 -5.49,-1.75 -4.72,-3.03 -3.47,2.48 -4.78,-1.53 -3.94,-2.37 -2.58,2.45 -5.59,-1.32 -4,-1.96 -2.58,3.91 5,0 3.89,1.11 2.58,-3.91 4.54,1.15 3.77,2.06 2.58,-2.45 5.44,1.43 4.8,2.81 3.47,-2.48 5.46,1.66 5.22,3.29 3.38,-2.01 9.35,-1.51 19.57,-9.93 34.44,-3.78 7.34,3.04 12.26,13.84 17.61,23.35 11.91,0.52 23.92,1.11 32.68,-2.9 3.65,-3.27 8.71,-55.14 -62.66,-54.21 -33.46,0.44 -68.55,22.63 -73.03,48.26z\"/>\n   <path class=\"hpc-eta-fil9\" d=\"M1472.43 8735.98c8.92,0.88 12.46,3.38 15.38,10.78 3.46,8.74 0.13,14.22 11.66,37.31 23.49,47.02 41.37,44.11 66.25,50.71 7.63,2.02 15.5,8.21 26.96,11.11 30.82,7.81 47.17,-5.19 67.2,-9.28l10.44 -8.46 -29.89 -0.28c-36.96,3.16 -89.02,8.03 -112.71,-12.21 -22.48,-19.2 -34.97,-53.04 -36.66,-96.14l-26.55 12.05\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M141.35 6483.88l-3.15 -2.44 -2.21 -2.26 2.21 2.26 3.15 2.44c3.67,15.17 23.09,35.21 14.64,77.23 -3.85,19.16 -9.77,17.39 -27.92,21.05 -21.97,4.43 -48.7,9.99 -59.87,-24.94 -9.83,-30.76 -12.02,-73.64 27.11,-83.94l20.28 -5.61c-3.31,-2.52 -1.23,-1.9 -7.22,-3.28 -7.83,-1.81 -22.61,2.74 -34.67,11.73 -32.19,24.02 -24.5,89.24 12.19,111.86 21.65,13.35 66.25,-0.52 75.21,-18.99 14.46,-29.81 -2.17,-72.93 -19.75,-85.11z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M2034.04 9138.51c-24.98,0.41 -63.17,8.45 -92.11,-5.44 0,-7.13 -0.41,-15.06 -0.26,-22.02 0.3,-14.03 -1.97,-10.43 5.7,-16.06 9.06,6.64 5.44,2.8 5.44,35.36l32.64 -5.44c-10.49,-0.87 -10.71,-2.72 -24.48,-2.72l0 -21.76c86.71,0 81.59,-24.98 81.59,32.62l5.36 0 1.56 -2.85 -1.02 -5.2 -0.5 -25.73c-5.7,-3.07 -11.94,-7.41 -18.53,-10.86 -45.93,8.23 -72.53,-7.67 -92.4,4.34 -3.48,41.66 -6.39,50.21 45.71,54.5 9.91,0.82 19.67,0.37 29.51,-0.6 1.46,-0.14 11.12,-1.56 11.54,-1.7 8.94,-2.95 1.61,2.95 10.25,-6.45z\"/>\n   <path class=\"hpc-eta-fil0\" d=\"M8110.42 6913.72c8.93,11.91 20,14.4 39.65,7.29 15.89,-5.75 42.97,-46.25 11.54,-41.18 -29.42,4.74 -47.62,7.78 -51.19,33.89z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M1058.61 8809.08c42.21,6.64 64.56,-36.56 66.65,-55.19 2.26,-20.19 0.49,-8.81 -3.82,-13.3l-14.49 27.8c-8.83,-8.63 -11.2,-17.35 -28.24,-18.9l-0.09 48.19c-8.01,5.01 -13.91,3.86 -20.02,11.4z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M4330.01 1555.34c0.86,-4.23 1.81,-3.26 -2.37,-3.26l2.37 3.26c16.09,23.27 103.94,9.37 122.28,5.8 8.51,-20.44 31.42,-61.43 13.76,-87.47l-3.21 -3.8c2.23,15.95 -9.97,71.19 -14.65,86.72 -28.66,-0.46 -94.75,4.11 -118.18,-1.26z\"/>\n   <path class=\"hpc-eta-fil3\" d=\"M2499.13 7911.88c13.7,-40.13 -41.64,-39.75 -42.37,-10.78 -0.45,17.67 25.07,61.48 42.37,10.78z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M1118 8464.91c0.86,-23.53 -17.7,-78.09 -24.85,-98.9 -6.87,14.16 8.79,24.53 -3.99,41.87 -9.13,12.39 -17.71,21.06 -13.18,41.37 16.53,7.04 23.15,6.9 35.59,-4.11 0.73,4.03 1.19,7.96 2.52,11.92 3.57,10.61 1.66,4.51 3.9,7.84z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1289.18 7230.41c0,-21.04 3.08,-16.9 9.43,-32.56 5.31,-13.1 4.32,-22.1 7.06,-36.46 1.55,-8.11 1.73,-9.31 7.43,-14.33 11.91,-10.46 27.24,-17.38 43.04,-22.24l133.01 -42.49 -4.15 -5.29c-18.26,3.46 -49.95,15.85 -67.37,21.38 -23.17,7.37 -44.5,14.16 -67.88,21.94 -66.01,21.97 -42.59,41.94 -59.06,78.33 -6.96,15.39 -11.13,16.97 -1.52,31.71z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M2887.09 7979.25c14.28,-7.44 58.94,-23.41 73.4,-25.24 -0.74,15.45 -6.2,13.39 -9.16,53.06 -1.35,18.12 -7.87,35.26 -8.01,51.5 -5.36,-0.82 -3.5,-1.36 -1.88,4.52 -4.54,0.3 -3.73,-3.84 -2.98,4.42 -5.42,-0.65 -3.48,-1.53 -3.87,4.82 7.15,0 6.13,1.8 3.87,-4.82l2.98 -4.42c6.3,1.8 4.07,2 1.88,-4.52 18.81,-15.68 29.52,-84.21 17.49,-107.36 -31.61,-11.62 -62.98,9.34 -73.71,28.03z\"/>\n   <path class=\"hpc-eta-fil0\" d=\"M7737.75 6854.6c15.02,0.4 31.64,0.54 46.63,0.31 12.17,-0.18 15.01,2.43 16.31,-9.01 3.9,-34.52 -63.06,-32.88 -62.94,8.7z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M8353.83 9461.07c7.92,-1.71 13.05,-0.61 22.04,3.04 28.54,3.49 57.64,1.31 84.9,-2.06 -14.38,-13.3 -34.25,-19.03 -53.88,-18.82 -10.43,0.11 -21.44,2.09 -30.83,4.35 -11.03,2.66 -19.31,3.55 -22.23,13.49z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M863.13 6561.8c7.25,9.47 18.52,19.61 35.45,15.71 1.86,-22.39 -21.92,-53.81 -29.84,-67.15 -1.81,1.91 -7.29,3.52 -1.64,15.97l-9.19 8.06c-7.32,8.82 -2.18,17.74 5.22,27.4z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M1116.7 8583.41c-10.15,21.27 9.51,54.89 26.67,60.54 0.92,-16.95 -2.09,-81.87 -6.31,-95.17 -8.41,10 -9.65,33.99 -12.27,47.85 -3.6,-20.08 3.82,-9.96 -8.09,-13.22z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M1571.15 6043.53l-9.8 -3.28c-14.19,9.3 -46.87,15.91 -81.4,38.85 -14.83,9.85 -56.41,40.16 -62.2,56.48 19.19,-2.71 31.42,-5.44 56.53,-0.97 9.82,1.74 6.88,2.09 15.14,5.41 -18.58,-7.41 -24.02,-18.68 -51.76,-11.43 1.72,-12.43 6.42,-14.69 21.83,-28.89 28.45,-26.21 69.97,-41.85 104.69,-51.26 2.08,13.65 6.15,26.73 14.91,36.86 4.71,5.45 20.04,18.98 27.79,23.11 -18.86,-12.23 -31.44,-32.1 -35.74,-64.87z\"/>\n   <path class=\"hpc-eta-fil1\" d=\"M3049.81 7946.25c27.88,3.67 98.07,6.27 111.89,-12.61 -8.87,-5.49 -46.23,-3.5 -58.83,-2.17 -19.03,1.99 -44.17,3.03 -53.06,14.78z\"/>\n   <path class=\"hpc-eta-fil0\" d=\"M1565.18 7802.82c13.69,2.89 15.32,6.92 23.18,7.3 4.74,-8.25 -7.22,-20.49 -12.13,-27.46 -12.35,-17.55 -48.58,-67.45 -59.35,-76.83l48.3 97z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M1781.27 9182.87c7.19,-8.66 5.53,-16.33 15.03,-37.66 21.93,-1.52 33.27,-5.43 48.92,-16.29 11.6,-8.05 27.13,-18.16 31.66,-31.78 -0.69,0.59 -2.72,2.23 -3.34,2.62 -0.49,0.31 -1.21,0.84 -1.76,1.16l-12.01 4.5c-48.52,15.31 -72.82,30.4 -78.5,77.44z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M1953.61 8992.08c17.03,2.61 18.48,7.15 40.01,6.79 15.48,-0.26 29.14,-2.49 41.99,-8.39 -0.05,7.62 -2.11,3.89 2.85,5.2 0.32,-11.06 0,-3.5 -2.85,-5.2 -3.92,-9.65 -4.77,-8.84 -17.27,-9.92 -7.47,-0.64 -17.34,-0.9 -24.83,-0.6 -14.64,0.58 -31.38,2.98 -39.9,12.12z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M1524.46 7480c4.7,-3.49 2.19,-0.94 6.71,-6.04l24.31 -38.35c26.97,-40.17 16.1,-20.68 32.86,-40.89 -15,6.88 -35.94,19.69 -45.53,31.05 -10.74,12.71 -16.61,32.99 -18.36,54.24z\"/>\n   <path class=\"hpc-eta-fil4\" d=\"M1873.34 8961.81l-33.79 -7.1 -33.97 -91.64c0.67,14.88 0.16,29.59 0.2,44.45 0.02,8 0.59,12.36 2.88,17.03l28.98 31.72c7.07,3.6 24.3,5.43 35.71,5.53z\"/>\n   <path class=\"hpc-eta-fil0\" d=\"M1484.22 7573.71c-13.37,0.55 -17.9,4.69 -24.1,11.79 1.13,9.8 2.08,10.02 7.34,17.12 6.59,-22.88 7.54,-15.45 16.76,-28.91l8.31 -2.7 23.49 -0.76c6.18,13.79 16.31,21.01 25.89,34.47l24.98 31.87 5.44 9 2.64 4.78 2.03 2.08 -2.03 -2.08 -2.64 -4.78c-1.87,-4.33 -0.49,-1.85 -1.86,-4.03 -3.57,-5.71 -2.14,-3.16 -3.58,-4.98 -6.04,-34.35 -25.86,-43.94 -35.36,-54.18 -3.69,-3.98 -1.22,-0.83 -3.45,-4.82 -6.97,-0.81 -2.97,0.53 -4.22,-3.86l-4.63 -1.69c-11.12,-2.93 -14.38,-6.65 -26.69,-1.03l-8.31 2.7z\"/>\n   <path class=\"hpc-eta-fil0\" d=\"M1574.98 5866.52l1.88 2.61 3.68 2.4c0.37,0.27 1.28,0.92 1.71,1.25l7.81 6.24c0.61,-14.77 -36.5,-93.92 -45.39,-106.44l30.31 93.94z\"/>\n   <path class=\"hpc-eta-fil0\" d=\"M4791.77 1253.28l6.86 15.7c2.74,3.65 1.92,2.14 4.52,4.38 0.4,-0.61 1.07,-2.21 1.19,-1.85l2.06 -51.33c-1.33,2.08 -0.97,0.47 -3.31,6.13l-11.32 26.97z\"/>\n   <path class=\"hpc-eta-fil0\" d=\"M3210.85 7875.69l9.17 5.79c-1.9,11.23 -2.36,6.49 -8.24,17.26l-4.59 2.93 -2.84 2.06 2.84 -2.06 4.59 -2.93c10.32,-3.22 7.57,-2.22 13.34,-9.25 5.97,-7.28 7.24,-6.74 7.09,-18.74 -11.91,-0.16 -12.73,0.16 -21.35,4.94z\"/>\n   <path class=\"hpc-eta-fil0\" d=\"M8353.83 9461.07l0.8 25.91c3.3,-3.1 1.94,-1.46 5.61,-6.17 1.06,-1.36 3.83,-5.36 4.58,-6.24 3.8,-4.47 6.95,-6.42 11.05,-10.46 -8.98,-3.65 -14.11,-4.75 -22.04,-3.04z\"/>\n   <path class=\"hpc-eta-fil0\" d=\"M1756.13 7355.23l17.17 -0.56c8.25,-6.91 11.64,-9.86 14.02,-23.24l-31.2 23.8z\"/>\n   <path class=\"hpc-eta-fil0\" d=\"M1628.69 6976.92c7.76,6.56 26.08,5.22 28.64,-5.78 -3.51,-2.24 -0.69,-2.47 -7.84,-1.99 -0.22,0.01 -5.3,1.39 -6.38,1.72 -6.14,1.86 -10.09,3.67 -14.42,6.05z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M2020.81 9130.35l13.6 0c-6.42,-13.37 2.78,-13.74 -8.16,-21.76 0,19.58 -1.86,8.36 -5.44,21.76z\"/>\n   <path class=\"hpc-eta-fil0\" d=\"M4277.36 1780.12c5.21,-4.74 5.31,-6.99 9.55,-11.82 2.52,-2.86 2.9,-2.74 5.62,-5.04 4.9,-4.14 3.38,-2.22 7.46,-7.08l-16.73 3.11 -5.89 20.83z\"/>\n   <path class=\"hpc-eta-fil0\" d=\"M2029.44 9088.41c6.59,3.45 12.83,7.8 18.53,10.86 -0.05,-18.7 -3.74,-17.59 -18.53,-10.86z\"/>\n   <path class=\"hpc-eta-fil0\" d=\"M5553.64 9612.88l14.75 18.56c-0.32,-14.54 0.01,-21.97 -14.75,-18.56z\"/>\n   <path class=\"hpc-eta-fil0\" d=\"M2744.37 5757.8c-8.04,-4.56 -3.49,-3.61 -12.46,-1.56 0.96,7.08 0.35,8.24 4.89,9.51 8.58,2.41 7.05,-5.23 7.57,-7.96z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M5687.09 9777.66l16.32 0c-5.76,-7.86 -2.22,-5.44 -16.32,-5.44l0 5.44z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M2004.49 8368.8c8.19,-2.19 5.97,0.04 8.16,-8.16l-8.16 0 0 8.16z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M2942.82 5638.13l8.16 0c-4.18,-6.01 -0.45,-3.38 -8.16,-5.44l0 5.44z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M5300.88 9802.13l0.81 -0.81c-0.05,0.05 -1.08,0.54 -0.81,0.81z\"/>\n   <path class=\"hpc-eta-fil2\" d=\"M2012.65 9127.63l0.81 -0.81c-0.05,0.05 -1.08,0.54 -0.81,0.81z\"/>\n   <rect class=\"hpc-eta-fil10\" transform=\"matrix(1 -0 -0.194228 1 3656.4 1423.63)\" width=\"629.11\" height=\"120.15\" rx=\"12.79\" ry=\"12.79\"/>\n  </g>\n </g>\n";

  // ETA eHACK cutaway visual from the approved SVG demo; no external fetch.
  const HPC_ETA_EHACK_CUTAWAY = "<svg x=\"0\" y=\"0\" width=\"9225.54\" height=\"9957.88\" viewBox=\"0 0 600 650\" aria-hidden=\"true\" style=\"overflow:visible\"><style>\n.eta-overlay .eta-frame {fill:#3c444b;stroke:#22272b;stroke-width:4;stroke-linejoin:round}\n.eta-overlay .eta-outline {fill:#171d22;stroke:#f7d76e;stroke-width:2.7}\n.eta-overlay .eta-insulation {fill:#59616a;stroke:#c4cbd0;stroke-width:1.6}\n.eta-overlay .eta-heatpipe {fill:none;stroke:#b8c0c6;stroke-width:6;stroke-linecap:round}\n.eta-overlay .eta-heatshine {fill:none;stroke:#59656e;stroke-width:2.3;stroke-linecap:round}\n.eta-overlay .eta-grate {stroke:#9da8b1;stroke-width:4;stroke-linecap:round}\n.eta-overlay .eta-ash {fill:#73706c;opacity:.85}\n.eta-overlay .eta-door {fill:none;stroke:#5a6268;stroke-width:3;opacity:.95}\n.eta-overlay .eta-ember{fill:#693d2d;transition:fill .4s}\n.eta-overlay .eta-flame{opacity:0;transform-box:fill-box;transform-origin:50% 95%;animation:eta-fire-dance 1.25s ease-in-out infinite alternate;animation-play-state:paused}\n.eta-overlay .eta-flame--2{animation-duration:1.6s;animation-delay:-.7s}\n.eta-overlay .eta-flame--3{animation-duration:1.05s;animation-delay:-.3s}\n.eta-overlay .eta-glow {opacity:0;transition:opacity .35s}\n.eta-overlay .eta-heatwave{fill:none;stroke:#f49b4b;stroke-width:2.5;stroke-linecap:round;opacity:0;animation:eta-rising 2s linear infinite;animation-play-state:paused}\n.eta-overlay .eta-heatwave.second {animation-delay:-.85s}\n.eta-overlay .eta-run-light{fill:#515e67;transition:fill .35s}\n.eta-overlay .eta-start-flame {opacity:0}\n.eta--heating .eta-overlay .eta-flame,.eta--ignition .eta-overlay .eta-flame{opacity:1;animation-play-state:running}\n.eta--heating .eta-overlay .eta-glow{opacity:.20}.eta--ignition .eta-overlay .eta-glow{opacity:.12}\n.eta--heating .eta-overlay .eta-ember,.eta--ignition .eta-overlay .eta-ember{fill:#ff7a22}\n.eta--heating .eta-overlay .eta-heatwave{opacity:.7;animation-play-state:running}\n.eta--heating .eta-overlay .eta-run-light{fill:#f5a340}\n.eta--ignition .eta-overlay .eta-flame{animation-duration:2.2s;opacity:.55}\n.eta--ignition .eta-overlay .eta-run-light{fill:#ffe087}\n.eta--heating .eta-overlay .eta-heatpipe{stroke:#deb295}\n.eta--fault .eta-overlay .eta-run-light{fill:#e35a5a}\n.eta--cleaning .eta-overlay .eta-run-light{fill:#72a8c5}\n.eta--cleaning .eta-overlay .eta-heatpipe{stroke:#94aec0}\n@keyframes eta-fire-dance{0%{transform:translate(1px,2px) scale(.92, .9) rotate(-3deg)}55%{transform:translate(-1px,-4px) scale(1.04,1.13) rotate(2deg)}100%{transform:translate(1px,1px) scale(.96,.99) rotate(-1deg)}}\n@keyframes eta-rising{0%{opacity:0;transform:translateY(8px)}30%{opacity:.65}100%{opacity:0;transform:translateY(-21px)}}\n@media (prefers-reduced-motion:reduce){.eta-overlay .eta-flame,.eta-overlay .eta-heatwave{animation:none !important}}\n.motion-off .eta-overlay .eta-flame,.motion-off .eta-overlay .eta-heatwave{animation:none !important}\n</style><g class=\"eta-overlay\">\n  <!-- The yellow front panel remains visible all around the deliberate cutaway. -->\n  <rect x=\"355\" y=\"169\" width=\"182\" height=\"266\" rx=\"13\" class=\"eta-frame\"/>\n  <rect x=\"363\" y=\"177\" width=\"166\" height=\"250\" rx=\"7\" class=\"eta-outline\"/>\n  <rect x=\"371\" y=\"185\" width=\"150\" height=\"234\" rx=\"3\" fill=\"#283039\"/>\n  <!-- Double-wall jacket and front detail, rather than a floating fireplace. -->\n  <path class=\"eta-insulation\" d=\"M371 185h10v234h-10zM511 185h10v234h-10z\"/>\n  <path class=\"eta-door\" d=\"M363 291h166 M363 419h166\"/>\n  <rect x=\"382\" y=\"197\" width=\"126\" height=\"92\" rx=\"5\" fill=\"#1e252d\" stroke=\"#69717a\" stroke-width=\"2\"/>\n  <!-- Simplified heat-exchanger tubes in the upper chamber. -->\n  <path class=\"eta-heatpipe\" d=\"M396 213v44q0 9 9 9h7q9 0 9-9v-44M427 213v44q0 9 9 9h7q9 0 9-9v-44M459 213v44q0 9 9 9h7q9 0 9-9v-44\"/>\n  <path class=\"eta-heatshine\" d=\"M396 213h79 M397 274h78\"/>\n  <rect x=\"382\" y=\"298\" width=\"126\" height=\"105\" rx=\"4\" fill=\"#191e23\" stroke=\"#69717a\" stroke-width=\"2\"/>\n  <ellipse cx=\"445\" cy=\"368\" rx=\"57\" ry=\"40\" fill=\"#ff7b24\" class=\"eta-glow\" opacity=\".4\" style=\"filter:none\"/>\n  <path fill=\"#2e2b29\" d=\"M387 375q30-22 59-8t57 2v31H387z\"/>\n  <path class=\"eta-ash\" d=\"M392 394q21-11 39 0t33-2q21-10 39 0v8H392z\"/>\n  <!-- Three separately animated flame silhouettes, with a fixed steel grate. -->\n  <path class=\"eta-flame eta-flame--1\" fill=\"#f97316\" d=\"M418 380C403 366 413 346 422 334c-1 13 16 14 11 34 13-13 10-31 11-38 22 21 27 37 14 50Z\"/>\n  <path class=\"eta-flame eta-flame--2\" fill=\"#ffb32f\" d=\"M434 383c-11-12-7-24-2-33 1 9 10 9 10 18 10-10 6-19 8-22 12 14 14 25 4 37Z\"/>\n  <path class=\"eta-flame eta-flame--3\" fill=\"#fff0a4\" d=\"M440 381c-5-8 0-13 2-18 1 6 5 6 6 12 5-5 3-11 4-13 7 9 8 14 3 19Z\"/>\n  <g class=\"eta-grate\"><path d=\"M389 392H500 M397 389v8 M412 389v8 M427 389v8 M442 389v8 M457 389v8 M472 389v8 M488 389v8\"/></g>\n  <path class=\"eta-heatwave\" d=\"M399 314q-9-9 0-18t0-16\"/><path class=\"eta-heatwave second\" d=\"M487 314q-9-9 0-18t0-16\"/>\n  <!-- Subtle on-device indicator; all HA status text stays outside SVG. -->\n  <circle cx=\"526\" cy=\"153\" r=\"6.5\" fill=\"#3e454b\" stroke=\"#baa13d\" stroke-width=\"1.2\"/>\n  <circle cx=\"526\" cy=\"153\" r=\"3.5\" class=\"eta-run-light\"/>\n</g></svg>";
  function chipArt(x,y,width,height,node,on,hass) {
    // The provided ETA eHACK drawing is specific to eHACK, not HACK/HACK VR.
    if (!node.options?.eta_model || node.options.eta_model === 'ehack') {
      // Preserve the original portrait proportions: no horizontal stretching.
      const artHeight=Math.min(height*1.18,130);
      const artWidth=artHeight*(9225.54/9957.88);
      const offsetX=(width-artWidth)/2;
      const offsetY=(height-artHeight)/2;
      const view=node.options?.eta_view==='cutaway'?'cutaway':'closed';
      const state=HPC_FREE.state(hass,node.sensors?.state);
      const raw=String(state?.text||'').toLowerCase();
      const ignition=/(zünd|zuend|ignit|anheiz|start)/.test(raw);
      const fault=/(stör|stoer|fault|alarm|error|fehler)/.test(raw);
      const cleaning=/(reinigen|reinigung|clean)/.test(raw);
      const heating=!ignition&&!fault&&!cleaning&&HPC_FREE.active(state);
      const status=fault?'eta--fault':cleaning?'eta--cleaning':ignition?'eta--ignition':heating?'eta--heating':'';
      return '<g class="hpi-chip-art hpi-eta-ehack '+status+'" transform="translate('+x+' '+y+')">'
        +'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9225.54 9957.88" x="'+offsetX.toFixed(2)+'" y="'+offsetY.toFixed(2)+'" width="'+artWidth.toFixed(2)+'" height="'+artHeight.toFixed(2)+'" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
        +HPC_ETA_EHACK_ART+'</svg>'
        +(view==='cutaway'?'<svg x="'+offsetX.toFixed(2)+'" y="'+offsetY.toFixed(2)+'" width="'+artWidth.toFixed(2)+'" height="'+artHeight.toFixed(2)+'" viewBox="0 0 9225.54 9957.88" preserveAspectRatio="xMidYMid meet">'+HPC_ETA_EHACK_CUTAWAY+'</svg>':'')+'</g>';
    }

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
      // Flue-gas cleaning is drawn at its real exhaust duct, outside
      // the boiler body, so its readings have their own space.
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
  function additionalSourceArt(type, box, on, node, hass) {
    const x=box.x+35, y=box.y+43;
    if(type==='wood_chip_boiler')return chipArt(x,y,170,89,node,on,hass);
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
    const evidence=HPC_NETWORK.flowEvidence(plan,hass);
    const flowing=new Set([...evidence].filter(([,reading])=>reading.active)
      .map(([edgeId])=>edgeId));
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
    const heatingFeeds=plan.connections.filter(edge=>
      edge.to_port==='flow_in'&&all[edge.to]?.type==='heating_circuit');
    if(heatingFeeds.length>1){
      const commonSource=heatingFeeds.every(edge=>
        edge.from===heatingFeeds[0].from&&edge.from_port===heatingFeeds[0].from_port);
      const source=all[heatingFeeds[0].from];
      if(commonSource&&source?.type==='buffer'&&heatingFeeds[0].from_port==='top_out'){
        const sourceShape=loc(source.id);
        if(sourceShape){
          const junction={x:660,y:port(source,sourceShape,'top_out').y};
          for(const edge of heatingFeeds)supplyTees.set(edge.id,junction);
        }
      }
    }
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
      const teeX=Math.min(hx.x-55,Math.max(sourceShape.x+sourceShape.w+20,660));
      supplyTees.set(supply.id,{x:teeX,y:hot.y});
      // Draw the real coil return into its configured buffer port. Do not
      // place a synthetic tee on the heating collector.
    }
    const obstacles=[...anchored,...points].map(([id,b])=>({id,...b}));
    const routedPaths=[];
    const circuitFlowing=new Map(plan.components.filter(node=>
      node.type==='heating_circuit').map(node=>{
      const feed=plan.connections.filter(edge=>
        edge.to===node.id&&edge.to_port==='flow_in');
      const returns=plan.connections.filter(edge=>
        edge.from===node.id&&edge.from_port==='return_out');
      return [node.id,feed.length>0&&returns.length>0&&
        feed.some(edge=>flowing.has(edge.id))&&returns.some(edge=>flowing.has(edge.id))];
    }));
    const circuitCount=plan.components.filter(node=>
      node.type==='heating_circuit').length;
    const hasCircuitPump=node=>circuitCount>1||
      plan.components.some(candidate=>candidate.type==='buffer')||
      !!node.sensors?.pump||!model.primaryPump;
    const routeRecords=[...plan.connections,...HPC_NETWORK.auxiliaryEdges(plan,hass),
      ...HPC_NETWORK.heatingCircuitEdges(plan)].map(edge=>{
      // Native heating circuits keep their original radiator/mixer pictograms,
      // but their actual supply/return paths use this very same pipe registry.
      const fromShape=loc(edge.from),toShape=loc(edge.to);
      if(!fromShape||!toShape)return null;
      const p=port(all[edge.from],fromShape,edge.from_port,
        all[edge.from]?.type!=='heating_circuit'||hasCircuitPump(all[edge.from]));
      const q=port(all[edge.to],toShape,edge.to_port,
        all[edge.to]?.type!=='heating_circuit'||hasCircuitPump(all[edge.to]));
      const fromSide=portSide(all[edge.from],fromShape,edge.from_port);
      const toSide=portSide(all[edge.to],toShape,edge.to_port);
      const supplyTee=supplyTees.get(edge.id);
      const returnTee=returnTees.get(edge.id);
      const d=HPC_NETWORK.route({
        edge,fromNode:all[edge.from],toNode:all[edge.to],
        fromShape,toShape,p,q,fromSide,toSide,supplyTee,returnTee,obstacles,routedPaths
      });
      routedPaths.push({edge,d});
      const from=all[edge.from],field=edge.from_port;
      const inferred=field==='flow'?from.sensors.flow:
        field==='top_out'?from.sensors.top:
        field==='mid_out'?from.sensors.middle:
        field==='bottom_out'?from.sensors.bottom:'';
      const reading=HPC_FREE.state(hass,edge.temperature_entity||inferred);
      const nativeCircuit=all[edge.to]?.type==='heating_circuit'&&anchored.has(edge.to)
        ?edge.to:all[edge.from]?.type==='heating_circuit'&&anchored.has(edge.from)
          ?edge.from:null;
      return {edge,d,nativeCircuit,on:edge.kind==='return_lift'?edge.active:
        edge.kind?.startsWith('heating_circuit_')?!!circuitFlowing.get(edge.from):flowing.has(edge.id),
        evidence:edge.kind==='return_lift'?(edge.active?'inferred':'stopped'):
          evidence.get(edge.id)?.state||'unknown',
        color:reading?HPC_FREE.color(reading):null,
        junction:supplyTee||returnTee};
    }).filter(Boolean);
    // Resolve all route overlaps together, rather than having every boiler,
    // tank or heating circuit draw a second copy of the same collector.
    const physicalPipes=HPC_NETWORK.mergeRoutes(routeRecords);
    const nativePipes={};
    const circuitIndexes=new Map(plan.components.filter(node=>
      node.type==='heating_circuit').map((node,index)=>[node.id,index]));
    for(const record of routeRecords.filter(r=>r.nativeCircuit)){
      const direction=record.edge.kind==='heating_circuit_mixer_bypass'?'mixer':
        ['heating_circuit_internal_return'].includes(record.edge.kind)?'return':
        record.edge.to===record.nativeCircuit?'flow':'return';
      const pair=physicalPipes.get(record.edge.id)||{pipe:'',flow:''};
      const group=nativePipes[record.nativeCircuit]||(nativePipes[record.nativeCircuit]={});
      const leg=group[direction]||(group[direction]={pipe:'',flow:''});
      const offsetY=(circuitIndexes.get(record.nativeCircuit)||0)*250;
      leg.pipe+=(leg.pipe?' ':'')+localizeCircuitPath(pair.pipe,offsetY);
      leg.flow+=(leg.flow?' ':'')+localizeCircuitPath(pair.flow,offsetY);
    }
    const links=routeRecords.filter(r=>!r.nativeCircuit)
      .map(({edge,on,color,junction,evidence:pipeState})=>{
      const paths=physicalPipes.get(edge.id)||{pipe:'',flow:''};
      const tee=junction?'<circle class="hpi-coil-branch" cx="'+junction.x+
        '" cy="'+junction.y+'" r="5" fill="var(--card-background-color,#fff)" stroke="'+
        (on?'var(--hfc-hot,#ff7043)':'var(--divider-color,#7e8790)')+
        '" stroke-width="2"/>':'';
      const rla=edge.kind==='return_lift';
      return '<g class="hpi-link'+(rla?' hpi-rla':'')+
        '" data-hpi-edge="'+HPC_FREE.esc(edge.id)+'"'+
        (rla?' data-hpi-rla="'+HPC_FREE.esc(edge.from)+'"':'')+
        ' data-flow-evidence="'+HPC_FREE.esc(pipeState)+'"><title>'+
        HPC_FREE.esc(all[edge.from].name+' → '+all[edge.to].name)+'</title>'+
        '<path class="pipe'+(rla?' hpi-rla-bypass':'')+(paths.flow?' on':'')+
        '" d="'+paths.pipe+'"'+(color?' style="--pc:'+color+'"':'')+'/>'+
        (paths.flow?'<path class="flow'+(rla?' hpi-rla-flow':'')+
          ' on" d="'+paths.flow+'"/>':'')+tee+'</g>';
    }).join('');
    const nodes=extras.map(node=>{
      const b=points.get(node.id);if(!b)return '';
      const s=HPC_FREE.state(hass,node.sensors.state||node.sensors.pump);
      const on=HPC_FREE.active(s);
      const title=HPC_FREE.esc(node.name);
      if(node.type==='diverter'&&b.inline){
        const cx=b.x+b.w/2,cy=b.y+b.h/2;
        const outlet=HPC_NETWORK.diverterActivePort(node,hass);
        const label=outlet?outlet.toUpperCase():'?';
        return '<g class="tap hpi-inline-diverter" data-hpi-node="'+HPC_FREE.esc(node.id)+'" data-entity="'+HPC_FREE.esc(node.sensors.position||'')+'">'
          +'<title>'+title+'</title>'
          +'<circle class="valve" cx="'+cx+'" cy="'+cy+'" r="20"/>'
          +'<path class="valve-arrow" d="M'+(cx-12)+' '+cy+' H'+cx+' L'+(cx+10)+' '+(cy-10)+' M'+cx+' '+cy+' L'+(cx+10)+' '+(cy+10)+'"/>'
          +'<text class="hpi-valve-port" x="'+(cx+23)+'" y="'+(cy-23)+'">'+label+'</text>'
          +'</g>';
      }
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
        // Hydraulic temperatures are labelled at their respective pipes,
        // rather than repeated inside the boiler graphic.
        const temps='';
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
      const icon=isSource(node)?additionalSourceArt(type,b,on,node,hass):
        type==='pump'?'<circle class="pump" cx="'+cx+'" cy="'+cy+'" r="23"/><path class="imp" d="M'+(cx-7)+' '+(cy-12)+' L'+(cx+12)+' '+cy+' L'+(cx-7)+' '+(cy+12)+'Z"/>':
        type==='mixer'||type==='diverter'?'<circle class="valve" cx="'+cx+'" cy="'+cy+'" r="21"/><path class="valve-arrow" d="M'+(cx-13)+' '+(cy-9)+' L'+cx+' '+(cy+7)+' L'+(cx+13)+' '+(cy-9)+'"/>':
        type==='electric_heater'?'<path class="heater" d="M'+(cx-26)+' '+cy+' h12 l10 -15 l11 30 l10 -15 h12"/>':
        type==='heating_circuit'?'<path class="rib" d="M'+(cx-30)+' '+(cy-18)+' v36 M'+(cx-17)+' '+(cy-18)+' v36 M'+(cx-4)+' '+(cy-18)+' v36 M'+(cx+9)+' '+(cy-18)+' v36 M'+(cx+22)+' '+(cy-18)+' v36"/>':
        '<path class="boiler-flame" d="M'+cx+' '+(cy+17)+' C'+(cx-23)+' '+(cy-2)+' '+(cx-9)+' '+(cy-17)+' '+(cx-2)+' '+(cy-28)+' C'+(cx-3)+' '+(cy-11)+' '+(cx+23)+' '+(cy-13)+' '+(cx+13)+' '+(cy+10)+' Z"/>';
      const sensorEntries=Object.entries(node.sensors||{}).filter(([k,v])=>
        v&&!['state','flow','return','exhaust','fuel_level','particle_state','particle_voltage','particle_current'].includes(k)).slice(0,2);
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

    // A real fuel silo is an accessory of a pellet/wood-chip generator,
    // connected by an auger/fuel pipe. It is NOT a water-side component.
    const biomass=plan.components.filter(node=>
      ['pellet_boiler','wood_chip_boiler'].includes(node.type));
    const accessories=biomass.map(node=>{
      const b=loc(node.id);
      if(!b)return '';
      const cx=b.x+b.w/2;
      const parts=[];
      if(node.options?.silo){
        const sx=b.x+20,sy=Math.max(10,b.y-115),w=68,h=66;
        const level=HPC_FREE.state(hass,node.sensors.fuel_level);
        const levelText=level?HPC_FREE.format(level):'';
        parts.push('<g class="tap hpi-fuel-silo" data-hpi-node="'+HPC_FREE.esc(node.id)+'">'
          +'<title>'+HPC_FREE.esc(node.type==='pellet_boiler'?'Pelletsilo':'Hackschnitzelsilo')+'</title>'
          +'<path class="hpi-silo-feed" d="M'+(sx+w/2)+' '+(sy+h+13)+
            ' L'+(b.x+68)+' '+(b.y+32)+'"/>'
          +'<rect class="hpi-silo-body" x="'+sx+'" y="'+sy+'" width="'+w+'" height="'+h+'" rx="5"/>'
          +'<path class="hpi-silo-roof" d="M'+(sx-4)+' '+sy+' L'+(sx+w/2)+' '+(sy-17)+' L'+(sx+w+4)+' '+sy+'Z"/>'
          +'<path class="hpi-silo-hopper" d="M'+sx+' '+(sy+h)+' L'+(sx+w/2)+' '+(sy+h+14)+' L'+(sx+w)+' '+(sy+h)+'Z"/>'
          +'<path class="hpi-silo-grain" d="M'+(sx+9)+' '+(sy+28)+' l11 -7 l10 10 l11 -9 l12 8"/>'
          +'<text class="hpi-silo-label" x="'+(sx+w/2)+'" y="'+(sy-23)+'" text-anchor="middle">'+
            HPC_FREE.esc(node.type==='pellet_boiler'?'Pelletsilo':'Hackschnitzelsilo')+'</text>'
          +(levelText?'<text class="hpi-silo-value" x="'+(sx+w/2)+'" y="'+(sy+51)+'" text-anchor="middle">'+
            HPC_FREE.esc(levelText)+'</text>':'')
          +'</g>');
      }
      if(node.sensors.exhaust||node.options?.particle_separator){
        const baseX=b.x+b.w-35, baseY=b.y+25;
        const flueY=Math.max(17,b.y-52), flueEnd=baseX+104;
        const ex=HPC_FREE.state(hass,node.sensors.exhaust);
        const exText=ex?HPC_FREE.format(ex):'';
        const separator=node.options?.particle_separator===true;
        const ps=HPC_FREE.state(hass,node.sensors.particle_state);
        const pv=HPC_FREE.state(hass,node.sensors.particle_voltage);
        const pi=HPC_FREE.state(hass,node.sensors.particle_current);
        const active=ps!==null&&HPC_FREE.active(ps);
        parts.push('<g class="hpi-flue" data-hpi-flue="'+HPC_FREE.esc(node.id)+'">'
          +'<path class="hpi-flue-duct" d="M'+baseX+' '+baseY+' V'+flueY+' H'+flueEnd+'"/>'
          +(separator?particleArt(baseX+35,flueY-25,50,46,active):'')
          +(exText?'<text class="hpi-flue-reading" x="'+(baseX+6)+'" y="'+(flueY-13)+'">Abgas '+HPC_FREE.esc(exText)+'</text>':'')
          +(separator?'<text class="hpi-flue-status" x="'+(baseX+44)+'" y="'+(flueY+41)+'" text-anchor="middle">'+
            HPC_FREE.esc(ps?(active?'Aktiv':'Aus'):'Partikelabscheider')+'</text>':'')
          +(pv||pi?'<text class="hpi-flue-values" x="'+(baseX+44)+'" y="'+(flueY+55)+'" text-anchor="middle">'+
            HPC_FREE.esc([pv?'HV '+HPC_FREE.format(pv):'',pi?'I '+HPC_FREE.format(pi):''].filter(Boolean).join(' · '))+'</text>':'')
          +'</g>');
      }
      return parts.join('');
    }).join('');
    // Temperature readings belong to a real, routed pipe segment. The role
    // and source ID—not the displayed value—define each label's identity.
    const occupiedLabels=[];
    const allPipeSegments=[];
    const seenPipeSegments=new Set();
    for(const paths of physicalPipes.values()){
      for(const segment of pipeSegments(paths.pipe)){
        const identity=segmentIdentity(segment);
        if(seenPipeSegments.has(identity))continue;
        seenPipeSegments.add(identity);
        allPipeSegments.push(segment);
      }
    }
    const nativeTemperatureLabels=new Set();
    const firstSource=plan.components.find(isSource);
    const pipeLabels=plan.components.filter(isSource).map(node=>{
      const b=loc(node.id);if(!b)return '';
      const readings=[];
      for(const [key,name] of [['flow','VL'],['return','RL']]){
        const state=HPC_FREE.state(hass,node.sensors[key]);
        if(state?.number===null||!Number.isFinite(state?.number))continue;
        const connection=routeRecords.find(record=>
          (record.edge.from===node.id&&record.edge.from_port===key)||
          (record.edge.to===node.id&&record.edge.to_port===key));
        if(!connection)continue;
        const route=physicalPipes.get(connection.edge.id)?.pipe||connection.d;
        const position=pipeLabelPosition(route,port(node,b,key),key,name+' '+HPC_FREE.format(state),
          obstacles,occupiedLabels,allPipeSegments);
        if(!position)continue;
        readings.push('<text class="hpi-pipe-reading" data-source="'+HPC_FREE.esc(node.id)+
          '" data-role="'+key+'" data-edge="'+HPC_FREE.esc(connection.edge.id)+
          '" x="'+position.x+'" y="'+position.y+'" text-anchor="'+
          position.anchor+'"><title>'+HPC_FREE.esc(node.name+' '+name)+'</title>'+
          name+' '+HPC_FREE.esc(HPC_FREE.format(state))+'</text>');
        if(node.id===firstSource?.id){
          nativeTemperatureLabels.add(key==='flow'?'t-vl':'t-rl');
          if(key==='flow'&&node.type!=='heat_pump')
            nativeTemperatureLabels.add('t-boiler-flow');
        }
      }
      return readings.join('');
    }).join('');
    const lift=HPC_NETWORK.auxiliaryEdges(plan,hass).map(edge=>{
      const node=all[edge.from],b=loc(edge.from);
      if(!node||!b)return '';
      const outlet=port(node,b,'flow'),returnPort=port(node,b,'return');
      const valveX=Math.max(outlet.x,returnPort.x)+42;
      const returnY=returnPort.y;
      const position=HPC_FREE.state(hass,node.sensors.mixer);
      const percentage=position?.number!==null&&Number.isFinite(position?.number)
        ?' '+Math.round(position.number)+' %':'';
      const label=String(hass?.locale?.language||'de').startsWith('de')?'RLA':'RLT';
      // Only the valve pictogram is overlaid. Its actual bypass pipe and
      // animation are generated by HPC_NETWORK and deduplicated with all
      // other physical hydraulic segments.
      return '<g class="hpi-rla-marker" data-hpi-rla-marker="'+HPC_FREE.esc(node.id)+'">'
        +'<title>'+HPC_FREE.esc('Rücklaufanhebung / Return-temperature lift – '+node.name)+'</title>'
        +'<circle class="hpi-rla-valve" cx="'+valveX+'" cy="'+returnY+'" r="14"/>'
        +'<path class="hpi-rla-symbol" d="M'+(valveX-8)+' '+(returnY-7)+' L'+valveX+' '+returnY+' L'+(valveX+8)+' '+(returnY-7)+' M'+valveX+' '+returnY+' v10"/>'
        +'<text class="hpi-rla-label" x="'+(valveX+20)+'" y="'+(returnY-10)+'">'+HPC_FREE.esc(label+percentage)+'</text>'
        +'</g>';
    }).join('');
    const sourceStatus=firstSource&&HPC_FREE.state(hass,firstSource.sensors.state);
    const primaryChip=firstSource?.type==='wood_chip_boiler'
      ?'<g class="tap hpi-chip-primary" data-hpi-node="'+HPC_FREE.esc(firstSource.id)+'" data-entity="'+HPC_FREE.esc(firstSource.sensors.state||firstSource.sensors.flow||'')+'">'
        +chipArt(92,238,156,102,firstSource,HPC_FREE.active(sourceStatus),hass)+'</g>'
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
    const firstBuffer=HPC_NETWORK.orderedBuffers(plan)[0];
    const firstDhw=plan.components.find(c=>c.type==='dhw_tank'&&anchored.has(c.id));
    return {defs,body:'<g id="hpc-integrated">'+links+nodes+accessories+pipeLabels+lift+primaryChip+primaryOil+primaryGas+'</g>',
      nativePipes,nativeTemperatureLabels:[...nativeTemperatureLabels].filter(Boolean),
      firstBuffer:firstBuffer?.id,firstDhw:firstDhw?.id};
  }
  return {layout,coreConfig,svg,tankPoints,flowStates,isSource,port,portSide};
})();
