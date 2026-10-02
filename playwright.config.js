const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:6435',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
