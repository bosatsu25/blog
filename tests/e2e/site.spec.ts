import { expect, test } from '@playwright/test';

test('home page uses the minimal blog composition', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.site-title')).toHaveText('Ikesama');
  await expect(page.getByRole('heading', { level: 2, name: 'Posts' })).toBeVisible();

  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'About', exact: true })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Writing', exact: true })).toBeVisible();

  await expect(page.locator('.page-shell')).toHaveCSS('max-width', '800px');
  await expect(page.locator('.post-list .post-link').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'RSS', exact: true })).toBeVisible();
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
    'href',
    /favicon\.svg$/,
  );
});

test('rss endpoint is generated from the writing collection', async ({ request }) => {
  const response = await request.get('/rss.xml');

  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('application/rss+xml');

  const body = await response.text();
  expect(body).toContain('<rss version="2.0">');
  expect(body).toContain('<title>Ikesama</title>');
  expect(body).toContain('Why this site is static-first');
});

test('project filter narrows the visible projects', async ({ page }) => {
  await page.goto('/projects/');

  const qaFilter = page.getByRole('button', { name: 'QA', exact: true });
  await expect(qaFilter).toBeEnabled();
  await qaFilter.click();

  await expect(qaFilter).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'ReflowPress', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'VoxelWeave', exact: true })).toHaveCount(0);
});

test('theme toggle changes the document theme', async ({ page }) => {
  await page.goto('/');

  const html = page.locator('html');
  const header = page.locator('.site-header');
  const button = header.getByRole('button', { name: /mode に切り替える/ });
  const before = await html.getAttribute('data-theme');
  const expected = before === 'dark' ? 'light' : 'dark';

  await expect(button).toBeEnabled();
  await button.click();

  await expect(html).toHaveAttribute('data-theme', expected);
  await expect(button).toHaveAttribute('data-hydrated', 'true');
});
