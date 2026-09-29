import { describe, expect, it } from 'vitest';
import { escapeXml } from './xml';

describe('escapeXml', () => {
  it('escapes every XML-sensitive character', () => {
    expect(escapeXml(`A & B < C > D "quoted" and 'quoted'`)).toBe(
      'A &amp; B &lt; C &gt; D &quot;quoted&quot; and &apos;quoted&apos;',
    );
  });
});
