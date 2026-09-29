export type SiteNavigationItem = Readonly<{
  label: string;
  path: `/${string}`;
}>;

export type SiteConfig = Readonly<{
  name: string;
  description: string;
  navigation: readonly SiteNavigationItem[];
}>;

export type DeploymentConfig = Readonly<{
  siteUrl: string;
  base: string;
}>;

export const siteConfig = {
  name: "Ikesama's Blog",
  description: 'Software quality, test automation, frontend engineering and personal projects.',
  navigation: [{ label: 'About', path: '/about/' }],
} as const satisfies SiteConfig;

function parseAbsoluteHttpUrl(value: string, variableName: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be an absolute HTTP(S) URL.`);
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `${variableName} must be an absolute HTTP(S) URL without credentials, query, or fragment.`,
    );
  }

  return url;
}

export function normalizeBase(base: string): string {
  if (base === '/') return '/';
  if (
    !base.startsWith('/') ||
    base.startsWith('//') ||
    base.includes('\\') ||
    base.includes('//') ||
    /[?#]/.test(base)
  ) {
    throw new Error('SITE_BASE must be "/" or an absolute URL path prefix.');
  }

  const pathWithoutTrailingSlash = base.endsWith('/') ? base.slice(0, -1) : base;
  const segments = pathWithoutTrailingSlash.slice(1).split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('SITE_BASE must not contain empty or dot path segments.');
  }

  return `${pathWithoutTrailingSlash}/`;
}

export function resolveDeploymentConfig(
  environment: Record<string, string | undefined>,
  requireExplicitValues = false,
): DeploymentConfig {
  const siteUrlValue = environment.SITE_URL;
  const siteBaseValue = environment.SITE_BASE;

  if (requireExplicitValues && (!siteUrlValue || !siteBaseValue)) {
    throw new Error('Production builds require both SITE_URL and SITE_BASE to be set explicitly.');
  }

  const base = normalizeBase(siteBaseValue ?? '/');
  const siteUrl = parseAbsoluteHttpUrl(siteUrlValue ?? 'http://localhost:4321', 'SITE_URL');
  const sitePath = normalizeBase(siteUrl.pathname);

  if (sitePath !== base) {
    throw new Error(`SITE_URL path "${sitePath}" must match SITE_BASE "${base}".`);
  }

  siteUrl.pathname = base;
  return { siteUrl: siteUrl.href, base };
}

export function resolveProductionUrl(value: string | undefined): URL {
  if (!value) {
    throw new Error('Production smoke tests require PRODUCTION_URL to be set explicitly.');
  }

  const url = parseAbsoluteHttpUrl(value, 'PRODUCTION_URL');
  url.pathname = normalizeBase(url.pathname);
  return url;
}

export function withBase(path: string, base: string): string {
  const normalizedBase = normalizeBase(base);
  const relativePath = path.replace(/^\/+/, '');

  if (relativePath.length === 0) {
    return normalizedBase;
  }

  if (normalizedBase === '/') {
    return `/${relativePath}`;
  }

  return `${normalizedBase}${relativePath}`;
}

export function withoutBase(path: string, base: string): string {
  const normalizedBase = normalizeBase(base);
  if (normalizedBase === '/' || !path.startsWith(normalizedBase)) return path;

  const relativePath = path.slice(normalizedBase.length);
  return relativePath ? `/${relativePath}` : '/';
}

export function buildAbsoluteUrl(base: string, origin: string, path: string): string {
  return new URL(withBase(path, base), origin).href;
}
