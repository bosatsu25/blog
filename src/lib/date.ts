export function formatDate(
  date: Date,
  locale = 'ja-JP',
  timeZone = 'Asia/Tokyo',
): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  }).format(date);
}
