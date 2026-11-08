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
    // Render the heater mixing valve with the ORIGINAL card's own
    // _circuitSvg/_mixerSvg, including its correct integrated bypass.
    // Physical mixers must be visible even without a position sensor.
    _hasMixer(n) {
      const circuit=this._integratedPlan?.components
        .filter(c=>c.type==='heating_circuit')[n-1];
      if(circuit)return circuit.options?.mixed===true ||
        (circuit.options?.mixed!==false&&super._hasMixer(n));
      return super._hasMixer(n);
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
    _polishBufferPipes(svg,plan,bufferId) {
      if(!bufferId)return;
      const count=Math.min(6,plan.components.filter(c=>c.type==='heating_circuit').length);
      // All heating-circuit returns belong to the ONE original collector at
      // x=676. The first circuit already connects it to the buffer at y=495;
      // every further circuit uses one segment of the same return riser.
      // Avoid extra custom blue return paths and any red bridge around it.
      for(let n=2;n<=count;n++){
        const y=360+(n-2)*250;
        const cross=y+135;
        const bottom=y+250;
        // The rising supply crosses an existing horizontal return. Leave a
        // small drafting gap in the SUPPLY at that crossing. The return stays
        // completely straight/continuous, so it cannot look like another
        // parallel branch or an additional hydraulic connection.
        const d='M660 '+y+' V'+(cross-8)
          +' M660 '+(cross+8)+' V'+bottom;
        const pipe=svg.querySelector('#p-hc-up'+n);
        const flow=svg.querySelector('#f-hc-up'+n);
        if(pipe)pipe.setAttribute('d',d);
        if(flow)flow.setAttribute('d',d);
        svg.querySelector('#hpi-riser-bridge-'+n)?.remove();
      }
      // Remove the prominent port circles added in an earlier iteration:
      // they covered the real pipe junctions and made one return look like
      // two independently connected return lines.
      svg.querySelector('#hpi-buffer-couplings')?.remove();
      const tank=svg.querySelector('rect.tank[x="520"][y="320"]');
      if(tank){
        tank.setAttribute('rx','23');
        tank.setAttribute('stroke','var(--divider-color,#737b82)');
        tank.setAttribute('stroke-width','1.25');
      }
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
      // Preserve the original hydraulic anchors and labels. Oil and ETA use
      // their own recognizable boiler artwork in exactly the same SVG.
      const originalBoilerArt=svg.querySelector('#primary-boiler-art');
      const primaryType=p.components.find(HPC_INTEGRATED.isSource)?.type;
      if(originalBoilerArt)originalBoilerArt.style.display=
        ['wood_chip_boiler','oil_boiler','gas_boiler'].includes(primaryType)?'none':'';
      // A storage-only plan is valid. Without a selected heat source the
      // original engine would otherwise paint a fictitious heat pump/boiler.
      if(!p.components.some(c=>HPC_INTEGRATED.isSource?.(c)||
        ["wood_gasifier","oil_boiler","pellet_boiler","wood_chip_boiler","gas_boiler","heat_pump"].includes(c.type))){
        const source=svg.querySelector("#hp-box")?.closest("g.tap");
        if(source)source.style.display="none";
      }
      // Reuse the ORIGINAL card's complete heating-circuit artwork and
      // prewired common supply/return trunks. In particular its mixer bypass
      // is integrated into the actual radiators and is not a separate overlay.
      // Only upstream generator/storage routes are replaced by custom pipes.
      for(const legacy of svg.querySelectorAll('path[id^="p-"],path[id^="f-"]')){
        if(legacy.closest('#hpi-root'))continue;
        const id=legacy.id;
        legacy.style.display=/^[pf]-hc(?:-?vl|-?rl|-?body|-?trunk|-?up|-?down|-?mix)/.test(id)
          ?'':'none';
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
      this._polishBufferPipes(svg,p,firstBuffer);
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
          +'.hpi-component .small{font-size:13px}'
          +'.hpi-component .heater{fill:none;stroke:var(--hfc-heat,#c8783d);stroke-width:5;stroke-linecap:round}'
          +'.hpi-component .rib{fill:none;stroke:var(--hfc-muted,#94a3b8);stroke-width:8;stroke-linecap:round}'
          +'.hpi-oil-casing{fill:var(--secondary-background-color,#3c5364);stroke:var(--divider-color,#667987);stroke-width:1.7;}'
          +'.hpi-oil-side{fill:var(--secondary-background-color,#314251);stroke:var(--divider-color,#718394);stroke-width:1.5;stroke-linejoin:round;}'
          +'.hpi-oil-top{fill:var(--hfc-muted,#8193a3);stroke:var(--divider-color,#728492);stroke-width:1.2;stroke-linejoin:round;}'
          +'.hpi-oil-plinth{fill:var(--secondary-text-color,#52616e);}'
          +'.hpi-oil-door{fill:var(--card-background-color,#26333d);stroke:var(--hfc-muted,#81909a);stroke-width:1.9;}'
          +'.hpi-oil-hinge,.hpi-oil-bolt{fill:var(--hfc-muted,#a8b3ba);}'
          +'.hpi-oil-flange{fill:var(--secondary-background-color,#65717a);stroke:var(--hfc-muted,#a4afb7);stroke-width:1.8;}'
          +'.hpi-oil-flange-inner{fill:var(--card-background-color,#2c3640);stroke:var(--divider-color,#909ca6);stroke-width:1.5;}'
          +'.hpi-oil-mark{fill:var(--hfc-cold,#81b9d9);stroke:none;}'
          +'.hpi-source-case{fill:var(--secondary-background-color,#29303a);stroke:var(--divider-color,#66717b);stroke-width:2.5;}'
          +'.hpi-source-door{fill:var(--card-background-color,#202124);stroke:var(--divider-color,#66717b);stroke-width:1.7;}'
          +'.hpi-source-seam{fill:none;stroke:var(--hfc-muted,#77838b);stroke-width:2;stroke-linecap:round;}'
          +'.hpi-source-handle{fill:var(--hfc-muted,#89939b);stroke:none;}'
          +'.hpi-source-panel{fill:var(--card-background-color,#202124);stroke:var(--divider-color,#66717b);stroke-width:1.7;}'
          +'.hpi-source-display{fill:#405765;stroke:#8197a0;stroke-width:1;}'
          +'.hpi-source-led{fill:var(--disabled-text-color,#737373);}'
          +'.hpi-source-led.on{fill:var(--hfc-good,#29a85e);}'
          +'.hpi-source-flame{fill:var(--disabled-text-color,#7b7b7b);transition:fill .25s;}'
          +'.hpi-source-flame.on{fill:var(--hfc-hot,#ff7043);filter:url(#glow);}'
          +'.hpi-source-hopper{fill:var(--secondary-background-color,#3b434d);stroke:var(--divider-color,#66717b);stroke-width:2;}'
          +'.hpi-source-pellet{fill:var(--hfc-heat,#b87952);stroke:none;}'
          +'.hpi-source-fan-ring{fill:none;stroke:var(--hfc-muted,#77838b);stroke-width:3;}'
          +'.hpi-source-fan-hub{fill:var(--hfc-muted,#77838b);stroke:none;}'
          +'.hpi-source-blades{fill:none;stroke:var(--hfc-muted,#77838b);stroke-width:4;stroke-linecap:round;}'
          +'.hpi-chip-body{fill:var(--secondary-background-color,#343943);stroke:var(--divider-color,#67717d);stroke-width:2.2;}'
          +'.hpi-chip-face{fill:#e9ad21;stroke:#ae8014;stroke-width:1.6;}'
          +'.hpi-chip-plinth{fill:var(--card-background-color,#1f242d);stroke:var(--divider-color,#66717b);stroke-width:1;}'
          +'.hpi-chip-feed{fill:var(--secondary-background-color,#515b66);stroke:var(--hfc-muted,#81909c);stroke-width:2;stroke-linejoin:round;}'
          +'.hpi-chip-screw{fill:none;stroke:var(--hfc-muted,#84939c);stroke-width:2.6;stroke-linecap:round;}'
          +'.hpi-chip-motor{fill:var(--card-background-color,#202124);stroke:var(--divider-color,#7a8793);stroke-width:2;}'
          +'.hpi-chip-screen{fill:#344e58;stroke:var(--hfc-muted,#95a0a8);stroke-width:1.3;}'
          +'.hpi-chip-divider{stroke:#9b7419;stroke-width:1.2;fill:none;}'
          +'.hpi-chip-brand{font-size:19px;font-weight:800;letter-spacing:1px;fill:#222933;}'
          +'.hpi-chip-model{font-size:14px;font-weight:700;fill:#26313b;}'
          +'.hpi-chip-model.is-compact{font-size:11px;}'
          +'.hpi-chip-light{fill:#6b7480;}'
          +'.hpi-chip-art.on .hpi-chip-light{fill:var(--hfc-good,#25b45e);}'
          +'.hpi-chip-side{fill:#949a9e;stroke:#626b74;stroke-width:1.4;}'
          +'.hpi-chip-window{fill:#2b3138;stroke:#5c656d;stroke-width:1.4;}'
          +'.hpi-chip-window-rim{fill:#404750;stroke:#7e8891;stroke-width:1.1;}'
          +'.hpi-chip-motor-ring{fill:none;stroke:#9a9fa5;stroke-width:2;}'
          +'.hpi-chip-motor-grille{fill:none;stroke:#b5babf;stroke-width:1.7;}'
          +'.hpi-chip-auger{fill:#3b4047;stroke:#929aa3;stroke-width:2;}'
          +'.hpi-particle-duct{fill:#4b4e53;stroke:#a9aeb5;stroke-width:2.5;}'
          +'.hpi-particle-chamber{fill:#2b2c30;stroke:#bfc3c8;stroke-width:3;}'
          +'.hpi-particle-inner{fill:none;stroke:#5d636a;stroke-width:2;}'
          +'.hpi-particle-electrodes{stroke:#ced2d7;stroke-width:3;stroke-linecap:round;}'
          +'.hpi-particle-ash{fill:#656565;stroke:#858585;stroke-width:1;}'
          +'.hpi-particle-arrow{fill:none;stroke:#d7d9dd;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;}'
          +'.hpi-particle-badge{fill:#232529;stroke:#bfc1c5;stroke-width:4;}'
          +'.hpi-particle-bolt{fill:#efb729;stroke:#e6bd42;stroke-width:1;}'
          +'.hpi-particle-art.on .hpi-particle-bolt{fill:#ffda2c;filter:url(#glow);}'
          +'.hpi-particle-reading{font-size:15px;font-weight:600;}'
          +'.hpi-silo-feed{fill:none;stroke:var(--hfc-muted,#9ca4ac);stroke-width:5;stroke-linecap:round;}'
          +'.hpi-silo-body,.hpi-silo-roof,.hpi-silo-hopper{fill:var(--secondary-background-color,#525963);stroke:var(--divider-color,#9da5ad);stroke-width:2;}'
          +'.hpi-silo-grain{fill:none;stroke:var(--hfc-heat,#ba995f);stroke-width:2;}'
          +'.hpi-silo-label,.hpi-silo-value,.hpi-flue-reading,.hpi-flue-status,.hpi-flue-values,.hpi-pipe-reading{fill:var(--primary-text-color,#eee);font-family:var(--ha-font-family-body,system-ui,sans-serif);paint-order:stroke;stroke:var(--card-background-color,#222);stroke-width:3;}'
          +'.hpi-silo-label,.hpi-flue-reading,.hpi-pipe-reading{font-size:13px;font-weight:600;}'
          +'.hpi-silo-value,.hpi-flue-status,.hpi-flue-values{font-size:11px;}'
          +'.hpi-flue-duct{fill:none;stroke:var(--divider-color,#858b93);stroke-width:10;stroke-linecap:round;stroke-linejoin:round;}'
          +'.hpi-buffer-port{fill:var(--card-background-color,#222);stroke-width:3;pointer-events:none;}'
          +'.hpi-buffer-hot{stroke:var(--hfc-hot,#f37b4e);}'
          +'.hpi-buffer-cold{stroke:var(--hfc-cold,#448cdd);}'
          +'.hpi-riser-bridge{pointer-events:none;}'

          +'.hpi-oil-seam{fill:none;stroke:var(--divider-color,#596c7c);stroke-width:1.25;stroke-linecap:round;}'
          +'.hpi-oil-burner{fill:var(--secondary-background-color,#4d5966);stroke:var(--hfc-muted,#8795a0);stroke-width:1.7;}'
          +'.hpi-oil-burner-neck{fill:var(--secondary-background-color,#7b858d);stroke:var(--divider-color,#a6b0b9);stroke-width:1.3;}'
          +'.hpi-oil-motor{fill:var(--secondary-text-color,#718293);stroke:var(--divider-color,#a2adb7);stroke-width:1;}'
          +'.hpi-oil-fan{fill:var(--card-background-color,#303943);stroke:var(--hfc-muted,#aab6c0);stroke-width:1.7;}'
          +'.hpi-oil-fan-hub{fill:var(--hfc-muted,#9cabb5);}'
          +'.hpi-oil-fan-blades{fill:none;stroke:var(--hfc-muted,#9daab4);stroke-width:2;stroke-linecap:round;}'
          +'.hpi-oil-hose{fill:none;stroke:var(--secondary-text-color,#b9a885);stroke-width:2.1;stroke-linecap:round;}'
          +'.hpi-oil-control{fill:var(--secondary-background-color,#35434e);stroke:var(--divider-color,#8a99a7);stroke-width:1;}'
          +'.hpi-oil-display{fill:#284e62;stroke:#87a9b9;stroke-width:.9;}'
          +'.hpi-oil-display-line{fill:none;stroke:#8abed3;stroke-width:1.1;stroke-linecap:round;}'
          +'.hpi-oil-led{fill:var(--disabled-text-color,#6c7680);transition:fill .2s;}'
          +'.hpi-oil-art.on .hpi-oil-led{fill:var(--hfc-good,#36bd77);filter:url(#glow);}'
          +'.hpi-oil-status{fill:var(--secondary-text-color,#919ba6);}'
          +'.hpi-oil.on .hpi-oil-status{fill:var(--hfc-good,#36bd77);}'
          +'.hpi-oil-kind{font-size:11px;font-weight:600;fill:var(--secondary-text-color,#919ba6);}'
          +'.hpi-oil-reading{fill:var(--hfc-muted,var(--secondary-text-color));}'
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
      if(this._nativeSensorForm?.isConnected)this._nativeSensorForm.hass=hass;
      // Live HA data changes frequently. Never replace the whole configuration form;
      // this would interrupt typing, select popovers and drag operations.
      if(this._free()||this._unconfigured()){
        const candidateSignature=JSON.stringify({ems:HPC_EMS.detect(hass).map(x=>[x.id,x.type,x.count,Object.values(x.entities)]),eta:HPC_ETA.detect(hass).map(x=>[x.id,x.model,x.count,Object.values(x.entities)])});
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
    _save(config,{repaint=true}={}){
      this._config=config;
      this.dispatchEvent(new CustomEvent("config-changed",{detail:{config},bubbles:true,composed:true}));
      // A changed sensor value must not destroy the expanded native ha-form.
      // Repaint only for changes that affect which controls exist.
      if(repaint)this._render();
    }
    _applyPlan(plan,extra={},options={}){
      this._save({...this._config,...extra,plan:HPC_FREE.normalize(plan)},options);
    }
    _legacyPlan(){
      // Classic setups often already contain buffers, DHW and heat circuits.
      // Import ALL configured roles into editable components before the first
      // new addition so the transition cannot silently lose them.
      const c=this._config||{},entities=c.entities||{};
      const mapped={wood_gasifier:'wood_gasifier',oil:'oil_boiler',
        pellet:'pellet_boiler',wood_chip_boiler:'wood_chip_boiler',gas:'gas_boiler',heat_pump:'heat_pump'};
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
          pump:prefix+'pump',mixer:prefix+'mixer',
          mixer_opening:prefix+'mixer_opening',mixer_closing:prefix+'mixer_closing'};
        if(i<=count||Object.values(roles).some(role=>entities[role])){
          add('heating_circuit','Heizkreis '+i,roles);
          const circuit=result.components.at(-1);
          if(circuit?.type==='heating_circuit'){
            const oldKey=i===1?'hc_type':'hc'+i+'_type';
            circuit.options={emitter:HFC_EMITTERS.includes(c[oldKey])?c[oldKey]:'radiator',
              mixed:!!(circuit.sensors.mixer||circuit.sensors.mixer_opening||circuit.sensors.mixer_closing)};
          }
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
      const etaCandidates=HPC_ETA.detect(this._hass);
      const etaParts=HPC_ETA_SYSTEM.detect(this._hass);
      const chosenEtaPart=etaParts.find(c=>!p.components.some(n=>
        n.discovery?.provider==='eta-system'&&n.discovery.id===c.id ||
        Object.values(n.sensors||{}).some(id=>Object.values(c.entities).includes(id))));
      // An imported or manually configured boiler must not keep appearing as
      // "new". A second, genuinely different device is offered next.
      const chosenEms=emsCandidates.find(c=>!HPC_DISCOVERY.matchedNode(p,c,'ems-esp',emsCandidates));
      const chosenEta=etaCandidates.find(c=>!HPC_DISCOVERY.matchedNode(p,c,'eta',etaCandidates));
      const emsTypeLabel=(type)=>type==="oil_boiler"?t("Ölkessel","Oil boiler"):
        type==="gas_boiler"?t("Gaskessel","Gas boiler"):t("Kessel (Brennstoff prüfen)","Boiler (verify fuel)");
      const emsInfo=chosenEms?`<section class="hpc-ems">
        <h3>${t("Heizung über EMS-ESP erkannt","Heating device detected via EMS-ESP")}</h3>
        <p class="hpc-row">${HPC_FREE.icon(chosenEms.type==="unknown"?"manifold":chosenEms.type)}<strong>${esc(chosenEms.name)}</strong> · ${esc(chosenEms.source)}</p>
        <label class="hpc-field">${t("Kesseltyp prüfen","Verify boiler type")}
          <select id="hpc-ems-type">
            <option value="" ${chosenEms.type==="unknown"?"selected":""}>${t("Bitte Kesseltyp wählen","Select boiler type")}</option>
            ${[["oil_boiler",t("Ölkessel","Oil boiler")],["gas_boiler",t("Gaskessel","Gas boiler")],
              ["pellet_boiler",t("Pelletkessel","Pellet boiler")],["wood_gasifier",t("Holzvergaser","Wood gasifier")]]
              .map(([id,name])=>`<option value="${id}" ${chosenEms.type===id?"selected":""}>${name}</option>`).join("")}
          </select></label>
        <p>${chosenEms.count} ${t("zuordenbare Messwerte gefunden. Die Erkennung liest nur Home-Assistant-Entitäten und verändert deine Heizung nicht.","assignable values found. Detection only reads Home Assistant entities and never changes heating controls.")}</p>
        ${chosenEms.count===0?`<p>${t("Das Gerät ist erkannt, stellt aber noch keine passenden Messwerte bereit. Bitte die EMS-ESP-Veröffentlichung prüfen.","Device recognized, but no matching measured values are available yet. Check EMS-ESP publishing settings.")}</p>`:""}
        ${chosenEms.type==="unknown"?`<p>${t("Der Brennstoff lässt sich aus den verfügbaren Geräten nicht sicher erkennen. Bitte den richtigen Kesseltyp auswählen.","Fuel type cannot be reliably inferred. Select the proper boiler type first.")}</p>`:""}
        <button type="button" data-action="ems-apply" ${chosenEms.type==="unknown"?"disabled":""}>${chosenEms.count?t("Kessel übernehmen und Messwerte zuordnen","Add boiler and assign values"):t("Erkannten Kessel hinzufügen","Add detected boiler")}</button>
      </section>`:"";
      const etaLabel=chosenEta?({ehack:'ETA eHACK',hack:'ETA HACK',hack_vr:'ETA HACK VR'}[chosenEta.model]||'ETA Hackschnitzelkessel'):'';
      const etaInfo=chosenEta?`<section class="hpc-ems">
        <h3>${t("ETA Hackschnitzelkessel automatisch erkannt","ETA wood-chip boiler detected")}</h3>
        <p><strong>${esc(chosenEta.name)}</strong> · ${esc(etaLabel)} · ${esc(chosenEta.source)}</p>
        <p>${chosenEta.count} ${t("Messwerte aus Home Assistant erkannt. Du kannst die Zuordnung vor dem Speichern prüfen. Es werden keine Kesselbefehle gesendet.","Home Assistant values detected. Review assignments after adding. No boiler commands are sent.")}</p>
        <button type="button" data-action="eta-apply">${t("ETA-Kessel und Sensoren übernehmen","Add ETA boiler and sensors")}</button>
      </section>`:'';
      const etaPartInfo=chosenEtaPart?`<section class="hpc-ems">
        <h3>${t("ETA-Anlagenbauteil erkannt","ETA system component detected")}</h3>
        <p><strong>${esc(chosenEtaPart.name)}</strong> · ${chosenEtaPart.count} ${t("Messwerte","values")}</p>
        <p>${t("Nur eindeutig benannte Bauteile werden übernommen. Hydraulische Leitungen werden nicht geraten. Bestehende Einstellungen bleiben erhalten.","Only clearly named components are imported. Hydraulic connections are not guessed. Existing settings are preserved.")}</p>
        <button type="button" data-action="eta-part-apply">${t("Bauteil und Messwerte übernehmen","Add component and values")}</button>
      </section>`:'';
      const selected=p.components.find(c=>c.id===this._selectedId)||p.components[0];
      if(selected)this._selectedId=selected.id;
      // Native Home Assistant ha-form matches the original card's entity setup.
      const useNativeForm=!!globalThis.customElements?.get('ha-form');
      const useNativePicker=!!globalThis.customElements?.get('ha-entity-picker');
      const hcMixed=selected?.type==='heating_circuit'
        ?(typeof selected.options?.mixed==='boolean'?selected.options.mixed:
          !!(selected.sensors.mixer||selected.sensors.mixer_opening||selected.sensors.mixer_closing))
        :false;
      // Mixer measurement is always available on a mixed heating circuit.
      // Only a wood-gasifier return-lift mixer belongs behind a separate toggle.
      const activeFields=selected?HPC_FREE.byType[selected.type].fields.filter(key=>
        (!['particle_state','particle_voltage','particle_current'].includes(key)||
         selected.options?.particle_separator===true)&&
        (!['mixer','mixer_opening','mixer_closing'].includes(key)||
        selected.type==='heating_circuit'&&hcMixed||
        key==='mixer'&&selected.type==='wood_gasifier'&&selected.options?.return_lift)):[];
      const mainFields={wood_gasifier:['state','flow','return','pump'],oil_boiler:['state','flow','return','pump'],
        pellet_boiler:['state','flow','return','pump'],gas_boiler:['state','flow','return','pump'],
        heat_pump:['state','flow','return','power'],buffer:['top','middle','bottom'],
        dhw_tank:['top','middle','bottom'],heating_circuit:['flow','return','pump','mixer'],
        pump:['state','volume'],mixer:['position','state'],diverter:['position','state'],
        electric_heater:['state','power'],wood_chip_boiler:['state','flow','return','pump','particle_state'],
        particle_separator:['state','voltage','current'],manifold:[]};
      const coreFields=activeFields.filter(key=>(mainFields[selected.type]||[]).includes(key));
      const moreFields=activeFields.filter(key=>!coreFields.includes(key));
      const sensors=Object.keys(this._hass?.states||{}).filter(id=>/^(sensor|binary_sensor|switch|number|select|input_boolean|input_number)\.[a-zA-Z0-9_]+$/.test(id));
      const dataList=`<datalist id="hpc-free-entities">${sensors.slice(0,8000).map(id=>`<option value="${esc(id)}"></option>`).join("")}</datalist>`;
      const categories=[
        ["source",t("Wärmeerzeuger und Kessel","Heat sources and boilers")],
        ["storage",t("Speicher","Storage")],
        ["load",t("Heizkreise","Heating circuits")],
        ["control",t("Pumpen, Mischer und Verteiler","Pumps, valves and manifolds")]
      ];
      const typeOptions=categories.map(([group,label])=>`<optgroup label="${esc(label)}">${HPC_FREE.types
        .filter(c=>c.group===group&&c.type!=='particle_separator')
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
      // Keep the complete original outdoor-unit illustration selector.
      // The same familiar manufacturer and cabinet choices are available
      // directly on each heat pump instead of buried in classic YAML fields.
      const unitLabels={
        auto:t('Automatisch','Automatic'),generic:t('Standardgerät','Generic unit'),
        lambda:'Lambda',vaillant:'Vaillant',panasonic:'Panasonic Aquarea',
        viessmann:'Viessmann',bosch:'Bosch / Buderus',saunier:'Saunier Duval',
        samsung:'Samsung',wolf:'Wolf',kronoterm:'Kronoterm',
        alpha_innotec:'alpha innotec',stiebel:'Stiebel Eltron'
      };
      const heatPumpChoices=selected?.type==='heat_pump'
        ?`<h3>${t("Außengerät wie in der Originalkarte","Original outdoor-unit style")}</h3>
          <div class="hpc-row">
            <label class="hpc-field">${t("Darstellung des Außengeräts","Outdoor-unit appearance")}
              <select data-wp-style="${esc(selected.id)}">
                ${HFC_UNIT_STYLES.map(style=>`<option value="${style}" ${(selected.options?.unit_style||'auto')===style?'selected':''}>${esc(unitLabels[style]||style)}</option>`).join('')}
              </select>
            </label>
            <label class="hpc-field">${t("Gerätegröße / Lüfter","Unit size / fans")}
              <select data-wp-size="${esc(selected.id)}">
                <option value="" ${!selected.options?.unit_size?'selected':''}>${t("Automatisch","Automatic")}</option>
                ${[['small',t('Klein','Small')],['medium',t('Mittel','Medium')],['large',t('Groß / zwei Lüfter','Large / two fans')]]
                  .map(([value,label])=>`<option value="${value}" ${selected.options?.unit_size===value?'selected':''}>${label}</option>`).join('')}
              </select>
            </label>
          </div>`:'';
      const chosen=selected?`<h3 class="hpc-config-title">${HPC_FREE.icon(selected.type)} ${t("Bauteil konfigurieren","Configure component")}</h3>
        <div class="hpc-row"><label>${t("Bezeichnung","Name")}<input data-name="${esc(selected.id)}"
          maxlength="75" value="${esc(selected.name)}"/></label>
          <button type="button" data-action="remove-component">${t("Entfernen","Remove")}</button></div>
        ${selected.type==="wood_gasifier"?`<label class="hpc-checkbox">
          <input type="checkbox" data-return-lift="${esc(selected.id)}" ${selected.options?.return_lift?"checked":""}/>
          <span>${t("Rücklaufanhebung am Holzvergaser","Return-temperature lift at wood gasifier")}</span>
        </label>
        <p>${t("Die Rücklaufanhebung wird direkt hinter dem Kessel eingezeichnet. Ein zusätzlicher Mischer ist dafür nicht erforderlich. Den Pumpenstatus und die Mischerstellung kannst du unten zuordnen.","The return-temperature lift is drawn behind the boiler. No separate mixer component is needed. You can map its pump state and mixer position below.")}</p>`:""}
        ${selected.type==="gas_boiler"?`<label class="hpc-field">${t("Wärmeerzeuger korrigieren","Correct heat source")}
          <select data-source-type="${esc(selected.id)}">
            <option value="gas_boiler" selected>${t("Gaskessel","Gas boiler")}</option>
            <option value="oil_boiler">${t("Ölkessel (mit Brenner)","Oil boiler (with burner)")}</option>
          </select></label>`:""}
        ${["oil_boiler","gas_boiler","pellet_boiler"].includes(selected.type)?`<label class="hpc-field">${t("Kesselbauart","Boiler construction")}
          <select data-boiler-kind="${esc(selected.id)}">
            ${[["standard",t("Standardkessel","Standard boiler")],["low_temp",t("Niedertemperaturkessel","Low-temperature boiler")],["condensing",t("Brennwertkessel","Condensing boiler")]]
             .map(([id,name])=>`<option value="${id}" ${(selected.options?.boiler_kind||"standard")===id?"selected":""}>${name}</option>`).join("")}
          </select></label>`:""}
        ${selected.type==="heating_circuit"?`<label class="hpc-checkbox">
          <input type="checkbox" data-hc-mixer="${esc(selected.id)}" ${hcMixed?'checked':''}/>
          <span>${t("Heizkreis mit Mischer","Heating circuit with mixing valve")}</span>
        </label>
        ${hcMixed?`<p>${t("Mischerstellung als Entität unter Messwerte zuordnen. Ohne Messwert wird der Mischer nur als Bauteil angezeigt.","Assign the mixer position under measured values. Without a value, only the mixing valve symbol is shown.")}</p>`:''}`:""}
        ${selected.type==="heating_circuit"?`<label class="hpc-field">${t("Heizflächenart","Heat emitter")}
          <select data-heating-emitter="${esc(selected.id)}">
            ${[['underfloor',t('Fußboden- / Flächenheizung','Underfloor heating')],
              ['radiator',t('Plattenheizkörper','Panel radiators')],
              ['column',t('Gliederheizkörper','Column radiators')]]
              .map(([id,label])=>`<option value="${id}" ${(selected.options?.emitter||'radiator')===id?'selected':''}>${label}</option>`).join('')}
          </select></label>`:""}
        ${selected.type==="wood_chip_boiler"?`<label class="hpc-field">${t("ETA Kesselmodell","ETA boiler model")}
          <select data-eta-model="${esc(selected.id)}">
            ${[["ehack","ETA eHACK"],["hack","ETA HACK"],["hack_vr","ETA HACK VR"]]
              .map(([id,name])=>`<option value="${id}" ${(selected.options?.eta_model||"ehack")===id?"selected":""}>${name}</option>`).join("")}
          </select></label>`:""}
        ${selected.type==="dhw_tank"?`<label class="hpc-field">${t("Heizwendel-Anbindung","Heat-exchanger connection")}
          <select data-dhw-style="${esc(selected.id)}">
            <option value="branch" ${selected.options?.connection_style==='branch'?'selected':''}>${t("Abzweig vom gemeinsamen Vorlauf und Rücklauf (wie Heizkreis)","Branch from shared supply and return (like a heating circuit)")}</option>
            <option value="separate" ${selected.options?.connection_style!=='branch'?'selected':''}>${t("Eigener Ladevorlauf und Rücklauf","Separate charging supply and return")}</option>
          </select></label>`:""}
        ${["wood_chip_boiler","pellet_boiler"].includes(selected.type)?`<label class="hpc-checkbox">
          <input type="checkbox" data-fuel-silo="${esc(selected.id)}" ${selected.options?.silo?'checked':''}/>
          <span>${t(selected.type==="pellet_boiler"?"Pelletsilo anzeigen":"Hackschnitzelsilo anzeigen",selected.type==="pellet_boiler"?"Show pellet silo":"Show wood-chip silo")}</span>
        </label>
        <p>${t("Silo wird mit der Brennstoffzuführung direkt am Kessel angezeigt. Füllstand unter Messwerte zuordnen.","The silo is shown with its fuel-feed connection at the boiler. Assign its level under measured values.")}</p>`:""}
        ${selected.type==="wood_chip_boiler"?`<label class="hpc-checkbox">
          <input type="checkbox" data-eta-particle="${esc(selected.id)}" ${selected.options?.particle_separator?'checked':''}/>
          <span>${t("Partikelabscheider am Hackgutautomaten","Particle separator on wood-chip boiler")}</span>
        </label>
        <p>${t("Teil der Abgasführung, ohne eigene Vor- oder Rücklaufleitung. Betriebsstatus, Hochspannung und Strom können unter Messwerte zugeordnet werden. Die Abgastemperatur steht am Abgasrohr.","Part of the flue-gas path, with no hydraulic connections. Assign operating state, voltage and current under measured values. Flue temperature is shown on the exhaust duct.")}</p>`:""}
        ${heatPumpChoices}
        ${useNativeForm?'<div class="hpc-native-form"><ha-form id="hpc-native-sensors"></ha-form></div>':activeFields.map(key=>sensorField(selected.id,key,selected.sensors[key])).join("")}
        ${isTank?`<h3>${t("Zusätzliche Temperaturfühler","Additional temperature sensors")}</h3>
          <p>${t("Ordne jeden Fühler seiner tatsächlichen Einbauhöhe zu. 0 % = oben, 100 % = unten.","Set each sensor to its real installation height. 0% = top, 100% = bottom.")}</p>
          ${extraRows}<button type="button" data-action="add-level">${t("Weiteren Fühler hinzufügen","Add temperature sensor")}</button>`:""}`:"";
      const connectionField=(edge,field,label)=>useNativePicker
        ? `<ha-entity-picker data-edge="${esc(edge.id)}" data-edge-field="${field}" data-label="${esc(label)}"></ha-entity-picker>`
        : `<label>${esc(label)}<input list="hpc-free-entities" data-edge="${esc(edge.id)}" data-edge-field="${field}" value="${esc(edge[field])}"/></label>`;
      // Selecting two components is easier than choosing four separate ports.
      // A heat-source/tank pair creates its hot supply and matching return.
      const dhwTanks=p.components.filter(c=>c.type==='dhw_tank');
      const dhwSources=p.components.filter(c=>c.type==='buffer'||HPC_FREE.byType[c.type]?.group==='source');
      const dhwOptions=dhwTanks.filter(c=>!p.connections.some(e=>
        e.to===c.id&&e.to_port==='coil_in'||e.from===c.id&&e.from_port==='coil_out'));
      const suggestedPairs=HPC_FREE.connectionPairs(p);
      const pairOptions=suggestedPairs.map(c=>
        '<option value="'+esc(c.from+'|'+c.to)+'">'+esc(c.label)+' · '+
        (c.count>1?t('Vorlauf + Rücklauf','Flow + return'):
          t('Fehlende Leitung ergänzen','Add missing pipe'))+'</option>').join('');
      const connectionRows=p.connections.map(edge=>{
        const from=p.components.find(c=>c.id===edge.from);
        const to=p.components.find(c=>c.id===edge.to);
        const supply=['flow','dhw','top_out','mid_out','coil_in','flow_in','top_in'].includes(edge.from_port)||
          ['coil_in','flow_in','top_in'].includes(edge.to_port);
        const direction=supply?t('Vorlauf','Supply'):t('Rücklauf','Return');
        return '<div class="hpc-pipe-row">'
          +'<span>'+esc((from?.name||edge.from)+' → '+(to?.name||edge.to))
          +'<small>'+direction+' · '+esc(portNames[edge.from_port]||edge.from_port)
            +' → '+esc(portNames[edge.to_port]||edge.to_port)+'</small></span>'
          +'<button type="button" data-action="remove-edge" data-edge-id="'+esc(edge.id)+'">'
            +t('Entfernen','Remove')+'</button>'
          +'<details><summary>'+t('Messwerte für diese Leitung (optional)','Values for this pipe (optional)')
            +'</summary><div class="hpc-row">'
            +connectionField(edge,'flow_entity',t('Pumpen-/Flussstatus','Pump or flow state'))
            +connectionField(edge,'temperature_entity',t('Rohrtemperatur','Pipe temperature'))
            +'</div></details></div>';
      }).join("");
      const html=`<style>${HPC_FREE.css}</style><div class="hpc-editor">
        ${!configured?`<h3>${t("Deine Heizungsanlage","Your heating system")}</h3>
          <p>${t("Wähle selbst, welche Wärmeerzeuger, Speicher und Heizkreise du hast und wie sie verbunden sind. Eine Wärmepumpe ist nicht erforderlich.","Choose your own heat generators, tanks, heating circuits and connections. No heat-pump integration required.")}</p>
          <div class="hpc-actions"><button type="button" class="hpc-primary" data-action="start">${t("Leeren Plan anlegen","Start blank plan")}</button>
            <button type="button" data-action="example">${t("Beispiel: Elternanlage","Example: parents' system")}</button></div>`:`
          ${useNativeForm?'<ha-form id="hpc-native-settings"></ha-form>':
             `<div class="hpc-row"><label>${t("Name der Anlage","System name")}<input id="hpc-free-title"
             value="${esc(this._config.title||"")}" placeholder="Hydraulic Plan Card"/></label></div>`}
          <div class="hpc-actions"><button type="button" data-action="example">${t("Beispielanlage laden (ersetzt Plan)","Load example (replaces plan)")}</button></div>
          ${emsInfo}
          ${etaInfo}
          ${etaPartInfo}
          ${chosenEta||chosenEtaPart?`<div class="hpc-actions"><button type="button" class="hpc-primary" data-action="eta-scan-all">${t("ETA-Anlage automatisch erkennen","Detect ETA system automatically")}</button></div>`:""}
          <h3>${t("Bauteil hinzufügen","Add component")}</h3>
          <div class="hpc-row"><div class="hpc-add-preview" id="hpc-free-icon">${HPC_FREE.icon("wood_gasifier")}</div><label>${t("Art","Type")}<select id="hpc-free-type">${typeOptions}</select></label>
            <button type="button" class="hpc-primary" data-action="add-component">${t("Hinzufügen","Add")}</button></div>
          <div class="hpc-component-list">${p.components.map(c=>`<button type="button" data-select="${esc(c.id)}"
            aria-pressed="${selected?.id===c.id}">${HPC_FREE.icon(c.type)}<span>${esc(c.name)}<small>${esc(HPC_FREE.display(c.type,lang))}</small></span></button>`).join("")}</div>
          <h3>${t("Hydraulikschema","Hydraulic schematic")}</h3>
          <p>${t("Die Bauteile werden passend zu ihren Anschlüssen automatisch im ursprünglichen Hydraulikplan angeordnet. Du musst keine Positionen eingeben. Die Live-Vorschau siehst du im Dashboard.","Components are automatically arranged in the original hydraulic schematic. No manual coordinates are required. The dashboard shows the live preview.")}</p>
          ${chosen}
          ${dhwTanks.length&&dhwSources.length?`<section class="hpc-ems">
            <h3>${t("Warmwasserbereitung anschließen","Connect domestic hot-water charging")}</h3>
            <p>${t("Wähle die Wärmequelle und wie der Speicher geladen wird. Vorlauf und Rücklauf werden zusammen angelegt; vorhandene WW-Leitungen werden nicht überschrieben.","Choose the heat source and charging method. Flow and return are created together. Existing DHW pipes are not overwritten.")}</p>
            <div class="hpc-row">
              <label>${t("Wärmequelle","Heat source")}<select id="hpc-dhw-source">
                ${dhwSources.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
              </select></label>
              <label>${t("Warmwasserspeicher","Hot-water tank")}<select id="hpc-dhw-target">
                ${dhwOptions.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
              </select></label>
              <label>${t("Leitungsführung","Pipe routing")}<select id="hpc-dhw-style">
                <option value="branch">${t("Abzweig wie Heizkreis – zur Heizwendel","Branch like heating circuit – into coil")}</option>
                <option value="separate">${t("Eigener Ladekreis","Separate charging circuit")}</option>
              </select></label>
              <label>${t("Ladeart","Charging method")}<select id="hpc-dhw-kind">
                <option value="pump">${t("Über Ladepumpe","Via charging pump")}</option>
                <option value="diverter">${t("Über Umschaltventil","Via diverter valve")}</option>
                <option value="direct">${t("Direkt verbunden","Direct connection")}</option>
              </select></label>
              <button type="button" data-action="dhw-route" class="hpc-primary" ${dhwOptions.length?'':'disabled'}>${t("WW-Kreis anlegen","Create DHW circuit")}</button>
            </div>
            <p>${t("Bei einer Umschaltung muss der tatsächliche Ventilzustand für die Flussanzeige zugeordnet werden. Die Darstellung ersetzt keine hydraulische Prüfung.","For diverting, assign the actual valve state to display flow correctly. This does not replace checking the actual pipework.")}</p>
          </section>`:""}
          <h3>${t("Bauteile verbinden","Connect components")}</h3>
          <div class="hpc-row hpc-quick-connect">
            <label class="hpc-field">${t("Was soll verbunden werden?","What should be connected?")}
              <select id="hpc-pair"><option value="">${t("Verbindung wählen","Choose connection")}</option>${pairOptions}</select>
            </label>
            <button type="button" data-action="connect-pair" class="hpc-primary" ${suggestedPairs.length?"":"disabled"}>${t("Verbinden","Connect")}</button>
          </div>
          <p class="hpc-connection-hint">${t("Vorlauf und Rücklauf werden gemeinsam angeschlossen. Beim Holzvergaser führt der Rücklauf vom Speicher zurück zum Kessel.","Supply and return are connected together. For wood gasifiers the return leads from the tank back to the boiler.")}</p>
          ${bufferList.length>=2?`<div class="hpc-ems">
            <strong>${t("Pufferspeicher verbinden","Connect buffer tanks")}</strong>
            <p>${t("Reihenschaltung: Vorlauf jeweils oben zum nächsten Puffer, Rücklauf unten zurück zum vorherigen. Bereits vorhandene Verbindungen bleiben erhalten; prüfe die tatsächliche Verrohrung.","Series layout: hot flow at the top to the next buffer, cooler return at the bottom to the previous. Existing connections are retained; check your actual pipework.")}</p>
            <button type="button" data-action="buffer-series">${t("Puffer in Reihe verbinden","Connect buffers in series")}</button>
          </div>`:""}
          ${misplacedBufferEdges.length?`<p class="hpc-connection-warning">${t("Achtung: Eine Pufferleitung ist von unten nach oben verbunden. Bitte prüfen, ob das der tatsächlichen Verrohrung entspricht.","Warning: a buffer pipe links bottom to top. Verify this corresponds to the actual installation.")}</p>`:""}
          <details class="hpc-advanced-pipes">
            <summary>${t("Spezielle Anschlüsse einzeln verbinden","Connect individual ports (advanced)")}</summary>
            <div class="hpc-row"><label>${t("Ausgang","From port")}<select id="hpc-from">
              <option value="">–</option>${portOptions("from")}</select></label>
              <label>${t("Eingang","To port")}<select id="hpc-to"><option value="">–</option></select></label>
              <button type="button" data-action="connect">${t("Einzelne Leitung hinzufügen","Add individual pipe")}</button>
            </div>
          </details>
          <h3>${t("Vorhandene Leitungen","Configured pipes")}</h3>
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
      // Always edit the latest plan, not the snapshot used to render this form.
      // Multiple sensor selections can otherwise overwrite each other when
      // the form intentionally stays mounted between changes.
      const changePlan=(fn,options={})=>{
        const next=HPC_FREE.normalize(this._config.plan);
        fn(next);
        this._applyPlan(next,{},options);
      };
      const settingsForm=root.querySelector('#hpc-native-settings');
      if(settingsForm){
        const choice=(name,options)=>({name,selector:{select:{mode:'dropdown',
          options:options.map(([value,label])=>({value,label}))}}});
        const settingsFields=[
          {name:'title',selector:{text:{}}},
          choice('layout',[['default',t('Standard','Default')],['compact',t('Kompakt','Compact')],
            ['wide',t('Breit','Wide')],['wall',t('Wanddisplay','Wall display')]]),
          choice('theme',[['auto',t('Automatisch','Automatic')],['night',t('Nacht','Night')],
            ['contrast',t('Kontrast','Contrast')]]),
          choice('animations',[['auto',t('Automatisch','Automatic')],['always',t('Immer','Always')],
            ['off',t('Aus','Off')]]),
          {name:'fullscreen',selector:{boolean:{}}},
          {name:'diagnostic',selector:{boolean:{}}},
          {name:'controls',selector:{entity:{multiple:true,domain:['switch','input_boolean','light',
            'fan','automation','button','input_button','script','scene','climate','number','input_number',
            'select','input_select','water_heater']}}},
        ];
        settingsForm.hass=this._hass;
        settingsForm.schema=[{type:'expandable',name:'appearance',flatten:true,
          title:t('Darstellung und Bedienung','Appearance and controls'),schema:settingsFields}];
        settingsForm.computeLabel=entry=>({
          title:t('Name der Anlage','System name'),layout:t('Layout','Layout'),
          theme:t('Farbschema','Theme'),animations:t('Animationen','Animations'),
          fullscreen:t('Vollbildansicht','Fullscreen'),diagnostic:t('Diagnosebericht','Diagnostic report'),
          controls:t('Schnellbedienung','Quick controls')})[entry.name]||entry.name;
        settingsForm.data={title:this._config.title||'',layout:this._config.layout||'default',
          theme:this._config.theme||'auto',animations:this._config.animations||'auto',
          fullscreen:this._config.fullscreen!==false,diagnostic:this._config.diagnostic!==false,
          controls:this._config.controls||[]};
        settingsForm.addEventListener('value-changed',event=>{
          event.stopPropagation();
          const values=event.detail?.value;
          if(!values)return;
          const changed={};
          for(const key of ['title','layout','theme','animations','fullscreen','diagnostic','controls']){
            if(Object.hasOwn(values,key))changed[key]=values[key];
          }
          // Keep the appearance section and its current focus open, too.
          if(Object.keys(changed).length)this._save({...this._config,...changed},{repaint:false});
        });
      }
      const chosenForm=root.querySelector('#hpc-native-sensors');
      this._nativeSensorForm=chosenForm||null;
      if(chosenForm&&selected){
        const entityField=key=>({name:key,selector:{entity:{}}});
        chosenForm.hass=this._hass;
        chosenForm.schema=[{type:'expandable',name:'sensors',title:t('Sensoren und Messwerte','Sensors and measurements'),
          expanded:true,
          schema:[...coreFields.map(entityField),
            ...(moreFields.length?[{type:'expandable',name:'more',flatten:true,
              title:t('Weitere Felder','More fields'),expanded:moreFields.some(key=>!!selected.sensors[key]),
              schema:moreFields.map(entityField)}]:[])]}];
        chosenForm.computeLabel=entry=>HPC_FREE.fieldLabel(entry.name,lang);
        chosenForm.computeHelper=()=>t('Wähle eine vorhandene Home-Assistant-Entität aus.','Choose an existing Home Assistant entity.');
        chosenForm.data={sensors:{...selected.sensors}};
        chosenForm.addEventListener('value-changed',event=>{
          event.stopPropagation();
          const values=event.detail?.value?.sensors;
          if(!values||typeof values!=='object')return;
          changePlan(next=>{
            const node=next.components.find(c=>c.id===selected.id);
            if(!node)return;
            for(const key of activeFields){
              // ha-form may emit partial values. Missing keys are not a
              // request to clear another already assigned sensor.
              if(!Object.hasOwn(values,key))continue;
              if(values[key])node.sensors[key]=values[key];
              else delete node.sensors[key];
            }
          },{repaint:false});
        });
      }
      const typePicker=root.querySelector('#hpc-free-type');
      typePicker?.addEventListener('change',()=>{
        const box=root.querySelector('#hpc-free-icon');
        if(box)box.innerHTML=HPC_FREE.icon(typePicker.value);
      });
      root.querySelectorAll('ha-entity-picker[data-edge]').forEach(picker=>{
        const edge=p.connections.find(c=>c.id===picker.dataset.edge);
        picker.hass=this._hass;
        picker.label=picker.dataset.label;
        picker.value=edge?.[picker.dataset.edgeField]||'';
        picker.allowCustomEntity=true;
        picker.addEventListener('value-changed',event=>{
          event.stopPropagation();
          changePlan(next=>{
            const row=next.connections.find(c=>c.id===picker.dataset.edge);
            if(row)row[picker.dataset.edgeField]=event.detail?.value||'';
          },{repaint:false});
        });
      });
      // Allow an uncertain boiler model to be selected before importing.
      const emsTypePicker=root.querySelector('#hpc-ems-type');
      emsTypePicker?.addEventListener('change',()=>{
        const apply=root.querySelector('[data-action="ems-apply"]');
        if(apply)apply.disabled=!emsTypePicker.value;
      });
      root.querySelectorAll("[data-action]").forEach(button=>button.addEventListener("click",()=>{
        const action=button.dataset.action;
        if(action==="eta-scan-all"){
          if(!window.confirm(t(
            "Alle eindeutig erkannten ETA-Bauteile und Messwerte ergänzen? Bestehende Einstellungen und Rohrverbindungen bleiben unverändert.",
            "Add all clearly detected ETA components and values? Existing settings and pipes remain unchanged.")))return;
          const copy=HPC_FREE.normalize(p);
          let last=null,added=0;
          for(const c of etaCandidates){
            if(HPC_DISCOVERY.matchedNode(copy,c,'eta',etaCandidates))continue;
            const node=HPC_FREE.newNode('wood_chip_boiler',copy);
            if(!node)continue;
            node.name=c.name.slice(0,75);
            node.options={...node.options,eta_model:c.model,particle_separator:c.particleSeparator===true};
            node.discovery={provider:'eta',id:String(c.id)};
            for(const [key,id] of Object.entries(c.entities))
              if(HPC_FREE.byType[node.type].fields.includes(key))node.sensors[key]=id;
            copy.components.push(node);
            last=node;added++;
          }
          for(const c of etaParts){
            if(copy.components.some(n=>
              n.discovery?.provider==='eta-system'&&n.discovery.id===c.id ||
              Object.values(n.sensors||{}).some(id=>Object.values(c.entities).includes(id))))continue;
            const node=HPC_FREE.newNode(c.type,copy);
            if(!node)continue;
            node.name=c.name.slice(0,75);
            node.discovery={provider:'eta-system',id:c.id};
            for(const [key,id] of Object.entries(c.entities))
              if(HPC_FREE.byType[node.type].fields.includes(key))node.sensors[key]=id;
            if(node.type==='heating_circuit'&&node.sensors.mixer)
              node.options={...node.options,mixed:true};
            copy.components.push(node);
            last=node;added++;
          }
          if(!added)return;
          if(last)this._selectedId=last.id;
          return this._applyPlan(copy,{hpc_legacy_imported:true});
        }
        if(action==="eta-part-apply"&&chosenEtaPart){
          const copy=HPC_FREE.normalize(p);
          const node=HPC_FREE.newNode(chosenEtaPart.type,copy);
          if(!node)return;
          node.name=chosenEtaPart.name;
          node.discovery={provider:'eta-system',id:String(chosenEtaPart.id)};
          for(const [key,id] of Object.entries(chosenEtaPart.entities)){
            if(HPC_FREE.byType[node.type].fields.includes(key))node.sensors[key]=id;
          }
          if(node.type==='heating_circuit'&&node.sensors.mixer)
            node.options={...node.options,mixed:true};
          copy.components.push(node);
          this._selectedId=node.id;
          return this._applyPlan(copy,{hpc_legacy_imported:true});
        }
        if(action==="eta-apply"&&chosenEta){
          // Reuse the exact detected device. Never merge an ETA installation
          // into an unrelated wood-chip boiler or overwrite manual choices.
          const detectedIds=new Set(Object.values(chosenEta.entities));
          const existing=p.components.filter(c=>c.type==='wood_chip_boiler');
          const target=existing.find(c=>Object.values(c.sensors||{}).some(id=>detectedIds.has(id)))||
            existing.find(c=>c.name===chosenEta.name&&c.options?.eta_model===chosenEta.model);
          const copy=HPC_FREE.normalize(p);
          const node=target?copy.components.find(c=>c.id===target.id):
            HPC_FREE.newNode('wood_chip_boiler',copy);
          if(!node)return;
          if(!target){
            node.name=chosenEta.name.slice(0,75);
            copy.components.push(node);
          }
          node.options={...node.options,eta_model:target?.options?.eta_model||chosenEta.model,
            particle_separator:node.options?.particle_separator===true||chosenEta.particleSeparator===true};
          node.discovery={provider:'eta',id:String(chosenEta.id)};
          for(const [key,id] of Object.entries(chosenEta.entities)){
            if(HPC_FREE.byType[node.type].fields.includes(key)&&!node.sensors[key])
              node.sensors[key]=id;
          }
          this._selectedId=node.id;
          return this._applyPlan(copy,{hpc_legacy_imported:true});
        }
        if(action==="ems-apply"&&chosenEms){
          const type=root.querySelector('#hpc-ems-type')?.value;
          if(!['oil_boiler','gas_boiler','pellet_boiler','wood_gasifier'].includes(type))return;
          const detectedIds=new Set(Object.values(chosenEms.entities));
          // Match by persistent device ID first, then by actual sensor IDs.
          // Never pick the first unrelated boiler merely because the fuel
          // happens to be the same.
          const sources=p.components.filter(c=>HPC_FREE.byType[c.type]?.group==="source");
          const match=sources.find(c=>c.discovery?.provider==='ems-esp'&&
            c.discovery.id===String(chosenEms.id))||
            sources.find(c=>Object.values(c.sensors||{}).some(id=>detectedIds.has(id)));
          const copy=HPC_FREE.normalize(p);
          const node=match?copy.components.find(c=>c.id===match.id):HPC_FREE.newNode(type,copy);
          if(!node)return;
          if(!match){
            node.name=chosenEms.name.slice(0,75);
            copy.components.push(node);
          }
          // User-selected fuel type is authoritative; this also repairs old
          // auto-imports labeled as gas despite an existing oil burner.
          if(node.type!==type){
            node.type=type;
            node.sensors=Object.fromEntries(Object.entries(node.sensors||{})
              .filter(([key])=>HPC_FREE.byType[type].fields.includes(key)));
            node.options={boiler_kind:'standard'};
          }
          node.discovery={provider:'ems-esp',id:String(chosenEms.id)};
          for(const [key,id] of Object.entries(chosenEms.entities)){
            if(HPC_FREE.byType[node.type].fields.includes(key)&&!node.sensors[key])
              node.sensors[key]=id;
          }
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
        if(action==="dhw-route"){
          const source=root.querySelector('#hpc-dhw-source')?.value;
          const tank=root.querySelector('#hpc-dhw-target')?.value;
          const kind=root.querySelector('#hpc-dhw-kind')?.value;
          const style=root.querySelector('#hpc-dhw-style')?.value||'branch';
          const next=HPC_FREE.connectDhwCharge(p,source,tank,kind,style);
          if(!next)return;
          return this._applyPlan(next);
        }
        if(action==="connect-pair"){
          const [from,to]=(root.querySelector('#hpc-pair')?.value||'').split('|');
          if(!from||!to)return;
          const next=HPC_FREE.connectPair(this._config.plan,from,to);
          if(next.connections.length===this._config.plan.connections.length)return;
          return this._applyPlan(next);
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
      fieldUpdate('[data-source-type]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.sourceType);
        if(!node||node.type!=='gas_boiler'||el.value!=='oil_boiler')return;
        node.type='oil_boiler';
        if(['Gaskessel','Gas boiler'].includes(node.name))node.name='Ölkessel';
        node.options={boiler_kind:node.options?.boiler_kind||'standard'};
        // Shared flow/return ports and existing sensor assignments survive.
      });
      fieldUpdate('[data-wp-style]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.wpStyle);
        if(node?.type==='heat_pump')node.options={...node.options,unit_style:el.value};
      });
      fieldUpdate('[data-wp-size]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.wpSize);
        if(node?.type!=='heat_pump')return;
        node.options={...node.options};
        if(el.value)node.options.unit_size=el.value;
        else delete node.options.unit_size;
      });
      fieldUpdate("[data-boiler-kind]",(plan,el)=>{
        const c=plan.components.find(x=>x.id===el.dataset.boilerKind);
        if(c)c.options={...c.options,boiler_kind:el.value};
      });
      root.querySelectorAll('[data-hc-mixer]').forEach(el=>el.addEventListener('change',()=>changePlan(plan=>{
        const node=plan.components.find(c=>c.id===el.dataset.hcMixer);
        if(node?.type!=='heating_circuit')return;
        node.options={...node.options,mixed:el.checked};
        // Keep an existing sensor for a future re-enable. The renderer and
        // sensor form both honor mixed:false without deleting it.
      })));
      fieldUpdate('[data-heating-emitter]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.heatingEmitter);
        if(node?.type==='heating_circuit'&&HFC_EMITTERS.includes(el.value))
          node.options={...node.options,emitter:el.value};
      });
      root.querySelectorAll('[data-fuel-silo]').forEach(el=>el.addEventListener('change',()=>changePlan(plan=>{
        const node=plan.components.find(c=>c.id===el.dataset.fuelSilo);
        if(['wood_chip_boiler','pellet_boiler'].includes(node?.type))
          node.options={...node.options,silo:el.checked};
      })));
      root.querySelectorAll('[data-eta-particle]').forEach(el=>el.addEventListener('change',()=>changePlan(plan=>{
        const node=plan.components.find(c=>c.id===el.dataset.etaParticle);
        if(node?.type==='wood_chip_boiler')node.options={...node.options,particle_separator:el.checked};
      })));
      fieldUpdate('[data-dhw-style]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.dhwStyle);
        if(node?.type==='dhw_tank')
          node.options={...node.options,connection_style:el.value==='branch'?'branch':'separate'};
      });
      fieldUpdate('[data-eta-model]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.etaModel);
        if(node?.type==='wood_chip_boiler')node.options={...node.options,eta_model:el.value};
      });
      fieldUpdate("[data-name]",(plan,el)=>{const c=plan.components.find(x=>x.id===el.dataset.name);if(c)c.name=el.value.slice(0,75);});
      fieldUpdate("[data-sensor]",(plan,el)=>{const c=plan.components.find(x=>x.id===el.dataset.sensor);if(c){
        if(el.value)c.sensors[el.dataset.field]=el.value;else delete c.sensors[el.dataset.field];
      }});
      fieldUpdate("input[data-edge]",(plan,el)=>{const c=plan.connections.find(x=>x.id===el.dataset.edge);if(c)c[el.dataset.edgeField]=el.value;});
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
