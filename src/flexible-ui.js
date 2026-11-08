const { HydraulicPlanCard, HydraulicPlanCardEditor } = (function hpcUI() {
  class HydraulicPlanCard extends HeatpumpFlowCard {
    static getConfigElement() { return document.createElement('hydraulic-plan-card-editor'); }
    static getStubConfig() {
      return {type:'custom:hydraulic-plan-card',preset:'none',plan:{components:[],connections:[]}};
    }
    setConfig(config) {
      if(!config||typeof config!=='object')throw Error('Invalid card configuration');
      this._integratedPlan=HPC_FREE.normalize(config.plan);
      this._integratedSig=null;
      // The original schematic is the primary and only display. Extra components
      // are merged into its original SVG, never a separate dashboard/card.
      super.setConfig(HPC_INTEGRATED.coreConfig({...config,plan:this._integratedPlan}));
    }
    _startState() {
      if(this._integratedPlan?.components.length)return false;
      return super._startState();
    }
    _render() {
      if(!this._integratedPlan?.components.length&&this._hass&&this._config&&this._startState()){
        const lang=String(this._hass?.locale?.language||navigator.language||'de').startsWith('de')?'de':'en';
        const message=lang==='de'
          ? 'Noch keine Bauteile eingerichtet. Öffne den Karteneditor und ergänze Wärmeerzeuger, Speicher und Heizkreise.'
          : 'No components configured. Open the card editor to add heat sources, tanks and circuits.';
        this._renderRoot().innerHTML='<style>'+HeatpumpFlowCard.styles+'</style><ha-card class="start">'
          +'<div class="head"><div class="title">Hydraulic Plan Card</div></div><div class="hint" id="start-hint">'
          +this._esc(message)+'</div></ha-card>';
        this._rendered=true;return;
      }
      super._render();
      this._syncAdditional(true);
    }
    set hass(hass) {
      super.hass=hass;
      this._syncAdditional();
    }
    _syncAdditional(force=false) {
      const p=this._integratedPlan;
      if(!this._hass||!p?.components.length)return;
      const svg=this._$('svg');if(!svg)return;
      const model=HPC_INTEGRATED.layout(p,this._hcCount||1);
      const ids=new Set();
      for(const n of p.components){
        Object.values(n.sensors||{}).forEach(id=>{if(id)ids.add(id);});
        (n.level_sensors||[]).forEach(point=>{if(point.entity)ids.add(point.entity);});
      }
      for(const edge of p.connections){
        if(edge.flow_entity)ids.add(edge.flow_entity);
        if(edge.temperature_entity)ids.add(edge.temperature_entity);
      }
      const tick=[...ids].sort().map(id=>{
        const st=this._hass?.states?.[id];
        return id+':'+(st?.state??'unavailable')+':'+(st?.attributes?.unit_of_measurement??'');
      }).join('|');
      const signature=JSON.stringify(p)+'|'+tick;
      if(!force&&signature===this._integratedSig&&svg.querySelector('#hpi-root'))return;
      const rendered=HPC_INTEGRATED.svg(model,this._hass);
      // A storage-only plan is valid. Without a selected heat source the
      // original engine would otherwise paint a fictitious heat pump/boiler.
      if(!p.components.some(c=>HPC_INTEGRATED.isSource?.(c)||
        ["wood_gasifier","oil_boiler","pellet_boiler","gas_boiler","heat_pump"].includes(c.type))){
        const source=svg.querySelector("#hp-box")?.closest("g.tap");
        if(source)source.style.display="none";
      }
      // The original heat-pump SVG has prewired pipes. In component mode
      // those would show fictitious connections and overlapping lines.
      for(const legacy of svg.querySelectorAll('path[id^="p-"],path[id^="f-"]')){
        if(!legacy.closest('#hpi-root'))legacy.style.display='none';
      }
      svg.querySelector('#hpi-root')?.remove();
      svg.insertAdjacentHTML('beforeend','<g id="hpi-root"><defs>'+rendered.defs+'</defs>'+rendered.body+'</g>');
      // First tank remains the upstream tank graphic. Only its fill gains the
      // additional measured stratification points configured for that tank.
      const firstBuffer=rendered.firstBuffer;
      const firstDhw=rendered.firstDhw;
      if(firstBuffer){
        svg.querySelector('rect.tank[x="520"][y="320"]')?.setAttribute('fill','url(#hpi-'+firstBuffer+')');
        const title=svg.querySelector('text.tank-title[x="580"][y="310"]');
        if(title)title.textContent=p.components.find(c=>c.id===firstBuffer)?.name||title.textContent;
      }
      if(firstDhw){
        svg.querySelector('rect.tank[x="520"][y="40"]')?.setAttribute('fill','url(#hpi-'+firstDhw+')');
        const title=svg.querySelector('text.tank-title[x="580"][y="30"]');
        if(title)title.textContent=p.components.find(c=>c.id===firstDhw)?.name||title.textContent;
      }
      const height=Math.max(model.height,560+(this._hcCount-1)*250);
      svg.setAttribute('viewBox','0 0 '+model.width+' '+height);
      // Keep the ORIGINAL 1000-unit schematic scaled to the card width.
      // Extra components extend the scrollable canvas without zooming in the
      // existing equipment when the editor preview is only ~500px wide.
      // Percentages also adapt automatically when HA resizes the editor/card.
      svg.style.width=(model.width/10)+'%';
      // Fullscreen on phones must not shrink to an unreadable overview.
      // Preserve a minimum drawing scale there; the stage is scrollable in
      // both directions, while the normal editor preview remains responsive.
      svg.style.minWidth=this._fullscreenOpen?(model.width*.85)+'px':'';
      svg.style.maxWidth='none';
      const root=this._renderRoot();
      // This SVG can be much wider than the dashboard. The stage owns horizontal
      // scrolling, but vertical wheel/touch scrolling must continue to the
      // fullscreen card (or to the page outside fullscreen). A blanket
      // overscroll-behavior: contain trapped wheel events over the stage.
      const stage=root.querySelector('.stage');
      const card=root.querySelector('ha-card');
      card?.classList.add('hpi-expanded');
      if(stage){
        stage.style.overflowX='auto';
        stage.style.overscrollBehaviorX='contain';
        stage.style.overscrollBehaviorY='auto';
        stage.style.touchAction='pan-x pan-y';
        stage.tabIndex=0;
        stage.setAttribute('role','region');
        stage.setAttribute('aria-label',String(this._hass?.locale?.language||'de').startsWith('de')
          ? 'Hydraulikschema – horizontal verschiebbar' : 'Hydraulic diagram – scroll horizontally');
        if(!stage.dataset.hpiWheelBound){
          // Shift + mouse-wheel is a useful fallback for wide diagrams on
          // desktop computers without a horizontal trackpad gesture.
          stage.addEventListener('wheel',(event)=>{
            if(!event.shiftKey||!event.deltaY||event.deltaX)return;
            const previous=stage.scrollLeft;
            stage.scrollLeft+=event.deltaY;
            if(previous!==stage.scrollLeft)event.preventDefault();
          },{passive:false});
          stage.dataset.hpiWheelBound='1';
        }
      }
      if(!root.querySelector('#hpi-styles')){
        const style=document.createElement('style');
        style.id='hpi-styles';
        style.textContent=
          '.hpi-expanded .stage{overflow-x:auto;overscroll-behavior-x:contain;overscroll-behavior-y:auto;scrollbar-width:thin;}'
          +'.hpi-expanded.fullscreen{overflow-y:auto;overflow-x:hidden;overscroll-behavior-y:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;}'
          +'.hpi-expanded .stage #svg{display:block;max-width:none;height:auto;}'
          +'.hpi-expanded .stage:focus-visible{outline:2px solid var(--primary-color,#03a9f4);outline-offset:-2px;}'
          +'.hpi-component .tap{cursor:pointer}.hpi-component .tank-title{font-size:16px}'
          +'.hpi-component .unit-title{font-size:15px}.hpi-component .small{font-size:13px}'
          +'.hpi-component .heater{fill:none;stroke:var(--hfc-heat,#c8783d);stroke-width:5;stroke-linecap:round}'
          +'.hpi-component .rib{fill:none;stroke:var(--hfc-muted,#94a3b8);stroke-width:8;stroke-linecap:round}'
          +'.hpi-oil-casing{fill:var(--secondary-background-color,#29303a);stroke:var(--divider-color,#66717b);stroke-width:2.5;}'
          +'.hpi-oil-front{fill:var(--card-background-color,#202124);stroke:var(--divider-color,#66717b);stroke-width:1.5;}'
          +'.hpi-oil-seam{fill:none;stroke:var(--hfc-muted,#77838b);stroke-width:2;}'
          +'.hpi-oil-burner{fill:var(--secondary-background-color,#343941);stroke:var(--hfc-muted,#77838b);stroke-width:2;}'
          +'.hpi-oil-fan{fill:var(--card-background-color,#202124);stroke:var(--hfc-muted,#77838b);stroke-width:2;}'
          +'.hpi-oil-flame{fill:var(--disabled-text-color,#7b7b7b);transition:fill .25s;}'
          +'.hpi-oil.on .hpi-oil-flame{fill:var(--hfc-hot,#ff7043);filter:url(#glow);}'
          +'.hpi-oil-control{fill:var(--card-background-color,#202124);stroke:var(--divider-color,#66717b);stroke-width:1.5;}'
          +'.hpi-oil-display{fill:#405765;stroke:#8197a0;stroke-width:1;}'
          +'.hpi-oil-led{fill:var(--disabled-text-color,#737373);}'
          +'.hpi-oil.on .hpi-oil-led{fill:var(--hfc-good,#29a85e);}'
          +'.hpi-oil-status{font-size:13px;font-weight:600;fill:var(--secondary-text-color,#8a949c);}'
          +'.hpi-oil-kind{font-size:11px;font-weight:600;fill:var(--secondary-text-color,#8a949c);}'
          +'.hpi-oil.on .hpi-oil-status{fill:var(--hfc-good,#32b46b);}'
          +'.hpi-oil-reading{font-size:13px;fill:var(--primary-text-color);}'
          +'.hpi-rla-bypass{fill:none;stroke:var(--hfc-heat,#d4783b);stroke-width:5;stroke-linecap:round;stroke-linejoin:round;}'
          +'.hpi-rla-flow{fill:none;stroke:#fff;stroke-width:2;stroke-dasharray:4 10;animation:hpc-rla-motion 1.4s linear infinite;pointer-events:none;}'
          +'@keyframes hpc-rla-motion{to{stroke-dashoffset:-28}}'
          +'@media (prefers-reduced-motion:reduce){.hpi-rla-flow{animation:none;}}'
          +'.hpi-rla-valve{fill:var(--card-background-color,#202124);stroke:var(--hfc-heat,#e7853d);stroke-width:3;}'
          +'.hpi-rla-symbol{fill:none;stroke:var(--hfc-muted,#9ca3af);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;}'
          +'.hpi-rla-label{font-size:12px;font-weight:700;fill:var(--primary-text-color);}';
        root.append(style);
      }
      this._integratedSig=signature;
    }
  }
  class HydraulicPlanCardEditor extends HeatpumpFlowCardEditor {
    _free(){return Array.isArray(this._config?.plan?.components);}
    _unconfigured(){return !this._free()&&this._config?.editor_mode!=="classic"&&(!this._config?.preset||this._config.preset==="none")&&
      !Object.values(this._config?.entities||{}).some(Boolean);}
    setConfig(config){
      // Home Assistant can call setConfig repeatedly (including for our own config-changed
      // event). Redrawing on an equivalent config destroys focused text inputs and selects.
      const newConfig=config||{};
      const changed=JSON.stringify(this._config)!==JSON.stringify(newConfig);
      this._config=newConfig;
      if(this._free()||this._unconfigured()){
        if(changed || !this._freeUi?.isConnected)this._renderFlex();
      } else {
        this._freeUi?.remove();this._freeUi=null;
        if(changed||!this._form)super.setConfig(config);
        this._showFreeButton();
      }
    }
    set hass(hass){
      const first=!this._hass;
      this._hass=hass;
      // Live HA data changes frequently. Never replace the whole configuration form;
      // this would interrupt typing, select popovers and drag operations.
      if(this._free()||this._unconfigured()){
        const candidateSignature=JSON.stringify(HPC_EMS.detect(hass).map(x=>[x.id,x.type,x.count,Object.values(x.entities)]));
        if(first||!this._freeUi?.isConnected||candidateSignature!==this._emsSignature){
          this._emsSignature=candidateSignature;
          this._renderFlex();
        }
        return;
      }
      super.hass=hass;this._showFreeButton();
    }
    _render(){
      if(this._free()||this._unconfigured())this._renderFlex();
      else {this._freeUi?.remove();this._freeUi=null;super._render();this._showFreeButton();}
    }
    _save(config){
      this._config=config;
      this.dispatchEvent(new CustomEvent("config-changed",{detail:{config},bubbles:true,composed:true}));
      // User action (not a HA data refresh) is the only reason to redraw the form.
      this._render();
    }
    _applyPlan(plan,extra={}){this._save({...this._config,...extra,plan:HPC_FREE.normalize(plan)});}
    _legacyPlan(){
      // Classic setups often already contain buffers, DHW and heat circuits.
      // Import ALL configured roles into editable components before the first
      // new addition so the transition cannot silently lose them.
      const c=this._config||{},entities=c.entities||{};
      const mapped={wood_gasifier:'wood_gasifier',oil:'oil_boiler',
        pellet:'pellet_boiler',gas:'gas_boiler',heat_pump:'heat_pump'};
      const result={components:[],connections:[]};
      const add=(type,name,map)=>{
        if(!type)return;
        const node=HPC_FREE.newNode(type,result);
        if(!node)return;
        node.name=name||HPC_FREE.display(type);
        for(const [field,role] of Object.entries(map)){
          if(entities[role])node.sensors[field]=entities[role];
        }
        result.components.push(node);
      };
      const source=mapped[c.generator_type];
      if(source){
        add(source,c.boiler_name||HPC_FREE.display(source),source==="heat_pump"
          ?{state:'mode',flow:'flow',return:'return',power:'power'}
          :{state:'boiler_state',flow:'boiler_flow',return:'boiler_return',
            exhaust:'boiler_exhaust',oxygen:'boiler_o2',fan:'boiler_fan',
            pump:'boiler_pump',power:'boiler_power',starts:'boiler_burner_starts'});
      }
      const second=mapped[c.boiler_type];
      if(second&&second!==source){
        add(second,HPC_FREE.display(second),{state:'boiler_state',
          flow:'boiler_flow',return:'boiler_return',pump:'boiler_pump'});
      }
      if(c.buffer===true||['buffer_top','buffer_middle','buffer_bottom'].some(key=>entities[key])){
        add('buffer','Puffer 1',{top:'buffer_top',middle:'buffer_middle',bottom:'buffer_bottom'});
      }
      if(['dhw_top','dhw_middle','dhw_bottom'].some(key=>entities[key])){
        add('dhw_tank','Warmwasserspeicher',{top:'dhw_top',middle:'dhw_middle',bottom:'dhw_bottom'});
      }
      const count=Math.min(6,Math.max(0,Math.round(+c.hc_count)||0));
      for(let i=1;i<=6;i++){
        const prefix=i===1?'hc_':'hc'+i+'_';
        const roles={flow:prefix+'flow',return:prefix+'return',target:prefix+'setpoint',
          pump:prefix+'pump',mixer:prefix+'mixer'};
        if(i<=count||Object.values(roles).some(role=>entities[role])){
          add('heating_circuit','Heizkreis '+i,roles);
        }
      }
      // Legacy fixed SVG piping has no reliable per-port graph representation.
      // Never pretend its pipes are real user-confirmed connections.
      return HPC_FREE.normalize(result);
    }
    _showFreeButton(){
      if(!this._config||!this._hass||this._free())return;
      if(this._switch?.isConnected)return;
      this._switch=document.createElement("div");
      this._switch.innerHTML=`<style>${HPC_FREE.css}</style><div class="hpc-editor hpc-actions"><button type="button" class="hpc-primary">Bauteile im vorhandenen Hydraulikplan ergänzen</button></div>`;
      this.prepend(this._switch);
      this._switch.querySelector("button").addEventListener("click",()=>this._applyPlan({components:[],connections:[]}));
    }
    _renderFlex(){
      if(!this._config)return;
      if(this._form){this._form.remove();this._form=null;}
      this._assistant?.remove();this._assistant=null;
      this._warn?.remove();this._warn=null;
      this._switch?.remove();this._switch=null;
      const lang=String(this._hass?.locale?.language||navigator.language||"de").startsWith("de")?"de":"en";
      const t=(de,en)=>lang==="de"?de:en,esc=HPC_FREE.esc;
      const p=HPC_FREE.normalize(this._config.plan);
      const configured=true;
      const emsCandidates=HPC_EMS.detect(this._hass);
      const chosenEms=emsCandidates[0];
      const emsTypeLabel=(type)=>type==="oil_boiler"?t("Ölkessel","Oil boiler"):
        type==="gas_boiler"?t("Gaskessel","Gas boiler"):t("Kessel (Brennstoff prüfen)","Boiler (verify fuel)");
      const emsInfo=chosenEms?`<section class="hpc-ems">
        <h3>${t("Heizung über EMS-ESP erkannt","Heating device detected via EMS-ESP")}</h3>
        <p><strong>${esc(chosenEms.name)}</strong> · ${esc(chosenEms.source)} · ${emsTypeLabel(chosenEms.type)}</p>
        <p>${chosenEms.count} ${t("zuordenbare Messwerte gefunden. Die Erkennung liest nur Home-Assistant-Entitäten und verändert deine Heizung nicht.","assignable values found. Detection only reads Home Assistant entities and never changes heating controls.")}</p>
        ${chosenEms.count===0?`<p>${t("Das Gerät ist erkannt, stellt aber noch keine passenden Messwerte bereit. Bitte die EMS-ESP-Veröffentlichung prüfen.","Device recognized, but no matching measured values are available yet. Check EMS-ESP publishing settings.")}</p>`:""}
        ${chosenEms.type==="unknown"?`<p>${t("Der Brennstoff lässt sich aus den verfügbaren Geräten nicht sicher erkennen. Bitte den richtigen Kesseltyp auswählen.","Fuel type cannot be reliably inferred. Select the proper boiler type first.")}</p>`:""}
        <button type="button" data-action="ems-apply">${chosenEms.count?t("Kessel übernehmen und Messwerte zuordnen","Add boiler and assign values"):t("Erkannten Kessel hinzufügen","Add detected boiler")}</button>
      </section>`:"";
      const selected=p.components.find(c=>c.id===this._selectedId)||p.components[0];
      if(selected)this._selectedId=selected.id;
      const sensors=Object.keys(this._hass?.states||{}).filter(id=>/^(sensor|binary_sensor|switch|number|select|input_boolean|input_number)\.[a-zA-Z0-9_]+$/.test(id));
      const dataList=`<datalist id="hpc-free-entities">${sensors.slice(0,8000).map(id=>`<option value="${esc(id)}"></option>`).join("")}</datalist>`;
      const categories=[
        ["source",t("Wärmeerzeuger und Kessel","Heat sources and boilers")],
        ["storage",t("Speicher","Storage")],
        ["load",t("Heizkreise","Heating circuits")],
        ["control",t("Pumpen, Mischer und Verteiler","Pumps, valves and manifolds")]
      ];
      const typeOptions=categories.map(([group,label])=>`<optgroup label="${esc(label)}">${HPC_FREE.types
        .filter(c=>c.group===group)
        .map(c=>`<option value="${esc(c.type)}">${esc(HPC_FREE.display(c.type,lang))}</option>`).join("")}</optgroup>`).join("");
      const portNames={
        flow:t("Vorlauf","Flow"),return:t("Rücklauf","Return"),dhw:t("Warmwasser","Hot water"),
        flow_in:t("Vorlauf Eingang","Flow inlet"),return_out:t("Rücklauf Ausgang","Return outlet"),
        top_in:t("Oben hinein","Top in"),top_out:t("Oben heraus","Top out"),
        mid_in:t("Mitte hinein","Middle in"),mid_out:t("Mitte heraus","Middle out"),
        bottom_in:t("Unten hinein","Bottom in"),bottom_out:t("Unten heraus","Bottom out"),
        coil_in:t("Wärmetauscher hinein","Coil in"),coil_out:t("Wärmetauscher heraus","Coil out"),
        hot_out:t("Warmwasser hinaus","Hot water out"),cold_in:t("Kaltwasser hinein","Cold water in"),
        in:t("Eingang","Inlet"),out:t("Ausgang","Outlet"),
        a:"A",b:"B",ab:"AB",c:"C",d:"D",e:"E",f:"F",
      };
      const portOptions=(role,selectedFrom="")=>p.components.map(c=>{
        const list=HPC_FREE.ports(c.type).filter(port=>{
          if(role==="from")return HPC_FREE.portRole(c.type,port.id)!=="in";
          const [fromId,fromPort]=selectedFrom.split("|");
          return !!fromId&&HPC_FREE.validConnection(p,fromId,fromPort,c.id,port.id);
        });
        if(!list.length)return "";
        return `<optgroup label="${esc(c.name)}">${list.map(port=>`<option value="${esc(c.id+"|"+port.id)}">${esc(portNames[port.id]||port.id)}</option>`).join("")}</optgroup>`;
      }).join("");
      const sensorField=(id,key,value)=>`<label class="hpc-field">${esc(HPC_FREE.fieldLabel(key,lang))}
        <input type="text" list="hpc-free-entities" autocomplete="off" data-sensor="${esc(id)}" data-field="${esc(key)}"
          value="${esc(value||"")}" placeholder="${t("Home Assistant-Entität","Home Assistant entity")}"/></label>`;
      const extraRows=(selected?.level_sensors||[]).map((point,index)=>`<div class="hpc-row">
        <label>${t("Höhe von oben (%)","Height from top (%)")}<input type="number" min="0" max="100" step="0.1"
          data-level-pos="${esc(selected.id)}" data-level-index="${index}" value="${point.position}"/></label>
        <label>${t("Temperaturfühler","Temperature sensor")}<input list="hpc-free-entities"
          data-level-entity="${esc(selected.id)}" data-level-index="${index}" value="${esc(point.entity)}"/></label>
        <button data-action="remove-level" data-index="${index}" type="button">${t("Löschen","Delete")}</button></div>`).join("");
      const isTank=selected&&["buffer","dhw_tank"].includes(selected.type);
      const bufferList=p.components.filter(c=>c.type==="buffer");
      const misplacedBufferEdges=p.connections.filter(e=>{
        const from=p.components.find(c=>c.id===e.from),to=p.components.find(c=>c.id===e.to);
        return from?.type==="buffer"&&to?.type==="buffer"&&e.from_port==="bottom_out"&&e.to_port==="top_in";
      });
      const chosen=selected?`<h3>${t("Bauteil konfigurieren","Configure component")}</h3>
        <div class="hpc-row"><label>${t("Bezeichnung","Name")}<input data-name="${esc(selected.id)}"
          maxlength="75" value="${esc(selected.name)}"/></label>
          <button type="button" data-action="remove-component">${t("Entfernen","Remove")}</button></div>
        ${selected.type==="wood_gasifier"?`<label class="hpc-checkbox">
          <input type="checkbox" data-return-lift="${esc(selected.id)}" ${selected.options?.return_lift?"checked":""}/>
          <span>${t("Rücklaufanhebung am Holzvergaser","Return-temperature lift at wood gasifier")}</span>
        </label>
        <p>${t("Die Rücklaufanhebung wird direkt hinter dem Kessel eingezeichnet. Ein zusätzlicher Mischer ist dafür nicht erforderlich. Den Pumpenstatus und die Mischerstellung kannst du unten zuordnen.","The return-temperature lift is drawn behind the boiler. No separate mixer component is needed. You can map its pump state and mixer position below.")}</p>`:""}
        ${["oil_boiler","gas_boiler","pellet_boiler"].includes(selected.type)?`<label class="hpc-field">${t("Kesselbauart","Boiler construction")}
          <select data-boiler-kind="${esc(selected.id)}">
            ${[["standard",t("Standardkessel","Standard boiler")],["low_temp",t("Niedertemperaturkessel","Low-temperature boiler")],["condensing",t("Brennwertkessel","Condensing boiler")]]
             .map(([id,name])=>`<option value="${id}" ${(selected.options?.boiler_kind||"standard")===id?"selected":""}>${name}</option>`).join("")}
          </select></label>`:""}
        ${HPC_FREE.byType[selected.type].fields.filter(key=>key!=="mixer"||selected.options?.return_lift).map(key=>sensorField(selected.id,key,selected.sensors[key])).join("")}
        ${isTank?`<h3>${t("Zusätzliche Temperaturfühler","Additional temperature sensors")}</h3>
          <p>${t("Ordne jeden Fühler seiner tatsächlichen Einbauhöhe zu. 0 % = oben, 100 % = unten.","Set each sensor to its real installation height. 0% = top, 100% = bottom.")}</p>
          ${extraRows}<button type="button" data-action="add-level">${t("Weiteren Fühler hinzufügen","Add temperature sensor")}</button>`:""}`:"";
      const connectionRows=p.connections.map(edge=>`<div class="hpc-row">
        <span style="flex:1 1 250px;font-size:.85em">${esc((p.components.find(c=>c.id===edge.from)?.name||edge.from)+" – "+(portNames[edge.from_port]||edge.from_port)+" → "+(p.components.find(c=>c.id===edge.to)?.name||edge.to)+" – "+(portNames[edge.to_port]||edge.to_port))}</span>
        <button type="button" data-action="remove-edge" data-edge-id="${esc(edge.id)}">${t("Entfernen","Remove")}</button>
        <label>${t("Pumpen-/Flussstatus (optional)","Pump/flow status (optional)")}
        <input list="hpc-free-entities" data-edge="${esc(edge.id)}" data-edge-field="flow_entity" value="${esc(edge.flow_entity)}"/></label>
        <label>${t("Rohrtemperatur (optional)","Pipe temperature (optional)")}
        <input list="hpc-free-entities" data-edge="${esc(edge.id)}" data-edge-field="temperature_entity" value="${esc(edge.temperature_entity)}"/></label>
        </div>`).join("");
      const html=`<style>${HPC_FREE.css}</style><div class="hpc-editor">
        ${!configured?`<h3>${t("Deine Heizungsanlage","Your heating system")}</h3>
          <p>${t("Wähle selbst, welche Wärmeerzeuger, Speicher und Heizkreise du hast und wie sie verbunden sind. Eine Wärmepumpe ist nicht erforderlich.","Choose your own heat generators, tanks, heating circuits and connections. No heat-pump integration required.")}</p>
          <div class="hpc-actions"><button type="button" class="hpc-primary" data-action="start">${t("Leeren Plan anlegen","Start blank plan")}</button>
            <button type="button" data-action="example">${t("Beispiel: Elternanlage","Example: parents' system")}</button></div>`:`
          <div class="hpc-row"><label>${t("Name der Anlage","System name")}<input id="hpc-free-title"
            value="${esc(this._config.title||"")}" placeholder="Hydraulic Plan Card"/></label></div>
          <div class="hpc-actions"><button type="button" data-action="example">${t("Beispielanlage laden (ersetzt Plan)","Load example (replaces plan)")}</button></div>
          ${emsInfo}
          <h3>${t("Bauteil hinzufügen","Add component")}</h3>
          <div class="hpc-row"><label>${t("Art","Type")}<select id="hpc-free-type">${typeOptions}</select></label>
            <button type="button" class="hpc-primary" data-action="add-component">${t("Hinzufügen","Add")}</button></div>
          <div class="hpc-component-list">${p.components.map(c=>`<button type="button" data-select="${esc(c.id)}"
            aria-pressed="${selected?.id===c.id}">${esc(c.name)}</button>`).join("")}</div>
          <h3>${t("Hydraulikschema","Hydraulic schematic")}</h3>
          <p>${t("Die Bauteile werden passend zu ihren Anschlüssen automatisch im ursprünglichen Hydraulikplan angeordnet. Du musst keine Positionen eingeben. Die Live-Vorschau siehst du im Dashboard.","Components are automatically arranged in the original hydraulic schematic. No manual coordinates are required. The dashboard shows the live preview.")}</p>
          ${chosen}
          <h3>${t("Rohrverbindungen","Pipe connections")}</h3>
          ${bufferList.length>=2?`<div class="hpc-ems">
            <strong>${t("Pufferspeicher verbinden","Connect buffer tanks")}</strong>
            <p>${t("Reihenschaltung: Vorlauf jeweils oben zum nächsten Puffer, Rücklauf unten zurück zum vorherigen. Bereits vorhandene Verbindungen bleiben erhalten; prüfe die tatsächliche Verrohrung.","Series layout: hot flow at the top to the next buffer, cooler return at the bottom to the previous. Existing connections are retained; check your actual pipework.")}</p>
            <button type="button" data-action="buffer-series">${t("Puffer in Reihe verbinden","Connect buffers in series")}</button>
          </div>`:""}
          ${misplacedBufferEdges.length?`<p class="hpc-connection-warning">${t("Achtung: Eine Pufferleitung ist von unten nach oben verbunden. Bitte prüfen, ob das der tatsächlichen Verrohrung entspricht.","Warning: a buffer pipe links bottom to top. Verify this corresponds to the actual installation.")}</p>`:""}
          <div class="hpc-row"><label>${t("Von Anschluss","From port")}<select id="hpc-from">
            <option value="">–</option>${portOptions("from")}</select></label>
            <label>${t("Zu Anschluss","To port")}<select id="hpc-to"><option value="">–</option></select></label>
            <button type="button" data-action="connect" class="hpc-primary">${t("Verbinden","Connect")}</button></div>
          ${connectionRows||`<p>${t("Noch keine Rohrverbindungen eingerichtet. Das Schema nimmt keine echte Verrohrung an.","No pipe connections configured. The diagram does not infer pipework.")}</p>`}
          <p>${t("Die Leitungen werden bei aktivem Pumpen- oder Flusssignal animiert. 0 % und 100 % Mischerstellung verhindern die Animation nicht. Ohne zugeordneten Pumpenstatus ist der Durchfluss unbekannt. Bitte die tatsächliche Hydraulik prüfen.","Pipes animate when an assigned pump or flow signal is active. Mixer positions of 0% or 100% do not disable circulation. Without a pump signal, flow is unknown. Verify actual pipework.")}</p>`}
        ${dataList}
      </div>`;
      if(!this._freeUi){this._freeUi=document.createElement("div");this.append(this._freeUi);}
      // Repaint only after an intentional editor action. Preserve the scroll position
      // when adding sensors, switching components or moving the hydraulic schematic.
      const oldY=this._freeUi.scrollTop;
      this._freeUi.innerHTML=html;
      this._freeUi.scrollTop=oldY;
      const root=this._freeUi;
      const changePlan=(fn)=>{const next=HPC_FREE.normalize(p);fn(next);this._applyPlan(next);};
      root.querySelectorAll("[data-action]").forEach(button=>button.addEventListener("click",()=>{
        const action=button.dataset.action;
        if(action==="ems-apply"&&chosenEms){
          const matches=p.components.filter(c=>c.type===chosenEms.type&&
            HPC_FREE.byType[c.type]?.group==="source");
          const same=matches.find(c=>Object.values(c.sensors||{}).some(id=>Object.values(chosenEms.entities).includes(id)));
          const target=same||matches[0]||
            (chosenEms.type==="unknown"&&selected&&HPC_FREE.byType[selected.type]?.group==="source"?selected:null);
          if(!target&&chosenEms.type==="unknown")return;
          const copy=HPC_FREE.normalize(p);
          const node=target?copy.components.find(c=>c.id===target.id):HPC_FREE.newNode(chosenEms.type,copy);
          if(!node)return;
          if(!target)copy.components.push(node);
          // Never overwrite a value the user selected manually.
          for(const [key,id] of Object.entries(chosenEms.entities)){
            if(HPC_FREE.byType[node.type].fields.includes(key)&&!node.sensors[key])node.sensors[key]=id;
          }
          if(!target)node.name=chosenEms.name.slice(0,75);
          this._selectedId=node.id;
          return this._applyPlan(copy,{hpc_legacy_imported:true});
        }
        if(action==="start")return this._applyPlan({components:[],connections:[]});
        if(action==="example"){
          if(p.components.length&&!window.confirm(
            t("Beispielanlage laden? Die aktuelle Konfiguration wird ersetzt.","Load example? This replaces the current configuration.")))return;
          return this._applyPlan(HPC_FREE.sample(),{hpc_legacy_imported:true});
        }
        if(action==="add-component"){
          const importing=!p.components.length&&!this._config.hpc_legacy_imported;
          const legacy=importing?this._legacyPlan():{components:[],connections:[]};
          const base=legacy.components.length?legacy:p;
          const node=HPC_FREE.newNode(root.querySelector("#hpc-free-type")?.value,base);
          if(!node)return;this._selectedId=node.id;
          return this._applyPlan({components:[...base.components,node],connections:base.connections},
            legacy.components.length?{hpc_legacy_imported:true}:{});
        }
        if(action==="remove-component"&&selected){
          this._selectedId=null;
          return this._applyPlan({components:p.components.filter(c=>c.id!==selected.id),
            connections:p.connections.filter(c=>c.from!==selected.id&&c.to!==selected.id)});
        }
        if(action==="connect"){
          const [from,from_port]=(root.querySelector("#hpc-from")?.value||"").split("|");
          const [to,to_port]=(root.querySelector("#hpc-to")?.value||"").split("|");
          if(!HPC_FREE.validConnection(p,from,from_port,to,to_port))return;
          const id=(()=>{let i=1;const seen=new Set(p.connections.map(x=>x.id));while(seen.has("leitung_"+i))i++;return "leitung_"+i;})();
          return this._applyPlan({components:p.components,connections:[...p.connections,{id,from,from_port,to,to_port}]});
        }
        if(action==="buffer-series"){
          const next=HPC_FREE.connectBufferSeries(p);
          if(next.connections.length===p.connections.length)return;
          return this._applyPlan(next);
        }
        if(action==="remove-edge"){
          return this._applyPlan({components:p.components,connections:p.connections.filter(c=>c.id!==button.dataset.edgeId)});
        }
        if(action==="add-level"&&selected){
          return changePlan(plan=>{
            const c=plan.components.find(x=>x.id===selected.id);
            if(!c)return;
            const taken=new Set((c.level_sensors||[]).map(p=>p.position));
            let pos=25;while(taken.has(pos)&&pos<100)pos+=5;
            c.level_sensors=[...(c.level_sensors||[]),{position:pos,entity:""}];
            // New fields are initially blank until an entity is selected.
          });
        }
        if(action==="remove-level"&&selected){
          return changePlan(plan=>{
            const c=plan.components.find(x=>x.id===selected.id);
            c.level_sensors=(c.level_sensors||[]).filter((_,i)=>i!==Number(button.dataset.index));
          });
        }
      }));
      const fromSelect=root.querySelector("#hpc-from");
      const toSelect=root.querySelector("#hpc-to");
      fromSelect?.addEventListener("change",()=>{
        toSelect.innerHTML='<option value="">–</option>'+portOptions("to",fromSelect.value);
      });
      root.querySelectorAll("[data-select]").forEach(b=>b.addEventListener("click",()=>{this._selectedId=b.dataset.select;this._renderFlex();}));
      const fieldUpdate=(selector,fn)=>root.querySelectorAll(selector).forEach(el=>el.addEventListener("change",()=>changePlan(plan=>fn(plan,el))));
      root.querySelectorAll("[data-return-lift]").forEach(el=>el.addEventListener("change",()=>changePlan(plan=>{
        const c=plan.components.find(x=>x.id===el.dataset.returnLift);
        if(c?.type==="wood_gasifier")c.options={...c.options,return_lift:el.checked};
      })));
      fieldUpdate("[data-boiler-kind]",(plan,el)=>{
        const c=plan.components.find(x=>x.id===el.dataset.boilerKind);
        if(c)c.options={...c.options,boiler_kind:el.value};
      });
      fieldUpdate("[data-name]",(plan,el)=>{const c=plan.components.find(x=>x.id===el.dataset.name);if(c)c.name=el.value.slice(0,75);});
      fieldUpdate("[data-sensor]",(plan,el)=>{const c=plan.components.find(x=>x.id===el.dataset.sensor);if(c){
        if(el.value)c.sensors[el.dataset.field]=el.value;else delete c.sensors[el.dataset.field];
      }});
      fieldUpdate("[data-edge]",(plan,el)=>{const c=plan.connections.find(x=>x.id===el.dataset.edge);if(c)c[el.dataset.edgeField]=el.value;});
      fieldUpdate("[data-level-pos]",(plan,el)=>{const c=plan.components.find(x=>x.id===el.dataset.levelPos);
        if(c?.level_sensors?.[Number(el.dataset.levelIndex)])c.level_sensors[Number(el.dataset.levelIndex)].position=Number(el.value);
      });
      fieldUpdate("[data-level-entity]",(plan,el)=>{const c=plan.components.find(x=>x.id===el.dataset.levelEntity);
        if(c?.level_sensors?.[Number(el.dataset.levelIndex)])c.level_sensors[Number(el.dataset.levelIndex)].entity=el.value;
      });
      const title=root.querySelector("#hpc-free-title");
      title?.addEventListener("change",()=>this._save({...this._config,title:title.value}));

    }
  }
  return { HydraulicPlanCard, HydraulicPlanCardEditor };
})();
