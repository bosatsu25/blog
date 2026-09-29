type ExternalLinkDestination = {
  type: 'external';
  hostname: string;
  displayHost: string;
};

type LinkDestination = { type: 'internal' | 'special' } | ExternalLinkDestination;

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

type HastTree = HastNode & { children: HastNode[] };
type RehypeOptions = { siteUrl: string; siteBase?: string };

function invalidLink(href: string, reason: string): Error {
  return new Error(`Invalid Markdown link "${href}": ${reason}`);
}

export function classifyLink(href: string, siteUrl: string): LinkDestination {
  let site: URL;
  let destination: URL;

  try {
    site = new URL(siteUrl);
    destination = new URL(href, site);
  } catch {
    throw invalidLink(href, 'the URL is malformed.');
  }

  if (destination.protocol === 'mailto:' || destination.protocol === 'tel:') {
    return { type: 'special' };
  }

  if (destination.username || destination.password) {
    throw invalidLink(href, 'URLs containing credentials are not allowed.');
  }

  if (destination.origin === site.origin) {
    return { type: 'internal' };
  }

  if (destination.protocol !== 'https:') {
    const reason =
      destination.protocol === 'http:'
        ? 'HTTP links are not allowed; use HTTPS.'
        : `the "${destination.protocol}" scheme is not supported.`;
    throw invalidLink(href, reason);
  }

  return {
    type: 'external',
    hostname: destination.hostname,
    displayHost: destination.port
      ? `${destination.hostname}:${destination.port}`
      : destination.hostname,
  };
}

function addClass(properties: Record<string, unknown>, className: string): void {
  const existing = properties.className;
  const classes = Array.isArray(existing)
    ? existing.filter((value): value is string => typeof value === 'string')
    : typeof existing === 'string'
      ? existing.split(/\s+/).filter(Boolean)
      : [];

  properties.className = [...new Set([...classes, className])];
}

function createText(value: string): HastNode {
  return { type: 'text', value };
}

function createSpan(className: string, value: string, hidden = false): HastNode {
  const properties: Record<string, unknown> = { className: [className] };
  if (hidden) properties.ariaHidden = 'true';

  return {
    type: 'element',
    tagName: 'span',
    properties,
    children: [createText(value)],
  };
}

export function rehypeSecureExternalLinks({ siteUrl, siteBase = '/' }: RehypeOptions) {
  return (tree: HastTree): void => {
    const visit = (node: HastNode): void => {
      if (node.type === 'element' && node.tagName === 'a' && node.properties?.href !== undefined) {
        const href = node.properties.href;
        if (typeof href !== 'string') {
          throw invalidLink(String(href), 'the destination must be a URL string.');
        }

        const destination = classifyLink(href, siteUrl);
        if (destination.type === 'internal' && href.startsWith('/') && siteBase !== '/') {
          const basePath = siteBase.replace(/\/$/, '');
          if (href !== basePath && !href.startsWith(`${basePath}/`)) {
            node.properties.href = `${basePath}${href}`;
          }
        }

        if (destination.type === 'external') {
          const properties = node.properties;
          properties.target = '_blank';
          properties.rel = ['noopener', 'noreferrer', 'external'];
          properties.referrerPolicy = 'no-referrer';
          addClass(properties, 'external-link');
          node.children ??= [];
          node.children.push(
            createSpan('external-link__indicator', ' ↗', true),
            createSpan('external-link__hostname', destination.displayHost, true),
            createSpan(
              'external-link__description',
              `, external link to ${destination.displayHost}; opens in a new tab.`,
            ),
          );
        }
      }

      for (const child of node.children ?? []) visit(child);
    };

    visit(tree);
  };
}
