# サイト開発・パフォーマンス部 —— 実装チェックリストと改善の型

`SKILL.md` の 4-2(改修)と 5章(品質基準)から使う。該当しない行は飛ばしてよいが、**飛ばした理由を言えること**。

---

## 1. 公開サイト(Astro SSG + Cloudflare Pages)

### ブランチとビルド
- [ ] 最新の `main` から `claude/<内容>-<ID>` を切った(`claude/media-roadmap-creation-*` を元にしていない)
- [ ] `npm run build` が通る。出力は `dist/client`。`dist/client/wrangler.json` と `dist/client/.assetsignore` が無い
- [ ] `export const prerender = false` を使っていない。サーバー処理が要るなら `functions/`(Cloudflare Pages Functions)
- [ ] 記事を `src/pages/` に足していない(記事はmicroCMS)
- [ ] ジャンルは `src/lib/taxonomy.ts` の3つのまま。カテゴリをコードで足していない(microCMSの `categories`)
- [ ] URLを変えたなら、旧URLを `public/_redirects` で301にした

### デザインの約束(CLAUDE.md)
- [ ] 背景の山は写真を使わずSVGのシルエット。等間隔の三角形を並べていない
- [ ] 動かすのは `transform`(translate)と `opacity` だけ。`feGaussianBlur`・`mix-blend-mode`・`scale` をアニメーションさせていない
- [ ] 背景のアニメーション層が予算内(トップ:drift 3+grain 1 / それ以外:drift 3+`.cover::after` 1)。`perf-check.mjs` の `animations.running` で数えた
- [ ] 動く層を全面(`inset:0`)にしていない。カバーの上から30%より上(stickyヘッダー付近)に置いていない
- [ ] `.scenery` の中に置いた要素の見え方を、`body::before` の暗幕(z-index:-1)の下に沈むことを前提に確かめた
- [ ] 大きいラッパーに `overflow-x` だけを `visible` 以外にしていない(iOS Safariのスクロール不具合)
- [ ] フォント:見出し(大きい和文)=Zen Old Mincho、本文=Zen Kaku Gothic New、欧文=Schibsted Grotesk。中くらいの和文は字間を開けたゴシック
- [ ] 目次に出るのは `h2` だけのまま
- [ ] ヘッダーのナビ:モバイルで4つ目以降を隠す間引き(`.site-nav a:nth-child(n + 4)`)を壊していない。常に見せたいリンクは `.site-nav` の外
- [ ] Aboutは5カラムの正方グリッド+点の背景(静止)のまま。`plain` で山と暗幕を外している
- [ ] SNSの並びは `SOCIAL_ORDER` のまま
- [ ] 修飾クラスのCSS(`.x--y`)を、基本のルール(`.x`)より**後ろ**に書いた(同じ詳細度は後勝ち)

### 計測タグの約束(CLAUDE.md)
- [ ] タグを足したら `src/lib/analytics.ts` の外部送信一覧に1行足した(`/privacy` の公表表がここから作られる)。法務部への確認依頼を書いた
- [ ] タグのIDは環境変数から読み、空なら何も出力しない
- [ ] 読み込みは `load` 後のアイドルか最初の操作まで遅らせた。headで同期的に読んでいない
- [ ] ASPを足したら `src/lib/affiliate.ts` の `AFFILIATE_NETWORKS` と `console/server/proofread.js` の一覧の両方に足し、`cd console && npm test` を通した
- [ ] `/preview/*` は noindex・計測タグなしのまま
- [ ] `AMAZON_ASSOCIATE` を、参加前に `true` にしていない

### 画像・LCP・CLS
- [ ] LCPになる画像(トップのポスター・記事のサムネ)に `loading="lazy"` を付けていない。`fetchpriority="high"` を外していない
- [ ] `<img>` に `width` と `height` がある(CLS)
- [ ] microCMSの画像URLに自分でクエリを付けていない(`src/lib/article.ts` が付ける)
- [ ] 新しく足したフォント・ウェイトが無い(足すならLCPへの影響を計測して書く)

### 仕上げ
- [ ] 本番とプレビューで `perf-check.mjs --cpu 4` を各2回測り、2回目を並べた(性能に触れる変更)
- [ ] 幅390と1280のスクリーンショットを見た(見た目の変更)
- [ ] コミットメッセージ・コード内コメントが日本語
- [ ] PRの本文に、何を・なぜ・計測値・切り戻しの方法を書いた

## 2. コンソール(`console/`。Workers)

- [ ] `cd console && npm run build && npm test` が通る
- [ ] `/api/*` は `console/server/access.js` でAccessのJWTを検証してからしか返さない。`CF_ACCESS_TEAM_DOMAIN` と `ALLOWED_EMAILS` が無ければ閉じる。この検証を外していない
- [ ] 鍵(Googleのサービスアカウント・APIキー・Notionのトークン)は環境変数(シークレット)だけ。ブラウザに渡していない
- [ ] `console/astro.config.mjs` の `vite.tsconfig` を消していない
- [ ] 売上の実データ(ASPのCSV・SUZURIの金額)をリポジトリに入れていない(`console/data/private/` は `.gitignore`)
- [ ] 実データモードで、取れない数字を「—」と「未接続/取得失敗」で出している(デモの数字で埋めていない)
- [ ] 動かすのは文字の書き換えと `opacity` だけ(コンソールにもfps制約)
- [ ] 連携を足したら `console/README.md` 10-3 の5手順(`connectors.js`・`connectors.ts`・`real.ts`・テスト・`SETUP.md`)を全部やった
- [ ] 部を足したら `console/agents/_template.md` から作り、`console/ORG.md` の組織図と境界表も更新する依頼を出した

## 3. 依存関係のメジャー更新

- [ ] 公開から2週間以上たっている。移行ガイド(Astroなら公式の「Upgrade to vN」)を読み、該当する変更を一覧にした
- [ ] 公開サイトとコンソールを別のブランチ・別のPRにした
- [ ] `npm run build` の出力(`dist/client` のファイル一覧と数)を更新前と比べ、消えたページ・増えたファイルが無い
- [ ] `sitemap.xml`・`rss.xml`・`llms.txt` の中身を更新前と `diff` した
- [ ] `@astrojs/cloudflare` を上げたら `wrangler.json` が公開フォルダに残らないか確かめた
- [ ] プレビューで4URL(トップ・ジャンル・記事・About)を計測し、更新前と並べた

## 4. Core Web Vitals の改善の型(このサイトで効く順)

| 指標 | 打ち手 | このサイトでの場所 |
|---|---|---|
| LCP | LCPの画像を最初に取りに行かせる(`fetchpriority="high"`・遅延読み込みしない) | `ArticleLayout.astro` のサムネ / トップの `<video poster>` |
| LCP | LCPの画像を軽くする(WebP・幅の合ったsrcset) | `src/lib/article.ts` の `microcmsImage` / `public/media/hero/01.webp`(114KB) |
| LCP | ポスターを `<link rel="preload" as="image">` で先に取る(トップだけ。効果を計測してから) | `src/pages/index.astro` |
| LCP | フォントのウェイトを増やさない。`display=swap` を保つ | `BaseLayout.astro` |
| LCP | 計測タグを遅らせたままにする | `Analytics.astro` |
| INP | スクロール・リサイズの処理は `requestAnimationFrame` でまとめ、`passive: true` | `AnalyticsEvents.astro` / `.js-auto-height` |
| INP | クリックの処理で重い計算をしない(送信は `requestIdleCallback` か次のフレーム) | `AnalyticsEvents.astro` |
| INP | 50msを超えるタスクを分ける | `perf-check.mjs` の `long_tasks` で見つける |
| CLS | 画像に `width`/`height`。本文の `<img>` は入稿のときに実寸(`docs/tone-and-manner.md` 7章) | microCMSの本文 |
| CLS | 遅れて出る枠(CV枠・関連記事)の高さを先に確保する | `ArticleCta.astro` ほか |
| CLS | Webフォントの差し替えのずれ(必要なら `size-adjust` の代替フォント) | `global.css` |
| fps | 動く層を減らす・面積を絞る・ヘッダーから離す・`will-change` を動く層だけに | `global.css` の `.scenery__*` / `.cover::after` |

## 5. 記録の型

### `content/dev/perf-log.md`(非公開リポジトリ。月1ブロック)

```markdown
## 2026-11(2026-11-01 測定)

| URL | 実ユーザー(PSI・p75) | ラボ LCP | ラボ CLS | 長いタスク | スクロール fps / p95 | 動く層 | 判定 |
|---|---|---|---|---|---|---|---|
| / | 未取得(PSIの鍵なし) | 1,316ms | 0.001 | 7件・1,190ms | 60.6 / 16.7ms | 5(予算4) | NG:層の予算超え |

- ビルド:Cloudflare Pages success / Workers Builds success
- 依存関係:audit critical 1(astro)・high 11・moderate 1。outdated:astro 7.2.2→7.4.1 ほか
- 計測の条件:perf-check.mjs --cpu 4・幅390×844・各2回の2回目
```

### `content/dev/incidents.md`(1件5行)

```markdown
## YYYY-MM-DD HH:MM <症状>
- 影響:<どのページが・何分>
- 原因:<コミット・ファイル・行>
- 検知まで:<分>(どうやって気づいたか)
- 戻し方:<ロールバック/revert。誰が押したか>
- 再発防止:<checklist.md に足した行>
```
