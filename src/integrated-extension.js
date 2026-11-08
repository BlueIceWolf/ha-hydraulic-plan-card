// Additional heating components share the original Heat Pump Hydraulic Card SVG.
// The first heat source, first buffer, first DHW tank and up to six heating circuits
// reuse their original renderer. All other components are ADDED to that same SVG.
const HPC_INTEGRATED = (() => {
  const sources = new Set(['wood_gasifier','oil_boiler','pellet_boiler','gas_boiler','heat_pump']);
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
    // Additional heat sources stay below the original generator, not far outside
    // the visible diagram. The first extra boiler is visible immediately.
    for(const [index,node] of byGroup.source.entries()){
      const [width,height]=node.type==='oil_boiler'?[240,195]:[240,165];
      points.set(node.id,{x:50+Math.floor(index/4)*265,
        y:475+(index%4)*218,w:width,h:height,type:node.type});
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
    // A second DHW row must not overlap the buffer row.
    // Put the next buffers below the last standard heating circuit.
    // This retains the original buffer graphic and avoids all radiator rows.
    const bufferStartY=Math.max(585,560+Math.min(hcCount,6)*250);
    orderedBuffers.forEach((node,index)=>{
      const [w,h]=HPC_FREE.dimension(node.type);
      points.set(node.id,{x:520+(index%3)*170,
        y:bufferStartY+Math.floor(index/3)*230,w,h,type:node.type});
    });
    extraDhw.forEach((node,index)=>{
      const [w,h]=HPC_FREE.dimension(node.type);
      points.set(node.id,{x:680+(index%2)*170,
        y:40+Math.floor(index/2)*215,w,h,type:node.type});
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
    const types={wood_gasifier:'wood_gasifier',oil_boiler:'oil',pellet_boiler:'pellet',
      gas_boiler:'gas',heat_pump:'heat_pump'};
    const entities={};
    const set=(target,source,key)=>{if(source?.sensors?.[key])entities[target]=source.sensors[key];};
    if(src){
      if(src.type==='heat_pump'){
        [['flow','flow'],['return','return'],['power','power'],['state','mode']].forEach(([from,to])=>set(to,src,from));
      }else {
        [['state','boiler_state'],['flow','boiler_flow'],['return','boiler_return'],['power','boiler_power'],
        ['exhaust','boiler_exhaust'],['oxygen','boiler_o2'],['fan','boiler_fan'],['pump','boiler_pump']].forEach(([from,to])=>set(to,src,from));
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
    if(src)derived.generator_type=types[src.type];
    if(src&&src.type!=='heat_pump'&&!config.boiler_name)derived.boiler_name=src.name;
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
      return{x:290,y:250};
    }
    if(shape.type==='buffer'){
      const y=key.includes('bottom')?495:key.includes('mid')?428:360;
      return{x:key.includes('out')?640:520,y};
    }
    if(shape.type==='dhw_tank'){
      const y=key.includes('out')?215:80;return{x:key.includes('out')?640:520,y};
    }
    if(shape.type==='heating_circuit')return{x:shape.x,y:key==='return_out'?shape.y+135:shape.y+30};
    const def=HPC_FREE.ports(node.type).find(p=>p.id===key);
    return{x:shape.x+(def?.side==='R'?shape.w:0),y:shape.y+(def?.y??.5)*shape.h};
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
    // A mixer position of 0% or 100% is NOT a flow sensor and is never used
    // to disable circulation. Only an explicitly mapped pipe flow status or
    // the state of an actual pump can activate animation.
    const nodes=Object.fromEntries(plan.components.map(c=>[c.id,c]));
    const adjacent=new Map(plan.components.map(c=>[c.id,[]]));
    const flowing=new Set();
    const mappedFlow=(edge)=>{
      if(!edge.flow_entity)return null;
      // Explicit pipe-level state always overrides topology inference.
      const status=HPC_FREE.state(hass,edge.flow_entity);
      return status?HPC_FREE.active(status):null;
    };
    for(const edge of plan.connections){
      adjacent.get(edge.from)?.push({edge,neighbor:edge.to});
      adjacent.get(edge.to)?.push({edge,neighbor:edge.from});
      if(mappedFlow(edge)===true)flowing.add(edge.id);
    }
    const pumpEntity=(node)=>{
      if(node.type==='pump')return node.sensors.state||node.sensors.pump||node.sensors.volume;
      if(isSource(node)||node.type==='heating_circuit')return node.sensors.pump;
      return null;
    };
    const pumpState=(node)=>{
      const id=pumpEntity(node);
      const status=id&&HPC_FREE.state(hass,id);
      return status?HPC_FREE.active(status):null;
    };
    const blocked=(node)=>pumpState(node)===false;
    const sources=plan.components.filter(n=>pumpState(n)===true);
    for(const pump of sources){
      const queue=[pump.id],visited=new Set();
      while(queue.length){
        const id=queue.shift();
        if(visited.has(id))continue;
        visited.add(id);
        for(const {edge,neighbor} of adjacent.get(id)||[]){
          const explicit=mappedFlow(edge);
          if(explicit===false)continue;
          const next=nodes[neighbor];
          if(!next||blocked(next))continue;
          flowing.add(edge.id);
          // Stop at an unmapped heat source / heating circuit instead of
          // assuming a different, uninstrumented boiler branch is running.
          const unknownSource=(isSource(next)||next.type==='heating_circuit')
            && pumpEntity(next)==null && next.id!==pump.id;
          if(!unknownSource&&!visited.has(neighbor))queue.push(neighbor);
        }
      }
    }
    return flowing;
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
      const p=port(all[edge.from],loc(edge.from),edge.from_port);
      const q=port(all[edge.to],loc(edge.to),edge.to_port);
      const mid=(p.x+q.x)/2;
      const d='M'+p.x+' '+p.y+' H'+mid+' V'+q.y+' H'+q.x;
      const s=HPC_FREE.state(hass,edge.temperature_entity);
      const color=s?HPC_FREE.color(s):null;
      const on=flowing.has(edge.id);
      return '<g class="hpi-link"><title>'+HPC_FREE.esc(all[edge.from].name+' → '+all[edge.to].name)+'</title>'
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
        const running=HPC_FREE.active(burner);
        const label=(de,en)=>String(hass?.locale?.language||'de').startsWith('de')?de:en;
        const status=burner?(running?label('Brenner läuft','Burner running'):label('Brenner aus','Burner off'))
          :label('Status unbekannt','Status unknown');
        const val=key=>HPC_FREE.esc(HPC_FREE.format(HPC_FREE.state(hass,node.sensors[key])));
        const bx=b.x+35,by=b.y+43;
        const top=b.y+23;
        return '<g class="tap hpi-component hpi-oil'+(running?' on':'')+'" data-hpi-node="'+node.id+'" data-entity="'+HPC_FREE.esc(node.sensors.state||node.sensors.flow||'')+'">'
          +'<title>'+title+'</title>'
          +'<rect class="unit'+(running?' on':'')+'" x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'" rx="20"/>'
          +'<text class="unit-title" x="'+cx+'" y="'+top+'" text-anchor="middle">'+title+'</text>'
          +'<rect class="hpi-oil-casing" x="'+bx+'" y="'+by+'" width="170" height="89" rx="13"/>'
          +'<rect class="hpi-oil-front" x="'+(bx+10)+'" y="'+(by+11)+'" width="102" height="67" rx="9"/>'
          +'<path class="hpi-oil-seam" d="M'+(bx+18)+' '+(by+61)+' h86"/>'
          +'<rect class="hpi-oil-burner" x="'+(bx+32)+'" y="'+(by+23)+'" width="62" height="30" rx="10"/>'
          +'<circle class="hpi-oil-fan" cx="'+(bx+42)+'" cy="'+(by+38)+'" r="8"/>'
          +'<path class="hpi-oil-flame" d="M'+(bx+76)+' '+(by+47)+' c-14 -12 -5 -22 1 -28 c-2 12 16 13 8 25 q-3 5 -9 3Z"/>'
          +'<rect class="hpi-oil-control" x="'+(bx+124)+'" y="'+(by+15)+'" width="35" height="49" rx="5"/>'
          +'<rect class="hpi-oil-display" x="'+(bx+130)+'" y="'+(by+23)+'" width="23" height="15" rx="3"/>'
          +'<circle class="hpi-oil-led" cx="'+(bx+141.5)+'" cy="'+(by+51)+'" r="4"/>'
          +'<text class="hpi-oil-status" x="'+cx+'" y="'+(b.y+148)+'" text-anchor="middle">'+HPC_FREE.esc(status)+'</text>'
          +'<text class="hpi-oil-reading" x="'+cx+'" y="'+(b.y+168)+'" text-anchor="middle">'+label('Vorlauf','Flow')+': '+val('flow')+'</text>'
          +'<text class="hpi-oil-reading" x="'+cx+'" y="'+(b.y+184)+'" text-anchor="middle">'+label('Rücklauf','Return')+': '+val('return')+'</text>'
          +'</g>';
      }
      const icon=type==='pump'?'<circle class="pump" cx="'+cx+'" cy="'+cy+'" r="23"/><path class="imp" d="M'+(cx-7)+' '+(cy-12)+' L'+(cx+12)+' '+cy+' L'+(cx-7)+' '+(cy+12)+'Z"/>':
        type==='mixer'||type==='diverter'?'<circle class="valve" cx="'+cx+'" cy="'+cy+'" r="21"/><path class="valve-arrow" d="M'+(cx-13)+' '+(cy-9)+' L'+cx+' '+(cy+7)+' L'+(cx+13)+' '+(cy-9)+'"/>':
        type==='electric_heater'?'<path class="heater" d="M'+(cx-26)+' '+cy+' h12 l10 -15 l11 30 l10 -15 h12"/>':
        type==='heating_circuit'?'<path class="rib" d="M'+(cx-30)+' '+(cy-18)+' v36 M'+(cx-17)+' '+(cy-18)+' v36 M'+(cx-4)+' '+(cy-18)+' v36 M'+(cx+9)+' '+(cy-18)+' v36 M'+(cx+22)+' '+(cy-18)+' v36"/>':
        '<path class="boiler-flame" d="M'+cx+' '+(cy+17)+' C'+(cx-23)+' '+(cy-2)+' '+(cx-9)+' '+(cy-17)+' '+(cx-2)+' '+(cy-28)+' C'+(cx-3)+' '+(cy-11)+' '+(cx+23)+' '+(cy-13)+' '+(cx+13)+' '+(cy+10)+' Z"/>';
      const sensorEntries=Object.entries(node.sensors||{}).filter(([k,v])=>v && k!=='state').slice(0,2);
      const labels=sensorEntries.map(([key,id],i)=>'<text class="small" text-anchor="middle" x="'+cx+'" y="'+(b.y+b.h-30+i*16)+'">'+
        HPC_FREE.esc(HPC_FREE.fieldLabel(key))+' '+HPC_FREE.esc(HPC_FREE.format(HPC_FREE.state(hass,id)))+'</text>').join('');
      return '<g class="tap hpi-component" data-hpi-node="'+node.id+'" data-entity="'+HPC_FREE.esc(node.sensors.state||node.sensors.flow||'')+'">'
        +'<rect class="unit'+(on?' on':'')+'" x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'" rx="20"/>'
        +'<text class="unit-title" x="'+cx+'" y="'+(b.y+24)+'" text-anchor="middle">'+title+'</text>'
        +icon+labels+'</g>';
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
        const fromX=outletX+8;
        const stemY=supplyY+24;
        const bypass='M'+fromX+' '+supplyY+' H'+valveX+' V'+returnY;
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
    const firstBuffer=plan.components.find(c=>c.type==='buffer');
    const firstDhw=plan.components.find(c=>c.type==='dhw_tank');
    return {defs,body:'<g id="hpc-integrated">'+links+nodes+lift+'</g>',
      firstBuffer:firstBuffer?.id,firstDhw:firstDhw?.id};
  }
  return {layout,coreConfig,svg,tankPoints,flowStates};
})();
