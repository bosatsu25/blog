import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { siteConfig, withBase } from '../config/site';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function GET({ site }: APIContext): Promise<Response> {
  const posts = (await getCollection('writing', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
  );

  const origin = (site ?? new URL('http://localhost:4321')).origin;
  const base = import.meta.env.BASE_URL;
  const absoluteUrl = (path: string): string => new URL(withBase(path, base), origin).href;

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
