import { expect, test } from '@playwright/test';
import { readdir } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { withBase } from '../../src/config/site';

const distRoot = resolve(process.cwd(), 'dist');
const siteBase = process.env.SITE_BASE ?? '/';

type PublicHtmlPage = {
  artifact: string;
  route: string;
};

async function findHtmlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return findHtmlFiles(path);
      return entry.isFile() && entry.name.toLowerCase().endsWith('.html') ? [path] : [];
    }),
  );

  return nestedFiles.flat();
}

function routeForArtifact(artifact: string): string {
  if (artifact === 'index.html') return '/';
  if (artifact.endsWith('/index.html')) return `/${artifact.slice(0, -'index.html'.length)}`;
  return `/${artifact}`;
}

async function getPublicHtmlPages(): Promise<PublicHtmlPage[]> {
  const files = await findHtmlFiles(distRoot);
  if (files.length === 0) {
    throw new Error(
      `No generated HTML pages found under ${distRoot}; build the production site first.`,
    );
  }

  return files
    .map((file) => {
      const artifact = relative(distRoot, file).split(sep).join('/');
      return {
        artifact,
        route: withBase(routeForArtifact(artifact), siteBase),
      };
    })
    .sort((left, right) => left.artifact.localeCompare(right.artifact));
}

test('every production HTML page enforces restrictive CSP and referrer policy', async ({
  page,
}) => {
  const pages = await getPublicHtmlPages();

  for (const { artifact, route } of pages) {
    await test.step(`${artifact} at ${route}`, async () => {
      await page.goto(route);

      const csp = await page
        .locator('meta[http-equiv="content-security-policy"]')
        .getAttribute('content');

      expect(csp, artifact).toBeTruthy();
      const directives = (csp ?? '')
        .split(';')
        .map((directive) => directive.trim().split(/\s+/))
        .filter(([name]) => name !== undefined && name.length > 0);
      const sourceMap = new Map(directives.map(([name, ...sources]) => [name, sources]));
      const sources = (name: string): string[] => sourceMap.get(name) ?? [];
      const allowedGeneratedSources = (name: string): string[] => {
        const values = sources(name);
        expect(values).toContain("'self'");
        for (const value of values.filter((source) => source !== "'self'")) {
          expect(value).toMatch(/^'sha256-[A-Za-z0-9+/]+={0,2}'$/);
        }
        return values.filter((source) => source !== "'self'");
      };

      expect(sourceMap.size).toBe(directives.length);
      expect([...sourceMap.keys()].sort()).toEqual(
        [
          'base-uri',
          'connect-src',
          'default-src',
          'font-src',
          'form-action',
          'frame-src',
          'img-src',
          'media-src',
          'object-src',
          'script-src',
          'style-src',
          'worker-src',
        ].sort(),
      );
      expect(sources('default-src')).toEqual(["'none'"]);
      expect(sources('connect-src')).toEqual(["'none'"]);
      expect(sources('object-src')).toEqual(["'none'"]);
      expect(sources('base-uri')).toEqual(["'none'"]);
      expect(sources('form-action')).toEqual(["'none'"]);
      expect(sources('frame-src')).toEqual(["'none'"]);
      expect(sources('media-src')).toEqual(["'none'"]);
      expect(sources('worker-src')).toEqual(["'none'"]);
      expect(sources('img-src')).toEqual(["'self'", 'data:']);
      expect(sources('font-src')).toEqual(["'self'"]);
      allowedGeneratedSources('script-src');
      allowedGeneratedSources('style-src');
      expect(csp).not.toMatch(/'unsafe-(?:inline|eval)'|\*/);
      await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
    });
  }
});

test('production HTML pages make no third-party requests', async ({ page }) => {
  const baseURL = test.info().project.use.baseURL;
  if (typeof baseURL !== 'string') {
    throw new Error('The security Playwright project must configure a baseURL.');
  }

  const allowedOrigin = new URL(baseURL).origin;
  const thirdPartyRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== allowedOrigin) {
      thirdPartyRequests.push(url.href);
    }
  });

  for (const { artifact, route } of await getPublicHtmlPages()) {
    await test.step(`${artifact} at ${route}`, async () => {
      const requestCount = thirdPartyRequests.length;
      await page.goto(route);
      expect(thirdPartyRequests.slice(requestCount), artifact).toEqual([]);
    });
  }

  expect(thirdPartyRequests).toEqual([]);
});

test('production HTML pages have no CSP violations or runtime errors', async ({ page }) => {
  const errors: string[] = [];

  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      document.documentElement.setAttribute('data-csp-violation', event.violatedDirective);
    });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  for (const { artifact, route } of await getPublicHtmlPages()) {
    await test.step(`${artifact} at ${route}`, async () => {
      await page.goto(route);
      await expect(page.locator('html')).not.toHaveAttribute('data-csp-violation');
    });
  }

  expect(errors).toEqual([]);
});

test('CSP does not break the interactive theme island', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(withBase('/', siteBase));

  const html = page.locator('html');
  const button = page.getByRole('button', { name: 'Dark mode' });
  const before = await html.getAttribute('data-theme');
  const expected = before === 'dark' ? 'light' : 'dark';

  await expect(button).toBeEnabled();
  await expect(button).toHaveAttribute('title', 'Toggle dark mode');
  await button.click();
  await expect(html).toHaveAttribute('data-theme', expected);
  await expect(button).toHaveAttribute('aria-pressed', String(expected === 'dark'));
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('theme'))).toBe(expected);

  expect(errors).toEqual([]);
});

test('production pages keep attack surface and external links safe', async ({ page }) => {
  for (const { artifact, route } of await getPublicHtmlPages()) {
    await test.step(`${artifact} at ${route}`, async () => {
      await page.goto(route);

      await expect(page.locator('form')).toHaveCount(0);
      await expect(page.locator('iframe')).toHaveCount(0);
      await expect(page.locator('object')).toHaveCount(0);
      await expect(page.locator('embed')).toHaveCount(0);

      const unsafeExternalLinks = await page
        .locator('a[href^="http://"], a[href^="https://"]')
        .evaluateAll((anchors) =>
          anchors
            .filter((anchor): anchor is HTMLAnchorElement => anchor instanceof HTMLAnchorElement)
            .filter((anchor) => anchor.target === '_blank')
            .filter((anchor) => {
              const rel = anchor.rel.split(/\s+/);
              return !rel.includes('noopener') || !rel.includes('noreferrer');
            })
            .map((anchor) => anchor.href),
        );
      expect(unsafeExternalLinks, artifact).toEqual([]);
    });
  }
});

test('common sensitive project paths are not publicly exposed', async ({ request }) => {
  const sensitivePaths = [
    '/.env',
    '/.env.local',
    '/.git/config',
    '/package.json',
    '/package-lock.json',
    '/tsconfig.json',
    '/src/pages/index.astro',
    '/node_modules/astro/package.json',
  ];

  for (const path of sensitivePaths) {
    const response = await request.get(withBase(path, siteBase), { failOnStatusCode: false });
    expect(response.status(), path).toBe(404);
  }
});

test('query-string input is not reflected into any production HTML page', async ({ page }) => {
  const probe = 'IKESAMA_SECURITY_PROBE_7f41c2';

  for (const { artifact, route } of await getPublicHtmlPages()) {
    await test.step(`${artifact} at ${route}`, async () => {
      await page.goto(`${route}?q=${encodeURIComponent(probe)}`);
      await expect(page.locator('body')).not.toContainText(probe);
      expect(await page.content(), artifact).not.toContain(probe);
    });
  }
});

test('every generated HTML artifact is reachable, including the 404 document', async ({ page }) => {
  for (const { artifact, route } of await getPublicHtmlPages()) {
    await test.step(`${artifact} at ${route}`, async () => {
      const response = await page.goto(route);
      expect(response, artifact).not.toBeNull();
      expect(response?.status(), artifact).toBeLessThan(400);
    });
  }
});
