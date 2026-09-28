import process from 'node:process';
import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';

const root = process.cwd();
const sourceRoot = resolve(root, 'src');
const distRoot = resolve(root, 'dist');
const failures = [];

const sourceExtensions = new Set(['.astro', '.js', '.jsx', '.mjs', '.ts', '.tsx']);
const forbiddenSourcePatterns = [
  ['Astro raw HTML injection', /\bset:html\s*=/],
  ['React raw HTML injection', /\bdangerouslySetInnerHTML\b/],
  ['DOM innerHTML assignment', /\.innerHTML\s*=/],
  ['eval()', /\beval\s*\(/],
  ['Function constructor', /\bnew\s+Function\s*\(/],
  ['document.write()', /\bdocument\.write\s*\(/],
];

const forbiddenDistNames = new Set([
  '.env',
  '.env.local',
  '.env.production',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolute)));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }

  return files;
}

function displayPath(file) {
  return relative(root, file).split(sep).join('/');
}

function fail(message) {
  failures.push(message);
}

for (const file of await walk(sourceRoot)) {
  if (!sourceExtensions.has(extname(file))) continue;

  const content = await readFile(file, 'utf8');
  for (const [label, pattern] of forbiddenSourcePatterns) {
    if (pattern.test(content)) {
      fail(`${displayPath(file)} uses forbidden sink: ${label}`);
    }
  }
}

for (const file of await walk(distRoot)) {
  const path = displayPath(file);
  const segments = path.split('/');
  const name = segments.at(-1)?.toLowerCase() ?? '';

  if (forbiddenDistNames.has(name)) {
    fail(`${path} must not be present in the deployment artifact`);
  }

  if (segments.includes('.git') || segments.includes('node_modules') || segments.includes('src')) {
    fail(`${path} exposes an internal project directory`);
  }

  if (path.endsWith('.map')) {
    fail(`${path} exposes a source map`);
  }

  if (extname(file) !== '.html') continue;

  const html = await readFile(file, 'utf8');

  if (!/<meta[^>]+http-equiv=["']content-security-policy["']/i.test(html)) {
    fail(`${path} is missing the generated Content-Security-Policy meta tag`);
  }

  if (/\b(?:src|srcset)=["'][^"']*https?:\/\//i.test(html)) {
    fail(`${path} loads an executable or media resource from a third-party origin`);
  }

  const resourceLinks = html.matchAll(
    /<link\b[^>]*\brel=["'](?:stylesheet|preload|modulepreload|icon)["'][^>]*\bhref=["']([^"']+)["']/gi,
  );

  for (const match of resourceLinks) {
    if (/^https?:\/\//i.test(match[1])) {
      fail(`${path} loads a linked resource from a third-party origin: ${match[1]}`);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write('Security audit failed:\n');
  for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  process.exit(1);
}

process.stdout.write('Security audit passed.\n');
