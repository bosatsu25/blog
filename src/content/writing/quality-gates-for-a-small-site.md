---
title: 'Quality gates for a small site'
description: '小さな個人サイトでも自動化する品質ゲート。'
publishedAt: 2026-09-27
tags: ['QA', 'CI', 'Playwright']
draft: false
---

小さなサイトでも、機械的に確認できるものはCIへ移します。

```text
format → lint → typecheck → unit test → build → E2E
```

「気をつける」ではなく、壊れたらPull Requestで落ちる状態を作ることが目的です。

ブラウザー操作の自動化には[Playwright](https://playwright.dev/)を利用しています。サイト構成は[static-firstの記事](/writing/why-this-site-is-static-first/)で紹介しています。
