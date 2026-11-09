// EMS-ESP exposes its heating appliances via Home Assistant MQTT Discovery.
// We only inspect the frontend's already available entity/device registries.
// No MQTT broker credentials, network requests, or heating-control writes.
const HPC_EMS = (() => {
  const roles = {
    state: ['burngas','burneractive','burnerstatus','burnerstate','burner','burngas2'],
    flow: ['curflowtemp','flowtemp','supplytemperature','supplytemp','boiltemp'],
    return: ['rettemp','returntemp','returntemperature'],
    exhaust: ['exhausttemp','fluegastemp','fluegastemperature'],
    pump: ['heatingpump','boilerpump','loadingpump','boilerloadingpump'],
    starts: ['burnstarts','burnerstarts','burnerstarth'],
    fan: ['fanwork','combustionfan'],
    oxygen: ['o2','oxygen','residualoxygen'],
    power: ['boilerpowerw','heatingpowerw','outputpowerw']
  };
    const isBoilerEntity = id => /(?:^|_)boiler_/.test(id);
  function detect(hass) {
    if(!hass?.states)return [];
    const found=new Map(), registrations=hass.entities||{}, devices=hass.devices||{};
    for(const id of Object.keys(hass.states)){
      const [domain,short]=id.split('.');
      if(!['sensor','binary_sensor','switch','number','select'].includes(domain)||!short)continue;
      if(!isBoilerEntity(short))continue;
      const suffix=short.replace(/^.*?boiler_/,'').replace(/[^a-z0-9]/g,'');
      const itemRole=Object.entries(roles).find(([role,names])=>names.includes(suffix))?.[0]||null;
      // Oil preheating is useful evidence of fuel type but not a burner status.
      // A heating block is NOT a flow temperature and must never be
      // automatically assigned as such. It can still identify the gateway.
      if(!itemRole&&!['oilpreheat','heatingblock'].includes(suffix))continue;
      const registry=registrations[id]||{};
      const device=devices[registry.device_id]||{};
      const gateway=devices[device.via_device_id]||{};
      const meta=[registry.unique_id,registry.platform,device.name,device.name_by_user,
        device.model,device.manufacturer,gateway.name,gateway.model,gateway.manufacturer,
        JSON.stringify(device.identifiers||[]),JSON.stringify(gateway.identifiers||[])].join(' ').toLowerCase();
      const isEms=/ems[-_\s]?esp|emsesp/.test(meta);
      const group=registry.device_id||short.replace(/boiler_.*/,'boiler');
      // A gateway may advertise a list of *supported* boiler models, not
      // the model actually installed. Keep it for classification diagnostics
      // but never print that long catalogue as a component name.
      const label=String(device.name_by_user||device.name||'').trim();
      const model=String(device.model||'').trim();
      const generic=/^ems[-_\s]?esp(?:\s+(?:boiler|kessel|heizung))?$/i.test(label);
      const familyList=model.includes(',')||model.length>60;
      const displayName=!generic&&label?label:(!familyList&&model?model:'EMS-ESP Heizung');
      if(!found.has(group))found.set(group,{group,entities:{},evidence:[],marker:false,
        displayName,genericName:generic||!label,
        description:[label,model,device.manufacturer||''].join(' ').trim()});
      const candidate=found.get(group);
      candidate.marker ||= isEms;
      candidate.evidence.push({id,role:itemRole,suffix});
      if(itemRole){
        const current=candidate.entities[itemRole];
        const rank=roles[itemRole].indexOf(suffix);
        const existingRank=current?roles[itemRole].findIndex(name=>current.endsWith(name)):Infinity;
        if(!current||rank<existingRank)candidate.entities[itemRole]=id;
      }
    }
    const output=[];
    for(const item of found.values()){
      const count=Object.keys(item.entities).length;
      const description=item.description.toLowerCase();
      // Classify the *boiler*, never the EMS gateway, from explicit boiler
      // models or a real oil-preheater entity. "burngas" is the EMS generic
      // burner signal, not evidence that the burner uses natural gas.
      // In particular GB125 is an OIL condensing boiler, not a gas boiler.
      const oilModel=/\b(?:s115u?|s115|s125|g115|g125|g215|gb125|gb135|logano\s+(?:plus\s+)?(?:s115u?|g115|g125|gb125)|oil|oel|öl|heizoel|heizöl|oil\s+boiler|ölkessel)\b/i.test(description);
      // "Logamax" alone names an entire product family and is inconclusive.
      const gasModel=/\b(?:gb172(?:i)?|gb192(?:i)?|gb162(?:i)?|gb122(?:i)?|gb132|gb142|gb212|gb402|gb272|kb192i|gasboiler|gaskessel|gas\s+boiler|gas\s+brennwertkessel)\b/i.test(description);
      const oilSignal=item.evidence.some(e=>e.suffix==='oilpreheat');
      const fuel=oilModel||oilSignal?'oil_boiler':gasModel?'gas_boiler':'unknown';
      // One definitive EMS-ESP oil boiler can be recognized even when it
      // exposes only a heating-block status and no temperatures yet.
      if(count<2 && !(item.marker&&fuel!=='unknown'&&item.evidence.length>0))continue;
      // A generic MQTT boiler is not sufficient evidence of EMS-ESP. Without
      // gateway evidence it would conflict with ETA and other integrations.
      if(!item.marker)continue;
      output.push({
        id:item.group,name:item.displayName||'EMS-ESP Heizung',genericName:item.genericName,
        source:item.marker?'EMS-ESP':'MQTT (EMS-ESP möglicherweise)',
        confirmed:item.marker,
        type:fuel,entities:item.entities,count,
        fuelCertain:fuel!=='unknown'
      });
    }
    return output.sort((a,b)=>Number(b.confirmed)-Number(a.confirmed)||b.count-a.count);
  }

  // EMS-ESP exports heating circuits via thermostat_hc1, mixer_hc1, etc.
  // Room temperature and thermostat seltemp are not hydraulic supply values.
  // Only known flow, return, pump and mixer entities are assigned.
  function detectCircuits(hass) {
    if(!hass?.states)return [];
    const entities=hass.entities||{}, devices=hass.devices||{};
    const groups=new Map();
    const hasEmsBoiler=detect(hass).length>0;
    const normalize=value=>String(value||'').toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    const circuitNumber=value=>{
      const match=normalize(value).match(/(?:^|_)(?:hc|heizkreis)_?([1-6])(?:_|$)/);
      return match?Number(match[1]):null;
    };
    const fields=[
      ['flow',/(?:^|_)(?:flowtemp|flowtemperature|curflowtemp|supplytemp|vorlauftemp|vorlauftemperatur)(?:_|$)/],
      ['return',/(?:^|_)(?:rettemp|returntemp|returntemperature|ruecklauftemp|rucklauftemp|ruecklauftemperatur)(?:_|$)/],
      ['target',/(?:^|_)(?:targetflowtemp|targetflowtemperature|flowtarget|setflowtemp|sollvorlauf)(?:_|$)/],
      ['pump',/(?:^|_)(?:pumpstatus|pumpstate|heatingpump|circuitpump|heizkreispumpe)(?:_|$)/],
      ['mixer',/(?:^|_)(?:mixerposition|mixposition|mixervalue|valveposition|mischerposition|mischerstellung)(?:_|$)/]
    ];
    for(const [id,state] of Object.entries(hass.states)){
      const [domain,raw]=id.split('.');
      if(!raw||!['sensor','binary_sensor','switch','number','climate'].includes(domain))continue;
      const registry=entities[id]||{};
      const device=devices[registry.device_id]||{};
      const gateway=devices[device.via_device_id]||{};
      const friendly=state?.attributes?.friendly_name||'';
      const number=circuitNumber(raw)||circuitNumber(friendly)||circuitNumber(registry.unique_id);
      if(!number)continue;
      const meta=[registry.unique_id,registry.platform,device.name,device.name_by_user,
        device.model,device.manufacturer,gateway.name,gateway.model,gateway.manufacturer]
        .filter(Boolean).join(' ').toLowerCase();
      // A generic hc1 in another integration must not be imported as EMS-ESP.
      const confirmed=/ems[-_\s]?esp|emsesp/.test(meta)||
        (hasEmsBoiler&&/^(?:thermostat|mixer)_hc[1-6](?:_|$)/.test(raw));
      if(!confirmed)continue;
      const gatewayId=device.via_device_id||'ems-esp';
      const key=gatewayId+':hc'+number;
      if(!groups.has(key))groups.set(key,{id:key,number,type:'heating_circuit',
        name:'Heizkreis '+number,source:'EMS-ESP',entities:{}});
      const candidate=groups.get(key);
      const suffix=normalize(raw);
      const role=fields.find(([,pattern])=>pattern.test(suffix))?.[0];
      if(!role)continue;
      if(['flow','return','target'].includes(role)&&domain!=='sensor')continue;
      if(role==='pump'&&domain==='sensor'&&
        !/^(?:on|off|true|false|0|1|ein|aus)$/i.test(String(state?.state)))continue;
      if(role==='mixer'&&domain!=='sensor'&&domain!=='number')continue;
      if(role==='mixer'&&!Number.isFinite(Number(state?.state)))continue;
      // Once selected by the user, this mapping never overwrites a value.
      if(!candidate.entities[role])candidate.entities[role]=id;
    }
    return [...groups.values()].map(c=>({...c,count:Object.keys(c.entities).length}))
      .sort((a,b)=>a.number-b.number||a.id.localeCompare(b.id));
  }
  return {detect,detectCircuits};
})();


// Detects ETA HACK/eHACK wood-chip boilers from Home Assistant's existing
// device/entity registries. No direct request to ETA hardware, MQTT or REST.
// An ETA pellet/SH boiler is not classified as a HACK just because it is ETA.
const HPC_ETA = (() => {
  const clean = value => String(value??'').toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[_./-]+/g,' ').replace(/\s+/g,' ').trim();
  const modelOf = value => {
    const words=clean(value);
    if(/(?:^|\s)ehack(?:\s|$)/.test(words)||/(?:^|\s)e hack(?:\s|$)/.test(words))return 'ehack';
    if(/(?:^|\s)hack vr(?:\s|$)/.test(words))return 'hack_vr';
    if(/(?:^|\s)hack(?:\s|$)/.test(words))return 'hack';
    return null;
  };
  // Match only explicit boiler measurements. Heizkreis and DHW fields from
  // the same ETA installation must never be silently assigned as boiler flow.
  const excluded = /\b(?:heizkreis|heating circuit|heating zone|mischer|mixed circuit|warmwasser|domestic hot water|speicher|buffer|puffer|raumtemperatur)\b/;
  const rolePatterns = [
    ['fuel_feed',/\b(?:austragung|foerderschnecke|forderschnecke|fuel feed|stoker|feeding auger)\b/],
    ['ash_removal',/\b(?:entaschung|aschenschnecke|ash removal|deashing)\b/],
    // Particle separator controls are sourced from the same ETA device.
    // Never treat these signals as water-side boiler temperatures.
    ['particle_voltage',/\b(?:partikelabscheider|partikelfilter|elektrofilter|electrostatic separator)\b.*\b(?:hochspannung|spannung|voltage|kv)\b/],
    ['particle_current',/\b(?:partikelabscheider|partikelfilter|elektrofilter|electrostatic separator)\b.*\b(?:strom|current|ma)\b/],
    ['particle_state',/\b(?:partikelabscheider|partikelfilter|elektrofilter|electrostatic separator)\b.*\b(?:status|betrieb|ein|an|aktiv|state|on|running)\b/],
    ['fuel_level',/\b(?:brennstoffvorrat|fuellstand|fuel level|wood chip stock|lagerstand)\b/],
    ['exhaust',/\b(?:abgastemperatur|abgas temp|abgas|flue gas|exhaust temperature|flue temperature)\b/],
    ['oxygen',/\b(?:rest o2|rest o 2|restsauerstoff|o2 ist|oxygen|residual o2|lambda ist)\b/],
    ['fan',/\b(?:saugzug|abgasgeblase|abgasgeblase|combustion fan|exhaust fan|flue fan)\b/],
    ['pump',/\b(?:kesselpumpe|kesselladepumpe|ladepumpe|boiler pump|loading pump)\b/],
    ['return',/\b(?:kesselrucklauf|kessel rucklauf|rucklauftemperatur|rucklauf temp|boiler return|return temperature)\b/],
    ['flow',/\b(?:kesselvorlauf|kessel vorlauf|kesseltemperatur|kessel temperatur|vorlauftemperatur|boiler temperature|boiler flow|flow temperature|supply temperature)\b/],
    ['power',/\b(?:kesselleistung|aktuelle leistung|boiler power|thermal output|heizleistung)\b/],
    ['state',/\b(?:kesselstatus|kessel status|kesselzustand|kessel zustand|betriebszustand|brennerstatus|brenner status|boiler state|boiler status|burner state|operating state)\b/]
  ];
  function detect(hass) {
    if(!hass?.states)return [];
    const registrations=hass.entities||{},devices=hass.devices||{},groups=new Map();
    for(const [id,state] of Object.entries(hass.states)){
      const [domain,raw]=id.split('.');
      if(!raw||!['sensor','binary_sensor','switch','number','select'].includes(domain))continue;
      const registry=registrations[id]||{};
      const device=devices[registry.device_id]||{};
      const gateway=devices[device.via_device_id]||{};
      const deviceInfo=[device.name_by_user,device.name,device.model,gateway.name,
        gateway.model].filter(Boolean).join(' ');
      const entityInfo=[raw,state?.attributes?.friendly_name].filter(Boolean).join(' ');
      const model=modelOf(deviceInfo)||modelOf(entityInfo);
      if(!model)continue;
      const brand=[registry.platform,registry.unique_id,device.manufacturer,
        gateway.manufacturer,deviceInfo,entityInfo].filter(Boolean).join(' ');
      const knownEta=/\beta\b/i.test(clean(brand))||
        /eta[_-]?webservices|eta[_-]?heating|(?:^|[_\s])eta[_-]/i.test(brand);
      if(!knownEta)continue;
      const label=clean(entityInfo);
      if(excluded.test(label))continue;
      const role=rolePatterns.find(([,pattern])=>pattern.test(label))?.[0];
      if(!role)continue;
      // Group sensors only within their actual Home Assistant device. Entity
      // prefixes are a fallback when a registry is not exposed to the editor.
      const group=registry.device_id||raw.replace(/(?:kessel|boiler|abgas|saugzug|austragung).*/,'');
      const key=group||raw;
      if(!groups.has(key))groups.set(key,{id:key,name:device.name_by_user||device.name||
        ('ETA '+({ehack:'eHACK',hack:'HACK',hack_vr:'HACK VR'}[model])),
        type:'wood_chip_boiler',model,entities:{},count:0,
        source:/eta[_-]?webservices|eta[_-]?heating/i.test(brand)
          ?'ETA Heating (Home Assistant)':'ETA (Home Assistant)'});
      const candidate=groups.get(key);
      const value=clean(label);
      const preferred=/\b(?:kessel|boiler)\b/.test(value) ||
        /\b(?:abgas|saugzug|austragung|entaschung)\b/.test(value);
      if(!candidate.entities[role]||preferred&&!candidate._priority?.[role]){
        candidate.entities[role]=id;
        candidate._priority={...candidate._priority,[role]:preferred};
      }
    }
    const allCandidates=[...groups.values()];
    return allCandidates.map(c=>{
      const { _priority, ...publicCandidate }=c;
      // Attach a particulate separator only when the ETA data explicitly
      // advertises one and it can be tied to this same boiler device.
      const particleSeparator=Object.entries(hass.states).some(([id,state])=>{
        const reg=registrations[id]||{};
        const name=clean([id,state?.attributes?.friendly_name].join(' '));
        const eta=reg.platform==='eta'||/^sensor\.eta_/.test(id);
        if(!eta||!/partikelabscheider|partikel filter|electrostatic separator/.test(name))return false;
        return reg.device_id===c.id || allCandidates.length===1;
      });
      return {...publicCandidate,particleSeparator,count:Object.keys(c.entities).length};
    }).sort((a,b)=>b.count-a.count);
  }
  return {detect};
})();



/*
 * ETA systems: identify only components that are explicit in ETA's published
 * Home Assistant entity/menu names. The REST API is NOT called from Lovelace.
 * This is read-only and cannot infer physical pipes or tank interconnections.
 */
const HPC_ETA_SYSTEM = (() => {
  const norm = value => String(value ?? '').toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\-\s/]+/g, '_').replace(/_+/g, '_');
  const kinds = [
    ['buffer', /(?:^|_)(puffer(?:speicher)?|buffer)(?:_|$)/],
    ['dhw_tank', /(?:^|_)(warmwasserspeicher|warmwasser|brauchwasserspeicher|dhw)(?:_|$)/],
    ['heating_circuit', /(?:^|_)(heizkreis|heating_circuit|heizkreisregelung)(?:_|$)/]
  ];
  const roles = {
    buffer: [
      ['top',/(?:^|_)(oben|top|fuehler_oben|temp_oben)(?:_|$)/],
      ['bottom',/(?:^|_)(unten|bottom|fuehler_unten|temp_unten)(?:_|$)/],
      ['middle',/(?:^|_)(mitte|middle)(?:_|$)/]
    ],
    dhw_tank: [
      ['top',/(?:^|_)(oben|top|speichertemperatur|boilertemperatur|ww_temperatur)(?:_|$)/],
      ['bottom',/(?:^|_)(unten|bottom)(?:_|$)/]
    ],
    heating_circuit: [
      ['flow',/(?:^|_)(vorlauf|vorlauftemperatur|flow|supply)(?:_|$)/],
      ['return',/(?:^|_)(ruecklauf|rucklauf|return)(?:_|$)/],
      ['pump',/(?:^|_)(pumpe|heizkreispumpe|pump)(?:_|$)/],
      ['mixer',/(?:^|_)(mischerstellung|mischer_position|mixer_position|mischer)(?:_|$)/]
    ]
  };
  function detect(hass) {
    const groups = new Map();
    for (const [id,state] of Object.entries(hass?.states || {})) {
      if (!/^(sensor|binary_sensor|switch|number)\./.test(id)) continue;
      const registry = hass?.entities?.[id] || {};
      // nigl/homeassistant_eta_integration uses sensor.eta_* and platform eta.
      if (registry.platform !== 'eta' && !/^sensor\.eta_/.test(id)) continue;
      const raw = norm(id.split('.').slice(1).join('.')).replace(/^eta_/, '');
      const label = norm(state?.attributes?.friendly_name);
      const kind = kinds.find(([,test])=>test.test(raw)) ||
        kinds.find(([,test])=>test.test(label));
      if (!kind) continue;
      const [type,pattern] = kind;
      const match = raw.match(pattern) || label.match(pattern);
      if (!match) continue;
      const index = match.index + match[0].length;
      const rest = (raw.match(/^(.*?)(?:puffer(?:speicher)?|buffer|warmwasserspeicher|warmwasser|brauchwasserspeicher|dhw|heizkreis|heating_circuit|heizkreisregelung)_?(\d*)/) || []);
      const number = rest[2] || ((raw.slice(index).match(/^(\d+)(?:_|$)/)||[])[1]) || '';
      const prefix = (rest[1] || '').replace(/_+$/,'').slice(0,50);
      const key = [type,prefix,number].join(':');
      const measurement = [raw,label].join('_');
      const role = (roles[type] || []).find(([,test])=>test.test(measurement))?.[0];
      if (!role) continue;
      // A top/bottom temperature needs a temperature entity, not a similarly
      // named actuator or target value.
      if (['top','middle','bottom','flow','return'].includes(role) &&
          id.split('.')[0] !== 'sensor') continue;
      if (!groups.has(key)) groups.set(key,{
        id:key,type,name:type==='buffer'?'ETA Pufferspeicher':
          type==='dhw_tank'?'ETA Warmwasserspeicher':'ETA Heizkreis',
        entities:{},count:0,source:'ETA (Home Assistant)'});
      const c = groups.get(key);
      if (number && !c.name.endsWith(' '+number)) c.name += ' '+number;
      if (!c.entities[role]) c.entities[role] = id;
    }
    return [...groups.values()].map(c=>({...c,count:Object.keys(c.entities).length}))
      .sort((a,b)=>a.type.localeCompare(b.type)||a.id.localeCompare(b.id));
  }
  return {detect};
})();

// Only genuinely new boilers are suggested in the editor. Persisting a
// discovery identity also makes repeat imports idempotent across HA reloads.
const HPC_DISCOVERY = (() => {
  const norm = value => String(value??'').toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const matchedNode = (plan,candidate,provider,peers=[]) => {
    const sources=(plan.components||[]).filter(c=>
      ['oil_boiler','gas_boiler','wood_chip_boiler','pellet_boiler','wood_gasifier','heat_pump'].includes(c.type));
    const ids=new Set(Object.values(candidate.entities||{}).filter(Boolean));
    if(sources.some(c=>c.discovery?.provider===provider&&
      c.discovery.id===String(candidate.id)))return true;
    // Manual configurations have no discovery metadata, but their assigned
    // sensor IDs reliably identify a previously added device.
    if(sources.some(c=>Object.values(c.sensors||{}).some(id=>ids.has(id))))return true;
    // Name + same fuel is a safe fallback for imported older YAML.
    if(sources.some(c=>c.type===candidate.type&&norm(c.name)===norm(candidate.name)))return true;
    // One manually added oil boiler and one physically detected oil boiler:
    // do not offer a second copy just because sensors were never assigned.
    if(candidate.type!=='unknown'&&
      sources.filter(c=>c.type===candidate.type).length===1&&
      peers.filter(c=>c.type===candidate.type).length===1&&
      sources.filter(c=>c.type===candidate.type)[0]?.discovery==null &&
      !sources.some(c=>c.discovery?.provider===provider&&
        c.discovery.id!==String(candidate.id)&&c.type===candidate.type))return true;
    return false;
  };
  return {matchedNode};
})();
