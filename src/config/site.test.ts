import { describe, expect, it } from 'vitest';
import { buildAbsoluteUrl, normalizeBase, withBase } from './site';

describe('withBase', () => {
  it('keeps root-relative paths unchanged for the root base', () => {
    expect(withBase('/', '/')).toBe('/');
    expect(withBase('/about/', '/')).toBe('/about/');
    expect(withBase('/rss.xml', '/')).toBe('/rss.xml');
  });

  it('adds the GitHub Pages base prefix when configured', () => {
    expect(withBase('/', '/ikesama.dev')).toBe('/ikesama.dev/');
    expect(withBase('/about/', '/ikesama.dev')).toBe('/ikesama.dev/about/');
    expect(withBase('/rss.xml', '/ikesama.dev/')).toBe('/ikesama.dev/rss.xml');
  });

  it('normalizes trailing slash differences consistently', () => {
    expect(withBase('/about/', '/ikesama.dev/')).toBe('/ikesama.dev/about/');
    expect(withBase('/about/', '/ikesama.dev')).toBe('/ikesama.dev/about/');
    expect(withBase('about', '/ikesama.dev')).toBe('/ikesama.dev/about');
  });
});

describe('normalizeBase', () => {
  it('keeps the root path as root and preserves a non-root base', () => {
    expect(normalizeBase('/')).toBe('/');
    expect(normalizeBase('/ikesama.dev')).toBe('/ikesama.dev/');
    expect(normalizeBase('/ikesama.dev/')).toBe('/ikesama.dev/');
  });
});

describe('buildAbsoluteUrl', () => {
  it('builds a full absolute URL from the configured base and origin', () => {
    expect(buildAbsoluteUrl('/ikesama.dev', 'https://bosatsuking.github.io', '/')).toBe(
      'https://bosatsuking.github.io/ikesama.dev/',
    );
    expect(buildAbsoluteUrl('/ikesama.dev', 'https://bosatsuking.github.io', '/rss.xml')).toBe(
      'https://bosatsuking.github.io/ikesama.dev/rss.xml',
    );
  });
});
