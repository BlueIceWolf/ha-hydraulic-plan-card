import { expect, test } from '@playwright/test';

test('hydraulic graph, ports, metered flow and interrupted coil regressions', async ({ page }, testInfo) => {
  await page.goto('/test/network.html');
  await expect(page.locator('#result')).toHaveText(/^(PASS|FAIL)$/, { timeout: 15000 });
  const log = (await page.locator('#log').textContent()) || '(no network log)';
  await testInfo.attach('hydraulic-network.log', {
    body: Buffer.from(log),
    contentType: 'text/plain',
  });
  expect((await page.locator('#result').textContent()).trim(), log).toBe('PASS');
});
