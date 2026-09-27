import process from 'node:process';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const [owner = 'owner', repository = `${owner}.github.io`] = (
  process.env.GITHUB_REPOSITORY ?? `owner/owner.github.io`
).split('/');

const isUserSite = repository === `${owner}.github.io`;
const base = process.env.GITHUB_ACTIONS === 'true' && !isUserSite ? `/${repository}` : '/';

export default defineConfig({
  site: process.env.SITE_URL ?? `https://${owner}.github.io`,
  base,
  integrations: [react()],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
});
