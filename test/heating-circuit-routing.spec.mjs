import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('one to six automatically connected circuits render complete shared buffer runs', async ({ page }, testInfo) => {
  await page.goto('/test/hydraulic-plan.html', { waitUntil: 'domcontentloaded' });
  const results = await page.evaluate(() => {
    const makePlan = count => {
      const editor = document.createElement('hydraulic-plan-card-editor');
      editor.setConfig({
        type: 'custom:hydraulic-plan-card',
        preset: 'none',
        plan: {
          components: [
            { id: 'boiler', type: 'oil_boiler', name: 'Ölkessel', sensors: {} },
            { id: 'buffer', type: 'buffer', name: 'Pufferspeicher',
              sensors: { top: 'sensor.buffer_top' } },
          ],
          connections: [
            { id: 'boiler_supply', from: 'boiler', from_port: 'flow',
              to: 'buffer', to_port: 'top_in' },
            { id: 'boiler_return', from: 'buffer', from_port: 'bottom_out',
              to: 'boiler', to_port: 'return' },
          ],
        },
      });
      document.body.replaceChildren(editor);
      editor.hass = { states: {}, entities: {}, devices: {}, locale: { language: 'de' } };
      for (let index = 0; index < count; index++) {
        editor.querySelector('#hpc-free-type').value = 'heating_circuit';
        editor.querySelector('[data-action="add-component"]').click();
      }
      const plan = JSON.parse(JSON.stringify(editor._config.plan));
      const circuits = plan.components.filter(node=>node.type==='heating_circuit');
      circuits.forEach((circuit,index)=>{
        circuit.name=index?'Heizkreis '+(index+1):'Heizkreis EG';
        circuit.sensors.pump='switch.hc'+(index+1);
        circuit.options={...circuit.options,mixed:index%2===1};
      });
      const savedPlan = JSON.parse(JSON.stringify(plan));
      const restoredPlan = JSON.parse(JSON.stringify(savedPlan));
      window.__heatingPlanExamples = window.__heatingPlanExamples || {};
      window.__heatingPlanExamples[count] = restoredPlan;
      window.__heatingStateExamples = window.__heatingStateExamples || {};
      window.__heatingStateExamples[count] = Object.fromEntries(
        Array.from({ length: count }, (_, index) => [
          'switch.hc' + (index + 1), {
            entity_id: 'switch.hc' + (index + 1), state: 'on', attributes: {},
          },
        ]));
      const card = document.createElement('hydraulic-plan-card');
      document.body.replaceChildren(card);
      card.setConfig({
        type: 'custom:hydraulic-plan-card',
        preset: 'none',
        hc_count: count,
        power_sources: 'manual',
        animations: 'always',
        plan: restoredPlan,
      });
      const states = window.__heatingStateExamples[count];
      card.hass = {
        states, entities: {}, devices: {}, locale: { language: 'de' },
        language: 'de', config: { version: '2026.10.4' },
        callService: () => Promise.resolve(),
        callWS: () => Promise.reject(new Error('Unavailable in routing test')),
      };
      const svg = card.shadowRoot.getElementById('svg');
      const nativePaths = Array.from({ length: count }, (_, index) => {
        const suffix = index ? String(index + 1) : '';
        return {
          id: 'hc' + (index + 1),
          flow: svg.querySelector('#p-hc-vl' + suffix)?.getAttribute('d') || '',
          return: svg.querySelector('#p-hc-rl' + suffix)?.getAttribute('d') || '',
          activeFlow: svg.querySelector('#f-hc-vl' + suffix)?.getAttribute('d') || '',
          activeReturn: svg.querySelector('#f-hc-rl' + suffix)?.getAttribute('d') || '',
        };
      });
      const edgeById = new Map(plan.connections.map(edge=>[edge.id,edge]));
      const externalPipes = [...svg.querySelectorAll('#hpi-root .hpi-link .pipe')]
        .map(path=>{
          const edgeId=path.parentElement?.getAttribute('data-hpi-edge');
          return {
            edgeId,
            leg: /(?:return|coil_out|bottom_out)$/.test(edgeById.get(edgeId)?.from_port||'')||
              /(?:return|return_in|bottom_in)$/.test(edgeById.get(edgeId)?.to_port||'')
              ?'return':'flow',
            d:path.getAttribute('d')||'',
          };
        });
      const routedPipes = [
        ...nativePaths.flatMap((paths,index)=>[
          {edgeId:paths.id+'_flow',leg:'flow',d:paths.flow,offsetY:index*250},
          {edgeId:paths.id+'_return',leg:'return',d:paths.return,offsetY:index*250},
        ]),
        ...externalPipes.map(pipe=>({...pipe,offsetY:0})),
      ];
      const pipeSegments = routedPipes.flatMap(({edgeId,leg,d,offsetY}) => {
          const tokens = (d.match(/[MHV]|-?\d+(?:\.\d+)?/g) || []);
          const segments = [];
          let x = 0, y = 0;
          for (let index = 0; index < tokens.length;) {
            const command = tokens[index++];
            if (command === 'M') {
              x = Number(tokens[index++]);
              y = Number(tokens[index++]);
              continue;
            }
            const nextX = command === 'H' ? Number(tokens[index++]) : x;
            const nextY = command === 'V' ? Number(tokens[index++]) : y;
            segments.push({ edgeId, leg, x, y, nextX, nextY, offsetY });
            x = nextX;
            y = nextY;
          }
          return segments;
        });
      const incomplete = JSON.parse(JSON.stringify(restoredPlan));
      const incompleteCircuit = circuits.at(-1).id;
      incomplete.connections = incomplete.connections.filter(edge =>
        !(edge.from === incompleteCircuit && edge.from_port === 'return_out'));
      card.setConfig({
        type: 'custom:hydraulic-plan-card',
        preset: 'none',
        hc_count: count,
        power_sources: 'manual',
        animations: 'always',
        plan: incomplete,
      });
      card.hass = {
        states, entities: {}, devices: {}, locale: { language: 'de' },
        language: 'de', config: { version: '2026.10.4' },
        callService: () => Promise.resolve(),
        callWS: () => Promise.reject(new Error('Unavailable in routing test')),
      };
      const incompleteSvg = card.shadowRoot.getElementById('svg');
      const incompleteSuffix = count > 1 ? String(count) : '';
      return {
        count,
        edges: restoredPlan.connections,
        circuits,
        nativePaths,
        externalPipes,
        pipeSegments,
        svgHeight: Number(svg.getAttribute('viewBox').split(/\s+/)[3]),
        incompleteActiveFlow: incompleteSvg.querySelector(
          '#f-hc-vl' + incompleteSuffix)?.getAttribute('d') || '',
        serializedEdges: restoredPlan.connections.length,
      };
    };
    return [1, 2, 3, 6].map(makePlan);
  });

  for (const result of results) {
    expect(result.edges.filter(edge=>edge.to_port==='flow_in')).toHaveLength(result.count);
    expect(result.edges.filter(edge=>edge.from_port==='return_out')).toHaveLength(result.count);
    expect(result.edges.filter(edge=>edge.to_port==='bottom_in')).toHaveLength(result.count);
    expect(result.circuits).toHaveLength(result.count);
    expect(result.serializedEdges).toBe(result.edges.length);
    expect(result.svgHeight).toBeGreaterThanOrEqual(560 + (result.count - 1) * 250);
    for (const paths of result.nativePaths) {
      expect(paths.flow, paths.id + ' supply route missing').not.toBe('');
      expect(paths.return, paths.id + ' return route missing').not.toBe('');
      expect(paths.activeFlow, paths.id + ' complete active supply missing').not.toBe('');
      expect(paths.activeReturn, paths.id + ' complete active return missing').not.toBe('');
      const index=Number(paths.id.slice(2))-1;
      const circuitFlow=result.pipeSegments.filter(segment=>
        segment.edgeId===paths.id+'_flow');
      const circuitReturn=result.pipeSegments.filter(segment=>
        segment.edgeId===paths.id+'_return');
      expect(circuitFlow.some(segment=>segment.y===360&&segment.nextY===360&&
        Math.max(segment.x,segment.nextX)===704),
      paths.id+' supply must terminate at its own pump inlet').toBe(true);
      const emitterRun=circuitFlow.filter(segment=>segment.y===360&&
        segment.nextY===360&&Math.min(segment.x,segment.nextX)>=736);
      const emitterIntervals=emitterRun.map(segment=>[
        Math.min(segment.x,segment.nextX),Math.max(segment.x,segment.nextX),
      ]).sort((a,b)=>a[0]-b[0]);
      expect(emitterIntervals[0]?.[0],paths.id+' pump outlet must start its own emitter run')
        .toBe(736);
      expect(emitterIntervals.at(-1)?.[1],paths.id+' pump outlet must reach its own emitter')
        .toBe(826);
      for(let interval=1;interval<emitterIntervals.length;interval++){
        const gap=emitterIntervals[interval][0]-emitterIntervals[interval-1][1];
        expect(gap===0||(gap===12&&emitterIntervals[interval-1][1]===774&&
          emitterIntervals[interval][0]===786),
        paths.id+' may cross the return riser only with a visible crossover gap').toBe(true);
      }
      expect(circuitFlow.some(segment=>segment.y===360&&segment.nextY===360&&
        Math.min(segment.x,segment.nextX)<736&&Math.max(segment.x,segment.nextX)>704),
      paths.id+' supply must not bridge across the pump').toBe(false);
      expect(circuitReturn.some(segment=>segment.y===455&&segment.x===826),
        paths.id+' return must start at its original radiator port').toBe(true);
      expect(circuitFlow.some(segment=>segment.offsetY===index*250&&
        segment.y+segment.offsetY===360+index*250)).toBe(true);
    }
    expect(result.pipeSegments.some(segment=>segment.leg==='return'&&
      segment.y===495&&Math.min(segment.x,segment.nextX)===640),
    'consumer return must physically terminate at the buffer right-side port').toBe(true);
    if (result.count > 1) {
      expect(result.pipeSegments.filter(segment=>segment.leg==='flow'&&
        segment.y===360&&Math.min(segment.x,segment.nextX)===640&&
        Math.max(segment.x,segment.nextX)===660)).toHaveLength(1);
      expect(result.pipeSegments.filter(segment=>segment.leg==='return'&&
        segment.x===780&&segment.x===segment.nextX)).toHaveLength(result.count-1);
    }
    const displayedSegments=result.pipeSegments.map(segment=>({
      ...segment,y:segment.y+segment.offsetY,nextY:segment.nextY+segment.offsetY,
    }));
    for (const segment of displayedSegments) {
      const insideBuffer = segment.x===segment.nextX
        ? segment.x>520&&segment.x<640&&
          Math.max(segment.y,segment.nextY)>320&&Math.min(segment.y,segment.nextY)<520
        : segment.y>320&&segment.y<520&&
          Math.max(segment.x,segment.nextX)>520&&Math.min(segment.x,segment.nextX)<640;
      expect(insideBuffer, 'a circuit pipe must not cross the buffer body').toBe(false);
    }
    expect(displayedSegments.filter(segment=>segment.leg==='flow'&&
      segment.x===736&&segment.nextX===736&&segment.y!==segment.nextY),
    'pump outlets must not share a vertical connection').toHaveLength(0);
    const physicalSegments = new Set();
    for (const segment of displayedSegments) {
      const key = [Math.min(segment.x,segment.nextX),Math.min(segment.y,segment.nextY),
        Math.max(segment.x,segment.nextX),Math.max(segment.y,segment.nextY)].join(':');
      expect(physicalSegments.has(key), 'shared segment was drawn more than once').toBe(false);
      physicalSegments.add(key);
    }
    expect(result.incompleteActiveFlow,
      'running pump must not animate a supply when its return is missing').toBe('');
  }
  const independentFlows = await page.evaluate(() => {
    const plan = window.__heatingPlanExamples[2];
    const states = structuredClone(window.__heatingStateExamples[2]);
    states['switch.hc2'].state = 'off';
    const card = document.createElement('hydraulic-plan-card');
    document.body.replaceChildren(card);
    card.setConfig({
      type: 'custom:hydraulic-plan-card', preset: 'none', hc_count: 2,
      power_sources: 'manual', animations: 'always', plan,
    });
    card.hass = {
      states, entities: {}, devices: {}, locale: { language: 'de' },
      language: 'de', config: { version: '2026.10.4' },
      callService: () => Promise.resolve(),
      callWS: () => Promise.reject(new Error('Unavailable in routing test')),
    };
    const svg = card.shadowRoot.getElementById('svg');
    const first = svg.querySelector('#f-hc-vl')?.getAttribute('d') || '';
    const second = svg.querySelector('#f-hc-vl2')?.getAttribute('d') || '';
    const mixedPlan = structuredClone(plan);
    mixedPlan.components.filter(node=>node.type==='heating_circuit')
      .forEach(circuit=>{circuit.options.mixed=true;});
    card.setConfig({
      type: 'custom:hydraulic-plan-card', preset: 'none', hc_count: 2,
      power_sources: 'manual', animations: 'always', plan: mixedPlan,
    });
    card.hass = {
      states: window.__heatingStateExamples[2], entities: {}, devices: {},
      locale: { language: 'de' }, language: 'de',
      config: { version: '2026.10.4' },
      callService: () => Promise.resolve(),
      callWS: () => Promise.reject(new Error('Unavailable in routing test')),
    };
    const mixedSvg = card.shadowRoot.getElementById('svg');
    return {
      first, second,
      mixers: ['#p-hc-mix', '#p-hc-mix2'].map(selector=>
        mixedSvg.querySelector(selector)?.getAttribute('d') || ''),
    };
  });
  expect(independentFlows.first,'running circuit must animate').not.toBe('');
  expect(independentFlows.second,'stopped circuit must not animate').toBe('');
  expect(independentFlows.mixers.every(path=>path!== ''),
    'each mixed circuit must retain its own mixer connection').toBe(true);
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach('oil-boiler-buffer-two-heating-circuits.png', {
    body: screenshot,
    contentType: 'image/png',
  });
  await writeFile(testInfo.outputPath('oil-boiler-buffer-two-heating-circuits.png'), screenshot);
});
