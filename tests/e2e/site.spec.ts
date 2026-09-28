import { expect, test } from '@playwright/test';

test('home page exposes the blog and About navigation', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: "Ikesama's Blog", exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Posts', exact: true })).toBeVisible();

  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
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
    'https://github.com/bosatsuKing',
  );
  await expect(page.getByRole('link', { name: 'Blog', exact: true })).toHaveAttribute('href', /\/$/);
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
  const header = page.locator('.top');
  const button = header.getByRole('button', { name: /mode に切り替える/ });
  const before = await html.getAttribute('data-theme');
  const expected = before === 'dark' ? 'light' : 'dark';

  await expect(button).toBeEnabled();
  await button.click();

  await expect(html).toHaveAttribute('data-theme', expected);
  await expect(button).toHaveAttribute('data-hydrated', 'true');
});
