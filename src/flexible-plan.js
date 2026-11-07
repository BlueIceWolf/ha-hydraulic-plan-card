const HPC_FREE = (function makeFreeHelpers() {
  const types = [
    {type:"wood_gasifier",de:"Holzvergaser",en:"Wood gasifier",group:"source",fields:["state","flow","return","exhaust","oxygen","fan","power","pump"],ports:["flow:R:.25","return:L:.75"]},
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
      components.push({id:n.id,type:n.type,name:String(n.name||display(n.type)).slice(0,75),
        x:coord(n.x,defaults[group]),y:coord(n.y,70+index*(group==="storage"?240:180)),sensors,level_sensors});
    }
    const byId=Object.fromEntries(components.map(c=>[c.id,c]));
    const connections=[], edgeIds=new Set();
    for(const e of (Array.isArray(raw.connections)?raw.connections:[]).slice(0,180)){
      if(!e||!isId(e.id)||edgeIds.has(e.id)||!byId[e.from]||!byId[e.to])continue;
      if(!ports(byId[e.from].type).some(p=>p.id===e.from_port)||
         !ports(byId[e.to].type).some(p=>p.id===e.to_port))continue;
      edgeIds.add(e.id);
      connections.push({id:e.id,from:e.from,from_port:e.from_port,to:e.to,to_port:e.to_port,
        flow_entity:entityRx.test(e.flow_entity||"")?e.flow_entity:"",
        temperature_entity:entityRx.test(e.temperature_entity||"")?e.temperature_entity:""});
    }
    return {components,connections};
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
      y:70+index*(group==="storage"?240:180),sensors:{}};
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
    const f=Math.min(1,Math.max(0,(t-15)/65));
    const cold=[70,145,186],hot=[223,88,52];
    return "rgb("+cold.map((v,i)=>Math.round(v+(hot[i]-v)*f)).join(",")+")";
  }
  function portXY(c,key) {
    const [w,h]=dimension(c.type);
    const p=ports(c.type).find(p=>p.id===key);
    return p?{x:c.x+(p.side==="R"?w:0),y:c.y+h*p.y}:{x:c.x+w/2,y:c.y+h/2};
  }
  function draw(raw,hass,options={}) {
    const plan=normalize(raw);
    const lang=options.lang||"de";
    const selected=options.selected||"";
    const bx=Math.max(1150,...plan.components.map(c=>c.x+dimension(c.type)[0]+70));
    const by=Math.max(510,...plan.components.map(c=>c.y+dimension(c.type)[1]+85));
    const width=Math.min(bx,8500),height=Math.min(by,8500);
    const tanks=plan.components.filter(c=>["buffer","dhw_tank"].includes(c.type));
    // Store measured stratification points in height order. SVG interpolates colors
    // BETWEEN real readings, and never invents an unmeasured temperature.
    const tankPoints=c=>{
      const standard=[["top",0],["middle",50],["bottom",100]]
        .filter(([key])=>!!c.sensors[key]).map(([key,position])=>({key,position,entity:c.sensors[key]}));
      const extra=(c.level_sensors||[]).map((p,i)=>({key:"extra_"+i,position:p.position,entity:p.entity}));
      return [...standard,...extra].filter(p=>state(hass,p.entity)?.number!==null&&!!state(hass,p.entity))
        .sort((a,b)=>a.position-b.position);
    };
    const gradients=tanks.map(c=>{
      const points=tankPoints(c);
      const stops=[];
      if(!points.length){stops.push('<stop offset="0%" stop-color="#586575"/>',
        '<stop offset="100%" stop-color="#586575"/>');}
      else{
        const first=points[0],last=points[points.length-1];
        const add=(pos,c)=>stops.push(`<stop offset="${pos}%" stop-color="${c}"/>`);
        if(first.position>0){add(0,"#586575");add(Math.max(0,first.position-.5),"#586575");}
        points.forEach(p=>add(p.position,color(state(hass,p.entity))));
        if(last.position<100){add(Math.min(100,last.position+.5),"#586575");add(100,"#586575");}
      }
      return `<linearGradient id="hpc-${esc(c.id)}" x1="0" y1="0" x2="0" y2="1">${stops.join("")}</linearGradient>`;
    }).join("");
    const map=Object.fromEntries(plan.components.map(c=>[c.id,c]));
    const connectors=plan.connections.map(e=>{
      const a=portXY(map[e.from],e.from_port),b=portXY(map[e.to],e.to_port);
      const mx=Math.round((a.x+b.x)/2);
      const path=`M${a.x},${a.y} H${mx} V${b.y} H${b.x}`;
      const c=color(state(hass,e.temperature_entity));
      const moving=!!e.flow_entity&&active(state(hass,e.flow_entity));
      return `<g class="hpc-route" data-edge="${esc(e.id)}"><title>${esc(e.from+":"+e.from_port+" → "+e.to+":"+e.to_port)}</title>
        <path d="${path}" class="hpc-pipe" stroke="${c}" marker-end="url(#hpc-arrow)"/>
        ${moving?`<path d="${path}" class="hpc-pulse"/>`:""}</g>`;
    }).join("");
    const nodes=plan.components.map(c=>{
      const [w,h]=dimension(c.type);
      const isTank=["buffer","dhw_tank"].includes(c.type);
      const sensor=c.sensors.state||c.sensors.pump||c.sensors.heater;
      const on=active(state(hass,sensor));
      const rows=(c.type==="heating_circuit"?["flow","return","mixer"]:["flow","return","power","exhaust","position"])
        .filter(key=>!!c.sensors[key]).slice(0,3);
      const tankRows=isTank?tankPoints(c):[];
      // Every sensor affects the gradient. To prevent overlapping labels at dense
      // installation heights, show up to seven evenly spaced values. All sensor
      // markers retain a tooltip with their real position and reading.
      const visibleTankRows=tankRows.length<=7?tankRows:
        tankRows.filter((p,i)=>i===0||i===tankRows.length-1||Math.round(i*6/(tankRows.length-1))!==Math.round((i-1)*6/(tankRows.length-1)));
      const values=isTank
        ? tankRows.map(p=>{
          const physicalY=c.y+Math.max(9,Math.min(h-9,h*p.position/100));
          const v=state(hass,p.entity),idx=visibleTankRows.indexOf(p);
          const marker=`<circle cx="${c.x+8}" cy="${physicalY}" r="3" fill="#fff" opacity=".9"><title>${esc(p.position+" % · "+format(v))}</title></circle>`;
          if(idx<0)return marker;
          const textY=c.y+52+(visibleTankRows.length===1?0:idx*(h-67)/(visibleTankRows.length-1));
          return marker+`<text x="${c.x+16}" y="${textY}" class="hpc-reading hpc-tank-reading">${esc(format(v))}</text>`;
        }).join("")
        : rows.map((key,i)=>`<text x="${c.x+14}" y="${c.y+57+i*22}" class="hpc-reading">${esc(fieldLabel(key,lang))}: ${esc(format(state(hass,c.sensors[key])))}</text>`).join("");
      const outline=isTank?`fill="url(#hpc-${esc(c.id)})"`:`fill="${on?"#294839":"#202f41"}"`;
      const border=selected===c.id?"#f4c25c":on?"#6dd7ad":"#60758d";
      const circles=ports(c.type).map(p=>{
        const xy=portXY(c,p.id);
        return `<circle class="hpc-port" cx="${xy.x}" cy="${xy.y}" r="5" fill="#cad7e4"><title>${esc(c.id+":"+p.id)}</title></circle>`;
      }).join("");
      const title=(c.name||display(c.type,lang));
      return `<g class="hpc-node" data-node="${esc(c.id)}" role="group" aria-label="${esc(title)}">
        <rect x="${c.x}" y="${c.y}" width="${w}" height="${h}" rx="${isTank?23:16}" ${outline} stroke="${border}" stroke-width="${selected===c.id?3:2}"/>
        <text x="${c.x+14}" y="${c.y+28}" class="hpc-name">${esc(title)}</text>
        ${values}
        ${!values?`<text class="hpc-muted" x="${c.x+14}" y="${c.y+60}">${esc(display(c.type,lang))}</text>`:""}
        ${circles}</g>`;
    }).join("");
    return `<svg id="hpc-free-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(text("Hydraulikplan","Hydraulic plan",lang))}" preserveAspectRatio="xMinYMin meet">
      <defs>${gradients}<marker id="hpc-arrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#adc8dd"/></marker></defs>
      ${connectors}${nodes}
    </svg>`;
  }
  const css=`
    :host{display:block} ha-card{padding:14px;background:var(--card-background-color,#192230)}
    .hpc-board{width:100%;overflow:auto;min-height:200px;border-radius:14px;background:#111d2b}
    #hpc-free-svg{width:100%;height:auto;min-width:600px;max-height:76vh;display:block}
    .hpc-node{cursor:pointer}.hpc-node:focus-visible rect{stroke:#ffcc6f;stroke-width:4}
    .hpc-name{font:600 16px sans-serif;fill:#f3f6fa}
    .hpc-reading{font:13px sans-serif;fill:#eff6ff;paint-order:stroke fill;stroke:#172130;stroke-width:2.5px}
    .hpc-tank-reading{font-size:12px}.hpc-muted{font:13px sans-serif;fill:#aabbd0}
    .hpc-pipe{fill:none;stroke-width:7;stroke-linejoin:round;stroke-linecap:round}
    .hpc-pulse{fill:none;stroke:#ebf6ff;stroke-width:3;stroke-dasharray:4 13;animation:hpc-motion 1.4s linear infinite}
    @keyframes hpc-motion{to{stroke-dashoffset:-34}}
    @media(prefers-reduced-motion:reduce){.hpc-pulse{animation:none}}
    .hpc-note{font-size:.82em;color:var(--secondary-text-color,#9ca3af);margin:8px 3px}
    .hpc-editor{font-family:var(--ha-font-family-body,inherit);color:var(--primary-text-color,inherit)}
    .hpc-editor h3{font-size:1.05em;margin:12px 0 7px}
    .hpc-editor p{font-size:.9em;color:var(--secondary-text-color,#9ca3af)}
    .hpc-actions{display:flex;flex-wrap:wrap;gap:8px;margin:9px 0}
    .hpc-editor button,.hpc-editor select,.hpc-editor input{font:inherit;border-radius:9px;
      border:1px solid var(--divider-color,#67738c);padding:8px 10px;color:var(--primary-text-color,inherit);
      background:var(--secondary-background-color,rgba(140,140,140,.09));max-width:100%;min-width:0}
    .hpc-editor button{cursor:pointer}.hpc-editor button:focus-visible{outline:2px solid var(--primary-color,#53a8f7)}
    .hpc-editor button.hpc-primary{background:var(--primary-color,#157cbd);color:white;border-color:transparent}
    .hpc-editor .hpc-row{display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-bottom:7px}
    .hpc-editor label{display:flex;flex-direction:column;gap:4px;font-size:.85em;flex:1 1 180px}
    .hpc-editor .hpc-field{margin:6px 0}
    .hpc-editor .hpc-component-list{display:flex;flex-wrap:wrap;gap:5px}
    .hpc-editor .hpc-component-list button[aria-pressed=true]{border-color:var(--primary-color,#338be5);background:color-mix(in srgb,var(--primary-color,#338be5) 12%,transparent)}
    .hpc-editor .hpc-board{min-height:180px}
  `;
  return {types,byType,ports,dimension,display,fieldLabel,esc,normalize,newNode,sample,state,active,format,color,portXY,draw,css,text};
})();
