---
id: dev
name: サイト開発・パフォーマンス部
short: サイト開発
tagline: 凝ったデザインを、速いまま保つ
division: product-content
status: active
standby_until: ""
order: 60
permission: L1
members:
  - 実装AI
  - パフォーマンス計測AI
kpi:
  - { key: build_status, label: mainのビルド, unit: "", source: Cloudflare Pages }
  - { key: lcp_p75, label: LCP(p75), unit: 秒, source: CrUX / GA4のWeb Vitals }
  - { key: inp_p75, label: INP(p75), unit: ms, source: CrUX / GA4のWeb Vitals }
  - { key: scroll_fps, label: スクロール中のfps(実測), unit: fps, source: 計測スクリプト }
screen: build-vitals
sources: [Cloudflare Pages, CrUX, GA4(web_vitals イベント), npm run build]
cadence:
  - { when: "monthly 1日", what: "パフォーマンス(4URLのCWV・ラボ計測・動く層)と依存関係(npm outdated・audit)の月次点検(運営の時間割 monthly)" }
  - { when: "daily", what: "mainのビルド状態はコンソールのサーバーが自動で取得(GitHubのcheck-runs)" }
  - { when: "daily 19:00", what: 定例ヒアリングに回答 }
reports_to: executive
staff:
  - { name: "実装AI", does: "サイトとコンソールの改修(claude/*ブランチ → build・test → プレビューで計測 → mainへのマージの承認依頼)、依存関係の更新、障害時の切り戻し手順", where: "GitHub(aoi7160/yamato-outdoor)/ Notion承認トレイ(mainへのマージ)", runs: "スキル yamato-dev(改修・依存関係・障害)。運営の時間割(yamato-ops)の monthly で依存関係を点検。頼まれたときも実行", state: on-call }
  - { name: "パフォーマンス計測AI", does: "Core Web Vitals(PSI・CrUX・GA4のweb_vitals)とラボ計測(perf-check.mjs:LCP・CLS・長いタスク・スクロールfps・動く層の数と面積)で、fps制約と性能の予算が守られているかを確かめる", where: "非公開リポジトリ(content/dev/perf-log.md)/ BASE CAMP「本日」(PSIの自動取得はコンソールのサーバー)", runs: "スキル yamato-dev(月次の計測・改修ごとのプレビュー計測)。運営の時間割(yamato-ops)の monthly で実行。頼まれたときも実行", state: on-call }
---

## ミッション

サイトの改修を担当し、**デザインに凝るほど重くなるのを止める**。
`CLAUDE.md` の制約(fps・レイヤー予算・SSG・ビルド出力)を守るのはこの部の責任。

## 担当すること

- 改修の実装(`claude/<内容>-<ID>` ブランチで。mainへのマージはCEO承認)
- **mainに入れる前に必ず `npm run build` を通す**
- Core Web Vitals(LCP・INP・CLS)の監視
- 背景・カバーにアニメーションを足すときのfps実測(レイヤー数・面積・stickyヘッダー付近の制約)
- 法務部の指摘で `src/lib/analytics.ts`(外部送信一覧)や `/privacy` を直す
- `public/_redirects`(旧URLの301)・sitemap / RSS / llms.txt の生成ロジックの保守
- このコンソール(`console/`)自体の開発

## やらないこと(他部の担当)

- 記事を書く・記事をコードで足す → コンテンツ制作部(microCMS)
- 素材(画像・動画)を作る → クリエイティブ制作部
- 計測の数字の解釈 → データ分析部

## 受け取るもの / 渡すもの

| 受け取る(から) | 渡す(へ) |
|---|---|
| 改修の依頼(経営企画・各部) | プレビューURLとマージの承認依頼(承認トレイ → CEO) |
| 動画・画像(クリエイティブ部) | fpsの計測結果(クリエイティブ部) |
| 外部送信の修正依頼(法務部) |  |
| CWVの悪化(データ分析部) |  |

## 定例報告

例:「mainのビルドOK。LCP 1.9秒・INP 120ms。カバー動画の差し替え候補はスクロール中58fpsで問題なし」

## 承認が要るもの(L2)

- mainへのマージ(=本番公開)
- 計測タグ・外部送信先の追加(法務部の確認も必要)

## 参照するドキュメント・データ

- `CLAUDE.md`(全体。とくに「デザインの約束」「その他」)
- `docs/analytics.md`
- `src/lib/analytics.ts` / `src/components/Analytics.astro`

## コンソールでの見え方

- ミニ画面:ビルド履歴とCWVの3指標
- KPIタイル:mainのビルド状態(OK / NG)
