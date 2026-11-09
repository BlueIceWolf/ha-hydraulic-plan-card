import { expect, test } from '@playwright/test';

test('1200 seeded hydraulic topologies validate and render deterministically', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const replaySeed = process.env.TOPOLOGY_SEED;
  await page.goto('/test/topology-generator.html' +
    (replaySeed ? '?seed=' + encodeURIComponent(replaySeed) : ''));
  expect(await page.evaluate(() => typeof HPC_MIGRATION)).toBe('object');
  await expect(page.locator('#result')).toHaveText(/^(PASS|FAIL)$/, { timeout: 230_000 });
  const report = await page.evaluate(() => window.topologyTestSummary);
  console.log('Topology run:', JSON.stringify({
    cases: report?.cases, valid: report?.valid,
    intentionallyInvalid: report?.intentionallyInvalid,
    structurallyDistinct: report?.structurallyDistinct,
    failed: report?.failed, failureCategories: report?.failureCategories,
    runtimeMs: report?.runtimeMs, baseSeed: report?.baseSeed,
  }));
  await testInfo.attach('hydraulic-topology-report.json', {
    body: Buffer.from(JSON.stringify(report, null, 2)),
    contentType: 'application/json',
  });
  expect(report, 'topology generator produced no report').toBeTruthy();
  expect(report.cases).toBe(replaySeed ? 1 : 1200);
  expect(report.failed, JSON.stringify(report.failures, null, 2)).toBe(0);
  expect(report.structurallyDistinct).toBe(report.cases);
  if (!replaySeed) {
    expect(report.valid).toBeGreaterThan(1000);
    expect(report.intentionallyInvalid).toBeGreaterThan(0);
  }
  expect((await page.locator('#result').textContent()).trim()).toBe('PASS');
});
