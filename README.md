# 仏の道

[![Site](https://github.com/bosatsu25/blog/actions/workflows/site.yml/badge.svg)](https://github.com/bosatsu25/blog/actions/workflows/site.yml)
[![Dependency Security](https://github.com/bosatsu25/blog/actions/workflows/security.yml/badge.svg)](https://github.com/bosatsu25/blog/actions/workflows/security.yml)

Astroで静的HTMLを生成し、状態が必要なUIだけReact islandとしてhydrateする **static-first / islands architecture** の個人ブログです。

## Design goals

- 記事を主役にした静かな情報設計
- lotus source imageをブランド画像とfaviconに一貫して使用
- 単一カテゴリーの記事をbuild-time archiveとして年月別に整理
- JavaScriptを必要な場所だけに限定する
- Markdown + Astro Content Collectionsで記事を管理する
- 記事作成時のファイル名・frontmatter・Git操作を薄いローカルツールで自動化する
- TypeScript / Astro Checkで型・構造を検証する
- Unit / E2E / Security / Accessibility / PerformanceをCIで自動検証する
- 記事本文のContent ProtectionとSecure External Link Contractをbuild/testの契約として扱う
- 外部CMS・DB・常駐サーバーを持たず、GitHub Pagesを0円ホスティングとして利用する

## Architecture

```text
npm run post:new
      |
      v
Timestamped Markdown draft
      |
      v
Astro Content Collections
      |
      +--> Secure External Link build-time transform
      |
      v
Astro static generation
      |
Static HTML + CSS
  |           |
  |           +--> React island: ThemeToggle
      |
      +--> Article-only Content Protection
      |
      +--> Build-time category/year/month Archive
      |
      v
GitHub Actions
      |
      v
GitHub Pages
```

記事本文・Archive・RSS・sitemapはビルド時に生成されます。Reactはテーマ切り替えなど、クライアント状態が必要なUIだけに使用します。

設計の詳細は [ARCHITECTURE.md](./ARCHITECTURE.md)、deployment contractは [docs/deployment.md](./docs/deployment.md)、外部リンク契約は [docs/external-links.md](./docs/external-links.md)、セキュリティ検証方針は [docs/security-testing.md](./docs/security-testing.md) を参照してください。

## Tech stack

| Area               | Technology                           |
| ------------------ | ------------------------------------ |
| Framework          | Astro 7                              |
| Language           | TypeScript 5.9 / Node.js             |
| Interactive UI     | React 19                             |
| Styling            | SCSS / CSS Custom Properties         |
| Content            | Astro Content Collections / Markdown |
| Markdown transform | @astrojs/markdown-remark             |
| Unit Test          | Vitest                               |
| E2E                | Playwright                           |
| Accessibility      | axe / Playwright                     |
| Static analysis    | ESLint / Astro Check                 |
| Formatting         | Prettier                             |
| CI/CD              | GitHub Actions                       |
| Hosting            | GitHub Pages                         |

## Pages

| Route           | Purpose                            |
| --------------- | ---------------------------------- |
| `/`             | Blog home / recent articles        |
| `/archive/`     | Articles grouped by category/date  |
| `/about/`       | Profile                            |
| `/writing/`     | Compatibility page linking Archive |
| `/writing/:id/` | Article detail                     |
| `/404.html`     | Not found                          |

## Local development

### Requirements

- Node.js `>=22.12.0`
- CI baseline: Node.js `24.17.0`（`.node-version`）
- npm
- Git（`post:publish`を使う場合）

### Setup

```bash
npm ci
npx playwright install
npm run dev
```

Windowsで`npm ci`が`EPERM`になる場合は、開発サーバーやNodeプロセスが`node_modules`内のnative bindingを掴んでいないか確認してください。

## Commands

| Command                      | Purpose                                         |
| ---------------------------- | ----------------------------------------------- |
| `npm run dev`                | Start local development server                  |
| `npm run build`              | Astro Check + production build                  |
| `npm run preview`            | Preview production build                        |
| `npm run format`             | Apply Prettier formatting                       |
| `npm run format:check`       | Verify repository formatting                    |
| `npm run format:content`     | Verify article Markdown formatting              |
| `npm run lint`               | Run ESLint                                      |
| `npm run check`              | Run Astro diagnostics                           |
| `npm run test`               | Run Vitest unit tests                           |
| `npm run test:e2e`           | Run Playwright E2E tests                        |
| `npm run test:security`      | Test browser-level security contracts           |
| `npm run test:accessibility` | Run axe and keyboard accessibility checks       |
| `npm run test:smoke`         | Smoke-test the configured production URL        |
| `npm run test:hosting`       | Verify root and generic subpath artifacts        |
| `npm run security:audit`     | Audit generated/source security invariants      |
| `npm run performance:budget` | Check generated asset-size budgets              |
| `npm run verify:content`     | Fast gate for article-only changes              |
| `npm run verify:code`        | Non-browser full code quality gate              |
| `npm run verify`             | Full local code + browser verification           |
| `npm run audit`              | Run dependency vulnerability audit              |
| `npm run post:new`           | Create a timestamped draft article              |
| `npm run post:publish`       | Validate, publish, commit, and push one draft    |

Production-shaped local verification requires explicit `SITE_URL` and `SITE_BASE` values. See [docs/deployment.md](./docs/deployment.md).

## Writing

通常の記事作成では、ファイル名やfrontmatterを手で決めません。

```text
npm run post:new
      |
      +--> title
      +--> category
      +--> description
      |
      v
src/content/writing/YYMMDD-HHmm.md
      |
      v
本文を書く
      |
      v
npm run post:publish
      |
      +--> draft: false
      +--> content verification
      +--> git add (対象記事のみ)
      +--> git commit (対象記事のみ)
      +--> git push
```

同一分に複数記事を作った場合は `YYMMDD-HHmm-02.md` のように連番を付与します。日時は `Asia/Tokyo` を基準に生成します。

新規記事は安全側に倒し、schemaの既定値も `draft: true` です。明示的に公開処理を通した記事だけ公開対象になります。

`category` は `仏教`、`日々`、`技術` のいずれか1つです。

## CI design

`.github/workflows/site.yml` がPR検証とmainデプロイを一元管理します。

```text
Pull Request / main push
          |
          v
     Change scope
       /      \
      /        \
content-only   code/config
    |              |
    v              v
Fast content     Full quality
verification      gate
    |              |
    |         Browser gate
    |       Chromium/Firefox/
    |         WebKit/a11y/sec
    \              /
     \            /
        CI gate
           |
           +--> PR: merge criterion
           |
           +--> main:
                configure-pages
                     |
                  Astro build
                     |
               upload artifact
                     |
                 deploy-pages
                     |
              Production smoke
```

`src/content/writing/**/*.md` だけの変更では、Markdown formatting、Astro schema/build、static security auditを実行します。コード・設定変更ではUnit/E2E/Security/Accessibility/Performanceを含むフルゲートを実行します。

依存関係の `npm audit` は記事公開の可否から分離し、`.github/workflows/security.yml` で週次および手動実行します。DependabotもnpmとGitHub Actionsを週次確認します。

最終required check名は **CI gate** です。

## Quality and security contracts

E2EではChromium / Firefox / WebKitとmobile条件で主要UIを検証します。テストは特定の記事slugに依存せず、生成された公開記事を動的に発見して検証します。

主な契約:

- Primary navigation / Theme switching / category-year-month Archive
- Article Content Protection
- Secure External Links
- CSP / third-party request / generated artifact security
- Accessibility
- Performance budget
- Production smoke

記事本文では通常のブラウザUIによる選択・コピー・印刷等を強く抑止し、繰り返しwatermarkで転載を抑止します。ただしDevTools、View Source、direct HTTP retrieval、OCR、OS screenshot、screen recording、external cameraを完全に防止するものではありません。

Markdown内の外部HTTPSリンクはbuild-timeで分類され、destination hostname表示、`target="_blank"`、`rel="noopener noreferrer external"`、`referrerpolicy="no-referrer"`を自動付与します。危険・未対応schemeや外部HTTPリンクはbuild時に拒否します。

## Deployment

GitHub Pagesを唯一のproduction hostとして使います。外部CMS、DB、Cloudflare Pages、Workers等は必要ありません。

Repository Settings → Pages → Build and deployment の Source は **GitHub Actions** に設定します。workflowは `actions/configure-pages` が返す `base_url` / `base_path` をAstroへ渡すため、repository名やcustom domainをworkflowにハードコードしません。

詳細は [docs/deployment.md](./docs/deployment.md) を参照してください。
