export type SiteNavigationItem = Readonly<{
  label: string;
  path: `/${string}`;
}>;

export type SiteConfig = Readonly<{
  name: string;
  description: string;
  navigation: readonly SiteNavigationItem[];
}>;

export const siteConfig = {
  name: "Ikesama's Blog",
  description: 'Software quality, test automation, frontend engineering and personal projects.',
  navigation: [{ label: 'About', path: '/about/' }],
} as const satisfies SiteConfig;

export function normalizeBase(base: string): string {
  return base === '/' ? '/' : base.endsWith('/') ? base : `${base}/`;
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

export function buildAbsoluteUrl(base: string, origin: string, path: string): string {
  return new URL(withBase(path, base), origin).href;
}
