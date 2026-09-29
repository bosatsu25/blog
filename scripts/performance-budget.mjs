/* global process, console */

import { readdir, stat } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';

const root = process.cwd();
const distRoot = resolve(root, 'dist');
const budget = {
  totalJs: 240 * 1024,
  totalCss: 12 * 1024,
  largestJsChunk: 230 * 1024,
  sourceMaps: 0,
};

const failures = [];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

const files = await collectFiles(distRoot);
let totalJs = 0;
let totalCss = 0;
let largestJsChunk = 0;
let sourceMaps = 0;

for (const file of files) {
  const path = relative(root, file).split(sep).join('/');
  const size = (await stat(file)).size;
  const lower = file.toLowerCase();

  if (lower.endsWith('.js')) {
    totalJs += size;
    largestJsChunk = Math.max(largestJsChunk, size);
  }
  if (lower.endsWith('.css')) {
    totalCss += size;
  }
  if (lower.endsWith('.map')) {
    sourceMaps += size;
  }

  if (lower.endsWith('.map') && size > 0) {
    failures.push(`${path} exceeds the no-source-map budget`);
  }
}

for (const [key, limit] of Object.entries(budget)) {
  const value = {
    totalJs,
    totalCss,
    largestJsChunk,
    sourceMaps,
  }[key];

  if (value > limit) {
    failures.push(`${key}=${value} exceeds budget ${limit}`);
  }
}

if (failures.length > 0) {
  console.error('Performance budget failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Performance budget passed: JS=${totalJs} CSS=${totalCss} largest=${largestJsChunk} maps=${sourceMaps}`,
);
