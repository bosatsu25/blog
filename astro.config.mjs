import process from 'node:process';
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { resolveDeploymentConfig } from './src/config/site.ts';
import { rehypeSecureExternalLinks } from './src/lib/secure-external-links.ts';

const deployment = resolveDeploymentConfig(process.env, process.argv.includes('build'));

export default defineConfig({
  site: deployment.siteUrl,
  base: deployment.base,
  integrations: [react(), sitemap()],
  markdown: {
    processor: unified({
      rehypePlugins: [
        [rehypeSecureExternalLinks, { siteUrl: deployment.siteUrl, siteBase: deployment.base }],
      ],
    }),
    syntaxHighlight: 'prism',
  },
  security: {
    csp: {
      algorithm: 'SHA-256',
      scriptDirective: {
        resources: ["'self'"],
      },
      styleDirective: {
        resources: ["'self'"],
      },
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
