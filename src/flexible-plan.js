const HPC_FREE = (function makeFreeHelpers() {
  const types = [
    {type:"wood_gasifier",de:"Holzvergaser",en:"Wood gasifier",group:"source",fields:["state","flow","return","exhaust","oxygen","fan","power","pump","mixer"],ports:["flow:R:.25","return:L:.75"]},
    {type:"oil_boiler",de:"Ölkessel",en:"Oil boiler",group:"source",fields:["state","flow","return","power","pump","starts"],ports:["flow:R:.25","return:L:.75","dhw:R:.56"]},
    {type:"pellet_boiler",de:"Pelletkessel",en:"Pellet boiler",group:"source",fields:["state","flow","return","exhaust","pump"],ports:["flow:R:.25","return:L:.75"]},
    {type:"gas_boiler",de:"Gaskessel",en:"Gas boiler",group:"source",fields:["state","flow","return","power","pump"],ports:["flow:R:.25","return:L:.75"]},
    {type:"heat_pump",de:"Wärmepumpe",en:"Heat pump",group:"source",fields:["state","flow","return","power","pump"],ports:["flow:R:.25","return:L:.75"]},
    {type:"buffer",de:"Pufferspeicher",en:"Buffer tank",group:"storage",fields:["top","middle","bottom","heater"],ports:["top_in:L:.2","top_out:R:.2","mid_in:L:.5","mid_out:R:.5","bottom_in:L:.8","bottom_out:R:.8"]},
    {type:"dhw_tank",de:"Warmwasserspeicher",en:"Hot-water tank",group:"storage",fields:["top","middle","bottom"],ports:["coil_in:L:.28","coil_out:L:.74","hot_out:R:.24","cold_in:R:.78"]},
    {type:"heating_circuit",de:"Heizkreis (gemischt/ungemischt)",en:"Heating circuit",group:"load",fields:["flow","return","target","pump","mixer"],ports:["flow_in:L:.25","return_out:L:.75"]},
    {type:"pump",de:"Umwälzpumpe",en:"Circulation pump",group:"control",fields:["state","power","volume"],ports:["in:L:.5","out:R:.5"]},
    {type:"mixer",de:"3-Wege-Mischer / Rücklaufanhebung",en:"3-way mixing valve",group:"control",fields:["position","state"],ports:["a:L:.25","b:L:.75","ab:R:.5"]},
    {type:"diverter",de:"3-Wege-Umschaltventil",en:"3-way diverter valve",group:"control",fields:["position","state"],ports:["a:L:.25","b:L:.75","ab:R:.5"]},
    {type:"electric_heater",de:"Heizstab / Heizregister",en:"Electric heater",group:"control",fields:["state","power","flow","target"],ports:["in:L:.5","out:R:.5"]},
    {type:"manifold",de:"Verteiler / Sammelpunkt",en:"Manifold",group:"control",fields:[],ports:["a:L:.2","b:L:.5","c:L:.8","d:R:.2","e:R:.5","f:R:.8"]},
  ];
  const fields = {
    state:["Betrieb","State"],flow:["Vorlauf","Flow"],return:["Rücklauf","Return"],
    exhaust:["Abgas","Flue gas"],oxygen:["Restsauerstoff","Residual oxygen"],
    fan:["Gebläse","Fan"],power:["Leistung","Power"],pump:["Pumpe","Pump"],starts:["Starts","Starts"],
    top:["Oben","Top"],middle:["Mitte","Middle"],bottom:["Unten","Bottom"],heater:["Heizstab","Immersion heater"],
    target:["Sollwert","Setpoint"],mixer:["Mischer","Mixer"],position:["Stellung","Position"],volume:["Volumenstrom","Flow rate"],
  };
  const byType = Object.fromEntries(types.map(t=>[t.type,t]));
  const entityRx = /^(?:sensor|binary_sensor|switch|number|select|input_boolean|input_number)\.[a-zA-Z0-9_]+$/;
  const isId = id => typeof id==="string" && /^[a-z][a-z0-9_]{0,43}$/.test(id);
  const esc = v => String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const text = (de,en,lang) => lang==="en"?en:de;
  const display = (type,lang="de") => byType[type] ? text(byType[type].de,byType[type].en,lang) : type;
  const fieldLabel = (key,lang="de") => text(...(fields[key]||[key,key]),lang);
  const ports = type => byType[type] ? byType[type].ports.map(p=>{const [id,side,y]=p.split(":");return {id,side,y:+y};}) : [];
  const dimension = type => ["buffer","dhw_tank"].includes(type) ? [138,170] :
    ["mixer","diverter","pump","electric_heater","manifold"].includes(type) ? [157,96] : [192,122];
  function normalize(input) {
    const raw=input&&typeof input==="object"?input:{};
    const components=[], used=new Set(), counters={};
    for (const n of (Array.isArray(raw.components)?raw.components:[]).slice(0,80)) {
      if (!n||!byType[n.type]||!isId(n.id)||used.has(n.id))continue;
      used.add(n.id);
      const group=byType[n.type].group;
      const index=counters[group]||0;counters[group]=index+1;
      const defaults={source:75,control:365,storage:635,load:910};
      const coord=(v,d) => Number.isFinite(v)&&v>=0&&v<=7000?Math.round(v):d;
      const sensors={};
      for(const key of byType[n.type].fields){
        const id=n.sensors?.[key];
        if(typeof id==="string"&&entityRx.test(id))sensors[key]=id;
      }
      // Heights are measured from the top of the tank, 0..100 %. Arbitrarily
      // many additional sensor points can be inserted between the fixed legacy slots.
      const level_sensors=[];
      if(["buffer","dhw_tank"].includes(n.type)&&Array.isArray(n.level_sensors)){
        const slots=new Set();
        for(const point of n.level_sensors.slice(0,24)){
          const entity=point?.entity;
          const position=Number(point?.position);
          if(typeof entity!=="string"||(entity&&!entityRx.test(entity))||!Number.isFinite(position)||position<0||position>100)continue;
          const key=Math.round(position*10)/10;
          if(slots.has(key))continue;
          slots.add(key);
          level_sensors.push({position:key,entity});
        }
        level_sensors.sort((a,b)=>a.position-b.position);
      }
      const options=n.type==="wood_gasifier"
        ?{return_lift:n.options?.return_lift===true}
        :["oil_boiler","gas_boiler","pellet_boiler"].includes(n.type)
          ?{boiler_kind:["standard","low_temp","condensing"].includes(n.options?.boiler_kind)?n.options.boiler_kind:"standard"}
          :{};
      components.push({id:n.id,type:n.type,name:String(n.name||display(n.type)).slice(0,75),
        x:coord(n.x,defaults[group]),y:coord(n.y,70+index*(group==="storage"?240:180)),sensors,level_sensors,options});
    }
    const byId=Object.fromEntries(components.map(c=>[c.id,c]));
    const connections=[], edgeIds=new Set();
    for(const e of (Array.isArray(raw.connections)?raw.connections:[]).slice(0,180)){
      if(!e||!isId(e.id)||edgeIds.has(e.id)||!byId[e.from]||!byId[e.to])continue;
      if(e.from===e.to||!ports(byId[e.from].type).some(p=>p.id===e.from_port)||
         !ports(byId[e.to].type).some(p=>p.id===e.to_port))continue;
      edgeIds.add(e.id);
      connections.push({id:e.id,from:e.from,from_port:e.from_port,to:e.to,to_port:e.to_port,
        flow_entity:entityRx.test(e.flow_entity||"")?e.flow_entity:"",
        temperature_entity:entityRx.test(e.temperature_entity||"")?e.temperature_entity:""});
    }
    return {components,connections};
  }
  // Read the hydraulic direction from each port. Valves allow both directions,
  // whereas a boiler return port is never a valid pipe source.
  function portRole(type,key) {
    if(["mixer","diverter","manifold"].includes(type))return "both";
    if(["flow","dhw","top_out","mid_out","bottom_out","coil_out","hot_out","return_out","out"].includes(key))return "out";
    if(["return","top_in","mid_in","bottom_in","coil_in","cold_in","flow_in","in"].includes(key))return "in";
    return "both";
  }
  function validConnection(plan,from,fromPort,to,toPort) {
    const p=normalize(plan);
    const a=p.components.find(c=>c.id===from),b=p.components.find(c=>c.id===to);
    if(!a||!b||a.id===b.id)return false;
    if(!ports(a.type).some(x=>x.id===fromPort)||!ports(b.type).some(x=>x.id===toPort))return false;
    if(portRole(a.type,fromPort)==="in"||portRole(b.type,toPort)==="out")return false;
    return !p.connections.some(e=>e.from===from&&e.from_port===fromPort&&e.to===to&&e.to_port===toPort);
  }
  const nextId=(prefix,ids)=>{let i=1;while(ids.has(prefix+"_"+i))i++;return prefix+"_"+i;};
  function newNode(type,plan) {
    if(!byType[type])return null;
    const nodes=normalize(plan).components;
    const group=byType[type].group;
    const index=nodes.filter(c=>byType[c.type].group===group).length;
    const prefix={wood_gasifier:"holzvergaser",oil_boiler:"oelkessel",pellet_boiler:"pelletkessel",gas_boiler:"gaskessel",heat_pump:"waermepumpe",
      buffer:"puffer",dhw_tank:"warmwasser",heating_circuit:"heizkreis",pump:"pumpe",mixer:"mischer",diverter:"ventil",
      electric_heater:"heizstab",manifold:"verteiler"}[type];
    return {id:nextId(prefix,new Set(nodes.map(c=>c.id))),type,name:display(type),x:{source:75,control:365,storage:635,load:910}[group],
      y:70+index*(group==="storage"?240:180),sensors:{},options:{}};
  }
  const sample = () => {
    const cs=[
      ["wood_gasifier","holz","Fröling S3 Turbo",75,100],
      ["pump","holzlade","Kesselladepumpe",365,98],
      ["buffer","puffer1","Puffer 1",650,60],
      ["buffer","puffer2","Puffer 2",875,60],
      ["buffer","puffer3","Puffer 3",1100,60],
      ["heat_pump","wp","Wärmepumpe",75,330],
      ["oil_boiler","oel","Ölheizung",365,360],
      ["dhw_tank","ww","Warmwasserspeicher",650,390],
      ["diverter","ruecklauf","Rücklaufumschaltung",875,415],
      ["manifold","verteiler","Heizkreis-Verteiler",1100,430],
      ["mixer","mischer1","Heizkreismischer 1",1340,290],
      ["heating_circuit","hk1","Heizkreis 1",1590,285],
      ["mixer","mischer2","Heizkreismischer 2",1340,475],
      ["heating_circuit","hk2","Heizkreis 2",1590,480],
      ["electric_heater","heizstab","Heizstab / Heizregister",365,690],
      ["mixer","heizstabmischer","Heizstab-Umlaufmischer",650,705],
    ].map(([type,id,name,x,y])=>({type,id,name,x,y,sensors:{}}));
    // Conceptual connections only; precise port directions and safety functions
    // must be checked against the actual pipework before use.
    const es=[
      ["holz","flow","holzlade","in"],["holzlade","out","puffer1","top_in"],
      ["puffer1","bottom_out","puffer2","top_in"],
      ["puffer2","bottom_out","puffer3","top_in"],
      ["puffer3","bottom_out","holz","return"],
      ["wp","flow","puffer1","mid_in"],
      ["puffer1","mid_out","wp","return"],
      ["puffer1","top_out","oel","return"],
      ["oel","flow","verteiler","a"],
      ["oel","dhw","ww","coil_in"],
      ["ww","coil_out","ruecklauf","a"],
      ["ruecklauf","ab","puffer1","bottom_in"],
      ["verteiler","d","mischer1","a"],
      ["mischer1","ab","hk1","flow_in"],
      ["hk1","return_out","puffer1","bottom_in"],
      ["verteiler","e","mischer2","a"],
      ["mischer2","ab","hk2","flow_in"],
      ["hk2","return_out","puffer1","bottom_in"],
      ["heizstab","out","heizstabmischer","a"],
      ["heizstabmischer","ab","puffer1","mid_in"],
      ["heizstabmischer","b","heizstab","in"],
    ].map(([from,from_port,to,to_port],i)=>({id:"leitung_"+(i+1),from,from_port,to,to_port}));
    return normalize({components:cs,connections:es});
  };
  function state(hass,id) {
    const s=id&&hass?.states?.[id];
    if(!s||["unavailable","unknown","none",""].includes(String(s.state).toLowerCase()))return null;
    const n=Number(s.state),v=Number.isFinite(n)?n:null;
    return {text:String(s.state),number:v,unit:String(s.attributes?.unit_of_measurement||"")};
  }
  function active(s) {
    if(!s)return false;
    const t=s.text.toLowerCase();
    if(["on","open","active","running","heat","heating","ein","an","aktiv","brennt","heizen"].includes(t))return true;
    if(["off","closed","idle","standby","aus","false"].includes(t))return false;
    return s.number!==null&&s.number>0;
  }
  const format=s=>s?(s.number!==null?
    s.number.toLocaleString("de-DE",{maximumFractionDigits:1})+(s.unit?" "+s.unit:""):
    s.text.slice(0,16)):"–";
  function color(s) {
    if(!s||s.number===null||!["°c","c","°f","k"].includes(s.unit.toLowerCase()))return "#718096";
    const t=s.unit==="°F"?(s.number-32)*5/9:s.unit==="K"?s.number-273.15:s.number;
    // Matching the upstream tank palette: blue → teal → warm amber → red.
    const ranges=[
      [10,[72,110,170]],
      [30,[63,145,164]],
      [50,[200,120,61]],
      [80,[199,91,91]],
    ];
    if(t<=ranges[0][0])return "rgb("+ranges[0][1].join(",")+")";
    for(let i=1;i<ranges.length;i++){
      if(t<=ranges[i][0]){
        const [at,b]=ranges[i-1], [next,c]=ranges[i];
        const f=(t-at)/(next-at);
        return "rgb("+b.map((v,j)=>Math.round(v+(c[j]-v)*f)).join(",")+")";
      }
    }
    return "rgb("+ranges.at(-1)[1].join(",")+")";
  }
  function portXY(c,key) {
    const [w,h]=dimension(c.type);
    const p=ports(c.type).find(p=>p.id===key);
    return p?{x:c.x+(p.side==="R"?w:0),y:c.y+h*p.y}:{x:c.x+w/2,y:c.y+h/2};
  }
  function draw(raw,hass,options={}) {
  const plan=normalize(raw),lang=options.lang||"de",selected=options.selected||"";
  const bx=Math.max(1060,...plan.components.map(c=>c.x+dimension(c.type)[0]+76));
  const by=Math.max(450,...plan.components.map(c=>c.y+dimension(c.type)[1]+90));
  const width=Math.min(bx,8500),height=Math.min(by,8500);
  const tanks=plan.components.filter(c=>["buffer","dhw_tank"].includes(c.type));
  const validTemp=(id)=>{
    const v=state(hass,id);
    return v&&v.number!==null&&["°c","c","°f","k"].includes(v.unit.toLowerCase())?v:null;
  };
  const tankPoints=c=>{
    const standard=[["top",0],["middle",50],["bottom",100]]
      .filter(([key])=>!!c.sensors[key]).map(([key,position])=>({key,position,entity:c.sensors[key]}));
    const extra=(c.level_sensors||[]).map((p,i)=>({key:"extra_"+i,position:p.position,entity:p.entity}));
    return [...standard,...extra].filter(p=>validTemp(p.entity)).sort((a,b)=>a.position-b.position);
  };
  const defs=tanks.map(c=>{
    const points=tankPoints(c),stops=[];
    const add=(pos,col)=>stops.push(`<stop offset="${pos}%" stop-color="${col}"/>`);
    if(!points.length){add(0,"#718096");add(100,"#718096");}
    else {
      const first=points[0],last=points.at(-1);
      if(first.position>0){add(0,"#718096");add(Math.max(0,first.position-.4),"#718096");}
      points.forEach(p=>add(p.position,color(validTemp(p.entity))));
      if(last.position<100){add(Math.min(100,last.position+.4),"#718096");add(100,"#718096");}
    }
    return `<linearGradient id="hpc-${esc(c.id)}" x1="0" y1="0" x2="0" y2="1">${stops.join("")}</linearGradient>`;
  }).join("");
  const names=Object.fromEntries(plan.components.map(c=>[c.id,c]));
  const connectorColor=(e)=>color(validTemp(e.temperature_entity));
  const routes=plan.connections.map(e=>{
    const start=portXY(names[e.from],e.from_port),end=portXY(names[e.to],e.to_port);
    const mid=(start.x+end.x)/2;
    const path=`M${start.x},${start.y} H${mid} V${end.y} H${end.x}`;
    const pumping=!!e.flow_entity&&active(state(hass,e.flow_entity));
    const c=connectorColor(e);
    return `<g class="hpc-route" data-edge="${esc(e.id)}">
      <title>${esc(names[e.from].name+" → "+names[e.to].name+" | "+e.from_port+" → "+e.to_port)}</title>
      <path d="${path}" class="hpc-pipe-outline"/>
      <path d="${path}" class="hpc-pipe" stroke="${c}" marker-end="url(#hpc-arrow)"/>
      ${pumping?`<path d="${path}" class="hpc-pulse"/>`:""}
    </g>`;
  }).join("");
  const glyph=(type,x,y,on)=>{
    const base=`transform="translate(${x} ${y})"`;
    const line=`stroke-linecap="round" stroke-linejoin="round"`;
    const icon={
      wood_gasifier:`<path d="M4 36 L40 36 M10 43 L39 43 M17 32 C6 20 23 16 23 5 C36 15 40 24 31 33 C33 23 24 23 24 16 C22 22 14 24 17 32Z"/>`,
      oil_boiler:`<path d="M6 32 H22 L32 22 H42 M9 41 H38 M18 18 L26 11 L32 19 L25 28 Z"/><circle cx="9" cy="32" r="3"/>`,
      pellet_boiler:`<path d="M7 11 H37 V38 H7 Z M10 25 H34 M10 38 L22 45 L34 38"/><circle cx="15" cy="17" r="3"/><circle cx="23" cy="17" r="3"/><circle cx="31" cy="17" r="3"/>`,
      gas_boiler:`<path d="M9 38 H38 M12 28 C11 19 25 13 25 6 C42 22 41 31 30 39 C32 30 25 27 24 21 C22 28 15 30 17 38Z"/>`,
      heat_pump:`<rect x="5" y="7" width="39" height="37" rx="6"/><circle cx="24" cy="26" r="12"/><path d="M24 26 L26 14 Q17 12 18 21Z M24 26 L36 27 Q38 18 29 22Z M24 26 L20 38 Q10 31 20 28Z"/>`,
      heating_circuit:`<path d="M4 11 V40 M43 11 V40 M4 11 H43 M4 40 H43 M10 14 V37 M17 14 V37 M24 14 V37 M31 14 V37 M38 14 V37"/>`,
      pump:`<circle cx="24" cy="24" r="18"/><path d="M14 11 L37 24 L14 37Z"/>`,
      mixer:`<circle cx="24" cy="24" r="18"/><path d="M9 14 L24 25 L39 14 M24 25 V40 M18 20 L30 20"/>`,
      diverter:`<circle cx="24" cy="24" r="18"/><path d="M8 14 L24 25 L39 14 M24 25 V40"/>`,
      manifold:`<path d="M24 4 V44 M4 14 H44 M4 25 H44 M4 36 H44"/>`,
      electric_heater:`<path d="M5 24 H13 L19 10 L26 38 L34 24 H43"/><path d="M7 43 H41"/>`,
    };
    return `<g class="hpc-component-icon ${on?"is-on":""}" ${base} ${line}>${icon[type]||""}</g>`;
  };
  const svgNodes=plan.components.map(c=>{
    const [w,h]=dimension(c.type),isTank=["buffer","dhw_tank"].includes(c.type);
    const rawState=c.sensors.state||c.sensors.pump||c.sensors.heater;
    const on=active(state(hass,rawState));
    const activeClass=on?" is-on":"";
    const selectedClass=c.id===selected?" is-selected":"";
    const name=c.name||display(c.type,lang);
    const shortName=name.length>22?name.slice(0,21)+"…":name;
    const portsMarkup=ports(c.type).map(p=>{
      const xy=portXY(c,p.id);
      return `<circle class="hpc-port" cx="${xy.x}" cy="${xy.y}" r="4.5"><title>${esc(p.id)}</title></circle>`;
    }).join("");
    if(isTank){
      const list=tankPoints(c),maxLabels=6;
      const selectedIndices=new Set(Array.from({length:Math.min(list.length,maxLabels)},(_,i)=>
        Math.round((i*(list.length-1))/Math.max(1,Math.min(maxLabels,list.length)-1))));
      const visible=list.filter((p,i)=>selectedIndices.has(i));
      const gaugeX=c.x+19,gaugeY=c.y+38,gaugeW=w-38,gaugeH=h-50;
      const ticks=Array.from({length:5},(_,i)=>{
        const yy=gaugeY+gaugeH*i/4;
        return `<path class="hpc-tank-tick" d="M${gaugeX+2} ${yy} h9"/>`;
      }).join("");
      const markers=visible.map((p,i)=>{
        const val=validTemp(p.entity);
        const y=gaugeY+gaugeH*(p.position/100);
        const labelY=c.y+61+(visible.length===1?0:i*(h-78)/(visible.length-1));
        return `<circle cx="${gaugeX+6}" cy="${y}" r="3.2" fill="#fff" stroke="#294557" stroke-width="1">
          <title>${esc(p.position+"% · "+format(val))}</title></circle>
          <text x="${c.x+38}" y="${labelY}" class="hpc-reading hpc-tank-reading">${esc(format(val))}</text>`;
      }).join("");
      return `<g class="hpc-node hpc-tank${selectedClass}" data-node="${esc(c.id)}" role="group" aria-label="${esc(name)}">
        <title>${esc(name)}</title>
        <rect class="hpc-tank-shadow" x="${c.x+11}" y="${c.y+5}" width="${w-22}" height="${h-10}" rx="21"/>
        <rect class="hpc-tank-main" x="${gaugeX}" y="${gaugeY}" width="${gaugeW}" height="${gaugeH}" rx="17" fill="url(#hpc-${esc(c.id)})"/>
        <path class="hpc-tank-shine" d="M${gaugeX+12} ${gaugeY+12} V${gaugeY+gaugeH-12}"/>
        <text x="${c.x+w/2}" y="${c.y+28}" class="hpc-label hpc-tank-name" text-anchor="middle">${esc(shortName)}</text>
        ${ticks}${markers}${portsMarkup}
      </g>`;
    }
    const rows=(c.type==="heating_circuit"?["flow","return","mixer"]:["flow","return","power","exhaust","position"])
      .filter(k=>!!c.sensors[k]).slice(0,2);
    const status=rawState?state(hass,rawState):null;
    const values=rows.map((key,i)=>`<text class="hpc-reading" x="${c.x+72}" y="${c.y+74+i*19}">
      ${esc(fieldLabel(key,lang))}: ${esc(format(state(hass,c.sensors[key])))}</text>`).join("");
    const statusText=status?`<text class="hpc-detail" x="${c.x+72}" y="${c.y+49}">${esc(format(status))}</text>`:"";
    return `<g class="hpc-node hpc-appliance${activeClass}${selectedClass}" data-node="${esc(c.id)}" role="group" aria-label="${esc(name)}">
      <title>${esc(name)}</title>
      <rect class="hpc-unit-border" x="${c.x}" y="${c.y}" width="${w}" height="${h}" rx="13"/>
      <text class="hpc-label" x="${c.x+13}" y="${c.y+26}">${esc(shortName)}</text>
      ${glyph(c.type,c.x+16,c.y+43,on)}
      ${statusText}
      ${values || `<text class="hpc-detail" x="${c.x+72}" y="${c.y+74}">${esc(display(c.type,lang).slice(0,19))}</text>`}
      ${portsMarkup}
    </g>`;
  }).join("");
  return `<svg id="hpc-free-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"
    role="img" aria-label="${esc(text("Hydraulikplan","Hydraulic plan",lang))}" preserveAspectRatio="xMinYMin meet">
    <defs>${defs}
      <marker id="hpc-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M1,1 L7,4 L1,7 Z" class="hpc-arrow"/>
      </marker>
    </defs>
    ${routes}${svgNodes}
  </svg>`;
}
  const css="\n  :host { display:block; --hpc-muted: var(--secondary-text-color, #7b8798); }\n  ha-card { background:var(--ha-card-background,var(--card-background-color,#fff)); padding:14px;overflow:hidden; }\n  .hpc-board {width:100%;overflow:auto;overscroll-behavior:contain;border-radius:12px;\n    border:1px solid var(--divider-color,rgba(110,125,145,.22));\n    background:var(--card-background-color,rgba(0,0,0,.02));}\n  #hpc-free-svg{min-width:650px;display:block;width:100%;height:auto;max-height:72vh;}\n  .hpc-appliance .hpc-unit-border{fill:var(--secondary-background-color,rgba(126,144,160,.1));\n    stroke:var(--divider-color,#9ca3af);stroke-width:2.3;}\n  .hpc-appliance.is-on .hpc-unit-border{stroke:var(--hfc-heat,#ca793e);}\n  .hpc-node.is-selected .hpc-unit-border,.hpc-node.is-selected .hpc-tank-shadow{\n    stroke:var(--primary-color,#2196f3);stroke-width:4;}\n  .hpc-unit-border,.hpc-tank-shadow,.hpc-tank-main{filter:drop-shadow(0 2px 3px rgba(0,0,0,.08))}\n  .hpc-component-icon{stroke:var(--hpc-muted);fill:none;stroke-width:2.8}\n  .hpc-component-icon.is-on{stroke:var(--hfc-hot,#b35b38)}\n  .hpc-component-icon circle,.hpc-component-icon rect{fill:var(--card-background-color,#fff)}\n  .hpc-node{cursor:pointer}.hpc-node:hover .hpc-unit-border{stroke:var(--primary-color,#2196f3)}\n  .hpc-label{font:600 16px var(--ha-font-family-body,system-ui,sans-serif);fill:var(--primary-text-color,#222);}\n  .hpc-tank-name{font-size:15px}\n  .hpc-reading{font:13px var(--ha-font-family-body,system-ui,sans-serif);fill:var(--primary-text-color,#222);}\n  .hpc-tank-reading{font:600 12px var(--ha-font-family-body,system-ui,sans-serif);\n    fill:#fff;stroke:rgba(29,46,62,.85);paint-order:stroke fill;stroke-width:3px;}\n  .hpc-detail{font:13px var(--ha-font-family-body,system-ui,sans-serif);fill:var(--secondary-text-color,#7d8590);}\n  .hpc-tank-shadow{fill:var(--card-background-color,#fff);stroke:var(--divider-color,#8e9bab);stroke-width:2.4;}\n  .hpc-tank-main{stroke:var(--divider-color,rgba(70,90,110,.6));stroke-width:1.3}\n  .hpc-tank-shine{fill:none;stroke:rgba(255,255,255,.28);stroke-width:6;stroke-linecap:round}\n  .hpc-tank-tick{fill:none;stroke:rgba(255,255,255,.50);stroke-width:1.1;}\n  .hpc-port{fill:var(--card-background-color,#fff);stroke:var(--hfc-flow-hot,#ad584b);stroke-width:2}\n  .hpc-route{pointer-events:none;}\n  .hpc-pipe-outline{fill:none;stroke:var(--divider-color,rgba(110,125,145,.5));\n    stroke-width:13;stroke-linecap:round;stroke-linejoin:round;}\n  .hpc-pipe{fill:none;stroke-width:9;stroke-linecap:round;stroke-linejoin:round;}\n  .hpc-arrow{fill:var(--primary-text-color,#516274);}\n  .hpc-pulse{fill:none;stroke:rgba(255,255,255,.9);stroke-width:3;stroke-dasharray:5 13;\n    animation:hpc-motion 1.35s linear infinite;}\n  @keyframes hpc-motion{to{stroke-dashoffset:-36}}\n  @media(prefers-reduced-motion:reduce){.hpc-pulse{animation:none;}}\n  .hpc-note{font-size:.82em;color:var(--secondary-text-color,#7d8590);margin:10px 3px 4px;}\n  .hpc-editor{font-family:var(--ha-font-family-body,inherit);color:var(--primary-text-color,inherit);}\n  .hpc-editor h3{font-size:1.02em;font-weight:600;margin:18px 0 9px;border-bottom:1px solid var(--divider-color,rgba(127,127,127,.16));padding-bottom:6px}\n  .hpc-editor p{font-size:.88em;line-height:1.5;color:var(--secondary-text-color,#7d8590)}\n  .hpc-actions,.hpc-row{display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:9px 0}\n  .hpc-editor button,.hpc-editor select,.hpc-editor input{\n    box-sizing:border-box;font:inherit;border-radius:10px;\n    border:1px solid var(--divider-color,rgba(127,127,127,.34));\n    padding:10px 12px;color:var(--primary-text-color,inherit);\n    background:var(--card-background-color,#fff);max-width:100%;min-width:0}\n  .hpc-editor input:focus,.hpc-editor select:focus{outline:2px solid var(--primary-color,#03a9f4);outline-offset:1px}\n  .hpc-editor button{cursor:pointer;font-weight:500}\n  .hpc-editor button:hover{background:var(--secondary-background-color,rgba(127,127,127,.12))}\n  .hpc-editor button.hpc-primary{background:var(--primary-color,#03a9f4);color:#fff;border:0;}\n  .hpc-editor label{display:flex;flex-direction:column;gap:5px;font-size:.86em;font-weight:500;flex:1 1 170px;}\n  .hpc-editor .hpc-checkbox{display:flex;flex-direction:row;align-items:center;gap:11px;flex:1 1 100%;cursor:pointer;padding:11px 12px;border:1px solid var(--divider-color,rgba(127,127,127,.32));border-radius:10px;background:var(--secondary-background-color,rgba(127,127,127,.08));}\n  .hpc-editor .hpc-checkbox input{width:19px;height:19px;margin:0;flex:0 0 auto;accent-color:var(--primary-color,#03a9f4);}\n  .hpc-editor .hpc-field{margin:6px 0;}\n  .hpc-editor .hpc-component-list{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}\n  .hpc-editor .hpc-component-list button[aria-pressed=true]{\n    border-color:var(--primary-color,#03a9f4);background:var(--secondary-background-color,rgba(127,127,127,.14));}\n  .hpc-editor .hpc-board{margin:8px 0;min-height:160px;}\n";
  return {types,byType,ports,portRole,validConnection,dimension,display,fieldLabel,esc,normalize,newNode,sample,state,active,format,color,portXY,draw,css,text};
})();
