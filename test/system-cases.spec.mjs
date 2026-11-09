import { expect, test } from '@playwright/test';

test('five real-life hydraulic plant configurations retain all components and collision-free layout', async ({ page }, testInfo) => {
  await page.goto('/test/system-cases.html');
  await expect(page.locator('#result')).toHaveText(/^(PASS|FAIL)$/, { timeout: 20000 });
  const output = (await page.locator('#log').textContent()) || '(no output)';
  await testInfo.attach('hydraulic-systems.log', {
    body: Buffer.from(output),
    contentType: 'text/plain',
  });
  expect((await page.locator('#result').textContent())?.trim(), output).toBe('PASS');
});
