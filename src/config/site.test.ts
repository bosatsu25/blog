import { describe, expect, it } from 'vitest';
import {
  buildAbsoluteUrl,
  normalizeBase,
  resolveDeploymentConfig,
  resolveProductionUrl,
  siteConfig,
  withBase,
  withoutBase,
} from './site';

describe('siteConfig', () => {
  it('uses the blog identity and Archive/About navigation', () => {
    expect(siteConfig.name).toBe('仏の道');
    expect(siteConfig.navigation).toEqual([
      { label: 'Archive', path: '/archive/' },
      { label: 'About', path: '/about/' },
    ]);
  });
});

describe('withBase', () => {
  it('keeps root-relative paths unchanged for the root base', () => {
    expect(withBase('/', '/')).toBe('/');
    expect(withBase('/about/', '/')).toBe('/about/');
    expect(withBase('/rss.xml', '/')).toBe('/rss.xml');
  });

  it('adds the configured deployment base prefix', () => {
    expect(withBase('/', '/project')).toBe('/project/');
    expect(withBase('/about/', '/project')).toBe('/project/about/');
    expect(withBase('/rss.xml', '/project/')).toBe('/project/rss.xml');
  });

  it('normalizes trailing slash differences consistently', () => {
    expect(withBase('/about/', '/project/')).toBe('/project/about/');
    expect(withBase('/about/', '/project')).toBe('/project/about/');
    expect(withBase('about', '/project')).toBe('/project/about');
  });
});

describe('withoutBase', () => {
  it('removes a configured base path once and leaves similarly named paths unchanged', () => {
    expect(withoutBase('/project-site/', '/project-site/')).toBe('/');
    expect(withoutBase('/project-site/about/', '/project-site')).toBe('/about/');
    expect(withoutBase('/about/', '/')).toBe('/about/');
    expect(withoutBase('/project-site-extra/about/', '/project-site')).toBe(
      '/project-site-extra/about/',
    );
  });
});

describe('normalizeBase', () => {
  it('normalizes root and non-root paths with one trailing slash', () => {
    expect(normalizeBase('/')).toBe('/');
    expect(normalizeBase('/project')).toBe('/project/');
    expect(normalizeBase('/project/')).toBe('/project/');
  });

  it.each(['project', 'project/', '//project', '/project//', '/project/../root', '/project?x=1'])(
    'rejects malformed base %s',
    (base) => {
      expect(() => normalizeBase(base)).toThrow(/SITE_BASE/);
    },
  );
});

describe('buildAbsoluteUrl', () => {
  it('builds a full absolute URL from the configured base and origin', () => {
    expect(buildAbsoluteUrl('/project', 'https://example.test', '/')).toBe(
      'https://example.test/project/',
    );
    expect(buildAbsoluteUrl('/project', 'https://example.test', '/rss.xml')).toBe(
      'https://example.test/project/rss.xml',
    );
  });
});

describe('resolveDeploymentConfig', () => {
  it.each([
    [{ SITE_URL: 'https://example.test', SITE_BASE: '/' }, 'https://example.test/', '/'],
    [
      { SITE_URL: 'https://example.test/project-site', SITE_BASE: '/project-site' },
      'https://example.test/project-site/',
      '/project-site/',
    ],
  ])('resolves valid deployment shape %#', (environment, siteUrl, base) => {
    expect(resolveDeploymentConfig(environment)).toEqual({ siteUrl, base });
  });

  it('keeps local development defaults without weakening build validation', () => {
    expect(resolveDeploymentConfig({})).toEqual({
      siteUrl: 'http://localhost:4321/',
      base: '/',
    });
    expect(() => resolveDeploymentConfig({}, true)).toThrow(/require both SITE_URL and SITE_BASE/);
  });

  it.each([
    [{ SITE_URL: 'relative', SITE_BASE: '/' }],
    [{ SITE_URL: 'https://example.test', SITE_BASE: 'project' }],
    [{ SITE_URL: 'https://example.test/project', SITE_BASE: '/' }],
    [{ SITE_URL: 'https://example.test', SITE_BASE: '/project' }],
    [{ SITE_URL: 'https://example.test/?query=1', SITE_BASE: '/' }],
  ])('rejects invalid deployment configuration %#', (environment) => {
    expect(() => resolveDeploymentConfig(environment, true)).toThrow();
  });
});

describe('resolveProductionUrl', () => {
  it('requires a provider-neutral production URL and normalizes its base path', () => {
    expect(resolveProductionUrl('https://example.test/project').href).toBe(
      'https://example.test/project/',
    );
    expect(() => resolveProductionUrl(undefined)).toThrow(/PRODUCTION_URL/);
  });
});
