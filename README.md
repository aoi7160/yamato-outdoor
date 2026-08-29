# YAMATO OUTDOOR

「山と生きる。山と挑む。」— 実体験ベースの装備検証・レビューを届けるアウトドアメディア。

- CMS: [microCMS](https://microcms.io/)(ヘッドレスCMS)
- フロントエンド: [Astro](https://astro.build/)(静的サイト生成)
- ホスティング: [Cloudflare Pages](https://pages.cloudflare.com/)

## 技術構成の方針

基本は、microCMSからビルド時に記事データを取得して静的HTMLを生成する構成(SSG)です。
記事を追加・更新したらmicroCMS側で公開し、Cloudflare Pages側で再ビルドを走らせれば
反映されます(GitHub連携時は後述の通り自動化可能)。

例外として、下書きを確認する「画面プレビュー」ページ(`/preview/[contentId]`)だけは
リクエストの都度サーバー側で描画する構成にしています(Cloudflare Pages Functions)。
これはCloudflare Pagesの無料枠(1日10万リクエストまで)に含まれる機能で、EmDashで
問題になった「Dynamic Workers」(Workers Paidプラン必須の機能)とは別物です。

## セットアップ手順

### 1. microCMSのセットアップ

1. [microCMS](https://microcms.io/)で無料アカウントを作成
2. `docs/microcms-schema.md` の通りに `categories` / `articles` の2つのAPIを作成
3. APIキーとサービスIDを取得

### 2. ローカル環境変数の設定

```bash
cp .env.example .env
```

`.env` を開いて、取得したmicroCMSのサービスID・APIキーを設定してください。

### 3. 依存関係のインストール・開発サーバー起動

```bash
npm install
npm run dev
```

`http://localhost:4321` で確認できます。

### 4. ビルド

```bash
npm run build
```

`dist/client/` に静的ファイル、`dist/server/` にプレビュー用のサーバー関数が出力されます。

## Cloudflare Pagesへのデプロイ(GitHub連携・自動デプロイ)

APIトークンをGitHub Secretsで管理する必要がない、Cloudflare Pages標準のGit連携を使います。
pushするたびに自動でビルド・公開されます。

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/) にログイン
2. 「Workers & Pages」>「作成」>「Pages」>「Gitに接続」
3. このGitHubリポジトリ(`yamato-outdoor`)を選択
4. ビルド設定:
   - フレームワークプリセット: `Astro`
   - ビルドコマンド: `npm run build`
   - ビルド出力ディレクトリ: `dist/client`(`dist` ではない点に注意)
5. 「環境変数」に以下を追加(本番・プレビュー両方の環境で):
   - `MICROCMS_SERVICE_DOMAIN`
   - `MICROCMS_API_KEY`
6. 「保存してデプロイ」

以降、`main`ブランチにpushすると自動的に再ビルド・公開されます。
プルリクエストを作成すると、プレビュー用のURLも自動生成されます。

## microCMSの画面プレビュー設定

下書き状態の記事を公開前に確認できる機能です。microCMS管理画面で以下を設定してください。

1. `articles` API を開く >「API設定」>「画面プレビュー」
2. 「遷移先URL」に以下を設定:
   - ローカル確認用: `http://localhost:4321/preview/{CONTENT_ID}?draftKey={DRAFT_KEY}`
   - 本番確認用(Cloudflare Pagesデプロイ後): `https://yamato-outdoor.com/preview/{CONTENT_ID}?draftKey={DRAFT_KEY}`
3. 「変更する」で保存

設定後、記事の詳細画面右上に出る「画面プレビュー」ボタンから、公開前の下書き内容を
確認できます。`{CONTENT_ID}` と `{DRAFT_KEY}` はmicroCMSが自動的に値を埋め込みます。

## 独自ドメインの紐付け

1. Cloudflare Pagesプロジェクトの「カスタムドメイン」タブを開く
2. `yamato-outdoor.com`(すでにCloudflareで管理中のドメイン)を追加
3. 同一Cloudflareアカウント内のドメインなので、DNSレコードは自動追加される

## ディレクトリ構成

```
src/
  layouts/
    BaseLayout.astro     共通レイアウト(フォント読み込み・背景の山・ヘッダー/フッター)
    ArticleLayout.astro  記事ページ(目次・読了バー・FAQ・著者・関連記事・構造化データ)
  pages/         ルーティング(index.astro, articles/[slug].astro など)
  lib/
    microcms.ts  microCMS APIクライアント・型定義
    article.ts   本文HTMLの加工(見出しへのid付与・目次抽出・表の横スクロール化)
  styles/
    global.css   全体のトーンと背景の山
    article.css  記事ページ専用
docs/
  microcms-schema.md  microCMS側のAPI設計ドキュメント
```

## ナビゲーションの区分

| メニュー | 中身 | リンク先 |
|---|---|---|
| Articles | 全カテゴリの新着一覧 | `/` |
| Gear | ウェア・テント・ザックなど装備の実地レビューと比較検証 | `/category/gear` |
| Route | 実際に歩いた山行記録(コースタイム・水場・エスケープ) | `/category/route` |
| About | 運営者とブランドの紹介 | `/about` |

カテゴリページは `src/pages/category/[slug].astro` がmicroCMSのカテゴリから
自動生成する。記事が0件でもリンクが404にならないよう、gear / route / how-to は
常にページを用意している。

## SNS

アカウントのURLは `src/lib/site.ts` の `SOCIALS` にまとめてある。ここを書き換えれば
フッターのフォローリンクと記事末尾のシェア/フォロー欄に反映される
(URLを空文字にしたものは表示されない)。

アイコンは `src/components/SocialIcon.astro` にパスを持たせた単色SVG。
各社が配布しているロゴパック(`__MACOSX` や `Dev Portal Logo Pack` などが同梱された
zip)をそのまま置く必要はない。形式もサイズもばらつくうえ、単色・同一サイズに
揃えるほうがデザイン上も扱いやすいため。

- シェア(記事末尾): X / Facebook / Threads / LINE / リンクコピー
- フォロー(記事末尾・フッター): X / Instagram / TikTok / Threads / Facebook

Instagram と TikTok にはWebからの投稿共有の導線が無いため、シェアではなく
フォローリンクとしてのみ設置している。

## 記事ページのデザインについて

霧のかかった山の写真のトーンに寄せている。背景は写真素材を使わず、不規則なパスの
シルエット(SVG)とぼかした霧の層、フィルム粒子だけで作っている
(`BaseLayout.astro` の `.scenery` と `global.css`)。稜線は等間隔の三角形にしないこと
——反復するとすぐ「図形の並び」に見えてしまう。
見出しや本文の影は、霧越しに文字が浮かび上がる見え方を狙って二段の `text-shadow`
で作っている。

- ロゴ: `src/components/Logo.astro`(SVG、色は `currentColor` で継承)。
  ヘッダー・フッターはこのコンポーネントを読んでいるので、公式ロゴのベクターデータを
  受け取ったらこのファイルのSVGを差し替えるだけでよい(`fill`/`stroke` は
  `currentColor` のままにしておくと、配色を変えても追従する)。
  色を継承できない用途(OGP画像・メールなど)向けに `public/logo.svg` も同じ形で置いている。
- フォント: 和文の見出しは Zen Old Mincho(明朝)、本文は Zen Kaku Gothic New、
  欧文・数字・ラベルは Barlow Condensed。Google Fontsから読み込む。
- 目次: 本文の `h2` から自動生成する(`src/lib/article.ts`)。アンカーリンクで該当見出しへ飛ぶ。
  広い画面では右側に追従表示し、いま読んでいる見出しをハイライトする。
  狭い画面では本文の先頭に置く。
- 記事内で使える装飾クラス(microCMSのリッチエディタでHTMLとして貼れる):
  `div.note`(補足) / `div.note.warn`(注意) / `div.checklist`(持ち物リスト) /
  `p.source`(出典)。表は自動で横スクロール対応の箱に入る。
- `src/pages/articles/night-hike-basics.astro` は、microCMSに記事が入る前でも
  デザインと記事の分量を確認するための見本ページ。不要になったら削除してよい。
