import { expect, test } from '@playwright/test';

const components = [
  { id: 'hp', type: 'heat_pump', name: 'Wärmepumpe',
    sensors: { flow: 'sensor.hp_vl' } },
  { id: 'buffer', type: 'buffer', name: 'Puffer',
    sensors: { top: 'sensor.buffer' } },
  { id: 'ww', type: 'dhw_tank', name: 'Warmwasser', sensors: {} },
  { id: 'valve', type: 'diverter', name: '3-Wege-Ventil', sensors: {} },
  { id: 'pump', type: 'pump', name: 'Warmwasser-Ladepumpe', sensors: {} },
];
const connections = [
  { id: 'supply', from: 'hp', from_port: 'flow', to: 'valve', to_port: 'ab' },
  { id: 'heating', from: 'valve', from_port: 'b', to: 'buffer', to_port: 'top_in' },
  { id: 'wwfeed', from: 'valve', from_port: 'a', to: 'ww', to_port: 'coil_in' },
  { id: 'wwback', from: 'ww', from_port: 'coil_out', to: 'hp', to_port: 'return' },
];

test('WW tank is drawn only after a WW temperature is configured, without deleting setup', async ({ page }) => {
  await page.goto('/test/hydraulic-plan.html', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(({ nodes, edges }) => {
    const card = document.createElement('hydraulic-plan-card');
    const configured = { type: 'custom:hydraulic-plan-card', preset: 'none',
      plan: { components: nodes, connections: edges } };
    card.setConfig(configured);
    document.body.append(card);
    const original = JSON.stringify(configured.plan);
    const empty = card._displayHydraulicPlan(configured.plan);
    const node = card._integratedPlan.components.find(item => item.id === 'ww');
    node.sensors.top = 'sensor.ww_temp';
    const assigned = card._displayHydraulicPlan(card._integratedPlan);
    const missingValue = { ...card._integratedPlan,
      components: card._integratedPlan.components.map(item =>
        item.id === 'ww' ? { ...item, sensors: { top: 'sensor.ww_temp' } } : item) };
    const stillAssigned = card._displayHydraulicPlan(missingValue);
    return {
      originalPlanUnmodified: JSON.stringify(configured.plan) === original,
      hiddenWithoutSensor: !empty.components.some(item => item.id === 'ww'),
      hiddenBranchRemoved: !empty.connections.some(edge => edge.id === 'wwfeed' || edge.id === 'wwback'),
      heatingPreserved: empty.connections.some(edge => edge.id === 'heating'),
      valvePreserved: empty.components.some(item => item.id === 'valve'),
      shownWithSensor: assigned.components.some(item => item.id === 'ww'),
      coilPreserved: assigned.connections.some(edge => edge.id === 'wwfeed'),
      shownEvenIfStateUnavailable: stillAssigned.components.some(item => item.id === 'ww'),
    };
  }, { nodes: components.slice(0,4), edges: connections });

  expect(result).toEqual({
    originalPlanUnmodified: true,
    hiddenWithoutSensor: true, hiddenBranchRemoved: true,
    heatingPreserved: true, valvePreserved: true,
    shownWithSensor: true, coilPreserved: true,
    shownEvenIfStateUnavailable: true,
  });
});

test('dedicated WW charge pump disappears visually without a mapped WW sensor', async ({ page }) => {
  await page.goto('/test/hydraulic-plan.html', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(({ nodes }) => {
    const card = document.createElement('hydraulic-plan-card');
    const graph = { components: nodes, connections: [
      { id: 'pipe1', from: 'hp', from_port: 'flow', to: 'pump', to_port: 'in' },
      { id: 'pipe2', from: 'pump', from_port: 'out', to: 'ww', to_port: 'coil_in' },
      { id: 'pipe3', from: 'ww', from_port: 'coil_out', to: 'hp', to_port: 'return' },
    ] };
    const renderPlan = card._displayHydraulicPlan(graph);
    return {
      hiddenTank: !renderPlan.components.some(item => item.id === 'ww'),
      hiddenDedicatedPump: !renderPlan.components.some(item => item.id === 'pump'),
      heatingSourceKept: renderPlan.components.some(item => item.id === 'hp'),
      savedComponentsUntouched: graph.components.length === 3,
      savedEdgesUntouched: graph.connections.length === 3,
    };
  }, { nodes: [components[0], components[2], components[4]] });
  expect(result).toEqual({
    hiddenTank: true, hiddenDedicatedPump: true, heatingSourceKept: true,
    savedComponentsUntouched: true, savedEdgesUntouched: true,
  });
});
