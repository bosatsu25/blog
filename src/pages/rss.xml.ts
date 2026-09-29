import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { buildAbsoluteUrl, siteConfig } from '../config/site';
import { escapeXml } from '../lib/xml';

export { escapeXml } from '../lib/xml';

export async function GET({ site }: APIContext): Promise<Response> {
  const posts = (await getCollection('writing', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
  );

  if (!site) {
    throw new Error('Astro site URL must be configured to generate the RSS feed.');
  }

  const origin = site.origin;
  const base = import.meta.env.BASE_URL;
  const absoluteUrl = (path: string): string => buildAbsoluteUrl(base, origin, path);

  const items = posts
    .map(
      (post) => `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${absoluteUrl(`/writing/${post.id}/`)}</link>
      <guid>${absoluteUrl(`/writing/${post.id}/`)}</guid>
      <pubDate>${post.data.publishedAt.toUTCString()}</pubDate>
      <description>${escapeXml(post.data.description)}</description>
    </item>`,
    )
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${absoluteUrl('/')}</link>
    <description>${escapeXml(siteConfig.description)}</description>
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
