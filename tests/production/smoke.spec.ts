import { expect, test } from '@playwright/test';
import { withBase } from '../../src/config/site';

const pagesURL = process.env.PAGES_URL ?? 'https://bosatsuking.github.io/ikesama.dev';
const siteBase = new URL(pagesURL).pathname.replace(/\/?$/, '/');
const publicPath = (path: string): string => withBase(path, siteBase);
const htmlPages = ['/', '/about/', '/writing/quality-gates-for-a-small-site/'];

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

  test('RSS and sitemap endpoints publish valid route references', async ({ page, request }) => {
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
    expect(
      parsedFeed.itemLinks.some((link) =>
        new URL(link ?? '').pathname.endsWith('/writing/quality-gates-for-a-small-site/'),
      ),
    ).toBe(true);

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
    expect(
      sitemapDocuments.some((sitemapXml) =>
        sitemapXml.includes('/writing/quality-gates-for-a-small-site/'),
      ),
    ).toBe(true);
  });

  test('favicon is served as SVG', async ({ request }) => {
    const response = await request.get(publicPath('/favicon.svg'));
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/svg+xml');
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
    await expect(page.getByRole('heading', { name: /Page not found/i })).toBeVisible();
  });

  test('main navigation still points to viable public pages', async ({ page }) => {
    await page.goto(publicPath('/'));
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' })).toHaveAttribute('href', /\/about\//);
  });

  test('article links expose secure external destinations without leaving production', async ({
    page,
  }) => {
    await page.goto(publicPath('/writing/quality-gates-for-a-small-site/'), {
      waitUntil: 'networkidle',
    });

    const articleBody = page.locator('.article-body');
    await expect(articleBody).toHaveCSS('user-select', 'none');
    const externalLink = articleBody.locator('a.external-link');
    await expect(externalLink).toHaveAttribute('href', 'https://playwright.dev/');
    await expect(externalLink).toHaveAttribute('target', '_blank');
    await expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer external');
    await expect(externalLink).toHaveAttribute('referrerpolicy', 'no-referrer');
    await expect(externalLink.locator('.external-link__hostname')).toHaveText('playwright.dev');

    const internalLink = articleBody.getByRole('link', { name: 'static-firstの記事' });
    await expect(internalLink).not.toHaveAttribute('target', '_blank');
    await expect(internalLink.locator('.external-link__hostname')).toHaveCount(0);
  });
});
