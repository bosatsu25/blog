type ArchivePost = {
  id: string;
  data: {
    category: string;
    publishedAt: Date;
    title: string;
  };
};

export type ArchiveMonth<T extends ArchivePost> = Readonly<{
  year: number;
  month: number;
  posts: T[];
}>;

export type ArchiveYear<T extends ArchivePost> = Readonly<{
  year: number;
  months: ArchiveMonth<T>[];
}>;

export type ArchiveCategory<T extends ArchivePost> = Readonly<{
  name: string;
  years: ArchiveYear<T>[];
}>;

export function buildArchive<T extends ArchivePost>(posts: T[]): ArchiveCategory<T>[] {
  const categories = new Map<string, Map<number, Map<number, T[]>>>();

  for (const post of posts) {
    const date = post.data.publishedAt;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    let years = categories.get(post.data.category);
    if (!years) {
      years = new Map();
      categories.set(post.data.category, years);
    }

    let months = years.get(year);
    if (!months) {
      months = new Map();
      years.set(year, months);
    }

    const monthPosts = months.get(month) ?? [];
    monthPosts.push(post);
    months.set(month, monthPosts);
  }

  return [...categories.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'ja'))
    .map(([name, years]) => ({
      name,
      years: [...years.entries()]
        .sort(([left], [right]) => right - left)
        .map(([year, months]) => ({
          year,
          months: [...months.entries()]
            .sort(([left], [right]) => right - left)
            .map(([month, monthPosts]) => ({
              year,
              month,
              posts: monthPosts.sort(
                (left, right) => right.data.publishedAt.valueOf() - left.data.publishedAt.valueOf(),
              ),
            })),
        })),
    }));
}
