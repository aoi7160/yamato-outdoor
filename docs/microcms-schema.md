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
| supervisorName | 監修者名 | テキストフィールド | 任意。監修者を立てない記事は空欄でよい |
| supervisorTitle | 監修者肩書き | テキストフィールド | 任意。例:「登山ガイド」「〇〇山岳会所属」 |
| supervisorBio | 監修者プロフィール | テキストエリア | 任意。1〜2文の経歴・資格 |
| supervisorImage | 監修者写真 | 画像 | 任意 |

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

### 書き込み権限について(記事の下書き自動保存に必要)

`src/lib/microcms.ts` の `createArticleDraft` は、平日パイプライン(`seo-researcher`→
`outdoor-researcher`→`writer`→`editor`)が仕上げた記事を「下書き」ステータスでmicroCMSに
保存するための関数です(公開はしない。`docs/content-workflow.md` 参照)。これを使うには、
`.env` の `MICROCMS_API_KEY` が **書き込み権限を持つキー** である必要があります。

デフォルトで発行されるAPIキーは読み取り専用の場合があるため、以下を確認してください。

1. microCMS管理画面 > 「サービス設定」>「APIキー」
2. 該当キーの「権限」で `articles` エンドポイントへの **GET/POST/PUT/PATCH/DELETE** が
   許可されているか確認する(読み取り専用なら書き込み用に別キーを発行するか、権限を追加する)
3. 書き込み用キーは閲覧専用キーと別に発行し、`.env` にのみ置く(ビルド成果物やクライアント
   コードに含めない。書き込みは常にこのファイル経由のサーバーサイド処理でのみ行う)
