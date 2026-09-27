import process from 'node:process';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const [owner = 'owner'] = (process.env.GITHUB_REPOSITORY ?? 'owner/owner.github.io').split('/');

export default defineConfig({
  site: process.env.SITE_URL ?? `https://${owner}.github.io`,
  base: process.env.SITE_BASE ?? '/',
  integrations: [react()],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
});
