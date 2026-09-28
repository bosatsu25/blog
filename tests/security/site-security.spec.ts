import { expect, test } from '@playwright/test';

const protectedPages = ['/', '/about/'];

test('production pages enforce a restrictive CSP and referrer policy', async ({ page }) => {
  for (const route of protectedPages) {
    await page.goto(route);

    const csp = await page
      .locator('meta[http-equiv="content-security-policy"]')
      .getAttribute('content');

    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("media-src 'none'");
    expect(csp).toContain("worker-src 'none'");
    expect(csp).toContain("img-src 'self' data:");
    expect(csp).toContain("font-src 'self'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("'unsafe-inline'");

    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
  }
});

test('pages make no third-party subresource requests', async ({ page }) => {
  const origins = new Set<string>();

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      origins.add(url.origin);
    }
  });

  for (const route of protectedPages) {
    await page.goto(route);
  }

  expect([...origins]).toEqual(['http://127.0.0.1:4322']);
});

test('CSP does not break the interactive theme island', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  const html = page.locator('html');
  const button = page.getByRole('button', { name: /mode に切り替える/ });
  const before = await html.getAttribute('data-theme');
  const expected = before === 'dark' ? 'light' : 'dark';

  await expect(button).toBeEnabled();
  await button.click();
  await expect(html).toHaveAttribute('data-theme', expected);

  expect(errors).toEqual([]);
});

test('public pages keep the active browser attack surface minimal', async ({ page }) => {
  for (const route of protectedPages) {
    await page.goto(route);

    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.locator('object')).toHaveCount(0);
    await expect(page.locator('embed')).toHaveCount(0);
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
    const response = await request.get(path, { failOnStatusCode: false });
    expect(response.status(), path).toBe(404);
  }
});

test('query-string input is not reflected into rendered content', async ({ page }) => {
  const probe = 'IKESAMA_SECURITY_PROBE_7f41c2';

  for (const route of protectedPages) {
    await page.goto(`${route}?q=${encodeURIComponent(probe)}`);
    await expect(page.locator('body')).not.toContainText(probe);
  }
});

test('external links do not receive referrer context or opener access', async ({ page }) => {
  await page.goto('/about/');

  const github = page.getByRole('link', { name: 'GitHub', exact: true });
  const rel = (await github.getAttribute('rel'))?.split(/\s+/) ?? [];

  expect(rel).toContain('noopener');
  expect(rel).toContain('noreferrer');
});
