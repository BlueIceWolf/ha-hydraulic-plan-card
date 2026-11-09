import { expect, test } from '@playwright/test';

// Six fixed installations, rendered by the distributable card, not a mock SVG.
// Each screenshot has its own committed baseline for Chromium and Firefox.
const plants = ['A', 'B', 'C', 'D', 'E', 'F'];
const views = [
  { name: 'wide', width: 1440, height: 900, theme: 'auto' },
  { name: 'night', width: 1440, height: 900, theme: 'night' },
  { name: 'narrow', width: 480, height: 900, theme: 'auto' },
  { name: 'fullscreen', width: 1440, height: 900, theme: 'auto', fullscreen: true },
];

for (const [index, plant] of plants.entries()) {
  for (const view of views) {
    test('plant ' + plant + ' / ' + view.name + ' has no orphan drawing or duplicate labels', async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: view.width, height: view.height });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/test/system-cases.html');
      await expect(page.locator('#result')).toHaveText('PASS', { timeout: 25_000 });
      await page.addScriptTag({ url: '/dist/ha-hydraulic-plan-card.js' });

      const mount = await page.evaluate(({ index, view }) => {
        const example = scenarios[index];
        const card = document.createElement('hydraulic-plan-card');
        const config = {
          type: 'custom:hydraulic-plan-card',
          title: 'Anlage ' + String.fromCharCode(65 + index),
          preset: 'none',
          power_sources: 'manual',
          animations: 'off',
          theme: view.theme,
          plan: { components: example.components, connections: example.connections },
        };
        card.setConfig(config);
        document.body.replaceChildren(card);
        const entities = {};
        for (const component of example.components) {
          for (const id of Object.values(component.sensors || {})) {
            if (typeof id !== 'string' || !id.includes('.')) continue;
            entities[id] = {
              entity_id: id,
              state: id.startsWith('switch.') || id.startsWith('binary_sensor.') ? 'on' : '45',
              attributes: id.startsWith('sensor.') ? { unit_of_measurement: '°C' } : {},
            };
          }
        }
        card.hass = {
          states: entities, entities: {}, devices: {},
          locale: { language: 'de' }, language: 'de',
          config: { version: '2026.10.4' },
          callService: () => Promise.resolve(),
          callWS: () => Promise.reject(new Error('Unavailable in visual test')),
        };
        if (view.fullscreen) card._openFullscreen();
        return { count: example.components.length, title: example.name };
      }, { index, view });
      expect(mount.count).toBeGreaterThan(0);

      const card = page.locator('hydraulic-plan-card');
      const graphic = card.locator('svg#svg');
      await expect(graphic).toBeVisible({ timeout: 20_000 });
      await expect(card.locator('#hpc-integrated')).toHaveCount(1);
      await page.evaluate(() => document.fonts.ready);
      const report = await page.evaluate(index => {
        const example = scenarios[index];
        const card = document.querySelector('hydraulic-plan-card');
        const svg = card.shadowRoot.getElementById('svg');
        const failures = [];
        const realEdges = new Set(example.connections.map(edge => edge.id));
        const links = [...svg.querySelectorAll('#hpc-integrated .hpi-link')];
        const actualEdges = new Set();
        for (const link of links) {
          const id = link.getAttribute('data-hpi-edge');
          if (!realEdges.has(id) && !id.startsWith('rla_'))
            failures.push('Unmapped visible connection: ' + id);
          if (actualEdges.has(id)) failures.push('Repeated connection: ' + id);
          actualEdges.add(id);
        }
        if (card._failed) failures.push('Card render failed');
        if (card._integratedPlan?.components.length !== example.components.length)
          failures.push('Components were lost');

        // Only hydraulic pipe shapes count; boiler icons and exhaust ducts
        // have different SVG classes and must not be mistaken for water pipes.
        const pipes = [
          ...svg.querySelectorAll('#hpc-integrated .hpi-link > path.pipe'),
          ...svg.querySelectorAll('path[id^="p-hc-vl"], path[id^="p-hc-rl"]'),
        ];
        const segments = [];
        for (const path of pipes) {
          const d = path.getAttribute('d') || '';
          if (!d) continue; // a shared pipe can be owned by a different edge
          const raw = d.match(/[MHV]|-?\d+(?:\.\d+)?/g) || [];
          const edgeId = path.parentElement?.getAttribute('data-hpi-edge') || path.id;
          let x = 0, y = 0;
          const role = path.id.includes('-rl') ||
            /(?:^|_)rl(?:$|_)/.test(edgeId) ? 'return' : 'flow';
          for (let i = 0; i < raw.length;) {
            const command = raw[i++];
            if (command === 'M') {
              x = Number(raw[i++]); y = Number(raw[i++]);
              continue;
            }
            if (command !== 'H' && command !== 'V') {
              failures.push('Unsupported water-pipe command in ' + edgeId);
              break;
            }
            const nx = command === 'H' ? Number(raw[i++]) : x;
            const ny = command === 'V' ? Number(raw[i++]) : y;
            if (![x, y, nx, ny].every(Number.isFinite) ||
                Math.abs(nx - x) + Math.abs(ny - y) < .01) {
              failures.push('Invalid or zero-length segment in ' + edgeId);
              break;
            }
            segments.push({
              edgeId, role, axis: command, fixed: command === 'H' ? y : x,
              low: Math.min(command === 'H' ? x : y, command === 'H' ? nx : ny),
              high: Math.max(command === 'H' ? x : y, command === 'H' ? nx : ny),
            });
            x = nx; y = ny;
          }
        }
        // One geometric trunk must be drawn once even when it serves several
        // consumers. Different pipes cannot share more than a tolerance.
        for (let i = 0; i < segments.length; i++) {
          const a = segments[i];
          for (let j = i + 1; j < segments.length; j++) {
            const b = segments[j];
            if (a.axis !== b.axis || Math.abs(a.fixed - b.fixed) > .01) continue;
            if (Math.min(a.high, b.high) - Math.max(a.low, b.low) > 1)
              failures.push('Overlapping water pipes: ' + a.edgeId + ' / ' + b.edgeId);
          }
        }

        const labels = [...svg.querySelectorAll('text')].filter(el => {
          const box = el.getBoundingClientRect();
          return el.textContent.trim() && box.width > 3 && box.height > 3 &&
            getComputedStyle(el).visibility !== 'hidden';
        }).map(el => {
          const rect = el.getBoundingClientRect();
          return {
            content: el.textContent.trim().replace(/\s+/g, ' '),
            x: rect.x, y: rect.y, w: rect.width, h: rect.height,
          };
        });
        for (let i = 0; i < labels.length; i++) {
          for (let j = i + 1; j < labels.length; j++) {
            const a = labels[i], b = labels[j];
            if (a.content !== b.content) continue;
            const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
            const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
            if (w > 3 && h > 3 && w * h > Math.min(a.w * a.h, b.w * b.h) * .35)
              failures.push('Duplicate label at the same place: ' + a.content);
          }
        }

        return {
          failures: [...new Set(failures)].slice(0, 24),
          components: card._integratedPlan?.components.length,
          pipeSegments: segments.length,
          labels: labels.length,
          hasSvg: !!svg,
        };
      }, index);

      expect(report.pipeSegments, JSON.stringify(report)).toBeGreaterThan(0);
      expect(report.failures, JSON.stringify(report, null, 2)).toEqual([]);
      expect(errors).toEqual([]);
      // Golden images are checked in both browsers. Never regenerate them as
      // part of an ordinary validation run.
      await expect(card.locator('ha-card')).toHaveScreenshot(
        'plant-' + plant.toLowerCase() + '-' + view.name + '.png',
        { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.015 }
      );
    });
  }
}
