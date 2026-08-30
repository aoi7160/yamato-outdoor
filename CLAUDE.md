# YAMATO OUTDOOR — 作業ルール

Astro(SSG) + microCMS + Cloudflare Pages のアウトドアメディア。

## ブランチ運用

- **`main` が本番。** `main` にpushされた内容がCloudflare Pagesでビルドされ、公開される。
- 作業は `claude/<内容>-<ID>` ブランチで行い、完了・確認後に `main` へマージする。
- **`docs/roadmap.md` を含む `claude/media-roadmap-creation-*` ブランチは `main` にマージしない。**
  事業ロードマップは社内の検討用ドキュメントであり、公開リポジトリの本流には載せない方針。
- `main` へ入れる前に必ず `npm run build` が通ることを確認する。

## サイトの階層

```
/                                      トップ(ジャンルを選ぶ)
/mountain-climbing/                    ジャンル(登山 / 釣り fishing / キャンプ camp)
/mountain-climbing/gear/               ジャンル内のカテゴリ
/mountain-climbing/gear/<記事slug>/     記事
```

- ジャンルは `src/lib/taxonomy.ts` で固定(3つ。写真とコピーが要るため)。
- カテゴリはmicroCMSの `categories` で増やす。どのジャンルに属するかは
  カテゴリの `genre` フィールド(`mountain-climbing` / `fishing` / `camp`)で決まる。
  未設定のときは `taxonomy.ts` のフォールバック表で解決する。
- 旧URL(`/articles/...` `/category/...`)は `public/_redirects` で301転送している。

## 記事の追加

- **記事本文はmicroCMSに入れる。** リポジトリ側にはページを作らない。
  microCMSで公開 → 再ビルドで反映される(`docs/workflow.md` 参照)。
- 例外は `src/pages/articles/night-hike-basics.astro`(デザイン確認用の見本記事)のみ。
  新しい記事をコードとして追加しないこと。

## 主要ファイル

| 対象 | 場所 |
|---|---|
| 記事ページのレイアウト | `src/layouts/ArticleLayout.astro` |
| 共通レイアウト・背景の山 | `src/layouts/BaseLayout.astro` |
| ロゴ | `src/components/Logo.astro` / `public/logo.svg` |
| SNSのURL・並び順 | `src/lib/site.ts` |
| 目次生成・本文HTMLの加工 | `src/lib/article.ts` |
| スタイル | `src/styles/global.css`(全体) / `src/styles/article.css`(記事) |
| 読者ペルソナ・編集方針 | `docs/persona.md` |
| 公開までの手順 | `docs/workflow.md` |

## デザインの約束

- 背景の山は写真を使わず、SVGのシルエットとぼかした霧で作る。
  **等間隔の三角形を並べない**(反復するとすぐ図形の並びに見える)。
- フォントは 見出し=Zen Old Mincho / 本文=Zen Kaku Gothic New / 欧文=Barlow Condensed。
- 目次に出すのは `h2` のみ。
- **背景に重い処理を足さない。** SVGのぼかしフィルタ(`feGaussianBlur`)や
  全画面の `mix-blend-mode` をアニメーションさせると、スクロールが5fpsまで落ちる。
  背景は `public/scenery.svg` に焼き込んだ静止画とし、動かすのは transform だけにする。
- SNSの並び順は `SOCIAL_ORDER` に従い、シェアもフォローも同じ順にする。

## その他

- コミットメッセージ・コード内コメントは日本語で書く。
- ビルド出力は `dist/client`(`dist` ではない)。
