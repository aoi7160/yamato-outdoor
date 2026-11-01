# サイト開発・パフォーマンス部 —— 出典と確認日

ページ本文は `python3 -I .claude/skills/article-pipeline/fetch_page.py <URL> [語…]` で取る。閾値は年に1回、見直す。

| 項目 | 内容 | 出典 | 確認日 |
|---|---|---|---|
| Core Web Vitals の良好の閾値 | LCP 2.5秒以内・INP 200ms以下・CLS 0.1以下。75パーセンタイルを、モバイルとPCに分けて測る | https://web.dev/articles/vitals | 2026-11-01 |
| 不良の閾値 | LCP 4,000ms超・INP 500ms超・CLS 0.25超 | https://web.dev/articles/defining-core-web-vitals-thresholds | 2026-11-01 |
| PSIの実ユーザーのデータ | CrUXの過去28日。ページのデータが足りなければオリジンに戻る。3指標とも良好で合格(INPが足りなければLCPとCLSで判定) | https://developers.google.com/speed/docs/insights/v5/about | 2026-11-01 |
| CrUX API | 28日の移動平均。毎日 4:00(UTC)ごろ更新(SLAなし) | https://developer.chrome.com/docs/crux/api | 2026-11-01 |
| Cloudflare Pages のロールバック | 成功した本番のデプロイならどれにでも戻せる。プレビューのデプロイは戻し先にならない。Deployments →「…」→ Rollback to this deployment | https://developers.cloudflare.com/pages/configuration/rollbacks/ | 2026-11-01 |
| ブランチのプレビュー | `claude/*` にpushすると Cloudflare Pages がプレビューを作り、GitHubの check-runs(名前「Cloudflare Pages」)の要約に Preview URL が出る | `gh api repos/aoi7160/yamato-outdoor/commits/main/check-runs` で確認 | 2026-11-01 |

## この部で測った事実(2026-11-01)

| 事実 | 方法 |
|---|---|
| トップの動く層が5(`.scenery__drift` ×3・`.scenery__grain-drift`・`.cover--video::after`)。`.cover--video::after` の計算後の `content` は `""`(止まっていない) | `perf-check.mjs` と Playwright の `getComputedStyle` |
| トップ(幅390・CPU4倍遅延):ラボLCP 1,316ms・CLS 0.001・スクロール60.6fps | `perf-check.mjs` |
| 鍵なしのPSI APIは共有の1日の上限で失敗する(`Quota exceeded … Queries per day`) | `curl` で `runPagespeed` |
| `npm audit --omit=dev`(公開サイト):13件(critical 1・high 11・moderate 1) | `npm audit` |
| このコンテナに Playwright と Chromium(`/opt/pw-browsers`)がある。GPUは無い | `perf-check.mjs` の実行 |

## この部の運用値(外部の統計ではない)

- 目標(LCP 2.0秒・INP 150ms・CLS 0.05)と警戒線(+300ms・+50ms・+0.03):Googleの良好の閾値に、見た目を足すための余白を取った社内の初期値
- ラボのスクロールの予算(fps -5以内・p95 20ms以下・50ms超0):60fps(16.7ms)を基準にした社内の初期値
- GA4の `web_vitals` でページを判定する最小の標本30:p75が1〜2件の外れ値で動かない最小限として置いた社内の初期値
