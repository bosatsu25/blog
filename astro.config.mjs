import process from 'node:process';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const [owner = 'owner'] = (process.env.GITHUB_REPOSITORY ?? 'owner/owner.github.io').split('/');

export default defineConfig({
  site: process.env.SITE_URL ?? `https://${owner}.github.io`,
  base: process.env.SITE_BASE ?? '/',
  integrations: [react()],
  markdown: {
    syntaxHighlight: 'prism',
  },
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'none'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'none'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-src 'none'",
        "media-src 'none'",
        "worker-src 'none'",
      ],
    },
  },
});
