import { describe, expect, it } from 'vitest';
import { siteConfig, withBase } from './site';

describe('siteConfig', () => {
  it('keeps navigation paths typed and rooted', () => {
    expect(siteConfig.navigation.map((item) => item.path)).toEqual([
      '/about/',
      '/projects/',
      '/writing/',
    ]);
  });
});

describe('withBase', () => {
  it('resolves project-pages paths without dropping the repository base', () => {
    expect(withBase('/writing/', '/ikesama.dev/')).toBe('/ikesama.dev/writing/');
  });

  it('resolves the site root', () => {
    expect(withBase('/', '/ikesama.dev/')).toBe('/ikesama.dev/');
  });
});
