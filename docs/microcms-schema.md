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

トピッククラスターのピラーとほぼ1対1で対応させる。カテゴリページがそのまま
クラスターのハブになり、内部リンクの受け皿になる。

| slug | カテゴリ名 | 対応ピラー | URL |
|---|---|---|---|
| `boots` | 登山靴 | P01 登山靴・シューズ | `/mountain-climbing/boots/` |
| `backpack` | リュック | P02 リュック・ザック | `/mountain-climbing/backpack/` |
| `wear` | ウェア | P03 レインウェア / P05 ウェア・服装 | `/mountain-climbing/wear/` |
| `accessories` | 小物・携行品 | P04 トレッキングポール / P06 小物・携行品 | `/mountain-climbing/accessories/` |
| `beginner` | 初心者向け | P07 初心者・持ち物・行動食 | `/mountain-climbing/beginner/` |
| `route` | ルート・山域 | P08 山域別ルート情報 | `/mountain-climbing/route/` |

`genre` は**6つとも `mountain-climbing`**。

ピラー8つに対してカテゴリは6つ。レインウェア(P03)は `wear` に、
トレッキングポール(P04)は `accessories` にまとめている。
1本しか入らないカテゴリを作らないための判断で、記事が増えて
`wear` や `accessories` が20本を超えたら、そのときに切り出す
(切り出すとURLが変わるので、301転送を `public/_redirects` に足すこと)。

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
| faq | よくある質問 | 繰り返しフィールド | 任意。下記参照 |
| reviewItem | レビュー対象の製品名 | テキストフィールド | 任意。製品レビュー記事だけ入れる |
| reviewBrand | レビュー対象のブランド名 | テキストフィールド | 任意 |
| reviewRating | 評価(1〜5) | 数値 | 任意。入れなければ点数なしのレビューになる |

### FAQフィールド(faq)について

「繰り返しフィールド」で作り、中に**カスタムフィールド**を1つ置く。

| カスタムフィールドのフィールドID | 表示名 | 種類 |
|---|---|---|
| question | 質問 | テキストフィールド |
| answer | 回答 | テキストエリア |

ここに入れたQ&Aは、記事下部のアコーディオン表示と、検索エンジン向けの
`FAQPage` 構造化データの**両方**に使われる(`normalizeFaq()` が `q` / `a` という
フィールドIDでも拾えるようにしてあるので、すでにその名前で作っていればそのままでよい)。

本文のHTMLに直接Q&Aを書いても構造化データにはならないので、
**検索結果にQ&Aを出したい場合は必ずこのフィールドに入れる。**

### レビュー用フィールド(reviewItem / reviewBrand / reviewRating)について

`reviewItem` を入れた記事だけ、`Review` の構造化データが追加で出力される。
「誰が・どの製品を・何点で評価したのか」を機械可読にするためのもので、
ブランド別のレビュー記事(例:「サロモン 登山靴」)で使う。

- `reviewItem`: `X ULTRA 5 MID GORE-TEX` のように製品名だけを入れる
- `reviewBrand`: `SALOMON`
- `reviewRating`: `4.5` など。**実際に記事本文で書いた評価と食い違わせないこと**

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
