import { expect, test } from '@playwright/test';

const articleRoute = '/writing/quality-gates-for-a-small-site/';

test('article protection stays within the article body', async ({ page }) => {
  await page.goto(articleRoute);

  const articleBody = page.locator('.article-body');
  await expect(articleBody).toBeVisible();
  await expect(articleBody).toHaveCSS('user-select', 'none');
  await expect(page.getByRole('banner')).toHaveCSS('user-select', 'auto');
  await expect(page.getByRole('link', { name: 'About', exact: true })).toBeVisible();
  expect(await articleBody.evaluate((body) => getComputedStyle(body).backgroundImage)).toContain(
    'data:image/svg+xml',
  );

  const preventedEvents = await articleBody.evaluate((body) => {
    const dispatchCancelableEvent = (type: string): boolean =>
      !body.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));

    const clipboardPrevented = ['copy', 'cut'].map((type) => {
      const event = new ClipboardEvent(type, { bubbles: true, cancelable: true });
      body.dispatchEvent(event);
      return event.defaultPrevented;
    });

    return {
      clipboard: clipboardPrevented,
      contextmenu: dispatchCancelableEvent('contextmenu'),
      dragstart: dispatchCancelableEvent('dragstart'),
    };
  });

  expect(preventedEvents).toEqual({
    clipboard: [true, true],
    contextmenu: true,
    dragstart: true,
  });

  const shortcutsPrevented = await page.evaluate(() => {
    const target = document.querySelector('.article-body');
    if (!target) throw new Error('Article body was not rendered.');

    const range = document.createRange();
    range.selectNodeContents(target);
    window.getSelection()?.addRange(range);

    return ['c', 'x', 'p'].flatMap((key) =>
      [true, false].map((ctrlKey) => {
        const event = new KeyboardEvent('keydown', {
          key,
          ctrlKey,
          metaKey: !ctrlKey,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);
        return event.defaultPrevented;
      }),
    );
  });

  expect(shortcutsPrevented).toEqual(Array(6).fill(true));

  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  const outsideShortcutPrevented = await page.evaluate(() => {
    const event = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(outsideShortcutPrevented).toBe(false);
});

test('content protection does not apply to the About page', async ({ page }) => {
  await page.goto('/about/');

  await expect(page.locator('.article-body')).toHaveCount(0);
  await expect(page.locator('.prose-page__body')).toHaveCSS('user-select', 'auto');

  const selectionAllowed = await page.evaluate(() => {
    const aboutBody = document.querySelector('.prose-page__body');
    if (!aboutBody) throw new Error('About content was not rendered.');

    const range = document.createRange();
    range.selectNodeContents(aboutBody);
    window.getSelection()?.addRange(range);

    const event = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    window.getSelection()?.removeAllRanges();
    return !event.defaultPrevented;
  });
  expect(selectionAllowed).toBe(true);
});

test('article body is omitted from print and PDF output', async ({ page }) => {
  await page.goto(articleRoute);
  await page.emulateMedia({ media: 'print' });

  await expect(page.locator('.article-body')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Quality gates for a small site' })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
});
