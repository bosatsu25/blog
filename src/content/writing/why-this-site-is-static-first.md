---
title: 'Why this site is static-first'
description: 'AstroとReact Islandsを使い分ける理由。'
publishedAt: 2026-09-28
category: 技術
draft: false
---

このサイトは、ページ全体をSPAとして実装していません。

本文やナビゲーションの大部分はビルド時にHTMLへ変換し、テーマ切り替えなど、状態を必要とする部分だけReactで動かしています。

## Why

コンテンツ中心のサイトでは、クライアントJavaScriptを増やすこと自体は目的ではありません。

- 初期表示で必要なHTMLを最初から返す
- JavaScriptが無効でも本文を読める
- インタラクションが必要な箇所だけhydrateする
- テスト対象となるクライアント状態を小さく保つ

この制約を設計として明示するため、AstroのIsland Architectureを採用しています。
