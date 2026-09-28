export type BlogDateStyle = 'compact' | 'full';

export function formatDate(date: Date, locale = 'ja-JP', timeZone = 'Asia/Tokyo'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  }).format(date);
}

export function formatBlogDate(
  date: Date,
  style: BlogDateStyle = 'full',
  timeZone = 'Asia/Tokyo',
): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: style === 'compact' ? 'short' : 'long',
    day: 'numeric',
    timeZone,
  }).format(date);
}
