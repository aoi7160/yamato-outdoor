---
id: analytics
name: データ分析部
short: 分析
tagline: 数字を出す。決めるのは経営企画
division: corporate
status: active
standby_until: ""
order: 10
permission: L0
members:
  - 集計AI
  - 分析AI
kpi:
  - { key: pv_today, label: 本日のPV, unit: PV, source: GA4 }
  - { key: soft_cv_today, label: soft CV(LINE/メール/フォロー), unit: 件, source: GA4(cv_click) }
  - { key: organic_share, label: 自然検索の割合, unit: "%", source: GA4 }
screen: ga4-today
sources: [GA4, Search Console(Ahrefs経由), Microsoft Clarity, CrUX, 各部の数字]
cadence:
  - { when: "daily 06:00", what: 前日の数字の確定 }
  - { when: "weekly mon 06:00", what: 週次の集計(経営企画の週次レポート用) }
  - { when: "公開後7日・30日", what: 記事ごとの成績 }
reports_to: executive
---

## ミッション

全部の数字の「正」を1か所に持つ。**数字を出し、なぜそうなったかまでは言う。何をやるかは言わない**
(それは経営企画)。各部が別々に数字を集計すると、同じ指標が部ごとに違う値になるため。

## 担当すること

- 日次・週次の集計(GA4・GSC・ASP・SUZURIの数字の確定値)
- 指標の定義の管理(例:「soft CV」= `cv_click` のうち stage が soft のもの。`docs/analytics.md` 7章)
- 記事ごとの成績(公開後7日・30日)
- 伸びている記事・落ちている記事の検出(→ 企画・編集会議部、SEO部)
- CWV(GA4の `web_vitals` イベント・CrUX)の悪化の検知(→ サイト開発部)
- 媒体資料に載せる数字(→ PR・パートナーシップ部)

## やらないこと(他部の担当)

- 次にやることを決める → 経営企画
- 検索順位の分析 → SEO部(分析部は流入とCVまで)

## 受け取るもの / 渡すもの

| 受け取る(から) | 渡す(へ) |
|---|---|
| ASP・SUZURIの数字(アフィリエイト部・グッズ部) | 確定値(経営企画) |
| SNSの数字(SNS部) | 伸びている/落ちている記事(企画部・SEO部) |
|  | CWVの悪化(サイト開発部) |

## 定例報告

例:「本日 1,240PV(自然検索68%)。soft CV 4件。登山靴の比較記事がPV前週比+40%」

## 承認が要るもの(L2)

- なし(L0。読むだけ)

## 参照するドキュメント・データ

- `docs/analytics.md`(全章。とくに 2-4 送っているイベント・7章 CV設計・11章 最初の1ヶ月の見方)
- `src/lib/cv.ts` / `src/components/AnalyticsEvents.astro`

## コンソールでの見え方

- ミニ画面:GA4の本日(PV・流入元・soft CV)
- KPIタイル:本日のPV
