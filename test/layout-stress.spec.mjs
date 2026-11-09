import { expect, test } from '@playwright/test';
test('large layouts have no component overlaps and respect hydraulic location', async ({ page }, testInfo) => {
  await page.goto('/test/layout-stress.html');
  await expect(page.locator('#result')).toHaveText(/^(PASS|FAIL)$/, {timeout:20000});
  const log=(await page.locator('#log').textContent())||'';
  await testInfo.attach('layout-stress.log',{body:Buffer.from(log),contentType:'text/plain'});
  expect((await page.locator('#result').textContent())?.trim(),log).toBe('PASS');
});
