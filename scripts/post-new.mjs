import { access, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { formatArticleId, formatPublishedDate, yamlSingleQuoted } from './post-utils.mjs';

const articleDirectory = resolve(process.cwd(), 'src/content/writing');
const categories = ['仏教', '日々', '技術'];

async function askRequired(rl, label) {
  while (true) {
    const value = (await rl.question(\`${label}: \`)).trim();
    if (value) return value;
    output.write('空欄にはできません。\n');
  }
}

async function chooseCategory(rl) {
  output.write('カテゴリ:\n');
  categories.forEach((category, index) => output.write(\`  ${index + 1}. ${category}\n\`));

  while (true) {
    const answer = (await rl.question('番号を選択: ')).trim();
    const index = Number(answer) - 1;
    if (Number.isInteger(index) && categories[index]) return categories[index];
    output.write('1〜3の番号で選択してください。\n');
  }
}

async function nextAvailablePath(baseId) {
  for (let attempt = 1; attempt <= 99; attempt += 1) {
    const suffix = attempt === 1 ? '' : \`-${String(attempt).padStart(2, '0')}\`;
    const filePath = resolve(articleDirectory, \`${baseId}${suffix}.md\`);
    try {
      await access(filePath);
    } catch {
      return filePath;
    }
  }

  throw new Error('同じ時刻の記事IDが多すぎるため、ファイル名を確保できませんでした。');
}

const rl = createInterface({ input, output });

try {
  const title = await askRequired(rl, 'タイトル');
  const category = await chooseCategory(rl);
  const description = await askRequired(rl, '説明');
  const now = new Date();
  const filePath = await nextAvailablePath(formatArticleId(now));

  const markdown = \`---
title: ${yamlSingleQuoted(title)}
description: ${yamlSingleQuoted(description)}
publishedAt: ${formatPublishedDate(now)}
category: ${category}
draft: true
---

\`;

  await mkdir(articleDirectory, { recursive: true });
  await writeFile(filePath, markdown, { encoding: 'utf8', flag: 'wx' });

  output.write(\`\n下書きを作成しました: ${filePath}\n\`);
  output.write('本文を書いたら npm run post:publish を実行してください。\n');
} finally {
  rl.close();
}
