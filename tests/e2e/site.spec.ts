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
  await expect(page.getByRole('link', { name: 'Blog', exact: true })).toHaveAttribute(
    'href',
    /\/$/,
  );
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

test('RSS feed contains valid XML and links to published writing', async ({ page }) => {
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
  expect(itemPaths).toContain('/writing/quality-gates-for-a-small-site/');
});

test('article links expose safe external destinations and preserve internal navigation', async ({
  page,
}) => {
  let externalReferrer: string | undefined;
  await page.context().route('https://playwright.dev/**', async (route) => {
    externalReferrer = (await route.request().allHeaders()).referer;
    await route.fulfill({
      contentType: 'text/html',
      body: '<title>Mocked documentation</title>',
    });
  });
  await page.goto('/writing/quality-gates-for-a-small-site/');

  const articleBody = page.locator('.article-body');
  const externalLink = articleBody.locator('a.external-link');
  await expect(externalLink).toHaveAttribute('href', 'https://playwright.dev/');
  await expect(externalLink).toHaveAttribute('target', '_blank');
  await expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer external');
  await expect(externalLink).toHaveAttribute('referrerpolicy', 'no-referrer');
  await expect(externalLink.locator('.external-link__indicator')).toHaveText(' ↗');
  await expect(externalLink.locator('.external-link__hostname')).toHaveText('playwright.dev');
  await expect(externalLink).toHaveAccessibleName(
    /Playwright.*external link to playwright\.dev; opens in a new tab\./i,
  );
  await externalLink.focus();
  await expect(externalLink).toBeFocused();

  const popupPromise = page.waitForEvent('popup');
  await page.keyboard.press('Enter');
  const popup = await popupPromise;
  await expect(popup).toHaveTitle('Mocked documentation');
  expect(externalReferrer).toBeUndefined();

  const internalLink = articleBody.getByRole('link', { name: 'static-firstの記事' });
  await expect(internalLink).toHaveAttribute('href', '/writing/why-this-site-is-static-first/');
  await expect(internalLink).not.toHaveAttribute('target', '_blank');
  await expect(internalLink).not.toHaveClass(/external-link/);
  await expect(internalLink.locator('.external-link__hostname')).toHaveCount(0);
  await internalLink.focus();
  await expect(internalLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/writing\/why-this-site-is-static-first\/$/);
});
