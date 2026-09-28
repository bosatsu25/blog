import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/security',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4322',
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'npm run build && npm run security:audit && npm run preview -- --host 127.0.0.1 --port 4322',
    url: 'http://127.0.0.1:4322',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'security-chromium', use: { ...devices['Desktop Chrome'] } }],
});
