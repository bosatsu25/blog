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
  name: 'Ikesama',
  description: 'Software quality, test automation, frontend engineering and personal projects.',
  navigation: [
    { label: 'About', path: '/about/' },
    { label: 'Projects', path: '/projects/' },
    { label: 'Writing', path: '/writing/' },
  ],
} as const satisfies SiteConfig;

export function withBase(path: string, base: string): string {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const relativePath = path.replace(/^\/+/, '');

  return relativePath.length === 0 ? normalizedBase : `${normalizedBase}${relativePath}`;
}
