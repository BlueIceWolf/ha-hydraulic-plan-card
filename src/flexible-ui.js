const { HydraulicPlanCard, HydraulicPlanCardEditor } = (function hpcUI() {
  class HydraulicPlanCard extends HeatpumpFlowCard {
    static getConfigElement() { return document.createElement("hydraulic-plan-card-editor"); }
    static getStubConfig() { return { type:"custom:hydraulic-plan-card", plan_mode:"free", plan:{components:[],connections:[]} }; }
    _isFree() { return this._config?.plan_mode==="free" || Array.isArray(this._config?.plan?.components); }
    setConfig(config) {
      if (!config || typeof config!=="object") throw Error("Invalid card configuration");
      if (config.plan_mode==="free" || Array.isArray(config.plan?.components)) {
        this._config={...config,plan_mode:"free",plan:HPC_FREE.normalize(config.plan)};
        if(this._hass)this._renderFree();
      } else super.setConfig(config);
    }
    set hass(hass) {
      if (!this._isFree()) { super.hass=hass; return; }
      this._hass=hass;this._renderFree();
    }
    getCardSize() { return this._isFree()?12:super.getCardSize(); }
    getGridOptions() { return {columns:"full",min_columns:6,rows:"auto"}; }
    _render() {
      if (this._isFree()) { this._renderFree();return; }
      if (this._hass&&this._config&&this._startState()) {
        const de=String(this._hass.locale?.language||navigator.language||"de").startsWith("de");
        const title=this._esc(this._config.title||"Hydraulic Plan Card");
        const head=de?"Heizungsanlage einrichten":"Set up heating system";
        const message=de?"Füge im Karteneditor Wärmeerzeuger, Pufferspeicher, Heizkreise und Verbindungen hinzu. Eine Wärmepumpen-Integration ist nicht notwendig.":"Add heat sources, buffer tanks, circuits and connections in the card editor. No heat pump integration is needed.";
        const root=this._renderRoot();
        root.innerHTML=`<style>${HPC_FREE.css}
          .hpc-empty{padding:20px;border-radius:14px;background:var(--secondary-background-color,rgba(100,130,180,.11))}
          .hpc-empty h3{margin:0 0 10px;font-size:1.1em}.hpc-empty p{margin:0;line-height:1.45}</style>
          <ha-card><h2 style="font-size:1.15em;margin:0 0 12px">${title}</h2>
          <div class="hpc-empty" id="start-hint"><h3>${head}</h3><p>${this._esc(message)}</p></div></ha-card>`;
        this._rendered=true;return;
      }
      super._render();
    }
    _renderFree() {
      if (!this._config||!this._hass)return;
      const plan=HPC_FREE.normalize(this._config.plan);
      const lang=String(this._hass.locale?.language||navigator.language||"de").startsWith("de")?"de":"en";
      const title=HPC_FREE.esc(this._config.title||"Hydraulic Plan Card");
      this._renderRoot().innerHTML=`<style>${HPC_FREE.css}</style><ha-card>
        <h2 style="font-size:1.15em;margin:0 0 12px">${title}</h2>
        ${!plan.components.length?`<div class="hpc-note">${lang==="de"?"Noch keine Bauteile. Öffne den Karteneditor und lege die Hydraulik an.":"No components yet. Open the card editor to build your hydraulic system."}</div>`:""}
        <div class="hpc-board">${HPC_FREE.draw(plan,this._hass,{lang})}</div>
        <div class="hpc-note">${lang==="de"?"Pfeile = konfigurierte Richtung. Animation nur bei aktivem zugeordnetem Statussensor.":"Arrows show configured direction. Animation requires a mapped active flow/status sensor."}</div>
        </ha-card>`;
      this._renderRoot().querySelectorAll("[data-node]").forEach(node=>node.addEventListener("click",()=>{
        const c=plan.components.find(c=>c.id===node.dataset.node);
        const entity=c&&(c.sensors.state||c.sensors.flow||c.sensors.top||c.level_sensors?.[0]?.entity);
        if(entity)this.dispatchEvent(new CustomEvent("hass-more-info",{bubbles:true,composed:true,detail:{entityId:entity}}));
      }));
      this._rendered=true;
    }
  }
  class HydraulicPlanCardEditor extends HeatpumpFlowCardEditor {
    _free(){return this._config?.plan_mode==="free"||Array.isArray(this._config?.plan?.components);}
    _unconfigured(){return !this._free()&&(!this._config?.preset||this._config.preset==="none")&&
      !Object.values(this._config?.entities||{}).some(Boolean);}
    setConfig(config){
      this._config=config||{};
      if(this._free()||this._unconfigured())this._renderFlex();
      else {this._freeUi?.remove();this._freeUi=null;super.setConfig(config);this._showFreeButton();}
    }
    set hass(hass){
      this._hass=hass;
      if(this._free()||this._unconfigured())this._renderFlex();
      else {super.hass=hass;this._showFreeButton();}
    }
    _render(){
      if(this._free()||this._unconfigured())this._renderFlex();
      else {this._freeUi?.remove();this._freeUi=null;super._render();this._showFreeButton();}
    }
    _save(config){
      this._config=config;
      this.dispatchEvent(new CustomEvent("config-changed",{detail:{config},bubbles:true,composed:true}));
      this._render();
    }
    _applyPlan(plan){this._save({...this._config,plan_mode:"free",plan:HPC_FREE.normalize(plan)});}
    _showFreeButton(){
      if(!this._config||!this._hass||this._free())return;
      if(this._switch?.isConnected)return;
      this._switch=document.createElement("div");
      this._switch.innerHTML=`<style>${HPC_FREE.css}</style><div class="hpc-editor hpc-actions"><button type="button" class="hpc-primary">Freien Hydraulikplan erstellen</button></div>`;
      this.prepend(this._switch);
      this._switch.querySelector("button").addEventListener("click",()=>this._applyPlan({components:[],connections:[]}));
    }
    _renderFlex(){
      if(!this._config)return;
      if(this._form){this._form.remove();this._form=null;}
      this._switch?.remove();this._switch=null;
      const lang=String(this._hass?.locale?.language||navigator.language||"de").startsWith("de")?"de":"en";
      const t=(de,en)=>lang==="de"?de:en,esc=HPC_FREE.esc;
      const p=HPC_FREE.normalize(this._config.plan);
      const configured=this._free();
      const selected=p.components.find(c=>c.id===this._selectedId)||p.components[0];
      if(selected)this._selectedId=selected.id;
      const sensors=Object.keys(this._hass?.states||{}).filter(id=>/^(sensor|binary_sensor|switch|number|select|input_boolean|input_number)\.[a-zA-Z0-9_]+$/.test(id));
      const dataList=`<datalist id="hpc-free-entities">${sensors.slice(0,8000).map(id=>`<option value="${esc(id)}"></option>`).join("")}</datalist>`;
      const typeOptions=HPC_FREE.types.map(c=>`<option value="${esc(c.type)}">${esc(HPC_FREE.display(c.type,lang))}</option>`).join("");
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
      const allPorts=p.components.flatMap(c=>HPC_FREE.ports(c.type).map(port=>({
        value:c.id+"|"+port.id,name:c.name+" – "+(portNames[port.id]||port.id),
      })));
      const portOptions=allPorts.map(x=>`<option value="${esc(x.value)}">${esc(x.name)}</option>`).join("");
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
      const chosen=selected?`<h3>${t("Bauteil konfigurieren","Configure component")}</h3>
        <div class="hpc-row"><label>${t("Bezeichnung","Name")}<input data-name="${esc(selected.id)}"
          maxlength="75" value="${esc(selected.name)}"/></label>
          <button type="button" data-action="remove-component">${t("Entfernen","Remove")}</button></div>
        <div class="hpc-row"><label>X<input type="number" min="0" max="7000" data-pos="x" value="${selected.x}"/></label>
          <label>Y<input type="number" min="0" max="7000" data-pos="y" value="${selected.y}"/></label></div>
        ${HPC_FREE.byType[selected.type].fields.map(key=>sensorField(selected.id,key,selected.sensors[key])).join("")}
        ${isTank?`<h3>${t("Zusätzliche Temperaturfühler","Additional temperature sensors")}</h3>
          <p>${t("Ordne jeden Fühler seiner tatsächlichen Einbauhöhe zu. 0 % = oben, 100 % = unten.","Set each sensor to its real installation height. 0% = top, 100% = bottom.")}</p>
          ${extraRows}<button type="button" data-action="add-level">${t("Weiteren Fühler hinzufügen","Add temperature sensor")}</button>`:""}`:"";
      const connectionRows=p.connections.map(edge=>`<div class="hpc-row">
        <span style="flex:1 1 250px;font-size:.85em">${esc(edge.from+":"+edge.from_port+" → "+edge.to+":"+edge.to_port)}</span>
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
            <button type="button" data-action="example">${t("Beispiel: Elternanlage","Example: parents' system")}</button>
            <button type="button" data-action="classic">${t("Klassische Wärmepumpenansicht","Classic heat-pump view")}</button></div>`:`
          <div class="hpc-row"><label>${t("Name der Anlage","System name")}<input id="hpc-free-title"
            value="${esc(this._config.title||"")}" placeholder="Hydraulic Plan Card"/></label></div>
          <div class="hpc-actions"><button type="button" data-action="example">${t("Beispielanlage laden","Load example")}</button>
            <button type="button" data-action="classic">${t("Zur klassischen Wärmepumpenansicht","Switch to classic heat-pump view")}</button></div>
          <h3>${t("Bauteil hinzufügen","Add component")}</h3>
          <div class="hpc-row"><label>${t("Art","Type")}<select id="hpc-free-type">${typeOptions}</select></label>
            <button type="button" class="hpc-primary" data-action="add-component">${t("Hinzufügen","Add")}</button></div>
          <div class="hpc-component-list">${p.components.map(c=>`<button type="button" data-select="${esc(c.id)}"
            aria-pressed="${selected?.id===c.id}">${esc(c.name)}</button>`).join("")}</div>
          <h3>${t("Hydraulikplan","Hydraulic plan")}</h3>
          <p>${t("Bauteile im Plan anklicken und verschieben. Verbindungspfeile sind keine automatisch erkannten Fließrichtungen.","Select and drag components. Arrow directions are configured, not automatically measured.")}</p>
          <div class="hpc-board">${HPC_FREE.draw(p,this._hass,{lang,selected:selected?.id})}</div>
          ${chosen}
          <h3>${t("Rohrverbindungen","Pipe connections")}</h3>
          <div class="hpc-row"><label>${t("Von Anschluss","From port")}<select id="hpc-from">
            <option value="">–</option>${portOptions}</select></label>
            <label>${t("Zu Anschluss","To port")}<select id="hpc-to"><option value="">–</option>${portOptions}</select></label>
            <button type="button" data-action="connect" class="hpc-primary">${t("Verbinden","Connect")}</button></div>
          ${connectionRows}
          <p>${t("Mischerstellungen und Pumpenzustände ersetzen keine hydraulische Durchflussmessung. Vor einem produktiven Einsatz Leitungswege prüfen.","Mixer and pump states do not prove hydraulic flow. Verify connections before relying on the visualization.")}</p>`}
        ${dataList}
      </div>`;
      if(!this._freeUi){this._freeUi=document.createElement("div");this.append(this._freeUi);}
      this._freeUi.innerHTML=html;
      const root=this._freeUi;
      const changePlan=(fn)=>{const next=HPC_FREE.normalize(p);fn(next);this._applyPlan(next);};
      root.querySelectorAll("[data-action]").forEach(button=>button.addEventListener("click",()=>{
        const action=button.dataset.action;
        if(action==="start")return this._applyPlan({components:[],connections:[]});
        if(action==="example")return this._applyPlan(HPC_FREE.sample());
        if(action==="classic"){
          const c={...this._config};delete c.plan;delete c.plan_mode;
          this._selectedId=null;this._save(c);return;
        }
        if(action==="add-component"){
          const node=HPC_FREE.newNode(root.querySelector("#hpc-free-type")?.value,p);
          if(!node)return;this._selectedId=node.id;
          return this._applyPlan({components:[...p.components,node],connections:p.connections});
        }
        if(action==="remove-component"&&selected){
          this._selectedId=null;
          return this._applyPlan({components:p.components.filter(c=>c.id!==selected.id),
            connections:p.connections.filter(c=>c.from!==selected.id&&c.to!==selected.id)});
        }
        if(action==="connect"){
          const [from,from_port]=(root.querySelector("#hpc-from")?.value||"").split("|");
          const [to,to_port]=(root.querySelector("#hpc-to")?.value||"").split("|");
          if(!from||!to||from===to&&from_port===to_port)return;
          const id=(()=>{let i=1;const seen=new Set(p.connections.map(x=>x.id));while(seen.has("leitung_"+i))i++;return "leitung_"+i;})();
          return this._applyPlan({components:p.components,connections:[...p.connections,{id,from,from_port,to,to_port}]});
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
            // Empty entities are not kept by normalize; see transient input UI below.
            this._pendingLevel={id:c.id,position:pos};
          });
        }
        if(action==="remove-level"&&selected){
          return changePlan(plan=>{
            const c=plan.components.find(x=>x.id===selected.id);
            c.level_sensors=(c.level_sensors||[]).filter((_,i)=>i!==Number(button.dataset.index));
          });
        }
      }));
      root.querySelectorAll("[data-select]").forEach(b=>b.addEventListener("click",()=>{this._selectedId=b.dataset.select;this._renderFlex();}));
      const fieldUpdate=(selector,fn)=>root.querySelectorAll(selector).forEach(el=>el.addEventListener("change",()=>changePlan(plan=>fn(plan,el))));
      fieldUpdate("[data-name]",(plan,el)=>{const c=plan.components.find(x=>x.id===el.dataset.name);if(c)c.name=el.value.slice(0,75);});
      fieldUpdate("[data-pos]",(plan,el)=>{const c=plan.components.find(x=>x.id===selected?.id);if(c)c[el.dataset.pos]=Number(el.value);});
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
      root.querySelectorAll("g[data-node]").forEach(g=>{
        g.style.cursor="grab";
        let start=null;
        g.addEventListener("pointerdown",ev=>{
          if(ev.button!==0)return;
          start={x:ev.clientX,y:ev.clientY,ox:p.components.find(c=>c.id===g.dataset.node)?.x,oy:p.components.find(c=>c.id===g.dataset.node)?.y};
          g.setPointerCapture(ev.pointerId);
        });
        g.addEventListener("pointermove",ev=>{
          if(!start)return;
          const svg=g.ownerSVGElement;
          const scale=svg.viewBox.baseVal.width/svg.getBoundingClientRect().width;
          g.setAttribute("transform",`translate(${(ev.clientX-start.x)*scale},${(ev.clientY-start.y)*scale})`);
        });
        g.addEventListener("pointerup",ev=>{
          if(!start)return;
          const dx=ev.clientX-start.x,dy=ev.clientY-start.y,svg=g.ownerSVGElement;
          const scale=svg.viewBox.baseVal.width/svg.getBoundingClientRect().width;
          const id=g.dataset.node;const original=start;start=null;
          this._selectedId=id;
          if(Math.abs(dx)+Math.abs(dy)<4){this._renderFlex();return;}
          changePlan(plan=>{
            const c=plan.components.find(c=>c.id===id);
            if(c){c.x=Math.round(Math.max(0,original.ox+dx*scale));c.y=Math.round(Math.max(0,original.oy+dy*scale));}
          });
        });
      });
    }
  }
  return { HydraulicPlanCard, HydraulicPlanCardEditor };
})();
