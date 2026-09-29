import { defineConfig, devices } from '@playwright/test';

const productionURL = process.env.PAGES_URL ?? 'https://bosatsuking.github.io/ikesama.dev';

export default defineConfig({
  testDir: './tests/production',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: productionURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'production-chromium', use: { ...devices['Desktop Chrome'] } }],
});
