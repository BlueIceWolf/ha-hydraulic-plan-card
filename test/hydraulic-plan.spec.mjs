import { expect, test } from '@playwright/test';

test('boiler types, hydraulic states and coexistence work in browser', async ({ page }, testInfo) => {
  await page.goto('/test/hydraulic-plan.html');
  const result = page.locator('#result');
  await expect(result).toHaveText(/^(PASS|FAIL)$/, { timeout: 20000 });
  const log = (await page.locator('#log').textContent()) || '(empty test log)';
  await testInfo.attach('hydraulic-plan.log', {
    body: Buffer.from(log),
    contentType: 'text/plain',
  });
  expect((await result.textContent()).trim(), log).toBe('PASS');
});
