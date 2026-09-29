import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/about/', '/writing/quality-gates-for-a-small-site/'];

test.describe('accessibility quality gate', () => {
  for (const route of routes) {
    test(`${route} has no critical accessibility violations`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('button', { name: 'Dark mode' })).toBeEnabled();
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }

  test('header actions remain in a single row and theme toggle exposes clear state', async ({
    page,
  }) => {
    await page.goto('/');
    const header = page.locator('.top');
    const actions = header.locator('.header-actions');
    const themeToggle = page.getByRole('button', { name: 'Dark mode' });

    await expect(actions).toBeVisible();
    await expect(themeToggle).toHaveAttribute('aria-pressed', /true|false/);
    await expect(themeToggle).toHaveAttribute('aria-label', 'Dark mode');
    await expect(actions).toHaveCSS('flex-direction', 'row');
    await expect(actions).toHaveCSS('flex-wrap', 'nowrap');

    const navigation = header.getByRole('navigation');
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

  test('skip link is present and keyboard navigation reaches the main content', async ({
    page,
  }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: /skip to content/i });
    await expect(skipLink).toBeVisible();
    await skipLink.focus();
    await skipLink.press('Enter');

    const main = page.locator('#main-content');
    await expect(main).toBeFocused();
  });
});
