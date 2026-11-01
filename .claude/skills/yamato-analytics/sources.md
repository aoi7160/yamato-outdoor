# データ分析部 —— 出典と確認日

ページ本文は `python3 -I .claude/skills/article-pipeline/fetch_page.py <URL> [語…]` で取る。仕様は変わるので、`metrics.md` を直すときに見直す。

| 項目 | 内容 | 出典 | 確認日 |
|---|---|---|---|
| GA4のデータの鮮度 | データ処理に24〜48時間かかり、その間にレポートの値が変わることがある。イントラデイは日次より先に出るが、日次のデータが出たあとに変わることがある | https://support.google.com/analytics/answer/11198161 | 2026-11-01 |
| Search Consoleのデータの遅れと日付 | 収集したデータは通常2〜3日以内に利用可能。日ごとのデータはカリフォルニア州の現地時間。行数の上限やプライバシーのため表に出ないクエリがある | https://support.google.com/webmasters/answer/96568 | 2026-11-01 |
| Search Console APIの `dataState` | 省略か `final` で確定したデータのみ、`all` で最新(不完全な行を含む) | https://developers.google.com/webmaster-tools/v1/searchanalytics/query | 2026-11-01 |
| Search Consoleの保持期間 | 16か月 | https://support.google.com/analytics/answer/13682862(GA4とSearch Consoleの連携のヘルプ) | 2026-11-01 |
| 検索パフォーマンスの指標 | CTR=クリック÷表示回数。平均掲載順位は最上位の掲載順位の平均 | https://support.google.com/webmasters/answer/7576553 | 2026-11-01 |
| Clarity Data Export API | 1プロジェクト1日10回まで。取れるのは直近1〜3日。1回に3ディメンションまで | https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api | 2026-11-01 |
| PSIの実ユーザーのデータ | CrUXの過去28日。ページのデータが足りなければオリジンに戻る | https://developers.google.com/speed/docs/insights/v5/about | 2026-11-01 |
| Core Web Vitalsの閾値 | LCP 2.5秒・INP 200ms・CLS 0.1(良好)、p75 | https://web.dev/articles/vitals | 2026-11-01 |
| GA4のデータ保持 | 14か月に設定する(既定は2か月) | `docs/analytics.md` 2-2 | 2026-11-01 |

## この部で確かめた事実(2026-11-01)

| 事実 | 方法 |
|---|---|
| `GA4_SA_KEY_B64` は形式は正しい(サービスアカウントのJSON)が、トークンの取得が `invalid_grant: Invalid JWT Signature` で失敗する | `fetch.mjs check` |
| このセッションに `GA4_PROPERTY_ID`・`PSI_API_KEY`・Clarity・Bing・microCMSの鍵は無い | 環境変数の名前だけを確認 |
| 鍵なしのPSI APIは共有の上限(`Queries per day`)で失敗する | `fetch.mjs check` |
| 公開サイト:sitemapのURL 8件・記事1本(salomon-hiking-shoes。RSSの公開日 2026-09-23) | `fetch.mjs public` |
| 公開サイトのHTMLにGTMとClarityのタグがある | `curl` でトップのHTMLを確認 |
| `web_vitals` の `*_rating` の境界はGoogleの閾値と同じ(LCP 2500/4000・CLS 0.1/0.25・INP 200/500)。操作が無いと `inp_ms=0`(good) | `src/components/AnalyticsEvents.astro` |
| Ahrefsのワークスペースに `yamato-outdoor.com` のプロジェクトは無い | `management-projects` |

## この部の運用値(外部の統計ではない)

- 異常値の z の閾値(2・3)とλの下限(20)、計測停止の判定(λ≥5で0):ポアソン分布の近似で置いた社内の初期値
- 「伸びている・落ちている」(表示+50%/−30%・100回以上、PV50以上)、母数の下限(PV30・表示100・`web_vitals` 30):社内の初期値。公開記事が30本を超えたら見直す
