import { readFile, readdir, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import process, { stdin as input, stdout as output } from 'node:process';
import { readFrontmatterString, setDraftState } from './post-utils.mjs';

const root = process.cwd();
const articleDirectory = resolve(root, 'src/content/writing');

async function findMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return findMarkdownFiles(path);
      return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
    }),
  );
  return nested.flat();
}

async function findDrafts() {
  const files = await findMarkdownFiles(articleDirectory);
  const drafts = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    if (/^draft:\s*true\s*$/m.test(content)) {
      drafts.push({ file, content, title: readFrontmatterString(content, 'title') });
    }
  }

  return drafts.sort((left, right) => left.file.localeCompare(right.file));
}

function assertInsideArticleDirectory(file) {
  const relativePath = relative(articleDirectory, file);
  if (!relativePath || relativePath.startsWith('..') || relativePath.split(sep).includes('..')) {
    throw new Error('公開対象は src/content/writing 配下のMarkdownに限ります。');
  }
  return relative(root, file).split(sep).join('/');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}.`,
    );
  }
}

async function chooseDraft(drafts) {
  const requested = process.argv[2];
  if (requested) {
    const candidate = resolve(articleDirectory, requested);
    const relativePath = assertInsideArticleDirectory(candidate);
    const draft = drafts.find(({ file }) => resolve(file) === candidate);
    if (!draft) {
      throw new Error(`${relativePath} は draft: true の記事ではありません。`);
    }
    return draft;
  }

  if (drafts.length === 0) {
    throw new Error('公開可能な draft: true の記事がありません。');
  }
  if (drafts.length === 1) return drafts[0];

  const rl = createInterface({ input, output });
  try {
    output.write('公開する記事を選択してください:\n');
    drafts.forEach((draft, index) => {
      output.write(
        `  ${index + 1}. ${draft.title} (${assertInsideArticleDirectory(draft.file)})\n`,
      );
    });

    while (true) {
      const answer = Number((await rl.question('番号を選択: ')).trim()) - 1;
      if (Number.isInteger(answer) && drafts[answer]) return drafts[answer];
      output.write(`1〜${drafts.length}の番号で選択してください。\n`);
    }
  } finally {
    rl.close();
  }
}

const drafts = await findDrafts();
const draft = await chooseDraft(drafts);
const relativePath = assertInsideArticleDirectory(draft.file);
const published = setDraftState(draft.content, false);

await writeFile(draft.file, published, 'utf8');

try {
  const npmExecPath = process.env.npm_execpath;
  if (!npmExecPath) {
    throw new Error('Run this command through npm: npm run post:publish');
  }
  run(process.execPath, [npmExecPath, 'run', 'verify:content'], {
    env: {
      ...process.env,
      SITE_URL: process.env.SITE_URL ?? 'https://example.test',
      SITE_BASE: process.env.SITE_BASE ?? '/',
    },
  });
} catch (error) {
  await writeFile(draft.file, draft.content, 'utf8');
  throw error;
}

run('git', ['add', '--', relativePath]);
run('git', ['commit', '-m', `publish: ${draft.title}`, '--', relativePath]);
run('git', ['push', 'origin', 'HEAD']);

output.write(`公開コミットをpushしました: ${relativePath}\n`);
