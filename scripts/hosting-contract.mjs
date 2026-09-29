import process from 'node:process';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { URL } from 'node:url';

const root = process.cwd();
const dist = resolve(root, 'dist');
const rootSiteUrl = process.env.SITE_URL;
const rootBase = process.env.SITE_BASE;
const npmCli = process.env.npm_execpath;

function fail(message) {
  throw new Error(`Hosting contract failed: ${message}`);
}

function normalizeSiteUrl(value, base) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail('SITE_URL must be an absolute URL.');
  }
  const expectedPath = base === '/' ? '/' : base.endsWith('/') ? base : `${base}/`;
  if (url.pathname !== expectedPath || url.search || url.hash || url.username || url.password) {
    fail(`SITE_URL path must match SITE_BASE (${expectedPath}).`);
  }
  return `${url.origin}${expectedPath}`;
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    }),
  );
  return nested.flat();
}

async function assertArtifact(base, siteUrl) {
  const htmlFiles = await walk(dist);
  const htmlPages = new Map(
    await Promise.all(
      htmlFiles
        .filter((path) => extname(path) === '.html')
        .map(async (path) => [
          relative(dist, path).split(sep).join('/'),
          await readFile(path, 'utf8'),
        ]),
    ),
  );

  const routes = new Map([
    ['index.html', '/'],
    ['archive/index.html', '/archive/'],
    ['about/index.html', '/about/'],
    ['writing/index.html', '/writing/'],
    [
      'writing/quality-gates-for-a-small-site/index.html',
      '/writing/quality-gates-for-a-small-site/',
    ],
    ['404.html', '/404/'],
  ]);

  if (htmlPages.has('projects/index.html')) {
    fail('Projects route must not be included in the blog artifact.');
  }

  for (const [file, route] of routes) {
    const html = htmlPages.get(file);
    if (!html) fail(`expected route artifact ${file} is missing.`);
    const canonical = html.match(/<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]+)"/i)?.[1];
    if (canonical !== `${siteUrl}${route.slice(1)}`) {
      fail(`${file} canonical should be ${siteUrl}${route.slice(1)}, got ${canonical ?? 'none'}.`);
    }
  }

  const prefix = base === '/' ? '' : base.slice(0, -1);
  let sawThemeScript = false;
  let sawStylesheet = false;
  let sawFavicon = false;
  let sawLotusBrandImage = false;
  for (const [file, html] of htmlPages) {
    for (const [, reference] of html.matchAll(/\b(?:href|src)="([^"]+)"/gi)) {
      if (reference.startsWith('/')) {
        if (prefix && !reference.startsWith(`${prefix}/`)) {
          fail(`${file} contains a root-relative URL outside SITE_BASE: ${reference}`);
        }
        if (!prefix && reference.startsWith('/ikesama.dev/')) {
          fail(`${file} contains the GitHub Pages base path in a root deployment.`);
        }
      }
    }
    if (/src=["'][^"']*theme-init\.js/i.test(html)) sawThemeScript = true;
    if (/rel=["']stylesheet["'][^>]*href=/i.test(html)) sawStylesheet = true;
    if (/rel=["']icon["'][^>]*href=/i.test(html)) sawFavicon = true;
    if (/lotus-512\.png/.test(html)) sawLotusBrandImage = true;
  }
  for (const asset of ['lotus-512.png', 'favicon-32x32.png', 'apple-touch-icon.png']) {
    if (!existsSync(join(dist, asset))) fail(`expected branding asset ${asset} is missing.`);
  }
  if (!sawThemeScript || !sawStylesheet || !sawFavicon || !sawLotusBrandImage) {
    fail('generated pages must include theme, stylesheet, favicon, and lotus brand resources.');
  }

  const rss = await readFile(join(dist, 'rss.xml'), 'utf8');
  if (!rss.includes(`<link>${siteUrl}</link>`) || !rss.includes(`${siteUrl}writing/`)) {
    fail('RSS channel and article URLs must include the configured SITE_URL and base.');
  }

  const xmlFiles = htmlFiles.filter((path) => extname(path) === '.xml');
  const sitemapContent = await Promise.all(xmlFiles.map((path) => readFile(path, 'utf8')));
  if (!sitemapContent.some((content) => content.includes(`${siteUrl}writing/`))) {
    fail('sitemap must publish article URLs under the configured SITE_URL and base.');
  }

  process.stdout.write(`Hosting artifact passed for SITE_URL=${siteUrl} SITE_BASE=${base}\n`);
}

if (!rootSiteUrl || rootBase !== '/' || !npmCli) {
  fail('the initial build must use an explicit root SITE_URL and SITE_BASE=/.');
}

const rootBuild = spawnSync(process.execPath, [npmCli, 'run', 'build:astro'], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});
if (rootBuild.error) throw rootBuild.error;
if (rootBuild.status !== 0) process.exit(rootBuild.status ?? 1);

const normalizedRootSiteUrl = normalizeSiteUrl(rootSiteUrl, rootBase);
await assertArtifact('/', normalizedRootSiteUrl);

const subpathBase = '/ikesama.dev';
const subpathSiteUrl = 'https://example.test/ikesama.dev/';
const build = spawnSync(process.execPath, [npmCli, 'run', 'build:astro'], {
  cwd: root,
  env: {
    ...process.env,
    SITE_URL: subpathSiteUrl,
    SITE_BASE: subpathBase,
  },
  stdio: 'inherit',
});

if (build.error) throw build.error;
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

await assertArtifact(`${subpathBase}/`, subpathSiteUrl);
