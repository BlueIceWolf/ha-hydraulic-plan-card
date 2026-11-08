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
  const allAliases = new Set(Object.values(roles).flat());
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
      if(!itemRole&&suffix!=='oilpreheat')continue;
      const registry=registrations[id]||{};
      const device=devices[registry.device_id]||{};
      const gateway=devices[device.via_device_id]||{};
      const meta=[registry.unique_id,registry.platform,device.name,device.name_by_user,
        device.model,device.manufacturer,gateway.name,gateway.model,gateway.manufacturer,
        JSON.stringify(device.identifiers||[]),JSON.stringify(gateway.identifiers||[])].join(' ').toLowerCase();
      const isEms=/ems[-_\s]?esp|emsesp/.test(meta);
      const group=registry.device_id||short.replace(/boiler_.*/,'boiler');
      if(!found.has(group))found.set(group,{group,entities:{},evidence:[],marker:false,
        description:[device.name_by_user||device.name||'',device.model||'',device.manufacturer||''].join(' ').trim()});
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
      if(count<2||(!item.marker&&count<3))continue;
      const description=item.description.toLowerCase();
      const oilModel=/\b(?:s115u?|g115|g125|g215|s125|oil|oel|öl|logano\s+g1)/i.test(description);
      const gasModel=/\b(?:gas|gaseous|logamax|gb172|gb192|gb125)\b/i.test(description);
      const oilSignal=item.evidence.some(e=>e.suffix==='oilpreheat');
      const fuel=oilModel||oilSignal?'oil_boiler':gasModel?'gas_boiler':'unknown';
      output.push({
        id:item.group,name:item.description||'EMS-ESP Boiler',
        source:item.marker?'EMS-ESP':'MQTT (EMS-ESP möglicherweise)',
        confirmed:item.marker,
        type:fuel,entities:item.entities,count,
        fuelCertain:fuel!=='unknown'
      });
    }
    return output.sort((a,b)=>Number(b.confirmed)-Number(a.confirmed)||b.count-a.count);
  }
  return {detect};
})();
