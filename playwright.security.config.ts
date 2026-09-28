import { defineConfig, devices } from '@playwright/test';

const siteBase = process.env.SITE_BASE ?? '/';
const previewBaseURL = new URL(
  siteBase.endsWith('/') ? siteBase : `${siteBase}/`,
  'http://127.0.0.1:4322',
).toString();

export default defineConfig({
  testDir: './tests/security',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: previewBaseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'npm run build && npm run security:audit && npm run preview -- --host 127.0.0.1 --port 4322',
    url: previewBaseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'security-chromium', use: { ...devices['Desktop Chrome'] } }],
});
