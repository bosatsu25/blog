import { describe, expect, it } from 'vitest';
import { buildArchive } from './archive';

const post = (id: string, category: string, publishedAt: string) => ({
  id,
  data: { category, publishedAt: new Date(publishedAt), title: id },
});

describe('buildArchive', () => {
  it('groups by category, year, and month, sorting each level newest first', () => {
    const archive = buildArchive([
      post('older', '技術', '2025-01-15'),
      post('latest', '技術', '2026-09-28'),
      post('middle', '技術', '2026-03-02'),
      post('daily', '日々', '2026-02-01'),
    ]);

    expect(archive.map(({ name }) => name)).toEqual(
      ['技術', '日々'].sort((a, b) => a.localeCompare(b, 'ja')),
    );
    expect(archive[0]?.years.map(({ year }) => year)).toEqual([2026, 2025]);
    expect(archive[0]?.years[0]?.months.map(({ month }) => month)).toEqual([9, 3]);
    expect(archive[0]?.years[0]?.months[0]?.posts.map(({ id }) => id)).toEqual(['latest']);
  });

  it('returns no groups when there are no published articles', () => {
    expect(buildArchive([])).toEqual([]);
  });
});
