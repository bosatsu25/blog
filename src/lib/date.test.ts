import { describe, expect, it } from 'vitest';
import { formatDate } from './date';

describe('formatDate', () => {
  const instant = new Date('2026-09-28T00:00:00+09:00');

  it('formats dates in Japan time by default', () => {
    expect(formatDate(instant)).toBe('2026年9月28日');
  });

  it('supports an explicit timezone override', () => {
    expect(formatDate(instant, 'ja-JP', 'UTC')).toBe('2026年9月27日');
  });
});
