import { expect, test } from '@playwright/test';

test('boiler types, hydraulic states and coexistence work in browser', async ({ page }, testInfo) => {
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.stack || String(error)));
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push('console: ' + message.text());
  });
  await page.goto('/test/hydraulic-plan.html', { waitUntil: 'domcontentloaded' });
  const result = page.locator('#result');
  let timeoutError;
  try {
    try {
    await expect(result).toHaveText(/^(PASS|FAIL)$/, { timeout: 20000 });
  } catch (error) {
    const checkpoint = (await page.locator('#log').textContent().catch(() => 'unavailable')) || '(no checkpoint)';
    throw new Error(`Hydraulic test did not complete. Last checkpoint:\n${checkpoint}\nBrowser errors:\n${browserErrors.join('\n') || '(none)'}\n${error}`);
  }
  } catch (error) {
    timeoutError = error;
  } finally {
    // Preserve the completed checks even if the page never reaches PASS/FAIL.
    // This identifies the actual component or render operation that stalled.
    const log = (await page.locator('#log').textContent().catch(() => 'Log unavailable')) || '(empty test log)';
    await testInfo.attach('hydraulic-plan.log', {
      body: Buffer.from(log + '\n\nBrowser errors:\n' + (browserErrors.join('\n') || '(none)')),
      contentType: 'text/plain',
    });
  }
  if (timeoutError) throw timeoutError;
  expect((await result.textContent()).trim()).toBe('PASS');
  expect(browserErrors).toEqual([]);
});
