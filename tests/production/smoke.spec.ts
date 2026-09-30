import { expect, test, type Page } from '@playwright/test';
import { normalizeBase, resolveProductionUrl, withBase } from '../../src/config/site';

const productionURL = resolveProductionUrl(process.env.PRODUCTION_URL);
const siteBase = normalizeBase(productionURL.pathname);
const publicPath = (path: string): string => withBase(path, siteBase);
const htmlPages = ['/', '/archive/', '/about/'];

async function firstPublishedArticleHref(page: Page): Promise<string> {
  await page.goto(publicPath('/archive/'));
  const firstArticle = page.locator('.post-link').first();
  await expect(firstArticle).toBeVisible();

  const href = await firstArticle.getAttribute('href');
  if (!href) throw new Error('Production archive does not contain a published article link.');
  return href;
}

test.describe('production smoke', () => {
  for (const path of htmlPages) {
    test(`${path} loads without errors and enforces CSP`, async ({ page }) => {
      const assetResponses: Array<{ type: string; status: number }> = [];
      page.on('response', (response) => {
        const type = response.request().resourceType();
        if (type === 'stylesheet' || type === 'script') {
          assetResponses.push({ type, status: response.status() });
        }
      });

      const response = await page.goto(publicPath(path), { waitUntil: 'networkidle' });
      expect(response, `${path} should return a response`).not.toBeNull();
      expect(response?.status(), `${path} should not be an error page`).toBeLessThan(400);
      const canonicalPath = path === '/' ? siteBase : withBase(path, siteBase);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new URL(canonicalPath, productionURL.origin).href,
      );

      const cspMeta = page.locator('meta[http-equiv="content-security-policy"]');
      await expect(cspMeta).toHaveCount(1);
      const csp = await cspMeta.getAttribute('content');
      expect(csp, 'CSP should exist').toContain("default-src 'none'");
      expect(csp).not.toMatch(/'unsafe-(?:inline|eval)'/);

      expect(assetResponses.some(({ type }) => type === 'stylesheet')).toBe(true);
      expect(assetResponses.some(({ type }) => type === 'script')).toBe(true);
      expect(assetResponses.every(({ status }) => status < 400)).toBe(true);
    });
  }

  test('a published article discovered from production Archive is reachable', async ({ page }) => {
    const href = await firstPublishedArticleHref(page);
    const response = await page.goto(new URL(href, productionURL.origin).href, {
      waitUntil: 'networkidle',
    });

    expect(response).not.toBeNull();
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('.article-header h1')).toBeVisible();
    await expect(page.locator('.article-body')).toBeVisible();
    await expect(page.locator('.article-body')).toHaveCSS('user-select', 'none');
  });

  test('RSS and sitemap endpoints publish valid article references', async ({ page, request }) => {
    const rss = await request.get(publicPath('/rss.xml'));
    expect(rss.status()).toBe(200);
    expect(rss.headers()['content-type']).toMatch(
      /^(?:application\/(?:rss\+)?xml|text\/xml)(?:;|$)/i,
    );

    const xml = await rss.text();
    await page.goto(publicPath('/'));
    const parsedFeed = await page.evaluate((feed) => {
      const document = new DOMParser().parseFromString(feed, 'application/xml');
      return {
        hasParseError: document.querySelector('parsererror') !== null,
        itemLinks: Array.from(document.querySelectorAll('item link'), (link) => link.textContent),
      };
    }, xml);
    expect(parsedFeed.hasParseError).toBe(false);

    const articleLink = parsedFeed.itemLinks.find((link) => {
      if (!link) return false;
      return /\/writing\/.+\/$/.test(new URL(link).pathname);
    });
    if (!articleLink) throw new Error('RSS does not contain a published article URL.');

    const sitemapIndex = await request.get(publicPath('/sitemap-index.xml'));
    expect(sitemapIndex.status()).toBe(200);
    expect(sitemapIndex.headers()['content-type']).toContain('xml');
    const sitemapIndexXml = await sitemapIndex.text();
    const sitemapLocations = await page.evaluate((xmlContent) => {
      const document = new DOMParser().parseFromString(xmlContent, 'application/xml');
      return {
        hasParseError: document.querySelector('parsererror') !== null,
        locations: Array.from(document.querySelectorAll('loc'), (location) => location.textContent),
      };
    }, sitemapIndexXml);
    expect(sitemapLocations.hasParseError).toBe(false);
    expect(sitemapLocations.locations.length).toBeGreaterThan(0);

    const sitemapResponses = await Promise.all(
      sitemapLocations.locations.map((location) => {
        if (!location) throw new Error('Sitemap index contains an empty location.');
        return request.get(location);
      }),
    );
    for (const response of sitemapResponses) {
      expect(response.status()).toBe(200);
    }

    const sitemapDocuments = await Promise.all(sitemapResponses.map((response) => response.text()));
    expect(sitemapDocuments.some((sitemapXml) => sitemapXml.includes(articleLink))).toBe(true);
  });

  test('brand image, favicon, and Apple touch icon are served', async ({ request }) => {
    const response = await request.get(publicPath('/favicon.svg'));
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/svg+xml');

    for (const path of ['/favicon-32x32.png', '/apple-touch-icon.png', '/lotus-512.png']) {
      const image = await request.get(publicPath(path));
      expect(image.status(), `${path} should be served`).toBe(200);
      expect(image.headers()['content-type']).toContain('image/png');
    }
  });

  test('theme toggle and skip link work on the deployed site', async ({ page }) => {
    await page.goto(publicPath('/'), { waitUntil: 'networkidle' });

    const themeToggle = page.getByRole('button', { name: 'Dark mode' });
    await expect(themeToggle).toBeEnabled();
    const html = page.locator('html');
    const before = await html.getAttribute('data-theme');
    const expected = before === 'dark' ? 'light' : 'dark';
    await themeToggle.click();
    await expect(html).toHaveAttribute('data-theme', expected);
    await expect(themeToggle).toHaveAttribute('aria-pressed', String(expected === 'dark'));

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to content' });
    await expect(skipLink).toBeVisible();
    await skipLink.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('custom 404 page is served for missing routes', async ({ page, request }) => {
    const missingPath = publicPath('/does-not-exist-12345');
    const response = await request.get(missingPath, { failOnStatusCode: false });
    expect(response.status()).toBe(404);

    const rendered = await page.goto(missingPath, { waitUntil: 'domcontentloaded' });
    expect(rendered?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: /ページが見つかりません/ })).toBeVisible();
  });

  test('main navigation still points to viable public pages', async ({ page }) => {
    await page.goto(publicPath('/'));
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Archive', exact: true })).toHaveAttribute(
      'href',
      publicPath('/archive/'),
    );
    await expect(page.getByRole('link', { name: 'About' })).toHaveAttribute('href', /\/about\//);
  });

  test('social metadata references the deployed lotus brand asset', async ({ page }) => {
    await page.goto(publicPath('/'));
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      'content',
      '仏の道',
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      new URL(publicPath('/lotus-512.png'), productionURL.origin).href,
    );
  });
});
