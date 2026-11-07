import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  testMatch: 'selftest.spec.mjs',
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  outputDir: 'test-results',
  reporter: [
    ['line'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  webServer: {
    command: 'node scripts/serve.mjs --port 4173',
    url: 'http://127.0.0.1:4173/test/selftest.html',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
