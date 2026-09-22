# microCMS スキーマ設計

microCMSの管理画面で以下の2つのAPI(コンテンツタイプ)を作成してください。

## 1. カテゴリ (categories) — リスト形式

| フィールドID | 表示名 | 種類 |
|---|---|---|
| name | カテゴリ名 | テキストフィールド |
| slug | スラッグ | テキストフィールド(URL用、英数字とハイフン) |
| genre | ジャンル | セレクトフィールド。`mountain-climbing` / `fishing` / `camp` |

`genre` はURLの第1階層になる(`/mountain-climbing/boots/`)。
**未設定にしない。** 未設定だと `src/lib/taxonomy.ts` のフォールバックで全部が登山扱いになり、
`/mountain-climbing/fishing/` のような矛盾したURLができる。
未設定のカテゴリがあると `npm run build` のログに警告が出る。

### カテゴリ設計(登山)

トピッククラスターのピラーと1対1で対応させる。カテゴリページがそのまま
クラスターのハブになり、内部リンクの受け皿になる。

| slug | カテゴリ名 | 対応ピラー | URL |
|---|---|---|---|
| `boots` | 登山靴・シューズ | P01 | `/mountain-climbing/boots/` |
| `backpack` | リュック・ザック | P02 | `/mountain-climbing/backpack/` |
| `rainwear` | レインウェア | P03 | `/mountain-climbing/rainwear/` |
| `poles` | トレッキングポール | P04 | `/mountain-climbing/poles/` |
| `wear` | ウェア・服装 | P05 | `/mountain-climbing/wear/` |
| `accessories` | 小物・携行品 | P06 | `/mountain-climbing/accessories/` |
| `beginner` | 初心者・持ち物 | P07 | `/mountain-climbing/beginner/` |
| `route` | ルート・山域 | P08 | `/mountain-climbing/route/` |

`genre` は**8つとも `mountain-climbing`**。

**ジャンル名をカテゴリにしないこと。** 「登山」「釣り」「キャンプ」はジャンル(URLの第1階層)で
`src/lib/taxonomy.ts` に固定されている。同名のカテゴリを作ると
`/mountain-climbing/fishing/` のような二重の階層ができる。

釣り・キャンプを始めるときは、同じ要領でそのジャンル用のカテゴリを作り、
`genre` に `fishing` / `camp` を設定する。

## 2. 記事 (articles) — リスト形式

| フィールドID | 表示名 | 種類 | 備考 |
|---|---|---|---|
| title | タイトル | テキストフィールド | |
| slug | スラッグ | テキストフィールド | URL用、英数字とハイフン。一意にする |
| description | 概要 | テキストエリア | 一覧・OGP用の要約文 |
| thumbnail | サムネイル画像 | 画像 | |
| content | 本文 | リッチエディタ | |
| category | カテゴリ | コンテンツ参照(単一) | categories APIを参照 |
| tags | タグ | 複数テキスト | 任意。「テキストフィールド」で作った場合はカンマ区切りで入力する |

### タグフィールドについて

`tags` は **複数テキスト**で作るのが本来の形(1タグ=1行で管理でき、表記ゆれに気づきやすい)。
ただし microCMS では作成後に種類を変更できないため、すでに「テキストフィールド」で
作ってしまった場合は、次のどちらでもよい。

- フィールドを削除して「複数テキスト」で作り直す(推奨)
- そのまま使い、`レインウェア, 登山装備, 初心者` のようにカンマ区切りで入力する

サイト側は `normalizeTags()`(`src/lib/article.ts`)でどちらの形も受け取れるようにしてある。
区切り文字は `,` `、` `/` `|` に対応。先頭の `#` は自動で外す。

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
