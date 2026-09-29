# ikesama.dev

[![CI](https://github.com/bosatsuKing/ikesama.dev/actions/workflows/ci.yml/badge.svg)](https://github.com/bosatsuKing/ikesama.dev/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/bosatsuKing/ikesama.dev/actions/workflows/deploy.yml/badge.svg)](https://github.com/bosatsuKing/ikesama.dev/actions/workflows/deploy.yml)

Astroで静的HTMLを生成し、状態が必要なUIだけReact islandとしてhydrateする **static-first / islands architecture** の個人ブログです。

## Design goals

- 記事とプロジェクトを主役にしたミニマルな情報設計
- JavaScriptを必要な場所だけに限定する
- Markdown + Astro Content Collectionsで記事を管理する
- TypeScript / Astro Checkで型・構造を検証する
- Unit / E2E / Security / Accessibility / PerformanceをCIで自動検証する
- 記事本文のContent ProtectionとSecure External Link Contractをbuild/testの契約として扱う
- Hosting-neutralな静的artifactを生成し、現在は検証済みSHAをGitHub Pagesへ配信する

## Architecture

```text
Markdown / Astro Content Collections
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
          +--------------> React island: ProjectFilter
                |
                +--> Article-only Content Protection
                |
                v
        Static artifact
                |
                v
       Current: GitHub Pages
```

ページ本体はビルド時に静的生成されます。Reactはテーマ切り替えやプロジェクト絞り込みなど、クライアント状態が必要なUIだけに使用します。

設計の詳細は [ARCHITECTURE.md](./ARCHITECTURE.md)、deployment contractは [docs/deployment.md](./docs/deployment.md)、外部リンク契約は [docs/external-links.md](./docs/external-links.md)、セキュリティ検証方針は [docs/security-testing.md](./docs/security-testing.md) を参照してください。

## Tech stack

| Area               | Technology                           |
| ------------------ | ------------------------------------ |
| Framework          | Astro 7                              |
| Language           | TypeScript 5.9                       |
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

| Route           | Purpose                         |
| --------------- | ------------------------------- |
| `/`             | Home / Recent Writing           |
| `/about/`       | Profile                         |
| `/projects/`    | Projects and category filtering |
| `/writing/`     | Articles                        |
| `/writing/:id/` | Article detail                  |
| `/404.html`     | Not found                       |

## Local development

### Requirements

- Node.js `>=22.12.0`
- CI baseline: Node.js `24.17.0`（`.node-version`）
- npm

### Setup

```bash
npm ci
npx playwright install
npm run dev
```

Windowsで`npm ci`が`EPERM`になる場合は、開発サーバーやNodeプロセスが`node_modules`内のnative bindingを掴んでいないか確認してください。

## Commands

| Command                      | Purpose                                    |
| ---------------------------- | ------------------------------------------ |
| `npm run dev`                | Start local development server             |
| `npm run build`              | Astro Check + production build             |
| `npm run preview`            | Preview production build                   |
| `npm run format`             | Apply Prettier formatting                  |
| `npm run format:check`       | Verify formatting                          |
| `npm run lint`               | Run ESLint                                 |
| `npm run check`              | Run Astro diagnostics                      |
| `npm run test`               | Run Vitest unit tests                      |
| `npm run test:e2e`           | Run Playwright E2E tests                   |
| `npm run test:security`      | Test browser-level security contracts      |
| `npm run test:accessibility` | Run axe and keyboard accessibility checks  |
| `npm run test:smoke`         | Smoke-test the configured production URL   |
| `npm run test:hosting`       | Verify root and subpath build artifacts    |
| `npm run security:audit`     | Audit generated/source security invariants |
| `npm run performance:budget` | Check generated asset-size budgets         |
| `npm run audit`              | Run npm vulnerability audit                |
| `npm run verify`             | Run the complete local quality gate        |

変更をpushする前は原則として次を実行します。

```bash
npm run verify
```

Production builds require explicit `SITE_URL` and `SITE_BASE` values. For local
verification, set `SITE_URL=https://example.test` and `SITE_BASE=/`; deployment
workflows provide the public production values. See [docs/deployment.md](./docs/deployment.md).

## CI design

Pull Requestと`main`へのpushは同じCI contractを通ります。README-only変更も含め、すべてのPRで最終`CI gate`が生成されます。

```text
Pull Request / main push
          |
          v
    Quality gate
    - npm ci
    - format
    - lint
    - unit
    - Astro check + build
    - static security audit
    - performance budget
    - npm audit
          |
          v
    Browser gate
    - Chromium / Firefox / WebKit E2E
    - browser security tests
    - accessibility
          |
          v
       CI gate
          |
      all green
          |
          +--> PR: merge criterion
          |
          +--> main: Deploy workflow
                        |
                        v
                  GitHub Pages
                        |
                        v
                 Production smoke
```

`Browser gate`は`Quality gate`成功後にだけ実行されます。依存解決やformatなど前段で失敗した場合、同じ原因で複数jobが大量に赤くならないようにしています。

古い同一PRのCIは`concurrency`でキャンセルし、最新commitの結果を優先します。

GitHub側でbranch rulesetを設定する場合は、最終checkの **CI gate** をrequired status checkにする想定です。

## Quality and security contracts

E2EではChromium / Firefox / WebKitとmobile条件で主要UIを検証します。

主な契約:

- Primary navigation / Theme switching / Project filtering
- Article Content Protection
- Secure External Links
- CSP / third-party request / generated artifact security
- Accessibility
- Performance budget
- Production smoke

記事本文では通常のブラウザUIによる選択・コピー・印刷等を強く抑止し、繰り返しwatermarkで転載を抑止します。ただしDevTools、View Source、direct HTTP retrieval、OCR、OS screenshot、screen recording、external cameraを完全に防止するものではありません。

Markdown内の外部HTTPSリンクはbuild-timeで分類され、destination hostname表示、`target="_blank"`、`rel="noopener noreferrer external"`、`referrerpolicy="no-referrer"`を自動付与します。危険・未対応schemeや外部HTTPリンクはbuild時に拒否します。

## Writing

記事は `src/content/writing/` にMarkdownで追加します。

```md
---
title: 'Article title'
description: 'Short description'
publishedAt: 2026-09-28
tags:
  - Astro
  - Frontend
draft: false
---

本文
```

frontmatterはAstro Content Collectionsで検証されます。

## Dependency updates

DependabotはnpmとGitHub Actionsを週次確認します。

- patch / minor: PR作成対象
- major: 自動PR対象外。互換性を確認して手動で更新

メジャー更新を無理に`--force`や`--legacy-peer-deps`で通す運用はしません。

## Deployment

`main`のCIが成功したときだけ、`.github/workflows/deploy.yml` がその検証済みSHAをGitHub Pagesへデプロイします。

Deploy workflowは`main`のCI完了だけを監視し、PR CIからは起動しません。デプロイ後はProduction Smokeを実行し、公開URLの主要route・asset・runtime contractをread-onlyで確認します。
