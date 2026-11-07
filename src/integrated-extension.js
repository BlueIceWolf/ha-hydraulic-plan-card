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
    // Preserve the user's own relative positions, but place extra equipment beside
    // the original 1000-unit schematic so neither the original boiler nor the
    // heat pump/pipes are obscured by a second representation.
    const extras=p.components.filter(c=>!anchored.has(c.id));
    const points=new Map();
    extras.forEach(c=>{
      const [w,h]=HPC_FREE.dimension(c.type);
      points.set(c.id,{x:1090+Math.round(c.x*.80),y:90+Math.round(c.y*.88),w,h,type:c.type});
    });
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
    for(const [node,prefix] of [[buffer,'buffer'],[dhw,'dhw']])
      for(const key of ['top','middle','bottom'])set(prefix+'_'+key,node,key);
    circuits.forEach((node,index)=>{
      const prefix=index?'hc'+(index+1)+'_':'hc_';
      for(const key of ['flow','return','target','pump','mixer'])set(prefix+ (key==='target'?'setpoint':key),node,key);
    });
    // Legacy entities intentionally win over auto-mappings; existing heat pump
    // users retain precisely their previous presets/overrides.
    const derived={...config};
    if(src&&!config.generator_type)derived.generator_type=types[src.type];
    if(src&&src.type!=='heat_pump'&&!config.boiler_name)derived.boiler_name=src.name;
    if(buffer&&!config.series_buffer)derived.buffer=true;
    if(dhw&&!config.storage)derived.storage='separate';
    if(circuits.length&&!config.hc_count)derived.hc_count=Math.min(6,circuits.length);
    if((src||buffer||dhw)&&!config.preset)derived.preset='none';
    derived.entities={...entities,...(config.entities||{})};
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
  function svg(model,hass) {
    const {plan,anchored,points,extras}=model;
    const all=Object.fromEntries(plan.components.map(c=>[c.id,c]));
    const loc=id=>anchored.get(id)||points.get(id);
    const defs=plan.components.filter(isTank).map(c=>'<linearGradient id="hpi-'+c.id+'" x1="0" y1="0" x2="0" y2="1">'+stops(c,hass)+'</linearGradient>').join('');
    const links=plan.connections.map(edge=>{
      // The core pipe path already connects legacy core units. Only draw extra
      // paths for links crossing into or between added components.
      if(anchored.has(edge.from)&&anchored.has(edge.to))return '';
      const p=port(all[edge.from],loc(edge.from),edge.from_port);
      const q=port(all[edge.to],loc(edge.to),edge.to_port);
      const mid=(p.x+q.x)/2;
      const d='M'+p.x+' '+p.y+' H'+mid+' V'+q.y+' H'+q.x;
      const s=HPC_FREE.state(hass,edge.temperature_entity);
      const color=s?HPC_FREE.color(s):null;
      const on=edge.flow_entity && HPC_FREE.active(HPC_FREE.state(hass,edge.flow_entity));
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
    const firstBuffer=plan.components.find(c=>c.type==='buffer');
    const firstDhw=plan.components.find(c=>c.type==='dhw_tank');
    return {defs,body:'<g id="hpc-integrated">'+links+nodes+'</g>',
      firstBuffer:firstBuffer?.id,firstDhw:firstDhw?.id};
  }
  return {layout,coreConfig,svg,tankPoints};
})();
