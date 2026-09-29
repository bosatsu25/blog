import { defineConfig, devices } from '@playwright/test';
import process from 'node:process';
import { resolveProductionUrl } from './src/config/site';

const productionURL = resolveProductionUrl(process.env.PRODUCTION_URL).href;

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
