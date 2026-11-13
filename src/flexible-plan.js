const HPC_FREE = (function makeFreeHelpers() {
  const types = [
    {type:"wood_gasifier",de:"Holzvergaser",en:"Wood gasifier",group:"source",fields:["state","flow","return","exhaust","oxygen","fan","power","pump","mixer","volume"],ports:["flow:R:.25","return:L:.75"]},
    {type:"oil_boiler",de:"Ölkessel",en:"Oil boiler",group:"source",fields:["state","flow","return","power","pump","starts","volume"],ports:["flow:R:.25","return:L:.75","dhw:R:.56"]},
    {type:"pellet_boiler",de:"Pelletkessel",en:"Pellet boiler",group:"source",fields:["state","flow","return","exhaust","pump","fuel_level","volume"],ports:["flow:R:.25","return:L:.75"]},
    {type:"wood_chip_boiler",de:"ETA Hackschnitzelkessel",en:"ETA Wood-chip boiler",group:"source",fields:["state","flow","return","exhaust","oxygen","fan","power","pump","fuel_feed","ash_removal","fuel_level","particle_state","particle_voltage","particle_current","volume"],ports:["flow:R:.25","return:L:.75"]},
    {type:"gas_boiler",de:"Gaskessel",en:"Gas boiler",group:"source",fields:["state","flow","return","power","pump","volume"],ports:["flow:R:.25","return:L:.75"]},
    {type:"heat_pump",de:"Wärmepumpe",en:"Heat pump",group:"source",fields:["state","compressor","compressor_speed","fan_speed","defrost","fault","flow","return","power","pump","volume"],ports:["flow:R:.25","return:L:.75"]},
    {type:"buffer",de:"Pufferspeicher",en:"Buffer tank",group:"storage",fields:["top","middle","bottom","heater"],ports:["top_in:L:.2","top_out:R:.2","mid_in:L:.5","mid_out:R:.5","bottom_in:R:.8","return_in:L:.8","bottom_out:L:.8"]},
    {type:"dhw_tank",de:"Warmwasserspeicher",en:"Hot-water tank",group:"storage",fields:["top","middle","bottom"],ports:["coil_in:L:.28","coil_out:L:.74","hot_out:R:.24","cold_in:R:.78"]},
    {type:"heating_circuit",de:"Heizkreis (gemischt/ungemischt)",en:"Heating circuit",group:"load",fields:["flow","return","target","pump","volume","mixer","mixer_opening","mixer_closing"],ports:["flow_in:L:.25","return_out:L:.75"]},
    {type:"pump",de:"Umwälzpumpe",en:"Circulation pump",group:"control",fields:["state","power","volume"],ports:["in:L:.5","out:R:.5"]},
    {type:"mixer",de:"3-Wege-Mischer / Rücklaufanhebung",en:"3-way mixing valve",group:"control",fields:["position","state"],ports:["a:L:.25","b:L:.75","ab:R:.5"]},
    {type:"diverter",de:"3-Wege-Umschaltventil",en:"3-way diverter valve",group:"control",fields:["position","state"],ports:["a:R:.25","b:R:.75","ab:L:.5"]},
    {type:"electric_heater",de:"Heizstab / Heizregister",en:"Electric heater",group:"control",fields:["state","power","flow","target"],ports:["in:L:.5","out:R:.5"]},
    // The electrostatic filter belongs to the flue-gas path, NOT the water circuit.
    {type:"particle_separator",de:"Elektrostatischer Partikelabscheider",en:"Electrostatic particle separator",group:"control",fields:["state","voltage","current"],ports:[]},
    {type:"manifold",de:"Verteiler / Sammelpunkt",en:"Manifold",group:"control",fields:[],ports:["a:L:.2","b:L:.5","c:L:.8","d:R:.2","e:R:.5","f:R:.8"]},
  ];
  const fields = {
    state:["Betrieb","State"],flow:["Vorlauf","Flow"],return:["Rücklauf","Return"],
    exhaust:["Abgas","Flue gas"],oxygen:["Restsauerstoff","Residual oxygen"],
    fan:["Gebläse","Fan"],power:["Leistung","Power"],pump:["Pumpe","Pump"],starts:["Starts","Starts"],
    compressor:["Verdichter aktiv","Compressor active"],compressor_speed:["Verdichterfrequenz / Modulation","Compressor speed / modulation"],
    fan_speed:["Außengerät-Lüfter","Outdoor fan"],defrost:["Abtauung aktiv","Defrost active"],
    fault:["Störung","Fault"],
    top:["Oben","Top"],middle:["Mitte","Middle"],bottom:["Unten","Bottom"],heater:["Heizstab","Immersion heater"],
    target:["Sollwert","Setpoint"],mixer:["Mischerstellung (%)","Mixing valve position (%)"],mixer_opening:["Mischer öffnet","Mixer opening"],mixer_closing:["Mischer schließt","Mixer closing"],position:["Stellung","Position"],volume:["Volumenstrom","Flow rate"],
    fuel_feed:["Austragung / Förderschnecke","Fuel feed / auger"],ash_removal:["Entaschung","Ash removal"],fuel_level:["Brennstoffvorrat","Fuel stock"],
    voltage:["Hochspannung (kV)","Voltage (kV)"],current:["Strom (mA)","Current (mA)"],
    particle_state:["Partikelabscheider Betrieb","Particle separator state"],
    particle_voltage:["Partikelabscheider Hochspannung","Particle separator voltage"],
    particle_current:["Partikelabscheider Strom","Particle separator current"],
  };
  const byType = Object.fromEntries(types.map(t=>[t.type,t]));
  // Entity IDs are validated syntactically; all measurements remain optional.
  // A meaningful entity may come from an integration, helper or template domain.
  const entityRx = /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;
  const isId = id => typeof id==="string" && /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(id);
  const esc = v => String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const text = (de,en,lang) => lang==="en"?en:de;
  const display = (type,lang="de") => byType[type] ? text(byType[type].de,byType[type].en,lang) : type;
  const fieldLabel = (key,lang="de") => text(...(fields[key]||[key,key]),lang);
  // Simple, original line drawings. No logos or external image assets.
  const icon = (type) => {
    const drawings = {
      wood_gasifier: '<rect x="7" y="7" width="34" height="34" rx="5"/><path d="M10 35h28M14 31h20M18 28c-5-7 3-12 5-18 2 7 10 11 8 18-2 5-10 7-13 0Z"/>',
      oil_boiler: '<rect x="5" y="5" width="27" height="38" rx="4"/><path d="M9 35h19M11 11h15M18 17c-3 4-5 7-5 9a5 5 0 0 0 10 0c0-2-2-5-5-9Z"/><rect x="32" y="17" width="11" height="16" rx="3"/><circle cx="37.5" cy="25" r="2"/><path d="M32 22h-4"/>',
      pellet_boiler: '<rect x="6" y="6" width="36" height="36" rx="5"/><path d="M10 29h28M10 33h28M12 38h24"/><circle cx="16" cy="18" r="3"/><circle cx="25" cy="18" r="3"/><circle cx="34" cy="18" r="3"/>',
      wood_chip_boiler: '<path d="M17 6h25v34H17zM17 31h25M20 11h19v20H20zM24 16h10v12H24zM13 25 3 34M6 29l-3-6M4 36l12-6"/>',
      particle_separator: '<rect x="8" y="14" width="32" height="27" rx="2"/><path d="M3 25h5m32 0h5M16 19v15M24 19v15M32 19v15M17 38l7 0 7 0M26 4l-7 12h7l-4 11 10-16h-7l1-7Z"/>',
      gas_boiler: '<rect x="6" y="6" width="36" height="36" rx="5"/><path d="M13 37h22M19 33c-6-7 3-13 6-22 0 8 10 12 8 20-1 7-12 10-14 2Z"/>',
      heat_pump: '<rect x="5" y="6" width="38" height="36" rx="5"/><circle cx="24" cy="24" r="13"/><path d="M24 24V13c-7 0-9 6-4 9m4 2 10 5c4-7 0-12-6-10m-4 5-9 6c4 7 10 7 12 0"/>',
      buffer: '<rect x="12" y="5" width="24" height="38" rx="8"/><path d="M12 17h24M12 30h24M19 9h10M19 39h10"/>',
      dhw_tank: '<rect x="12" y="5" width="24" height="38" rx="8"/><path d="M12 18h24M16 31c5-9 11 9 16 0M21 23c-2 3-3 5 0 6s4-3 0-6Z"/>',
      heating_circuit: '<rect x="5" y="11" width="38" height="28" rx="3"/><path d="M12 13v24M20 13v24M28 13v24M36 13v24"/>',
      pump: '<circle cx="24" cy="24" r="18"/><path d="M17 13 35 24 17 35Z"/>',
      mixer: '<circle cx="24" cy="24" r="18"/><path d="M11 16 24 26 37 16M24 26v13"/>',
      diverter: '<circle cx="24" cy="24" r="18"/><path d="M11 16 24 26 37 16M24 26v13M30 16h7l-2 7"/>',
      electric_heater: '<rect x="5" y="11" width="38" height="27" rx="4"/><path d="M10 24h7l5-10 5 20 5-10h7"/>',
      manifold: '<path d="M24 5v38M7 12h34M7 24h34M7 36h34"/>',
    };
    return '<svg class="hpc-pictogram" viewBox="0 0 48 48" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">'
      + (drawings[type] || drawings.manifold) + '</g></svg>';
  };
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
      // Retain extension-specific sensor roles on round-trip. Known fields
      // still use strict Home Assistant entity validation.
      const sensors=n.sensors&&typeof n.sensors==="object"&&!Array.isArray(n.sensors)
        ?{...n.sensors}:{};
      for(const key of byType[n.type].fields){
        const id=n.sensors?.[key];
        if(typeof id==="string"&&entityRx.test(id))sensors[key]=id;
        else delete sensors[key];
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
      const options=n.type==="dhw_tank"
        ?{connection_style:n.options?.connection_style==='branch'?'branch':'separate',
          ...(n.options?.dhw_charge&&isId(n.options.dhw_charge.source)&&
            ['pump','diverter','direct'].includes(n.options.dhw_charge.kind)&&
            Array.isArray(n.options.dhw_charge.edges)
            ?{dhw_charge:{source:n.options.dhw_charge.source,
              kind:n.options.dhw_charge.kind,
              control:isId(n.options.dhw_charge.control)?n.options.dhw_charge.control:'',
              edges:n.options.dhw_charge.edges.filter(isId).slice(0,3)}}
            :{})}
        :n.type==="wood_gasifier"
        ?{return_lift:n.options?.return_lift===true,
          froeling_view:n.options?.froeling_view==='classic'?'classic':'s3_turbo',
          mixer_inverted:n.options?.mixer_inverted===true}
        :n.type==="wood_chip_boiler"
          ?{eta_model:["ehack","hack","hack_vr"].includes(n.options?.eta_model)?n.options.eta_model:"ehack",
            particle_separator:n.options?.particle_separator===true,
            silo:n.options?.silo===true}
        :n.type==="mixer"
          ?{mixer_inverted:n.options?.mixer_inverted===true,
            a_closed_state:typeof n.options?.a_closed_state==="string"?n.options.a_closed_state.slice(0,60):"",
            b_closed_state:typeof n.options?.b_closed_state==="string"?n.options.b_closed_state.slice(0,60):"",
            ...(n.options?.a_closed_at!==''&&n.options?.a_closed_at!=null&&
              Number.isFinite(Number(n.options.a_closed_at))?
              {a_closed_at:Math.max(0,Math.min(100,Number(n.options.a_closed_at)))}:{}),
            ...(n.options?.b_closed_at!==''&&n.options?.b_closed_at!=null&&
              Number.isFinite(Number(n.options.b_closed_at))?
              {b_closed_at:Math.max(0,Math.min(100,Number(n.options.b_closed_at)))}:{})}
        :n.type==="diverter"
          ?{dhw_port:n.options?.dhw_port==="b"?"b":"a",
            dhw_state:typeof n.options?.dhw_state==="string"?n.options.dhw_state.slice(0,60):"",
            heating_state:typeof n.options?.heating_state==="string"?n.options.heating_state.slice(0,60):""}
        :n.type==="heating_circuit"
          ?{emitter:HFC_EMITTERS.includes(n.options?.emitter)?n.options.emitter:"radiator",
            mixer_inverted:n.options?.mixer_inverted===true,
            mixed:typeof n.options?.mixed==="boolean"?n.options.mixed:
              !!(n.sensors?.mixer||n.sensors?.mixer_opening||n.sensors?.mixer_closing),
            ...(n.options?.hydraulic_auto&&isId(n.options.hydraulic_auto.source)&&
              ['direct','pump','mixer'].includes(n.options.hydraulic_auto.kind)&&
              Array.isArray(n.options.hydraulic_auto.edges)
              ?{hydraulic_auto:{source:n.options.hydraulic_auto.source,
                kind:n.options.hydraulic_auto.kind,
                control:isId(n.options.hydraulic_auto.control)
                  ?n.options.hydraulic_auto.control:'',
                edges:n.options.hydraulic_auto.edges.filter(isId).slice(0,4)}}
              :{})}
        :n.type==="pellet_boiler"
          ?{boiler_kind:["standard","low_temp","condensing"].includes(n.options?.boiler_kind)?n.options.boiler_kind:"standard",
            silo:n.options?.silo===true}
        :["oil_boiler","gas_boiler"].includes(n.type)
          ?{boiler_kind:["standard","low_temp","condensing"].includes(n.options?.boiler_kind)?n.options.boiler_kind:"standard"}
          :n.type==="heat_pump"
          // Keep the full outdoor-unit gallery from the original card.
          ?{unit_style:(n.options?.unit_style==="buderus_wpls_13_2"||HFC_UNIT_STYLES.includes(n.options?.unit_style))?n.options.unit_style:"auto",
            // Empty defaults are deliberate: existing classic settings and
            // model-dependent fan counts must remain usable after migration.
            ...(HFC_UNIT_SIZES.includes(n.options?.unit_size)?{unit_size:n.options.unit_size}:{}),
            ...(["air","brine","water"].includes(n.options?.source_type)?{source_type:n.options.source_type}:{})}
          :{};
      // Remember which HA device was imported. This is only a read-only
      // identity for duplicate detection, never a credential or gateway URL.
      const discovery=typeof n.discovery?.id==="string"&&
        ["ems-esp","eta","eta-system"].includes(n.discovery?.provider)&&
        /^[a-zA-Z0-9._:\/-]{1,150}$/.test(n.discovery.id)
        ?{provider:n.discovery.provider,id:n.discovery.id}:undefined;
      components.push({...n,id:n.id,type:n.type,name:String(n.name||display(n.type)).slice(0,75),
        x:coord(n.x,defaults[group]),y:coord(n.y,70+index*(group==="storage"?240:180)),
        sensors,level_sensors,options:{...(n.options&&typeof n.options==="object"?n.options:{}),...options},
        ...(discovery?{discovery}:{})});
    }
    const byId=Object.fromEntries(components.map(c=>[c.id,c]));
    const connections=[], edgeIds=new Set(), connectionKeys=new Set();
    for(const e of (Array.isArray(raw.connections)?raw.connections:[]).slice(0,180)){
      if(!e||!isId(e.id)||edgeIds.has(e.id)||!byId[e.from]||!byId[e.to])continue;
      // Keep old "return_in" connections as a compatibility alias. New
      // consumer returns use bottom_in, the right-side consumer connection.
      const toPort=byId[e.to].type==='buffer'&&e.to_port==='return_in'
        ?'bottom_in':e.to_port;
      if(e.from===e.to||!ports(byId[e.from].type).some(p=>p.id===e.from_port)||
         !ports(byId[e.to].type).some(p=>p.id===toPort)||
         portRole(byId[e.from].type,e.from_port)==='in'||
         portRole(byId[e.to].type,toPort)==='out')continue;
      const connectionKey=[e.from,e.from_port,e.to,toPort].join('|');
      if(connectionKeys.has(connectionKey))continue;
      edgeIds.add(e.id);
      connectionKeys.add(connectionKey);
      connections.push({...e,id:e.id,from:e.from,from_port:e.from_port,to:e.to,to_port:toPort,
        flow_entity:entityRx.test(e.flow_entity||"")?e.flow_entity:"",
        temperature_entity:entityRx.test(e.temperature_entity||"")?e.temperature_entity:""});
    }
    // Keep forward-compatible plan metadata even when this version cannot render it.
    return {...raw,components,connections};
  }
  // Read the hydraulic direction from each port. Valves allow both directions,
  // whereas a boiler return port is never a valid pipe source.
  function portRole(type,key) {
    if(["mixer","diverter","manifold"].includes(type))return "both";
    if(["flow","dhw","top_out","mid_out","bottom_out","coil_out","hot_out","return_out","out"].includes(key))return "out";
    if(["return","top_in","mid_in","bottom_in","return_in","coil_in","cold_in","flow_in","in"].includes(key))return "in";
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
  // Connect ordinary heating components by their actual hydraulic ports.
  // The two choices are components, not directional pipe ends: a complete
  // heating circuit needs a hot supply AND a separate cooler return.
  // This helper never guesses mixing-valve routes or plant safety logic.
  function connectPair(input,firstId,secondId) {
    const plan=normalize(input);
    const first=plan.components.find(c=>c.id===firstId);
    const second=plan.components.find(c=>c.id===secondId);
    if(!first||!second||first.id===second.id)return plan;
    const source=type=>byType[type]?.group==='source';
    const pairs=[];
    if(source(first.type)&&second.type==='buffer'){
      pairs.push([first.id,'flow',second.id,'top_in'],
        [second.id,'bottom_out',first.id,'return']);
    }else if(source(first.type)&&second.type==='dhw_tank'){
      pairs.push([first.id,first.type==='oil_boiler'?'dhw':'flow',second.id,'coil_in'],
        [second.id,'coil_out',first.id,'return']);
    }else if(first.type==='buffer'&&second.type==='buffer'){
      pairs.push([first.id,'top_out',second.id,'top_in'],
        [second.id,'bottom_out',first.id,'bottom_in']);
    }else if((source(first.type)||first.type==='buffer')&&second.type==='heating_circuit'){
      pairs.push([first.id,first.type==='buffer'?'top_out':'flow',second.id,'flow_in'],
        [second.id,'return_out',first.id,first.type==='buffer'?'bottom_in':'return']);
    }else if(first.type==='pump'){
      if(second.type==='buffer')pairs.push([first.id,'out',second.id,'top_in']);
      if(second.type==='dhw_tank')pairs.push([first.id,'out',second.id,'coil_in']);
    }else if(source(first.type)&&second.type==='pump'){
      pairs.push([first.id,first.type==='oil_boiler'?'dhw':'flow',second.id,'in']);
    }
    const existing=new Set(plan.connections.map(e=>[e.from,e.from_port,e.to,e.to_port].join('|')));
    const ids=new Set(plan.connections.map(e=>e.id));
    for(const [from,fromPort,to,toPort] of pairs){
      const key=[from,fromPort,to,toPort].join('|');
      if(existing.has(key)||!validConnection(plan,from,fromPort,to,toPort))continue;
      const id=nextId('leitung',ids);
      ids.add(id);existing.add(key);
      plan.connections.push({id,from,from_port:fromPort,to,to_port:toPort,
        flow_entity:'',temperature_entity:''});
    }
    return normalize(plan);
  }

  function preferredHeatingBuffer(input) {
    const plan=normalize(input);
    const buffers=new Set(plan.components.filter(node=>node.type==='buffer').map(node=>node.id));
    if(buffers.size===1)return [...buffers][0];
    const sourceIds=new Set(plan.components.filter(node=>byType[node.type]?.group==='source')
      .map(node=>node.id));
    const fedBuffers=new Set(plan.connections.filter(edge=>
      sourceIds.has(edge.from)&&buffers.has(edge.to)&&edge.from_port==='flow'&&
      ['top_in','mid_in'].includes(edge.to_port)).map(edge=>edge.to));
    return fedBuffers.size===1?[...fedBuffers][0]:null;
  }

  function connectHeatingCircuit(input,circuitId,sourceId,kind='direct',controlId='',
                                 {replace=false}={}) {
    const plan=normalize(input);
    const circuit=plan.components.find(node=>
      node.id===circuitId&&node.type==='heating_circuit');
    const source=plan.components.find(node=>node.id===sourceId&&
      (node.type==='buffer'||node.type==='manifold'||byType[node.type]?.group==='source'));
    if(!circuit||!source||circuit.id===source.id||
       !['direct','pump','mixer'].includes(kind))return null;

    let existing=plan.connections.filter(edge=>
      edge.to===circuit.id&&edge.to_port==='flow_in'||
      edge.from===circuit.id&&edge.from_port==='return_out');
    const automatic=circuit.options?.hydraulic_auto;
    if(existing.length){
      if(!replace&&automatic&&automatic.source===sourceId&&
         automatic.kind===kind&&automatic.control===(controlId||'')&&
         existing.every(edge=>automatic.edges?.includes(edge.id)))return plan;
      if(replace&&automatic){
        const owned=new Set(automatic.edges||[]);
        if(existing.some(edge=>!owned.has(edge.id)))return null;
        plan.connections=plan.connections.filter(edge=>!owned.has(edge.id));
        existing=[];
      }else if(kind==='direct'){
        const supplies=existing.filter(edge=>edge.to===circuit.id);
        const returns=existing.filter(edge=>edge.from===circuit.id);
        if(supplies.length>1||returns.length>1||
           supplies.some(edge=>edge.from!==source.id)||
           returns.some(edge=>edge.to!==source.id))return null;
      }else return null;
    }

    const supplyPort=source.type==='buffer'?'top_out':
      source.type==='manifold'
        ?['d','e','f'].find(port=>!plan.connections.some(edge=>
          edge.from===source.id&&edge.from_port===port)):'flow';
    const returnPort=source.type==='buffer'?'bottom_in':
      source.type==='manifold'
        ?['a','b','c'].find(port=>!plan.connections.some(edge=>
          edge.to===source.id&&edge.to_port===port)):'return';
    if(!supplyPort||!returnPort)return null;
    let pairs=[];
    if(kind==='direct'){
      pairs=[
        ...(!existing.some(edge=>edge.to===circuit.id)
          ?[[source.id,supplyPort,circuit.id,'flow_in']]:[]),
        ...(!existing.some(edge=>edge.from===circuit.id)
          ?[[circuit.id,'return_out',source.id,returnPort]]:[])
      ];
    }else if(kind==='pump'){
      const pump=plan.components.find(node=>node.id===controlId&&node.type==='pump');
      if(!pump||plan.connections.some(edge=>edge.from===pump.id||edge.to===pump.id))return null;
      pairs=[[source.id,supplyPort,pump.id,'in'],
        [pump.id,'out',circuit.id,'flow_in'],
        [circuit.id,'return_out',source.id,returnPort]];
    }else{
      const mixer=plan.components.find(node=>node.id===controlId&&node.type==='mixer');
      if(!mixer||plan.connections.some(edge=>edge.from===mixer.id||edge.to===mixer.id))return null;
      pairs=[[source.id,supplyPort,mixer.id,'a'],
        [mixer.id,'ab',circuit.id,'flow_in'],
        [circuit.id,'return_out',mixer.id,'b'],
        [mixer.id,'b',source.id,returnPort]];
    }
    const used=new Set(plan.connections.map(edge=>
      [edge.from,edge.from_port,edge.to,edge.to_port].join('|')));
    const ids=new Set(plan.connections.map(edge=>edge.id)),created=[];
    for(const [from,fromPort,to,toPort] of pairs){
      const key=[from,fromPort,to,toPort].join('|');
      if(used.has(key)||!validConnection(plan,from,fromPort,to,toPort))return null;
      const id=nextId('leitung',ids);
      ids.add(id);used.add(key);created.push(id);
      plan.connections.push({id,from,from_port:fromPort,to,to_port:toPort,
        flow_entity:'',temperature_entity:''});
    }
    circuit.options={...circuit.options,hydraulic_auto:{
      source:sourceId,kind,control:controlId||'',edges:created
    }};
    return normalize(plan);
  }

  // Build a complete DHW charging branch with one simple choice.
  // No valve position or pipework is inferred from temperature readings.
  // The existing coil path is never replaced or connected twice.
  function connectDhwCharge(input,sourceId,tankId,kind,style="branch",controlId="") {
    const plan=normalize(input);
    const source=plan.components.find(c=>c.id===sourceId);
    const tank=plan.components.find(c=>c.id===tankId&&c.type==='dhw_tank');
    if(!source||!tank||source.id===tank.id||
       !(byType[source.type]?.group==='source'||source.type==='buffer')||
       !['direct','pump','diverter'].includes(kind))return null;
    // A pre-existing coil circuit needs a conscious manual edit; never
    // leave multiple conflicting supply/return paths after one click.
    if(plan.connections.some(e=>(e.to===tank.id&&e.to_port==='coil_in')||
      (e.from===tank.id&&e.from_port==='coil_out')))return null;
    tank.options={...tank.options,connection_style:style==='separate'?'separate':'branch'};
    const control=kind==='pump'?'pump':kind==='diverter'?'diverter':null;
    const existingControl=controlId&&control
      ?plan.components.find(node=>node.id===controlId&&node.type===control):null;
    if(controlId&&(!existingControl||
       plan.connections.some(edge=>edge.from===controlId||edge.to===controlId)))return null;
    const newNode=control&&!existingControl?HPC_FREE_NEWNODE(control,plan):null;
    if(control&&!existingControl&&!newNode)return null;
    const chargeControl=existingControl||newNode;
    if(newNode){
      newNode.name=(kind==='pump'?'WW-Ladepumpe ':'WW-Umschaltventil ')+tank.name;
      if(kind==='diverter')newNode.options={dhw_port:'a',dhw_state:'',heating_state:''};
      plan.components.push(newNode);
    }
    const supplyPort=source.type==='buffer'?'top_out':source.type==='oil_boiler'?'dhw':'flow';
    const returnPort=source.type==='buffer'?'bottom_in':'return';
    const specs=chargeControl
      ?[[source.id,supplyPort,chargeControl.id,kind==='pump'?'in':'ab'],
        [chargeControl.id,kind==='pump'?'out':'a',tank.id,'coil_in'],
        [tank.id,'coil_out',source.id,returnPort]]
      :[[source.id,supplyPort,tank.id,'coil_in'],
        [tank.id,'coil_out',source.id,returnPort]];
    const ids=new Set(plan.connections.map(e=>e.id)),created=[];
    for(const [from,fromPort,to,toPort] of specs){
      if(!validConnection(plan,from,fromPort,to,toPort))return null;
      const id=nextId('leitung',ids);
      ids.add(id);
      created.push(id);
      plan.connections.push({id,from,from_port:fromPort,to,to_port:toPort,
        flow_entity:'',temperature_entity:''});
    }
    tank.options={...tank.options,dhw_charge:{
      source:source.id,kind,control:chargeControl?.id||'',edges:created
    }};
    return normalize(plan);
  }
  // Avoid a lexical conflict with the public function name used by the editor.
  function HPC_FREE_NEWNODE(type,plan){return newNode(type,plan);}

  function connectionPairs(input) {
    const p=normalize(input);
    const choices=[];
    for(const a of p.components)for(const b of p.components){
      if(a.id===b.id)continue;
      const proposed=connectPair(p,a.id,b.id);
      if(proposed.connections.length<=p.connections.length)continue;
      const both=proposed.connections.length-p.connections.length;
      choices.push({from:a.id,to:b.id,label:a.name+' → '+b.name,
        count:both});
    }
    return choices;
  }
  function connectBufferSeries(input) {
    const plan=normalize(input),buffers=plan.components.filter(c=>c.type==="buffer");
    if(buffers.length<2)return plan;
    const existing=new Set(plan.connections.map(e=>e.from+"|"+e.from_port+"|"+e.to+"|"+e.to_port));
    const ids=new Set(plan.connections.map(e=>e.id));
    const connect=(from,fromPort,to,toPort)=>{
      const identity=from+"|"+fromPort+"|"+to+"|"+toPort;
      if(existing.has(identity))return;
      const id=nextId("leitung",ids);ids.add(id);existing.add(identity);
      plan.connections.push({id,from,from_port:fromPort,to,to_port:toPort,flow_entity:"",temperature_entity:""});
    };
    for(let i=0;i<buffers.length-1;i++){
      const first=buffers[i].id,second=buffers[i+1].id;
      // Hot top line runs from first to next. Cool return comes back from
      // the next tank's bottom to the previous tank's bottom.
      connect(first,"top_out",second,"top_in");
      connect(second,"bottom_out",first,"bottom_in");
    }
    return normalize(plan);
  }

  // Parallel buffers have individual source feed and return branches.
  // Do not convert an existing serial arrangement or invent an unknown
  // manifold. The user explicitly chooses the real upstream heat generator.
  function connectBuffersParallel(input,sourceId){
    const plan=normalize(input);
    const source=plan.components.find(n=>n.id===sourceId&&byType[n.type]?.group==='source');
    const buffers=plan.components.filter(n=>n.type==='buffer');
    if(!source||buffers.length<2)return null;
    const bufferIds=new Set(buffers.map(n=>n.id));
    if(plan.connections.some(e=>bufferIds.has(e.from)&&bufferIds.has(e.to)))
      return null; // existing series or another confirmed buffer topology
    const pairs=[];
    for(const tank of buffers){
      pairs.push([source.id,'flow',tank.id,'top_in']);
      pairs.push([tank.id,'bottom_out',source.id,'return']);
    }
    const used=new Set(plan.connections.map(e=>
      [e.from,e.from_port,e.to,e.to_port].join('|')));
    const ids=new Set(plan.connections.map(e=>e.id));
    for(const [from,from_port,to,to_port] of pairs){
      const key=[from,from_port,to,to_port].join('|');
      if(used.has(key))continue;
      if(!validConnection(plan,from,from_port,to,to_port))return null;
      const id=nextId('leitung',ids);
      ids.add(id);used.add(key);
      plan.connections.push({id,from,from_port,to,to_port,
        flow_entity:'',temperature_entity:''});
    }
    return normalize(plan);
  }

  const nextId=(prefix,ids)=>{let i=1;while(ids.has(prefix+"_"+i))i++;return prefix+"_"+i;};
  function newNode(type,plan) {
    if(!byType[type])return null;
    const nodes=normalize(plan).components;
    const group=byType[type].group;
    const index=nodes.filter(c=>byType[c.type].group===group).length;
    const prefix={wood_gasifier:"holzvergaser",oil_boiler:"oelkessel",pellet_boiler:"pelletkessel",wood_chip_boiler:"eta_hackgut",gas_boiler:"gaskessel",heat_pump:"waermepumpe",
      buffer:"puffer",dhw_tank:"warmwasser",heating_circuit:"heizkreis",pump:"pumpe",mixer:"mischer",diverter:"ventil",
      electric_heater:"heizstab",particle_separator:"partikelabscheider",manifold:"verteiler"}[type];
    return {id:nextId(prefix,new Set(nodes.map(c=>c.id))),type,name:type==="wood_chip_boiler"?"ETA eHACK":display(type),x:{source:75,control:365,storage:635,load:910}[group],
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
      ["puffer1","top_out","puffer2","top_in"],
      ["puffer2","bottom_out","puffer1","bottom_in"],
      ["puffer2","top_out","puffer3","top_in"],
      ["puffer3","bottom_out","puffer2","bottom_in"],
      ["puffer1","bottom_out","holz","return"],
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
    // Hydraulic water/brine: -10 °C deep blue, violet midrange, red at 90 °C.
    // RGB channel interpolation never passes through amber or brown.
    const ranges=[
      [-10,[20,58,151]],
      [0,[31,103,211]],
      [20,[53,167,242]],
      [40,[129,83,216]],
      [60,[203,69,172]],
      [75,[235,56,107]],
      [90,[235,38,55]],
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
  const css="\n  :host { display:block; --hpc-muted: var(--secondary-text-color, #7b8798); }\n  ha-card { background:var(--ha-card-background,var(--card-background-color,#fff)); padding:14px;overflow:hidden; }\n  .hpc-board {width:100%;overflow:auto;overscroll-behavior:contain;border-radius:12px;\n    border:1px solid var(--divider-color,rgba(110,125,145,.22));\n    background:var(--card-background-color,rgba(0,0,0,.02));}\n  #hpc-free-svg{min-width:650px;display:block;width:100%;height:auto;max-height:72vh;}\n  .hpc-appliance .hpc-unit-border{fill:var(--secondary-background-color,rgba(126,144,160,.1));\n    stroke:var(--divider-color,#9ca3af);stroke-width:2.3;}\n  .hpc-appliance.is-on .hpc-unit-border{stroke:var(--hfc-heat,#ca793e);}\n  .hpc-node.is-selected .hpc-unit-border,.hpc-node.is-selected .hpc-tank-shadow{\n    stroke:var(--primary-color,#2196f3);stroke-width:4;}\n  .hpc-unit-border,.hpc-tank-shadow,.hpc-tank-main{filter:drop-shadow(0 2px 3px rgba(0,0,0,.08))}\n  .hpc-component-icon{stroke:var(--hpc-muted);fill:none;stroke-width:2.8}\n  .hpc-component-icon.is-on{stroke:var(--hfc-hot,#b35b38)}\n  .hpc-component-icon circle,.hpc-component-icon rect{fill:var(--card-background-color,#fff)}\n  .hpc-node{cursor:pointer}.hpc-node:hover .hpc-unit-border{stroke:var(--primary-color,#2196f3)}\n  .hpc-label{font:600 16px var(--ha-font-family-body,system-ui,sans-serif);fill:var(--primary-text-color,#222);}\n  .hpc-tank-name{font-size:15px}\n  .hpc-reading{font:13px var(--ha-font-family-body,system-ui,sans-serif);fill:var(--primary-text-color,#222);}\n  .hpc-tank-reading{font:600 12px var(--ha-font-family-body,system-ui,sans-serif);\n    fill:#fff;stroke:rgba(29,46,62,.85);paint-order:stroke fill;stroke-width:3px;}\n  .hpc-detail{font:13px var(--ha-font-family-body,system-ui,sans-serif);fill:var(--secondary-text-color,#7d8590);}\n  .hpc-tank-shadow{fill:var(--card-background-color,#fff);stroke:var(--divider-color,#8e9bab);stroke-width:2.4;}\n  .hpc-tank-main{stroke:var(--divider-color,rgba(70,90,110,.6));stroke-width:1.3}\n  .hpc-tank-shine{fill:none;stroke:rgba(255,255,255,.28);stroke-width:6;stroke-linecap:round}\n  .hpc-tank-tick{fill:none;stroke:rgba(255,255,255,.50);stroke-width:1.1;}\n  .hpc-port{fill:var(--card-background-color,#fff);stroke:var(--hfc-flow-hot,#ad584b);stroke-width:2}\n  .hpc-route{pointer-events:none;}\n  .hpc-pipe-outline{fill:none;stroke:var(--divider-color,rgba(110,125,145,.5));\n    stroke-width:13;stroke-linecap:round;stroke-linejoin:round;}\n  .hpc-pipe{fill:none;stroke-width:9;stroke-linecap:round;stroke-linejoin:round;}\n  .hpc-arrow{fill:var(--primary-text-color,#516274);}\n  .hpc-pulse{fill:none;stroke:rgba(255,255,255,.9);stroke-width:3;stroke-dasharray:5 13;\n    animation:hpc-motion 1.35s linear infinite;}\n  @keyframes hpc-motion{to{stroke-dashoffset:-36}}\n  @media(prefers-reduced-motion:reduce){.hpc-pulse{animation:none;}}\n  .hpc-note{font-size:.82em;color:var(--secondary-text-color,#7d8590);margin:10px 3px 4px;}\n  .hpc-editor{font-family:var(--ha-font-family-body,inherit);color:var(--primary-text-color,inherit);}\n  .hpc-editor h3{font-size:1.02em;font-weight:600;margin:18px 0 9px;border-bottom:1px solid var(--divider-color,rgba(127,127,127,.16));padding-bottom:6px}\n  .hpc-editor p{font-size:.88em;line-height:1.5;color:var(--secondary-text-color,#7d8590)}\n  .hpc-actions,.hpc-row{display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:9px 0}\n  .hpc-editor button,.hpc-editor select,.hpc-editor input{\n    box-sizing:border-box;font:inherit;border-radius:10px;\n    border:1px solid var(--divider-color,rgba(127,127,127,.34));\n    padding:10px 12px;color:var(--primary-text-color,inherit);\n    background:var(--card-background-color,#fff);max-width:100%;min-width:0}\n  .hpc-editor input:focus,.hpc-editor select:focus{outline:2px solid var(--primary-color,#03a9f4);outline-offset:1px}\n  .hpc-editor button{cursor:pointer;font-weight:500}\n  .hpc-editor button:hover{background:var(--secondary-background-color,rgba(127,127,127,.12))}\n  .hpc-editor button.hpc-primary{background:var(--primary-color,#03a9f4);color:#fff;border:0;}\n  .hpc-editor label{display:flex;flex-direction:column;gap:5px;font-size:.86em;font-weight:500;flex:1 1 170px;}\n  .hpc-editor .hpc-checkbox{display:flex;flex-direction:row;align-items:center;gap:11px;flex:1 1 100%;cursor:pointer;padding:11px 12px;border:1px solid var(--divider-color,rgba(127,127,127,.32));border-radius:10px;background:var(--secondary-background-color,rgba(127,127,127,.08));}\n  .hpc-editor .hpc-checkbox input{width:19px;height:19px;margin:0;flex:0 0 auto;accent-color:var(--primary-color,#03a9f4);}\n  .hpc-editor .hpc-field{margin:6px 0;}\n  .hpc-editor .hpc-component-list{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}\n  .hpc-editor .hpc-pictogram{width:29px;height:29px;flex:none;color:var(--secondary-text-color,#7b8798)}\n  .hpc-editor .hpc-add-preview{display:flex;align-items:center;justify-content:center;min-width:46px;min-height:46px;border-radius:12px;background:var(--secondary-background-color,rgba(127,127,127,.09))}\n  .hpc-editor .hpc-add-preview .hpc-pictogram{width:34px;height:34px;color:var(--primary-color,#03a9f4)}\n  .hpc-editor .hpc-config-title{display:flex;align-items:center;gap:9px}\n  .hpc-editor .hpc-config-title .hpc-pictogram{width:25px;height:25px}\n  .hpc-editor .hpc-component-list button{display:inline-flex;align-items:center;gap:8px;text-align:left}\n  .hpc-editor .hpc-component-list button span{display:flex;flex-direction:column;line-height:1.3;min-width:0;max-width:180px}\n  .hpc-editor .hpc-component-list button{max-width:100%;min-width:0}\n  .hpc-editor .hpc-component-list button .hpc-item-name,.hpc-editor .hpc-component-list button small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}\n  .hpc-editor .hpc-component-list button .hpc-item-name{font-weight:600}\n  .hpc-editor .hpc-ems strong{overflow-wrap:anywhere}\n  .hpc-editor .hpc-component-list button small{font-size:.75em;font-weight:400;color:var(--secondary-text-color,#7b8798)}\n  .hpc-editor .hpc-native-form{margin:8px 0 16px;--ha-form-grid-column-min-width:220px}\n    .hpc-editor .hpc-native-form ha-form{display:block}\n\
  .hpc-editor .hpc-setup-group{border:1px solid var(--divider-color,rgba(127,127,127,.24));border-radius:12px;padding:8px 12px;margin:12px 0}\n\
  .hpc-editor .hpc-setup-group legend{font-weight:600;padding:0 6px}\n\
  .hpc-editor .hpc-setup-group .hpc-checkbox{margin:5px 0}\n\
  .hpc-editor .hpc-setup-group .hpc-checkbox span{flex:1}\n\
  .hpc-editor .hpc-setup-group .hpc-checkbox input[type=number]{width:76px}\n  .hpc-ems{border:1px solid var(--primary-color,#03a9f4);border-radius:12px;padding:8px 14px 14px;margin:14px 0;background:var(--secondary-background-color,rgba(127,127,127,.08));}\n  .hpc-ems h3{margin-top:5px;}\n  .hpc-connection-warning{color:var(--error-color,#e16a42)!important;font-weight:600;}\n  .hpc-editor .hpc-component-list button[aria-pressed=true]{\n    border-color:var(--primary-color,#03a9f4);background:var(--secondary-background-color,rgba(127,127,127,.14));}\n  .hpc-editor .hpc-quick-connect{margin:8px 0 4px}\n  .hpc-editor .hpc-quick-connect label{flex:1 1 260px}\n  .hpc-editor .hpc-connection-hint{margin:4px 0 14px;font-size:.82em}\n  .hpc-editor details summary{cursor:pointer;font-weight:600;padding:8px 2px}\n  .hpc-editor .hpc-advanced-pipes{border-top:1px solid var(--divider-color,rgba(127,127,127,.16));margin:13px 0}\n  .hpc-editor .hpc-pipe-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--divider-color,rgba(127,127,127,.16));padding:9px 0}\n  .hpc-editor .hpc-pipe-row>span{display:flex;flex:1 1 230px;flex-direction:column;font-weight:500;font-size:.9em;line-height:1.4}\n  .hpc-editor .hpc-pipe-row small{font-weight:400;font-size:.87em;color:var(--secondary-text-color,#7b8798)}\n  .hpc-editor .hpc-pipe-row details{flex:1 1 100%;font-size:.85em}\n  .hpc-editor .hpc-board{margin:8px 0;min-height:160px;}\n";
  return {types,byType,ports,portRole,validConnection,connectPair,connectHeatingCircuit,
    preferredHeatingBuffer,connectDhwCharge,connectionPairs,connectBufferSeries,
    connectBuffersParallel,dimension,display,fieldLabel,icon,esc,normalize,newNode,
    sample,state,active,format,color,portXY,draw,css,text};
})();
