import { describe, expect, it } from 'vitest';
import { formatDate } from './date';

describe('formatDate', () => {
  it('formats a date in Japanese', () => {
    expect(formatDate(new Date('2026-09-28T00:00:00+09:00'))).toBe('2026年9月28日');
  });
});
