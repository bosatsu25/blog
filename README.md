# ikesama.dev

[![CI](https://github.com/bosatsuKing/ikesama.dev/actions/workflows/ci.yml/badge.svg)](https://github.com/bosatsuKing/ikesama.dev/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/bosatsuKing/ikesama.dev/actions/workflows/deploy.yml/badge.svg)](https://github.com/bosatsuKing/ikesama.dev/actions/workflows/deploy.yml)

コンテンツ中心のサイトにフルSPAを持ち込まず、**Astroで静的HTMLを生成し、状態を持つUIだけReactでhydrateする** static-first / islands architecture を採用しています。

## Design goals

- 記事とプロジェクトを主役にする、ミニマルな情報設計
- JavaScriptを必要な場所だけに限定する
- Markdownで記事を追加できる運用性
- TypeScriptによる型安全性
- CIでformat / lint / type check / unit test / buildを自動検証する
- Playwrightで主要ユーザーフローをE2E検証する
- サーバーランタイムを持たずGitHub Pagesへ静的配信する

## Architecture

```text
Markdown / Astro Content Collections
                |
                v
        Astro components
                |
                v
        Static HTML + CSS
          |           |
          |           +--> React island: ThemeToggle
          |
          +--------------> React island: ProjectFilter
                |
                v
          GitHub Pages
```

ページ本体はビルド時に静的生成されます。Reactはテーマ切り替えやプロジェクト絞り込みなど、クライアント状態が必要なUIだけに使用します。

より詳しい設計判断は [ARCHITECTURE.md](./ARCHITECTURE.md) を参照してください。

## Tech stack

| Area            | Technology                           |
| --------------- | ------------------------------------ |
| Framework       | Astro 7                              |
| Language        | TypeScript                           |
| Interactive UI  | React 19                             |
| Styling         | SCSS / CSS Custom Properties         |
| Content         | Astro Content Collections / Markdown |
| Unit Test       | Vitest                               |
| E2E             | Playwright                           |
| Static analysis | ESLint / Astro Check                 |
| Formatting      | Prettier                             |
| CI/CD           | GitHub Actions                       |
| Hosting         | GitHub Pages                         |

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
- npm

### Setup

```bash
npm ci
npx playwright install
npm run dev
```

Astro dev serverが起動したら、ターミナルに表示されたローカルURLを開いて確認します。

## Commands

| Command                | Purpose                             |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start local development server      |
| `npm run build`        | Astro Check + production build      |
| `npm run preview`      | Preview production build            |
| `npm run format`       | Apply Prettier formatting           |
| `npm run format:check` | Verify formatting                   |
| `npm run lint`         | Run ESLint                          |
| `npm run check`        | Run Astro diagnostics               |
| `npm run test`         | Run Vitest unit tests               |
| `npm run test:e2e`     | Run Playwright E2E tests            |
| `npm run verify`       | Run the complete local quality gate |

変更をpushする前は、原則として次を実行します。

```bash
npm run verify
```

## Quality gates

`main`へのpushとPull RequestではGitHub Actionsが品質チェックを実行します。

```text
Prettier
   |
ESLint
   |
Astro Check
   |
Vitest
   |
Astro Build
   |
Playwright E2E
```

E2Eでは現在、デスクトップ / モバイル条件で以下を確認しています。

- Primary navigation
- Project category filtering
- Theme switching

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

## Projects

プロジェクト情報は `src/data/projects.ts` で管理しています。

現在のサイトでは、Minecraft MOD、開発者向けツール、Frontend / QA関連の個人開発を掲載する構成です。

## Deployment

`main`へのpushで `.github/workflows/deploy.yml` が実行され、Astroのproduction buildをGitHub Pagesへデプロイします。

初回のみ、GitHubリポジトリで次の設定が必要です。

1. **Settings**
2. **Pages**
3. **Build and deployment**
4. **Source: GitHub Actions**

この設定が未有効の場合、build artifactの生成には成功しても `actions/deploy-pages` がPages deploymentを作成できず失敗します。

カスタムドメイン `ikesama.dev` を使用する場合は、GitHub Pages側のCustom domain設定、DNS設定、`SITE_URL`、必要に応じて `public/CNAME` を設定します。

## Repository structure

```text
.
├─ .github/
│  └─ workflows/
│     ├─ ci.yml
│     └─ deploy.yml
├─ public/
├─ src/
│  ├─ components/
│  ├─ content/
│  │  └─ writing/
│  ├─ data/
│  ├─ layouts/
│  ├─ lib/
│  ├─ pages/
│  └─ styles/
├─ tests/
│  └─ e2e/
├─ ARCHITECTURE.md
├─ astro.config.mjs
├─ playwright.config.ts
├─ vitest.config.ts
└─ package.json
```

## Engineering policy

このサイト自体もポートフォリオの一部として扱います。

機能を追加する際は、単に「使える技術を増やす」ことよりも、サイト要件に対してその技術が必要かを優先します。静的に解決できるものはAstroで静的に生成し、ブラウザ状態が必要な箇所だけをReact islandとして追加します。
