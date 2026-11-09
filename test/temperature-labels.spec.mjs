import { expect, test } from '@playwright/test';

test('hydraulic temperature readings have one geometry-based owner and preserve native fallbacks', async ({ page }) => {
  await page.goto('/test/temperature-labels.html');
  await page.waitForFunction(() => !!customElements.get('hydraulic-plan-card'));
  const result = await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const failures = [];
    const details = [];
    const check = (condition, label) => {
      details.push((condition ? 'OK ' : 'FAIL ') + label);
      if (!condition) failures.push(label);
    };
    const state = (value, unit = '') => ({
      state: String(value),
      attributes: unit ? { unit_of_measurement: unit } : {},
    });
    const hassOf = (values = {}) => ({
      states: Object.fromEntries(Object.entries(values)
        .map(([id, value]) => [id, state(value, '°C')])),
      entities: {},
      devices: {},
      locale: { language: 'de' },
      language: 'de',
      config: { version: '2026.11.9' },
      callService: () => Promise.resolve(),
      callWS: () => Promise.reject(Error('Unexpected websocket request')),
    });
    const component = (id, type, sensors = {}, options = {}) =>
      ({ id, type, name: id, sensors, options });
    const edge = (id, from, from_port, to, to_port) =>
      ({ id, from, from_port, to, to_port });
    const visibleText = (element) => [...(element?.childNodes || [])]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join('');
    const planFor = (id, type, sensors, options = {}, withCircuit = false) => {
      const source = component(id, type, sensors, options);
      const buffer = component(id + '_buffer', 'buffer');
      const components = [source, buffer];
      const connections = [
        edge(id + '_flow_edge', id, 'flow', buffer.id, 'top_in'),
        edge(id + '_return_edge', buffer.id, 'bottom_out', id, 'return'),
      ];
      if (withCircuit) {
        const circuit = component(id + '_circuit', 'heating_circuit', {}, { name: 'EG' });
        components.push(circuit);
        connections.push(
          edge(id + '_circuit_flow', buffer.id, 'top_out', circuit.id, 'flow_in'),
          edge(id + '_circuit_return', circuit.id, 'return_out', buffer.id, 'bottom_in'),
        );
      }
      return { components, connections };
    };
    const mount = async (plan, values) => {
      const card = document.createElement('hydraulic-plan-card');
      card.setConfig({ type: 'custom:hydraulic-plan-card', preset: 'none', plan });
      document.body.append(card);
      card.hass = hassOf(values);
      await wait(50);
      return card;
    };
    const routeSegments = (path) => {
      const tokens = (path || '').match(/[MHV]|-?\d+(?:\.\d+)?/g) || [];
      const result = [];
      let x;
      let y;
      for (let i = 0; i < tokens.length;) {
        const command = tokens[i++];
        if (command === 'M') {
          x = Number(tokens[i++]);
          y = Number(tokens[i++]);
        } else if (command === 'H') {
          const next = Number(tokens[i++]);
          result.push({ x1: x, y1: y, x2: next, y2: y });
          x = next;
        } else if (command === 'V') {
          const next = Number(tokens[i++]);
          result.push({ x1: x, y1: y, x2: x, y2: next });
          y = next;
        }
      }
      return result;
    };
    const isOnRoute = (label) => {
      const edgeId = label.getAttribute('data-edge');
      const path = label.closest('svg')?.querySelector(
        '[data-hpi-edge="' + edgeId + '"] .pipe',
      )?.getAttribute('d');
      const x = Number(label.getAttribute('x'));
      const y = Number(label.getAttribute('y'));
      return routeSegments(path).some((segment) => {
        const left = Math.min(segment.x1, segment.x2);
        const right = Math.max(segment.x1, segment.x2);
        const top = Math.min(segment.y1, segment.y2);
        const bottom = Math.max(segment.y1, segment.y2);
        if (segment.y1 === segment.y2) {
          const offset = Math.abs(y - segment.y1);
          const expected = label.dataset.role === 'flow' ? [18, 34] : [29, 45];
          return x >= left && x <= right && expected.includes(offset);
        }
        return segment.x1 === segment.x2 && y >= top && y <= bottom &&
          Math.abs(Math.abs(x - segment.x1) - 14) < 0.01;
      });
    };
    const sourceValues = (id, flow = 74.7, ret = 71.8) => ({
      ['sensor.' + id + '_flow']: flow,
      ['sensor.' + id + '_return']: ret,
    });

    try {
      const syntheticSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const boilerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      boilerGroup.id = 'boiler';
      boilerGroup.dataset.a11y = 'Brenner läuft, 1200 W, 74,7 °C';
      const boilerReading = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      boilerReading.id = 't-boiler-flow';
      boilerReading.textContent = '74,7 °C';
      boilerGroup.append(boilerReading);
      syntheticSvg.append(boilerGroup);
      const nativeCard = document.createElement('hydraulic-plan-card');
      nativeCard._syncNativeTemperatureLabels(syntheticSvg, ['t-boiler-flow']);
      check(boilerReading.textContent === '' &&
        boilerGroup.dataset.a11y === 'Brenner läuft, 1200 W' &&
        !boilerReading.style.display,
      'replaced boiler text and accessibility reading are removed in render logic, not CSS');

      const cases = [
        ['ETA eHACK', 'wood_chip_boiler', { eta_model: 'ehack' }],
        ['wood gasifier', 'wood_gasifier', {}],
        ['oil boiler', 'oil_boiler', {}],
        ['gas boiler with heating circuit', 'gas_boiler', {}, true],
        ['heat pump', 'heat_pump', {}],
      ];
      for (const [label, type, options, withCircuit = false] of cases) {
        const id = 'source_' + type;
        const sensors = {
          flow: 'sensor.' + id + '_flow',
          return: 'sensor.' + id + '_return',
        };
        const values = sourceValues(id);
        if (type === 'wood_chip_boiler') {
          sensors.state = 'binary_sensor.' + id + '_state';
          values[sensors.state] = 'on';
        }
        const plan = planFor(id, type, sensors, options, withCircuit);
        const card = await mount(plan, values);
        const svg = card.shadowRoot.getElementById('svg');
        const readings = [...svg.querySelectorAll(
          '.hpi-pipe-reading[data-source="' + id + '"]',
        )];
        check(readings.length === 2, label + ' has exactly one supply and return label');
        check(readings.some((item) => item.dataset.role === 'flow' && visibleText(item).includes('74,7')) &&
          readings.some((item) => item.dataset.role === 'return' && visibleText(item).includes('71,8')),
        label + ' preserves distinct flow and return readings');
        check(readings.every(isOnRoute), label + ' labels follow their actual routed segments');
        const nativeValues = type === 'heat_pump'
          ? [['t-vl', '74,7'], ['t-rl', '71,8']]
          : [['t-boiler-flow', '74,7']];
        check(nativeValues.every(([legacyId, value]) =>
          !svg.querySelector('#' + legacyId)?.textContent.includes(value)),
        label + ' suppresses only the replaced native source text');
        card.remove();
      }

      const multiPlan = {
        components: [
          component('same_oil', 'oil_boiler', {
            flow: 'sensor.same_oil_flow', return: 'sensor.same_oil_return',
          }),
          component('same_gas', 'gas_boiler', {
            flow: 'sensor.same_gas_flow', return: 'sensor.same_gas_return',
          }),
          component('same_buffer_a', 'buffer'),
          component('same_buffer_b', 'buffer'),
        ],
        connections: [
          edge('same_oil_flow_edge', 'same_oil', 'flow', 'same_buffer_a', 'top_in'),
          edge('same_oil_return_edge', 'same_buffer_a', 'bottom_out', 'same_oil', 'return'),
          edge('same_gas_flow_edge', 'same_gas', 'flow', 'same_buffer_b', 'top_in'),
          edge('same_gas_return_edge', 'same_buffer_b', 'bottom_out', 'same_gas', 'return'),
        ],
      };
      const multi = await mount(multiPlan, {
        ...sourceValues('same_oil', 74.7, 71.8),
        ...sourceValues('same_gas', 74.7, 71.8),
      });
      const multiSvg = multi.shadowRoot.getElementById('svg');
      for (const role of ['flow', 'return']) {
        const readings = [...multiSvg.querySelectorAll('.hpi-pipe-reading[data-role="' + role + '"]')];
        check(readings.length === 2 &&
          new Set(readings.map((item) => item.dataset.source)).size === 2,
        'equal temperatures remain distinct for each source and role (' + role + ')');
        check(readings.every(isOnRoute), 'both-source ' + role + ' labels use routed geometry');
      }
      multi.remove();

      const noSensors = await mount(planFor('no_sensors', 'oil_boiler', {}), {});
      check(noSensors.shadowRoot.querySelectorAll('.hpi-pipe-reading').length === 0,
        'connected source without temperature sensors adds no pipe labels');
      noSensors.remove();

      const flowOnlyPlan = planFor('flow_only', 'heat_pump', {
        flow: 'sensor.flow_only_flow',
      });
      const flowOnly = await mount(flowOnlyPlan, { 'sensor.flow_only_flow': 68.2 });
      const flowOnlySvg = flowOnly.shadowRoot.getElementById('svg');
      check(flowOnlySvg.querySelectorAll('.hpi-pipe-reading[data-role="flow"]').length === 1 &&
        flowOnlySvg.querySelectorAll('.hpi-pipe-reading[data-role="return"]').length === 0,
      'single-sensor source labels only the measured flow role');
      check(!flowOnlySvg.querySelector('#t-vl')?.textContent.includes('68,2'),
        'single-sensor flow is not duplicated inside the heat-pump source');
      flowOnly.remove();

      const unconnectedId = 'unconnected_source';
      const unconnected = await mount({
        components: [component(unconnectedId, 'heat_pump', {
          flow: 'sensor.' + unconnectedId + '_flow',
          return: 'sensor.' + unconnectedId + '_return',
        })],
        connections: [],
      }, sourceValues(unconnectedId));
      const unconnectedSvg = unconnected.shadowRoot.getElementById('svg');
      check(unconnectedSvg.querySelectorAll('.hpi-pipe-reading').length === 0,
        'unconnected source does not invent pipe labels');
      check(unconnectedSvg.querySelector('#t-vl')?.textContent.includes('74,7') &&
        unconnectedSvg.querySelector('#t-rl')?.textContent.includes('71,8'),
      'unconnected heat pump retains its original in-component temperature fallbacks');
      unconnected.remove();

      const circuitPlan = {
        components: [
          component('circuit_source', 'heat_pump', {
            flow: 'sensor.circuit_source_flow',
            return: 'sensor.circuit_source_return',
          }),
          component('circuit_buffer', 'buffer'),
          component('circuit_eg', 'heating_circuit', { flow: 'sensor.circuit_eg_flow' }, { name: 'EG' }),
          component('circuit_og', 'heating_circuit', { flow: 'sensor.circuit_og_flow' }, { name: 'OG' }),
        ],
        connections: [
          edge('csf', 'circuit_source', 'flow', 'circuit_buffer', 'top_in'),
          edge('csr', 'circuit_buffer', 'bottom_out', 'circuit_source', 'return'),
          edge('egf', 'circuit_buffer', 'top_out', 'circuit_eg', 'flow_in'),
          edge('egr', 'circuit_eg', 'return_out', 'circuit_buffer', 'bottom_in'),
          edge('ogf', 'circuit_buffer', 'top_out', 'circuit_og', 'flow_in'),
          edge('ogr', 'circuit_og', 'return_out', 'circuit_buffer', 'bottom_in'),
        ],
      };
      const circuits = await mount(circuitPlan, {
        ...sourceValues('circuit_source', 72, 65),
        'sensor.circuit_eg_flow': 72,
        'sensor.circuit_og_flow': 72,
      });
      const circuitSvg = circuits.shadowRoot.getElementById('svg');
      check(circuitSvg.querySelector('#t-hc')?.textContent.includes('72') &&
        circuitSvg.querySelector('#t-hc2')?.textContent.includes('72'),
      'equal readings from separate heating-circuit sensors are not deduplicated');
      circuits.remove();

      const changingId = 'changing_source';
      const changingPlan = planFor(changingId, 'heat_pump', {
        flow: 'sensor.changing_flow',
        return: 'sensor.changing_return',
      });
      const changing = await mount(changingPlan, {
        'sensor.changing_flow': 76,
        'sensor.changing_return': 64,
      });
      changing.hass = hassOf({
        'sensor.changing_flow': 82.4,
        'sensor.changing_return': 67.1,
      });
      changing.hass = hassOf({
        'sensor.changing_flow': 82.4,
        'sensor.changing_return': 67.1,
      });
      await wait(60);
      let changingSvg = changing.shadowRoot.getElementById('svg');
      check(changingSvg.querySelectorAll('.hpi-pipe-reading[data-source="' + changingId + '"]').length === 2 &&
      visibleText(changingSvg.querySelector('.hpi-pipe-reading[data-role="flow"]')).includes('82,4'),
      'repeated render and sensor updates do not duplicate or stale labels');
      changing.setConfig({
        type: 'custom:hydraulic-plan-card',
        preset: 'none',
        plan: planFor(changingId, 'heat_pump', { flow: 'sensor.changing_flow' }),
      });
      changing.hass = hassOf({ 'sensor.changing_flow': 82.4 });
      await wait(60);
      changingSvg = changing.shadowRoot.getElementById('svg');
      check(changingSvg.querySelectorAll('.hpi-pipe-reading[data-role="return"]').length === 0 &&
        changingSvg.querySelectorAll('.hpi-pipe-reading[data-role="flow"]').length === 1,
      'configuration edits remove only labels whose sensor role was removed');
      changing.setConfig({
        type: 'custom:hydraulic-plan-card',
        preset: 'none',
        plan: {
          components: [component(changingId, 'heat_pump', { flow: 'sensor.changing_flow' })],
          connections: [],
        },
      });
      changing.hass = hassOf({ 'sensor.changing_flow': 82.4 });
      await wait(60);
      changingSvg = changing.shadowRoot.getElementById('svg');
      check(changingSvg.querySelectorAll('.hpi-pipe-reading').length === 0 &&
      changingSvg.querySelector('#t-vl')?.textContent.includes('82,4'),
      'disconnecting a source restores its original temperature fallback');
      changing.style.width = '320px';
      changing.style.setProperty('--primary-text-color', '#111');
      check(changingSvg.querySelectorAll('.hpi-pipe-reading').length === 0,
        'narrow and themed rendering preserves the fallback without a phantom pipe label');
      changing.remove();
    } catch (error) {
      failures.push(String(error?.stack || error));
      details.push(String(error?.stack || error));
    }
    return { failures, details: details.join('\n') };
  });
  expect(result.failures, result.details).toEqual([]);
});
