import { describe, expect, it } from 'vitest';
import {
  formatArticleId,
  formatPublishedDate,
  readFrontmatterString,
  setDraftState,
  yamlSingleQuoted,
} from './post-utils.mjs';

describe('post authoring utilities', () => {
  const instant = new Date('2026-10-01T00:19:00.000Z');

  it('generates a Tokyo-local timestamp ID and publication date', () => {
    expect(formatArticleId(instant)).toBe('261001-0919');
    expect(formatPublishedDate(instant)).toBe('2026-10-01');
  });

  it('quotes YAML strings without losing apostrophes', () => {
    expect(yamlSingleQuoted("it's ready")).toBe("'it''s ready'");
  });

  it('changes only the explicit draft field', () => {
    const markdown = "---\ntitle: 'Draft'\ndraft: true\n---\n\nBody\n";
    expect(setDraftState(markdown, false)).toContain('draft: false');
    expect(() => setDraftState("---\ntitle: 'Draft'\n---\n", false)).toThrow(/draft field/);
  });

  it('reads a quoted frontmatter string', () => {
    const markdown = "---\ntitle: 'It''s ready'\ndraft: true\n---\n";
    expect(readFrontmatterString(markdown, 'title')).toBe("It's ready");
  });
});
