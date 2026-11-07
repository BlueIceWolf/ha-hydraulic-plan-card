import { expect, test } from '@playwright/test';

test('browser self-test passes', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  await page.goto('/test/selftest.html');

  const result = page.locator('#result');
  await expect(result).toHaveText(/^(PASS|FAIL)$/, { timeout: 120_000 });

  const status = (await result.textContent())?.trim();
  const log = (await page.locator('#log').textContent())?.trim() || '(no self-test log)';
  await testInfo.attach('selftest.log', {
    body: Buffer.from(log),
    contentType: 'text/plain',
  });

  expect(status, log).toBe('PASS');
});

// Drawing snapshot and generated combinations (test/topology.html); it renders about 1,200 cases, so it gets more time.
test('topology test passes', async ({ page }, testInfo) => {
  test.setTimeout(420_000);
  await page.goto('/test/topology.html');

  const result = page.locator('#result');
  await expect(result).toHaveText(/^(PASS|FAIL)$/, { timeout: 400_000 });

  const status = (await result.textContent())?.trim();
  const log = (await page.locator('#log').textContent())?.trim() || '(no topology log)';
  await testInfo.attach('topology.log', {
    body: Buffer.from(log),
    contentType: 'text/plain',
  });

  expect(status, log).toBe('PASS');
});
