# microCMS スキーマ設計

microCMSの管理画面で以下の2つのAPI(コンテンツタイプ)を作成してください。

## 1. カテゴリ (categories) — リスト形式

| フィールドID | 表示名 | 種類 |
|---|---|---|
| name | カテゴリ名 | テキストフィールド |
| slug | スラッグ | テキストフィールド(URL用、英数字とハイフン) |

## 2. 記事 (articles) — リスト形式

| フィールドID | 表示名 | 種類 | 備考 |
|---|---|---|---|
| title | タイトル | テキストフィールド | |
| slug | スラッグ | テキストフィールド | URL用、英数字とハイフン。一意にする |
| description | 概要 | テキストエリア | 一覧・OGP用の要約文 |
| thumbnail | サムネイル画像 | 画像 | |
| content | 本文 | リッチエディタ | |
| category | カテゴリ | コンテンツ参照(単一) | categories APIを参照 |
| tags | タグ | 複数テキスト | 任意 |

エンドポイント名はそれぞれ `articles` / `categories` としてください
(`src/lib/microcms.ts` がこの名前を前提にしています)。

## APIキーの取得

1. microCMS管理画面 > 右上のサービス名 > 「サービス設定」> 「APIキー」
2. 発行されたAPIキーと、サービスID(`https://XXXX.microcms.io` のXXXX部分)を控える
3. `.env.example` を `.env` にコピーし、それぞれ設定する

```
MICROCMS_SERVICE_DOMAIN=XXXX
MICROCMS_API_KEY=発行されたAPIキー
```

Cloudflare Pagesにデプロイする場合は、Pagesプロジェクトの
「設定」>「環境変数」にも同じ2つを追加してください(本番・プレビュー両方)。
