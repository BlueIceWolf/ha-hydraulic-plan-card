import { expect, test } from '@playwright/test';

test('EMS-ESP displays one panel and ignores circuits with zero usable values', async ({ page }) => {
  await page.goto('/test/hydraulic-plan.html', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(() => {
    const makeState = (id, value, unit = '') => ({
      entity_id: id, state: String(value),
      attributes: { friendly_name: id,
        ...(unit ? { unit_of_measurement: unit } : {}) },
    });
    const editor = document.createElement('hydraulic-plan-card-editor');
    editor.setConfig({
      type: 'custom:hydraulic-plan-card', preset: 'none',
      plan: { components: [{ id: 'existing-buffer', name: 'Puffer', type: 'buffer',
        sensors: { top: 'sensor.buffer_top' } }], connections: [] },
    });
    document.body.append(editor);

    const states = {
      'sensor.boiler_curflowtemp': makeState('sensor.boiler_curflowtemp', 55, '°C'),
      'sensor.boiler_rettemp': makeState('sensor.boiler_rettemp', 43, '°C'),
      'sensor.thermostat_hc1_roomtemp': makeState('sensor.thermostat_hc1_roomtemp', 20.2, '°C'),
      'sensor.thermostat_hc2_seltemp': makeState('sensor.thermostat_hc2_seltemp', 21, '°C'),
    };
    const hass = {
      states,
      entities: Object.fromEntries(Object.keys(states).map(id => [id,
        { device_id: 'ems-boiler' }])),
      devices: { 'ems-boiler': { name: 'EMS-ESP Heizung', manufacturer: 'EMS-ESP' } },
      locale: { language: 'de' },
    };
    editor.hass = hass;

    const firstPanel = editor.querySelector('[data-discovery="ems-esp"]');
    const initial = {
      panelCount: editor.querySelectorAll('[data-discovery="ems-esp"]').length,
      sourceButton: !!firstPanel?.querySelector('[data-action="ems-apply"]'),
      emptyCircuitButton: !!firstPanel?.querySelector('[data-action="ems-circuits-apply"]'),
      duplicateFramedPanels: firstPanel?.querySelectorAll('.hpc-ems').length,
      zeroValuesShown: firstPanel?.textContent.includes('(0 Messwerte)'),
    };

    const extra = 'sensor.mixer_hc1_flowtemp';
    editor.hass = {
      ...hass,
      states: { ...states, [extra]: makeState(extra, 38, '°C') },
      entities: { ...hass.entities, [extra]: { device_id: 'ems-boiler' } },
    };
    const secondPanel = editor.querySelector('[data-discovery="ems-esp"]');
    const withCircuit = {
      panelCount: editor.querySelectorAll('[data-discovery="ems-esp"]').length,
      circuitHeading: [...secondPanel.querySelectorAll('h4')]
        .some(node => node.textContent.trim() === 'Heizkreise'),
      circuitButton: !!secondPanel.querySelector('[data-action="ems-circuits-apply"]'),
      noEmptySecondCircuit: !secondPanel.textContent.includes('Heizkreis 2'),
      measuredFirstCircuit: secondPanel.textContent.includes('Heizkreis 1 (1 Messwerte)'),
    };

    const bufferBefore = JSON.stringify(editor._config.plan.components[0].sensors);
    const typeSelect = editor.querySelector('#hpc-ems-type');
    typeSelect.value = 'oil_boiler';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    const enabled = !editor.querySelector('[data-action="ems-apply"]').disabled;
    editor.querySelector('[data-action="ems-apply"]').click();

    const afterImport = {
      originalBufferKept: JSON.stringify(editor._config.plan.components
        .find(node => node.id === 'existing-buffer')?.sensors) === bufferBefore,
      sourceCount: editor._config.plan.components.filter(node => node.type === 'oil_boiler').length,
      noInventedPipes: editor._config.plan.connections.length === 0,
    };
    return { initial, withCircuit, enabled, afterImport };
  });

  expect(result.initial).toEqual({
    panelCount: 1, sourceButton: true, emptyCircuitButton: false,
    duplicateFramedPanels: 0, zeroValuesShown: false,
  });
  expect(result.withCircuit).toEqual({
    panelCount: 1, circuitHeading: true, circuitButton: true,
    noEmptySecondCircuit: true, measuredFirstCircuit: true,
  });
  expect(result.enabled).toBe(true);
  expect(result.afterImport).toEqual({
    originalBufferKept: true, sourceCount: 1, noInventedPipes: true,
  });
});
