const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/smoke',
  fullyParallel: false,
  forbidOnly: true,
  retries: 2,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['line']] : 'list',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.UAT_BASE_URL || 'https://rickliky.github.io/table-tennis/uat/',
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  }
});
