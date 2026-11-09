// Conservative, versioned configuration migration for Hydraulic Plan Card.
// All operations are pure until the editor emits a single config-changed event.
// Unknown topology is never discarded or fabricated.
const HPC_MIGRATION = (() => {
  const VERSION=3;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const sourceTypes={wood_gasifier:'wood_gasifier',oil:'oil_boiler',
    pellet:'pellet_boiler',wood_chip_boiler:'wood_chip_boiler',
    gas:'gas_boiler',heat_pump:'heat_pump'};
  const roles={
    state:'boiler_state',flow:'boiler_flow',return:'boiler_return',
    exhaust:'boiler_exhaust',oxygen:'boiler_o2',fan:'boiler_fan',
    pump:'boiler_pump',power:'boiler_power',starts:'boiler_burner_starts'
  };
  const validEntity=id=>typeof id==='string'&&
    /^(sensor|binary_sensor|switch|number|select|input_boolean|input_number)\.[a-zA-Z0-9_]+$/.test(id);
  function check(plan) {
    const warnings=[],ids=new Set(),edges=new Set();
    const components=plan?.components,connections=plan?.connections;
    if(!Array.isArray(components)||!Array.isArray(connections))
      return ['Komponenten oder Verbindungen fehlen als Liste.'];
    if(components.length>80||connections.length>180)
      warnings.push('Die Anlage überschreitet die unterstützte Bauteil- oder Leitungsanzahl.');
    for(const n of components){
      if(!n||!HPC_FREE.byType[n.type]||typeof n.id!=='string'||
        !/^[a-z][a-z0-9_]{0,43}$/.test(n.id)||ids.has(n.id)){
        warnings.push('Unbekannter oder doppelter Bauteiltyp/Bezeichner; keine automatische Änderung.');
        continue;
      }
      ids.add(n.id);
      for(const [key,value] of Object.entries(n.sensors||{}))
        if(!HPC_FREE.byType[n.type].fields.includes(key)||!validEntity(value))
          warnings.push('Sensorzuordnung an '+n.id+' benötigt eine manuelle Prüfung.');
      if(n.level_sensors!==undefined&&!Array.isArray(n.level_sensors))
        warnings.push('Fühlerliste an '+n.id+' muss geprüft werden.');
      if(Array.isArray(n.level_sensors)){
        if(n.level_sensors.length>24)
          warnings.push('Mehr als 24 Zusatzfühler an '+n.id+'; manuelle Prüfung erforderlich.');
        const positions=new Set();
        for(const point of n.level_sensors){
          const pos=Number(point?.position);
          if(!point||typeof point.entity!=='string'&&! (point.entity===undefined)||
            point.entity&&!validEntity(point.entity)||
            !Number.isFinite(pos)||pos<0||pos>100||
            positions.has(Math.round(pos*10)/10)){
            warnings.push('Zusatzfühler an '+n.id+' sind nicht eindeutig übernehmbar.');
            break;
          }
          positions.add(Math.round(pos*10)/10);
        }
      }
      if(n.name&&String(n.name).length>75)
        warnings.push('Bauteilname an '+n.id+' ist länger als unterstützt.');
      if(n.options&&typeof n.options==='object'){
        const supported={dhw_tank:['connection_style'],
          wood_gasifier:['return_lift'],wood_chip_boiler:['eta_model','particle_separator','silo'],
          heating_circuit:['emitter','mixed'],pellet_boiler:['boiler_kind','silo'],
          oil_boiler:['boiler_kind'],gas_boiler:['boiler_kind'],
          heat_pump:['unit_style','unit_size','source_type']}[n.type]||[];
        if(Object.keys(n.options).some(key=>!supported.includes(key)))
          warnings.push('Unbekannte Einstellungen an '+n.id+'; keine automatische Änderung.');
      }
    }
    for(const e of connections){
      const from=components.find(n=>n?.id===e?.from);
      const to=components.find(n=>n?.id===e?.to);
      const targetPort=to?.type==='buffer'&&e?.to_port==='return_in'?'bottom_in':e?.to_port;
      if(!e||typeof e.id!=='string'||! /^[a-z][a-z0-9_]{0,43}$/.test(e.id)||
        edges.has(e.id)||!from||!to||e.from===e.to||
        !HPC_FREE.ports(from.type).some(p=>p.id===e.from_port)||
        !HPC_FREE.ports(to.type).some(p=>p.id===targetPort)){
        warnings.push('Eine Leitung kann nicht ohne Datenverlust übernommen werden.');
      }else edges.add(e.id);
      if(e&&(e.flow_entity&&!validEntity(e.flow_entity)||
        e.temperature_entity&&!validEntity(e.temperature_entity)))
        warnings.push('Eine Leitungsentität ist ungültig.');
    }
    // A legacy tank with only one side of the heating coil wired cannot be
    // auto-converted into a complete circuit. Preserve the partial topology.
    for (const tank of components.filter(n => n?.type === 'dhw_tank')) {
      const feeds = connections.filter(e => e?.to === tank.id && e.to_port === 'coil_in');
      const returns = connections.filter(e => e?.from === tank.id && e.from_port === 'coil_out');
      if (feeds.length !== returns.length || feeds.length > 1)
        warnings.push('Warmwasserspeicher ' + tank.id +
          ': Heizwendel-Anschlüsse sind nicht eindeutig. Bitte Verschaltung prüfen.');
    }
    return [...new Set(warnings)];
  }
  function legacyPlan(config){
    const c=config||{},entities=c.entities||{};
    const result={components:[],connections:[]},warnings=[];
    const add=(type,name,mapping,options)=>{
      if(!type)return null;
      const node=HPC_FREE.newNode(type,result);
      if(!node)return null;
      node.name=name||HPC_FREE.display(type);
      node.sensors={};
      for(const [field,key] of Object.entries(mapping))
        if(validEntity(entities[key]))node.sensors[field]=entities[key];
      node.options=options||{};
      result.components.push(node);
      return node;
    };
    const type=sourceTypes[c.generator_type];
    if(c.generator_type&&!type)warnings.push('Wärmeerzeuger ist unbekannt; bitte manuell zuordnen.');
    if(type)add(type,c.boiler_name||HPC_FREE.display(type),
      type==='heat_pump'?{state:'mode',flow:'flow',return:'return',power:'power'}:roles);
    const second=sourceTypes[c.boiler_type];
    if(c.boiler_type&&!second)warnings.push('Zusätzlicher Kesseltyp muss geprüft werden.');
    if(second&&second!==type)add(second,HPC_FREE.display(second),
      {state:'boiler_state',flow:'boiler_flow',return:'boiler_return',pump:'boiler_pump'});
    if(c.buffer===true||['buffer_top','buffer_middle','buffer_bottom'].some(k=>entities[k]))
      add('buffer','Puffer 1',{top:'buffer_top',middle:'buffer_middle',bottom:'buffer_bottom'});
    if(['dhw_top','dhw_middle','dhw_bottom'].some(k=>entities[k]))
      add('dhw_tank','Warmwasserspeicher',
        {top:'dhw_top',middle:'dhw_middle',bottom:'dhw_bottom'});
    const count=Math.min(6,Math.max(0,Math.round(Number(c.hc_count))||0));
    for(let i=1;i<=6;i++){
      const prefix=i===1?'hc_':'hc'+i+'_';
      const mapping={flow:prefix+'flow',return:prefix+'return',target:prefix+'setpoint',
        pump:prefix+'pump',mixer:prefix+'mixer',
        mixer_opening:prefix+'mixer_opening',mixer_closing:prefix+'mixer_closing'};
      if(i<=count||Object.values(mapping).some(key=>entities[key])){
        const node=add('heating_circuit','Heizkreis '+i,mapping);
        if(node){
          const kind=i===1?'hc_type':'hc'+i+'_type';
          node.options={emitter:HFC_EMITTERS.includes(c[kind])?c[kind]:'radiator',
            mixed:!!(node.sensors.mixer||node.sensors.mixer_opening||node.sensors.mixer_closing)};
        }
      }
    }
    // Preserve any classic entities not represented in the flexible model
    // within the untouched classic settings in the saved configuration.
    // No connection graph can be reliably reconstructed from legacy SVG paths.
    warnings.push('Rohrverbindungen aus der klassischen Ansicht müssen geprüft und einmalig angelegt werden.');
    return {plan:HPC_FREE.normalize(result),warnings};
  }
  function upgrade(config,{classic=false}={}){
    if(!config||typeof config!=='object')return {changed:false,config,warnings:['Ungültige Konfiguration.']};
    if(!classic&&!Array.isArray(config.plan?.components))
      return {changed:false,config,warnings:[]};
    if(!classic&&config.hpc_migration_skip_auto===true)
      return {changed:false,config,warnings:[]};
    if(!classic&&Number(config.hpc_schema_version)>VERSION)
      return {changed:false,config,warnings:['Diese Konfiguration stammt aus einer neueren Version.']};
    if(!classic&&config.hpc_schema_version===VERSION)
      return {changed:false,config,warnings:[]};
    const warnings=classic?[]:check(config.plan);
    if(warnings.length)return {changed:false,blocked:true,config,warnings};
    const result=classic?legacyPlan(config):{plan:HPC_FREE.normalize(config.plan),warnings:[]};
    if(classic&&!result.plan.components.length)
      return {changed:false,blocked:true,config,
        warnings:['Keine automatisch übernehmbaren Bauteile erkannt. Ursprüngliche Konfiguration bleibt unverändert.']};
    const snapshot=clone(config);
    // Old backup must remain immutable across later upgrades and edits.
    const backup=config.hpc_migration_backup||snapshot;
    const notes=[...result.warnings];
    if(!classic&&config.plan.connections?.some(e=>e.to_port==='return_in'))
      notes.push('Veraltete Puffer-Rückläufe wurden auf die linken Eingänge umgestellt.');
    const out={...config,plan:result.plan,hpc_schema_version:VERSION,
      hpc_legacy_imported:true,hpc_migration_backup:backup,
      hpc_migration_notes:notes,
      hpc_migration_review:notes.length>0};
    return {changed:true,config:out,warnings:notes};
  }
  function restore(config){
    if(!config?.hpc_migration_backup)return null;
    // Prevent the editor from immediately re-upgrading a restored v1 plan
    // on its next setConfig() callback. The user may edit and save it later.
    return {...clone(config.hpc_migration_backup),hpc_migration_skip_auto:true};
  }
  return {VERSION,check,legacyPlan,upgrade,restore};
})();
