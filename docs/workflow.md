# 公開までの手順

「どこで作業して、どこに置いたら公開されるのか」をまとめたもの。

## 全体像

```
記事を書く          →  microCMSで「公開」
                          │
                          ├─(Webhook)→ Cloudflare Pages が再ビルド
                          │
サイトの改修を書く  →  claude/xxx ブランチ  →  main にマージ
                                                    │
                                                    └→ Cloudflare Pages が再ビルド
                                                              │
                                                              ▼
                                                     https://yamato-outdoor.com
```

**公開判定はひとつだけ。`main` ブランチの内容がビルドされて公開される。**

記事のURLは `/ジャンル/カテゴリ/記事スラッグ/` になる。ジャンルはカテゴリの
`genre` フィールドで決まるため、記事側で指定する必要はない。
記事本文はコードではなくmicroCMS側にあるため、記事だけを増やす場合はGitの操作は不要。

---

## A. 記事を1本追加する(通常はこちら)

記事の本文はmicroCMSに入るので、Gitでの作業は発生しない。

1. microCMS管理画面 → `articles` → 「追加」
2. タイトル / スラッグ(URL、英数字とハイフン) / 概要 / サムネイル / カテゴリ / 本文 を入力
3. 本文はリッチエディタで書く。目次は `h2` から自動生成されるので、見出しは `h2` で切る
4. 「画面プレビュー」で表示を確認(下書きのまま確認できる。noindexなので検索には出ない)
5. `docs/tone-and-manner.md` の**公開前チェックリスト**を上から見る
   (表記ゆれ・タグ3〜5個・タイトル30〜35字・概要80〜120字・広告の明示)
6. 「公開」を押す
7. Cloudflare Pagesが再ビルド(数分)。完了するとサイトに出る
   `sitemap.xml` / `rss.xml` / `llms.txt` もこのビルドで自動更新される

### 記事内で使える装飾(リッチエディタのHTML編集で貼る)

| 用途 | HTML |
|---|---|
| 補足 | `<div class="note"><span class="note__title">Memo</span><p>本文</p></div>` |
| 注意 | `<div class="note warn"><span class="note__title">Caution</span><p>本文</p></div>` |
| 持ち物リスト | `<div class="checklist"><ul><li>項目</li></ul></div>` |
| 出典・注記 | `<p class="source">※ 出典</p>` |
| 広告の明示 | `<p class="pr-notice">※ 本記事にはアフィリエイトリンクを含みます。</p>` |

表は自動で横スクロールに対応し、画像は自動で遅延読み込みになる。
外部リンクには `target="_blank"` と `rel` が自動で付く。ASPのリンクは
`rel="sponsored nofollow"` になる(対象ドメインは `src/lib/article.ts` の `AFFILIATE_HOSTS`)。

**アフィリエイトリンクを含む記事は、冒頭に `pr-notice` を必ず置く。**
ステルスマーケティング規制(景品表示法)により、広告であることの明示が必要
(詳細は `docs/analytics.md` の「6-3. ステマ規制」)。

### 再ビルドの自動化(未設定なら最初に一度だけ)

microCMSで公開しても、再ビルドが走らなければサイトは変わらない。次を設定しておく。

1. Cloudflare Pages → プロジェクト → 「設定」→「ビルド」→ **デプロイフック**を作成
   (名前: `microcms`、ブランチ: `main`)→ 発行されたURLをコピー
2. microCMS → 「コンテンツ(API)」→ **記事(articles)** → 「API設定」→「Webhook」→「追加」
   → 「カスタム通知」を選び、URLに1のデプロイフックURLを貼る
   ※ Webhookは**API単位**の設定。カテゴリを変えたときも再ビルドしたいなら、
     カテゴリ(categories)側にも同じWebhookを追加する
3. 通知タイミングは「コンテンツの公開・更新・削除」にチェック

これで、microCMSで公開ボタンを押すだけでサイトが更新される。

---

## B. サイト自体を直す(デザイン・機能・カテゴリ追加など)

Claude Codeに依頼する場合も、手で直す場合も手順は同じ。

1. `main` から作業ブランチを切る
   ```bash
   git switch main && git pull
   git switch -c claude/<内容>-<日付やID>
   ```
2. 修正して、**必ずビルドを通す**
   ```bash
   npm install     # 初回のみ
   npm run build
   npm run dev     # http://localhost:4321 で見た目を確認
   ```
3. コミットしてブランチをpush
4. GitHubでPull Requestを作る
   - PRを作るとCloudflare Pagesが**プレビューURL**を自動発行する。ここで本番同様に確認できる
   - この時点ではまだ公開されない
5. 問題なければ `main` にマージ → 本番に反映

Claude Codeに頼むときは「作業ブランチで作業して、確認できたらmainにマージして」と伝えれば、
この流れで進む。ブランチ名を指定しなければ `claude/...` の形で自動的に切られる。

---

## 下書きプレビューの仕組み(と、設定するURL)

microCMSの「画面プレビュー」に設定するURLは**この形**にする。

```
https://yamato-outdoor.com/preview/?contentId={CONTENT_ID}&draftKey={DRAFT_KEY}
```

`{CONTENT_ID}` と `{DRAFT_KEY}` はmicroCMSが自動で埋めるので、そのまま書く。

### なぜパスではなくクエリなのか

Cloudflare Pagesは静的ファイルを配信する仕組みで、**「アクセスのたびにサーバーで組み立てるページ」を置けない**
(使っているAstroのCloudflareアダプタは、Pagesではなく Cloudflare Workers 向けに出力するため)。
`/preview/{記事ID}/` のようなURLは、記事ごとにファイルを用意できないので必ず404になる。

そこで次の2つに分けている。

| 役割 | 場所 | 中身 |
|---|---|---|
| 表示 | `src/pages/preview/index.astro` | 静的な1ページ。ブラウザ側で下書きを描画する(noindex) |
| 下書きの取得 | `functions/api/draft.js` | Cloudflare Pages Functions。microCMSのAPIキーはここだけで使う |

APIキーはブラウザに渡らない。下書きを見られるのは `draftKey` を知っている人だけで、
これはmicroCMSの画面プレビューと同じ考え方。

**プレビューは本文・表・装飾・FAQ・目次まで本番と同じ見た目で表示される**が、
パンくずと構造化データは出ない(公開後のページで確認する)。

### 前提

`functions/` はCloudflare Pagesが自動で認識する。ビルド設定の変更は不要。
ただし**環境変数 `MICROCMS_SERVICE_DOMAIN` / `MICROCMS_API_KEY` が
Production と Preview の両方に入っていること**が条件になる(入っていないと、
プレビュー画面にその旨のメッセージが出る)。
APIキーには「**GET(下書き)**」の権限が要る。

---

## 初回だけ必要な設定

### 1. GitHubの既定ブランチを `main` にする

1. https://github.com/aoi7160/yamato-outdoor を開く
2. 「Settings」→ 左メニュー「General」→ 「Default branch」
3. 現在の既定ブランチ名の右にある**切り替えアイコン(⇄)**をクリック
4. `main` を選んで「Update」→ 確認ダイアログで「I understand, update the default branch.」
5. 不要になった `claude/yamato-outdoor-setup-*` などのブランチは「Branches」から削除してよい
   (`claude/media-roadmap-creation-6fiko8` は残す。mainには入れない)

### 2. Cloudflare Pagesの本番ブランチを `main` にする

1. https://dash.cloudflare.com/ → 「Workers & Pages」→ 対象のPagesプロジェクト
2. 「設定」→「ビルド」→「ブランチの制御」
3. **本番ブランチ**を `main` に変更して保存
4. 「デプロイ」タブ →「デプロイを再試行」または `main` に何かpushして初回ビルドを走らせる

ビルド設定が未確認の場合は、あわせて次を確認する。

- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `dist/client` (`dist` ではない)
- 環境変数(本番・プレビュー両方): `MICROCMS_SERVICE_DOMAIN` / `MICROCMS_API_KEY`

---

## 環境変数とAPIキー

### 値の中身

| 変数名 | 値 | 種別 |
|---|---|---|
| `MICROCMS_SERVICE_DOMAIN` | `yamato-outdoor` | 公開情報。Cloudflareでは Text でよい |
| `MICROCMS_API_KEY` | microCMSで発行したキー | **秘密情報。Cloudflareでは必ず Secret** |
| `GTM_ID` ほか計測系 | 各ツールのID(任意) | 公開情報。**Productionにだけ**入れる |

計測系の変数(`GTM_ID` / `GA4_ID` / `CLARITY_ID` / `GSC_VERIFICATION` /
`META_PIXEL_ID` / `X_PIXEL_ID` / `ANALYTICS_DISABLED`)は全部任意で、
**空ならそのタグは出力されない**。一覧は `.env.example`、設定手順は `docs/analytics.md`。

Previewに入れないのは意図的で、PRプレビューのアクセスが本番の数字に混ざらないようにするため。

`MICROCMS_SERVICE_DOMAIN` はmicroCMSのサービスID(管理画面URL `https://yamato-outdoor.microcms.io`
の先頭部分)であって、サイトの独自ドメイン `yamato-outdoor.com` とは別物。
`.microcms.io` や `https://` は付けない。

### APIキーの発行(microCMS)

「サービス設定 → APIキー」で**新規発行**する。デフォルトキーは使い回さない。
権限は次のように最小限にする。

- GET: ON(記事の取得)
- GET(下書き): ON(`/preview` の下書き確認)
- POST / PUT / PATCH / DELETE: **OFF**(サイトは書き込まない)
- 管理画面API: OFF
- 対象APIは `articles` と `categories` だけに絞る

万一漏れても「公開済み記事が読まれる」以上のことが起きない状態にしておく。

### 置き場所

- ローカル: `.env`(`.gitignore` 済み。実値をコミットしない)
- 本番: Cloudflare Pages →「設定」→「Variables and secrets」
  **Production と Preview の両方**に登録する。片方だけだとPRプレビューが壊れる
- 登録・変更後は**再デプロイしないと反映されない**

コード側は `import.meta.env.MICROCMS_*` で読む(`src/lib/microcms.ts`)。
**変数名に `PUBLIC_` を付けないこと。** Astroは `PUBLIC_` で始まる値をブラウザ向けの
JSに埋め込むため、APIキーが公開されてしまう。
現構成はSSGなので、キーが使われるのはビルドサーバーの中だけで、生成後のHTMLには残らない。

### キーのローテーション(漏洩時・担当交代時)

1. microCMSで新しいキーを発行する(古いキーはまだ消さない)
2. Cloudflareの `MICROCMS_API_KEY` を新しい値に更新 → 再デプロイ
3. サイトが正常に表示されることを確認
4. microCMSで古いキーを削除する

この順番なら無停止で切り替わる。先に削除するとビルドが落ちる。

---

## microCMSの「API設定」はどこの話か

同じ「API設定」という言葉が2箇所に出てくるので、混同しやすい。

| 場所 | 何を設定するか |
|---|---|
| サービス設定 → APIキー | **認証キーの発行と権限**。サービス全体で1箇所 |
| コンテンツ(API) → 各API → API設定 | **そのAPI自体の設定**。スキーマ(フィールド)、エンドポイント名、画面プレビュー、Webhook |

このサイトが読んでいるのは **`articles` と `categories` の2つだけ**。
`news` や `blog` などのAPIがサービス内にあっても、コードからは参照していないので
サイトには出ない(消す必要もない)。

エンドポイント名は表示名ではなく**エンドポイントID(英字)**で判定される。
`src/lib/microcms.ts` が `articles` / `categories` を前提にしているため、
IDが違うとビルドしても記事が0件になる。

---

## 計測タグとCVを設定する

手順はすべて `docs/analytics.md` にまとめてある。**記事を公開する前に、
少なくとも次の6つを終わらせる。**

1. GA4を作り、**データ保持を14ヶ月**にする(既定の2ヶ月だと過去が消える)
2. GTMコンテナを作り、`GTM_ID` をCloudflareのProductionに入れる
3. GTMでGA4タグとカスタムイベントを設定して**公開**する
4. Search Consoleを**ドメインプロパティ**で登録し、`sitemap.xml` を送る
5. Microsoft Clarity(`CLARITY_ID`)を入れ、GA4と連携する
6. GA4で内部トラフィック(自分のIP)を除外する

**タグを足すときの約束。** GTM側でタグを追加したら、必ず `src/lib/analytics.ts` の
外部送信一覧にも1行足す。`/privacy` の公表表はこの配列から生成しているため、
ここを更新しないと**公表内容と実態がずれる**(電気通信事業法の外部送信規律)。

CVの行き先は `src/lib/site.ts` に入れる。空なら記事末のCV枠は描画されないので、
準備できたものから順に出せる。まずはGoogleフォーム1枚でよい。

---

## SNSアカウントを開設したとき

準備中のあいだ、SNSアイコンのリンク先は `/sns`(準備中の案内ページ)に向いている。
このページは **200を返し、`noindex, nofollow`** を出すので、リンク切れにも
検索評価の低下にもならない。リンク側にも `rel="nofollow"` が付く。

アカウントができたら `src/lib/site.ts` の `SOCIALS` に実URLを入れるだけでよい。
`href` が入ったものから自動的に、別タブで開く本物の外部リンク(`rel="noopener noreferrer"`)に切り替わる。

```ts
{ name: 'x', label: 'X', href: 'https://x.com/＜アカウント＞' },
```

全部のURLが埋まったら、`/sns` ページは残しても消してもよい(どこからも参照されなくなる)。

---

## 困ったときの確認順

| 症状 | 見るところ |
|---|---|
| microCMSで公開したのにサイトに出ない | Cloudflare Pagesの「デプロイ」履歴。ビルドが走っているか。走っていなければWebhook未設定 |
| ビルドが失敗する | Cloudflareのビルドログ。環境変数の未設定が最多 |
| 記事は出るが画像が出ない | microCMS側のサムネイル未設定、または本文のimgのURL |
| プレビューが404 | microCMSの画面プレビューURL設定。**`/preview/?contentId={CONTENT_ID}&draftKey={DRAFT_KEY}` の形**になっているか(パスではなくクエリで渡す) |
| プレビューに「接続情報がありません」と出る | Cloudflareの環境変数(Production・Preview両方)に `MICROCMS_SERVICE_DOMAIN` / `MICROCMS_API_KEY` が入っているか |
| プレビューに「下書きが見つかりません」と出る | APIキーの「GET(下書き)」権限。またはdraftKeyの期限切れ(microCMSで開き直す) |
| GA4に何も届かない | Cloudflareの環境変数(Production)に `GTM_ID` が入っているか。GTMを「公開」したか |
| GA4にイベント名は出るがパラメータが空 | GA4のカスタムディメンション未登録(`docs/analytics.md` 2-3) |
| Search Consoleでサイトマップが読めない | `https://yamato-outdoor.com/sitemap.xml` を直接開いて確認。記事0件でも200が返る |
