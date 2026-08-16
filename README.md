# YAMATO OUTDOOR

「山と生きる。山と挑む。」— 実体験ベースの装備検証・レビューを届けるアウトドアメディア。

- CMS: [microCMS](https://microcms.io/)(ヘッドレスCMS)
- フロントエンド: [Astro](https://astro.build/)(静的サイト生成)
- ホスティング: [Cloudflare Pages](https://pages.cloudflare.com/)

## 技術構成の方針

microCMSからビルド時に記事データを取得して静的HTMLを生成する構成(SSG)にしています。
サーバーサイド実行(Cloudflare Workers)を使わないため、Cloudflare Pagesの無料枠だけで
運用できます。記事を追加・更新したらmicroCMS側で公開し、Cloudflare Pages側で
再ビルドを走らせれば反映されます(GitHub連携時は後述の通り自動化可能)。

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

`dist/` に静的ファイルが出力されます。

## Cloudflare Pagesへのデプロイ(GitHub連携・自動デプロイ)

APIトークンをGitHub Secretsで管理する必要がない、Cloudflare Pages標準のGit連携を使います。
pushするたびに自動でビルド・公開されます。

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/) にログイン
2. 「Workers & Pages」>「作成」>「Pages」>「Gitに接続」
3. このGitHubリポジトリ(`yamato-outdoor`)を選択
4. ビルド設定:
   - フレームワークプリセット: `Astro`
   - ビルドコマンド: `npm run build`
   - ビルド出力ディレクトリ: `dist`
5. 「環境変数」に以下を追加(本番・プレビュー両方の環境で):
   - `MICROCMS_SERVICE_DOMAIN`
   - `MICROCMS_API_KEY`
6. 「保存してデプロイ」

以降、`main`ブランチにpushすると自動的に再ビルド・公開されます。
プルリクエストを作成すると、プレビュー用のURLも自動生成されます。

## 独自ドメインの紐付け

1. Cloudflare Pagesプロジェクトの「カスタムドメイン」タブを開く
2. `yamato-outdoor.com`(すでにCloudflareで管理中のドメイン)を追加
3. 同一Cloudflareアカウント内のドメインなので、DNSレコードは自動追加される

## ディレクトリ構成

```
src/
  layouts/       共通レイアウト
  pages/         ルーティング(index.astro, articles/[slug].astro など)
  lib/microcms.ts  microCMS APIクライアント・型定義
  styles/        グローバルCSS
docs/
  microcms-schema.md  microCMS側のAPI設計ドキュメント
```
