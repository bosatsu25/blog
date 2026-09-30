const TOKYO_TIME_ZONE = 'Asia/Tokyo';

function partsFor(date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TOKYO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );
}

export function formatArticleId(date = new Date()) {
  const { year, month, day, hour, minute } = partsFor(date);
  return `${year.slice(-2)}${month}${day}-${hour}${minute}`;
}

export function formatPublishedDate(date = new Date()) {
  const { year, month, day } = partsFor(date);
  return `${year}-${month}-${day}`;
}

export function yamlSingleQuoted(value) {
  return `'${String(value).replace(/\r?\n/g, ' ').trim().replaceAll("'", "''")}'`;
}

export function setDraftState(markdown, draft) {
  const replacement = `draft: ${draft ? 'true' : 'false'}`;
  if (!/^draft:\s*(?:true|false)\s*$/m.test(markdown)) {
    throw new Error('Article frontmatter must contain an explicit draft field.');
  }
  return markdown.replace(/^draft:\s*(?:true|false)\s*$/m, replacement);
}

export function readFrontmatterString(markdown, field) {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if (!frontmatter) {
    throw new Error('Article must begin with YAML frontmatter.');
  }

  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = frontmatter.match(new RegExp(`^${escapedField}:\\s*(['"])(.*?)\\1\\s*$`, 'm'));
  if (!match) {
    throw new Error(`Article frontmatter field "${field}" must be a quoted string.`);
  }

  return match[2].replaceAll("''", "'");
}
