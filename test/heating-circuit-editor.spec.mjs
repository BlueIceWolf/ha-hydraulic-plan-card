import { expect, test } from '@playwright/test';

test('new card stub opens the setup wizard without creating a migration backup', async ({ page }) => {
  await page.goto('/test/hydraulic-plan.html', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(() => {
    const editor = document.createElement('hydraulic-plan-card-editor');
    editor.setConfig({
      type: 'custom:hydraulic-plan-card',
      preset: 'none',
      plan: { components: [], connections: [] },
    });
    document.body.append(editor);
    editor.hass = { states: {}, entities: {}, devices: {}, locale: { language: 'en' } };

    const boiler = editor.querySelector('[data-setup-type="oil_boiler"]');
    const buffer = editor.querySelector('[data-setup-type="buffer"]');
    const circuit = editor.querySelector('[data-setup-type="heating_circuit"]');
    boiler.checked = true;
    boiler.dispatchEvent(new Event('change', { bubbles: true }));
    buffer.checked = true;
    buffer.dispatchEvent(new Event('change', { bubbles: true }));
    circuit.checked = true;
    circuit.dispatchEvent(new Event('change', { bubbles: true }));
    const circuitCount = editor.querySelector('[data-setup-count="heating_circuit"]');
    circuitCount.value = '2';
    circuitCount.dispatchEvent(new Event('change', { bubbles: true }));
    const initial = {
      state: editor._editorState(),
      wizardVisible: !!editor.querySelector('[data-action="setup-create"]'),
      componentEditorVisible: !!editor.querySelector('#hpc-free-type'),
      migrationBackupSaved: !!editor._config.hpc_migration_backup,
    };
    editor.querySelector('[data-action="setup-create"]').click();
    const circuits = editor._config.plan.components.filter(node => node.type === 'heating_circuit');
    return {
      initial,
      startedState: editor._editorState(),
      componentEditorVisibleAfterStart: !!editor.querySelector('#hpc-free-type'),
      schemaVersion: editor._config.hpc_schema_version,
      components: editor._config.plan.components.map(node => node.type),
      circuitCount: circuits.length,
      completeCircuitEdges: editor._config.plan.connections.filter(edge =>
        circuits.some(node => node.id === edge.to && edge.to_port === 'flow_in') ||
        circuits.some(node => node.id === edge.from && edge.from_port === 'return_out')).length,
    };
  });

  expect(result.initial).toEqual({
    state: 'new',
    wizardVisible: true,
    componentEditorVisible: false,
    migrationBackupSaved: false,
  });
  expect(result.startedState).toBe('existing');
  expect(result.componentEditorVisibleAfterStart).toBe(true);
  expect(result.schemaVersion).toBe(3);
  expect(result.components).toEqual(['oil_boiler', 'buffer', 'heating_circuit', 'heating_circuit']);
  expect(result.circuitCount).toBe(2);
  expect(result.completeCircuitEdges).toBe(4);
});

test('new heating circuits connect safely to an unambiguous source', async ({ page }) => {
  await page.goto('/test/hydraulic-plan.html', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async () => {
    const makeEditor = plan => {
      const editor = document.createElement('hydraulic-plan-card-editor');
      editor.setConfig({ type: 'custom:hydraulic-plan-card', preset: 'none', plan });
      document.body.append(editor);
      editor.hass = { states: {}, entities: {}, devices: {}, locale: { language: 'en' } };
      return editor;
    };
    const addCircuit = editor => {
      editor.querySelector('#hpc-free-type').value = 'heating_circuit';
      editor.querySelector('[data-action="add-component"]').click();
      return editor._config.plan.components.find(node => node.type === 'heating_circuit');
    };

    const single = makeEditor({
      components: [{ id: 'one_buffer', type: 'buffer', name: 'Named buffer',
        sensors: { top: 'sensor.buffer_top' } }],
      connections: [],
    });
    const autoCircuit = addCircuit(single);
    const autoConnections = single._config.plan.connections;

    const ambiguous = makeEditor({
      components: [
        { id: 'buffer_a', type: 'buffer', name: 'Buffer A', sensors: {} },
        { id: 'buffer_b', type: 'buffer', name: 'Buffer B', sensors: {} },
      ],
      connections: [],
    });
    const manualCircuit = addCircuit(ambiguous);
    const stayedOpen = ambiguous._config.plan.connections.length === 0;
    const incompleteNotice = ambiguous.textContent.includes('not fully connected');
    const sourcePicker = ambiguous.querySelector(`[data-hc-source="${manualCircuit.id}"]`);
    sourcePicker.value = 'buffer_b';
    ambiguous.querySelector(`[data-action="hc-connect"][data-component="${manualCircuit.id}"]`).click();

    return {
      autoCircuitName: autoCircuit.name,
      autoCircuitId: autoCircuit.id,
      autoPreservedSensor: single._config.plan.components.find(node => node.id === 'one_buffer')
        .sensors.top,
      autoEdges: autoConnections.map(edge =>
        [edge.from, edge.from_port, edge.to, edge.to_port]),
      ambiguousStayedOpen: stayedOpen,
      selectedBufferEdges: ambiguous._config.plan.connections.map(edge =>
        [edge.from, edge.from_port, edge.to, edge.to_port]),
      incompleteNotice,
    };
  });
  expect(result.autoEdges).toEqual([
    ['one_buffer', 'top_out', result.autoCircuitId, 'flow_in'],
    [result.autoCircuitId, 'return_out', 'one_buffer', 'bottom_in'],
  ]);
  expect(result.autoCircuitName).toBe('Heizkreis (gemischt/ungemischt)');
  expect(result.autoPreservedSensor).toBe('sensor.buffer_top');
  expect(result.ambiguousStayedOpen).toBe(true);
  expect(result.selectedBufferEdges).toHaveLength(2);
  expect(result.selectedBufferEdges[0].slice(0, 2)).toEqual(['buffer_b', 'top_out']);
  expect(result.selectedBufferEdges[1].slice(0, 3)).toEqual([
    result.selectedBufferEdges[0][2], 'return_out', 'buffer_b',
  ]);
  expect(result.incompleteNotice).toBe(true);
});
