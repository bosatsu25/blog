import { describe, expect, it } from 'vitest';
import { classifyLink, rehypeSecureExternalLinks } from './secure-external-links';

const siteUrl = 'https://ikesama.dev/site/';

describe('classifyLink', () => {
  it('identifies HTTPS links on another origin and extracts their destination host', () => {
    expect(classifyLink('https://docs.example.com:8443/guide', siteUrl)).toEqual({
      type: 'external',
      hostname: 'docs.example.com',
      displayHost: 'docs.example.com:8443',
    });
  });

  it.each(['/about/', './relative', '../relative', '#section', '******example.com/'])(
    'keeps relative link %s internal',
    (href) => {
      expect(classifyLink(href, siteUrl)).toEqual({ type: 'internal' });
    },
  );

  it('keeps an absolute URL on the configured site origin internal', () => {
    expect(classifyLink('https://ikesama.dev/another/path', siteUrl)).toEqual({
      type: 'internal',
    });
  });

  it('keeps links on a configured HTTP development origin internal', () => {
    expect(classifyLink('/about/', 'http://localhost:4321/site/')).toEqual({
      type: 'internal',
    });
  });

  it('treats an HTTPS protocol-relative destination as external', () => {
    expect(classifyLink('//docs.example.com/guide', siteUrl)).toEqual({
      type: 'external',
      hostname: 'docs.example.com',
      displayHost: 'docs.example.com',
    });
  });

  it('normalizes uppercase HTTPS schemes before classification', () => {
    expect(classifyLink('HTTPS://Docs.Example.com/guide', siteUrl)).toEqual({
      type: 'external',
      hostname: 'docs.example.com',
      displayHost: 'docs.example.com',
    });
  });

  it.each(['mailto:hello@example.com', 'tel:+123456789'])(
    'leaves supported special link %s undecorated',
    (href) => {
      expect(classifyLink(href, siteUrl)).toEqual({ type: 'special' });
    },
  );

  it.each([
    'http://example.com/',
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,hello',
    'vbscript:msgbox(1)',
    'file:///private/secret',
    'ftp://example.com/file',
    'https://user:pass@example.com/',
  ])('rejects unsupported or insecure destination %s', (href) => {
    expect(() => classifyLink(href, siteUrl)).toThrow(/Invalid Markdown link/);
  });

  it('reports a malformed URL as an authoring error', () => {
    expect(() => classifyLink('https://[invalid', siteUrl)).toThrow(/URL is malformed/);
  });
});

describe('rehypeSecureExternalLinks', () => {
  it('adds the external contract while preserving visible link content', () => {
    const link = {
      type: 'element',
      tagName: 'a',
      properties: { href: 'https://docs.example.com/guide', className: ['author-class'] },
      children: [{ type: 'text', value: 'Read the guide' }],
    };
    const tree = { type: 'root', children: [link] };

    rehypeSecureExternalLinks({ siteUrl })(tree);

    expect(link.properties).toMatchObject({
      href: 'https://docs.example.com/guide',
      target: '_blank',
      rel: ['noopener', 'noreferrer', 'external'],
      referrerPolicy: 'no-referrer',
      className: ['author-class', 'external-link'],
    });
    expect(link.children).toEqual([
      { type: 'text', value: 'Read the guide' },
      expect.objectContaining({
        tagName: 'span',
        properties: { className: ['external-link__indicator'], ariaHidden: 'true' },
      }),
      expect.objectContaining({
        tagName: 'span',
        properties: { className: ['external-link__hostname'], ariaHidden: 'true' },
        children: [{ type: 'text', value: 'docs.example.com' }],
      }),
      expect.objectContaining({
        tagName: 'span',
        properties: { className: ['external-link__description'] },
        children: [
          { type: 'text', value: ', external link to docs.example.com; opens in a new tab.' },
        ],
      }),
    ]);
  });

  it('does not decorate internal or special links', () => {
    const links = ['/about/', 'mailto:hello@example.com'].map((href) => ({
      type: 'element',
      tagName: 'a',
      properties: { href },
      children: [{ type: 'text', value: href }],
    }));
    const tree = { type: 'root', children: links };

    rehypeSecureExternalLinks({ siteUrl })(tree);

    expect(links.map((link) => link.properties)).toEqual([
      { href: '/about/' },
      { href: 'mailto:hello@example.com' },
    ]);
  });

  it('fails the build pipeline for dangerous schemes', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'a',
          properties: { href: 'data:text/html,hello' },
          children: [],
        },
      ],
    };

    expect(() => rehypeSecureExternalLinks({ siteUrl })(tree)).toThrow(
      /"data:" scheme is not supported/,
    );
  });
});
