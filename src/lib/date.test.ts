import { describe, expect, it } from 'vitest';
import { formatBlogDate, formatDate } from './date';

describe('formatDate', () => {
  const instant = new Date('2026-09-28T00:00:00+09:00');

  it('formats dates in Japan time by default', () => {
    expect(formatDate(instant)).toBe('2026年9月28日');
  });

  it('supports an explicit timezone override', () => {
    expect(formatDate(instant, 'ja-JP', 'UTC')).toBe('2026年9月27日');
  });
});

describe('formatBlogDate', () => {
  const instant = new Date('2026-09-28T00:00:00+09:00');

  it('formats compact post-list dates', () => {
    expect(formatBlogDate(instant, 'compact')).toBe('Sep 28, 2026');
  });

  it('formats full article dates', () => {
    expect(formatBlogDate(instant, 'full')).toBe('September 28, 2026');
  });
});
