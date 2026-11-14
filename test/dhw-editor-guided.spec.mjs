import { expect, test } from '@playwright/test';

const plan = () => ({
  components: [
    { id: 'hp', type: 'heat_pump', name: 'Wärmepumpe',
      sensors: { flow: 'sensor.hp_flow', return: 'sensor.hp_return' } },
    { id: 'buffer', type: 'buffer', name: 'Pufferspeicher',
      sensors: { top: 'sensor.buffer_top' } },
    { id: 'dhw', type: 'dhw_tank', name: 'Warmwasserspeicher',
      sensors: { top: 'sensor.dhw_top' } },
  ],
  connections: [
    { id: 'direct_flow', from: 'hp', from_port: 'flow',
      to: 'buffer', to_port: 'top_in' },
    { id: 'direct_return', from: 'buffer', from_port: 'bottom_out',
      to: 'hp', to_port: 'return' },
  ],
});

const createEditor = source => {
  const editor = document.createElement('hydraulic-plan-card-editor');
  editor.setConfig({
    type: 'custom:hydraulic-plan-card',
    preset: 'emsesp', plan: source,
  });
  document.body.append(editor);
  editor.hass = {
    states: {}, devices: {}, entities: {},
    locale: { language: 'de' }, language: 'de',
  };
  return editor;
};

test('original preset remains in General while the hydraulic DHW setup is guided', async ({ page }) => {
  await page.goto('/test/hydraulic-plan.html', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(({ planSource }) => {
    const editor = document.createElement('hydraulic-plan-card-editor');
    editor.setConfig({ type: 'custom:hydraulic-plan-card', preset: 'emsesp', plan: planSource });
    document.body.append(editor);
    editor.hass = { states: {}, devices: {}, entities: {}, locale: { language: 'de' } };
    const preset = editor.querySelector('#hpc-native-preset');
    const advanced = editor.querySelector('#hpc-native-legacy');
    const method = editor.querySelector('[data-dhw-kind="dhw"]');
    const source = editor.querySelector('[data-dhw-source="dhw"]');
    const buffer = editor.querySelector('[data-dhw-buffer="dhw"]');
    const unchanged = JSON.stringify(editor._config.plan);
    editor.querySelector('[data-action="dhw-method"][data-method="pump"][data-component="dhw"]').click();
    const pump = editor.querySelector('[data-dhw-kind="dhw"]')?.value;
    const pumpPreview = !!editor.querySelector('[data-panel="dhw-setup:dhw"] .hpc-dhw-flow');
    editor.querySelector('[data-action="dhw-method"][data-method="diverter"][data-component="dhw"]').click();
    return {
      presetSchema: preset?.schema?.map(field => field.name),
      presetData: preset?.data?.preset,
      advancedContainsPreset: advanced?.schema?.some(field => field.name === 'preset'),
      initialKind: method?.value,
      source: source?.value, buffer: buffer?.value,
      methodButtons: editor.querySelectorAll('[data-panel="dhw-setup:dhw"] [data-action="dhw-method"]').length,
      pump, pumpPreview, diverter: editor.querySelector('[data-dhw-kind="dhw"]')?.value,
      previewValve: !!editor.querySelector('[data-panel="dhw-setup:dhw"] .hpc-dhw-valve'),
      selectionDoesNotSave: JSON.stringify(editor._config.plan) === unchanged,
    };
  }, { planSource: plan() });
  expect(result).toEqual({
    presetSchema: ['preset'], presetData: 'emsesp',
    advancedContainsPreset: false,
    initialKind: 'diverter', source: 'hp', buffer: 'buffer',
    methodButtons: 3, pump: 'pump', pumpPreview: true,
    diverter: 'diverter', previewValve: true, selectionDoesNotSave: true,
  });
});

test('three-way setup confirms replacement, preserves sensors and survives reopening', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/test/hydraulic-plan.html', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(({ planSource }) => {
    const editor = document.createElement('hydraulic-plan-card-editor');
    editor.setConfig({ type: 'custom:hydraulic-plan-card', preset: 'emsesp', plan: planSource });
    document.body.append(editor);
    editor.hass = { states: {}, devices: {}, entities: {}, locale: { language: 'de' } };
    editor.querySelector('[data-action="dhw-route"][data-component="dhw"]').click();
    const after = editor._config;
    const valve = after.plan.components.find(component => component.type === 'diverter');
    const reopened = document.createElement('hydraulic-plan-card-editor');
    reopened.setConfig(after);
    document.body.append(reopened);
    reopened.hass = { states: {}, devices: {}, entities: {}, locale: { language: 'de' } };
    return {
      preset: after.preset,
      hp: after.plan.components.find(component => component.id === 'hp')?.sensors,
      buffer: after.plan.components.find(component => component.id === 'buffer')?.sensors,
      dhw: after.plan.components.find(component => component.id === 'dhw')?.sensors,
      valve: valve?.id,
      valveOptions: valve?.options,
      edges: after.plan.connections.map(edge => [edge.from, edge.from_port, edge.to, edge.to_port]),
      reopenedPreset: reopened.querySelector('#hpc-native-preset')?.data?.preset,
      reopenedKind: reopened.querySelector('[data-dhw-kind="dhw"]')?.value,
      reopenedComplete: reopened.textContent.includes('Warmwasserbereitung angeschlossen'),
    };
  }, { planSource: plan() });
  expect(result.preset).toBe('emsesp');
  expect(result.hp).toEqual({ flow: 'sensor.hp_flow', return: 'sensor.hp_return' });
  expect(result.buffer).toEqual({ top: 'sensor.buffer_top' });
  expect(result.dhw).toEqual({ top: 'sensor.dhw_top' });
  expect(result.valve).toBeTruthy();
  expect(result.valveOptions.dhw_port).toBe('a');
  expect(result.edges).toEqual([
    ['hp', 'flow', result.valve, 'ab'],
    [result.valve, 'a', 'dhw', 'coil_in'],
    ['dhw', 'coil_out', 'hp', 'return'],
    [result.valve, 'b', 'buffer', 'top_in'],
    ['buffer', 'bottom_out', 'hp', 'return'],
  ]);
  expect(result.reopenedPreset).toBe('emsesp');
  expect(result.reopenedKind).toBe('diverter');
  expect(result.reopenedComplete).toBe(true);
});

test('cancelling a pipe replacement leaves the existing graph untouched', async ({ page }) => {
  page.on('dialog', dialog => dialog.dismiss());
  await page.goto('/test/hydraulic-plan.html', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(({ planSource }) => {
    const editor = document.createElement('hydraulic-plan-card-editor');
    editor.setConfig({ type: 'custom:hydraulic-plan-card', preset: 'none', plan: planSource });
    document.body.append(editor);
    editor.hass = { states: {}, devices: {}, entities: {}, locale: { language: 'de' } };
    const before = JSON.stringify(editor._config.plan);
    editor.querySelector('[data-action="dhw-route"][data-component="dhw"]').click();
    return {
      unchanged: JSON.stringify(editor._config.plan) === before,
      valveCount: editor._config.plan.components.filter(component => component.type === 'diverter').length,
    };
  }, { planSource: plan() });
  expect(result).toEqual({ unchanged: true, valveCount: 0 });
});
