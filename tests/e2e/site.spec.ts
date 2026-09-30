import { expect, test, type Page } from '@playwright/test';

async function firstPublishedArticleHref(page: Page): Promise<string> {
  await page.goto('/archive/');
  const firstArticle = page.locator('.post-link').first();
  await expect(firstArticle).toBeVisible();

  const href = await firstArticle.getAttribute('href');
  expect(href).toBeTruthy();
  expect(href).toMatch(/\/writing\/.+\/$/);
  return href ?? '/';
}

test('home page exposes the blog identity and primary navigation', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: '仏の道 — Home', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '最近の記事', exact: true })).toBeVisible();

  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(navigation.getByRole('link', { name: 'Archive', exact: true })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'About', exact: true })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Projects', exact: true })).toHaveCount(0);
  await expect(navigation.getByRole('link', { name: 'Writing', exact: true })).toHaveCount(0);

  await expect(page.getByRole('link', { name: 'RSS', exact: true })).toHaveAttribute(
    'href',
    /rss\.xml$/,
  );
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
    'href',
    /favicon\.svg$/,
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    /apple-touch-icon\.png$/,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /lotus-512\.png$/,
  );
});

test('about page presents the public profile without detailed personal information', async ({
  page,
}) => {
  await page.goto('/about/');

  await expect(page.getByRole('heading', { name: 'About', exact: true })).toBeVisible();
  await expect(page.getByText("I'm Ikesama, a QA Engineer / Software Engineer.")).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What I work with', exact: true })).toBeVisible();
  await expect(page.getByText('Java · Python · TypeScript')).toBeVisible();
  await expect(page.getByText('Karate · Playwright · JUnit')).toBeVisible();

  await expect(page.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute(
    'href',
    'https://github.com/bosatsu25',
  );
  await expect(page.getByRole('link', { name: '仏の道', exact: true })).toHaveAttribute(
    'href',
    /\/$/,
  );
});

test('archive exposes categorized dated writing without depending on a fixed article', async ({
  page,
}) => {
  await page.goto('/archive/');

  await expect(page.getByRole('heading', { name: '記事一覧', exact: true })).toBeVisible();
  await expect(page.locator('.archive-category').first()).toBeVisible();
  await expect(page.locator('.archive-year').first()).toBeVisible();
  await expect(page.locator('.archive-month').first()).toBeVisible();

  const firstArticle = page.locator('.post-link').first();
  await expect(firstArticle).toBeVisible();
  await expect(firstArticle).toHaveAttribute('href', /\/writing\/.+\/$/);
});

test('/writing/ remains a compatible link to the Archive', async ({ page }) => {
  await page.goto('/writing/');

  await expect(page.getByRole('heading', { name: '記事一覧', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Archiveを開く →', exact: true })).toHaveAttribute(
    'href',
    '/archive/',
  );
});

test('header navigation and theme toggle stay aligned on desktop and mobile', async ({ page }) => {
  await page.goto('/');

  const actions = page.locator('.header-actions');
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  const themeToggle = page.getByRole('button', { name: 'Dark mode' });

  await expect(actions).toHaveCSS('flex-direction', 'row');
  await expect(actions).toHaveCSS('flex-wrap', 'nowrap');

  const navigationBox = await navigation.boundingBox();
  const toggleBox = await themeToggle.boundingBox();
  expect(navigationBox).not.toBeNull();
  expect(toggleBox).not.toBeNull();
  expect(
    Math.abs(
      (navigationBox?.y ?? 0) +
        (navigationBox?.height ?? 0) / 2 -
        ((toggleBox?.y ?? 0) + (toggleBox?.height ?? 0) / 2),
    ),
  ).toBeLessThan(4);
});

test('theme toggle changes the document theme', async ({ page }) => {
  await page.goto('/');

  const html = page.locator('html');
  const header = page.getByRole('banner');
  const navigation = header.getByRole('navigation', { name: 'Primary navigation' });
  const button = header.getByRole('button', { name: 'Dark mode' });

  await expect(navigation.getByRole('link', { name: 'Archive', exact: true })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'About', exact: true })).toBeVisible();
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute('title', 'Toggle dark mode');

  const before = await html.getAttribute('data-theme');
  const expected = before === 'dark' ? 'light' : 'dark';
  await expect(button).toBeEnabled();
  await button.click();

  await expect(html).toHaveAttribute('data-theme', expected);
  await expect(button).toHaveAttribute('data-hydrated', 'true');
  await expect(button).toHaveAttribute('aria-pressed', String(expected === 'dark'));
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('theme'))).toBe(expected);
});

test('RSS feed contains valid XML and at least one published article', async ({ page }) => {
  await page.goto('/');
  const response = await page.request.get('/rss.xml');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('application/rss+xml');

  const xml = await response.text();
  const parsedFeed = await page.evaluate((feed) => {
    const document = new DOMParser().parseFromString(feed, 'application/xml');
    return {
      hasParseError: document.querySelector('parsererror') !== null,
      itemLinks: Array.from(document.querySelectorAll('item link'), (link) => link.textContent),
    };
  }, xml);

  expect(parsedFeed.hasParseError).toBe(false);
  const itemPaths = parsedFeed.itemLinks.flatMap((link) => (link ? [new URL(link).pathname] : []));
  expect(itemPaths.some((path) => /\/writing\/.+\/$/.test(path))).toBe(true);
});

test('a published article discovered from the archive renders normally', async ({ page }) => {
  const href = await firstPublishedArticleHref(page);
  const response = await page.goto(href);

  expect(response).not.toBeNull();
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator('.article-header h1')).toBeVisible();
  await expect(page.locator('.article-body')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/writing\/.+\/$/);
});
