import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/accessibility',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4323',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4323',
    url: 'http://127.0.0.1:4323',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'a11y-chromium', use: { ...devices['Desktop Chrome'] } }],
});
