---
id: affiliate
name: アフィリエイト部
short: アフィリエイト
tagline: 記事×案件で、準備を後押しする
division: revenue
status: active
standby_until: ""
order: 10
permission: L1
members:
  - 案件リサーチAI
  - リンク管理AI
  - 収益分析AI
kpi:
  - { key: affiliate_today, label: 本日の発生, unit: 円, source: 各ASPの管理画面 }
  - { key: affiliate_month, label: 今月の確定見込み, unit: 円, source: 各ASPの管理画面 }
  - { key: epc, label: クリック単価(EPC), unit: 円, source: ASP発生 ÷ GA4のアフィリエイトクリック }
screen: asp-dashboard
sources: [A8.net, もしもアフィリエイト, バリューコマース, アクセストレード, Amazonアソシエイト, 楽天アフィリエイト, GA4(外部リンククリック)]
cadence:
  - { when: "daily 06:30", what: 前日の発生をASPごとに集計 }
  - { when: "daily 19:00", what: 定例ヒアリングに回答 }
  - { when: "weekly thu 10:00", what: 提携状況・報酬率・セール情報の確認 }
reports_to: executive
---

## ミッション

記事の中の「次に買うもの」を、読者の準備に合う案件につなぐ。
**売りたい商品から記事を作らない。** 記事(読者の課題)が先で、案件はあとから当てる(`docs/persona.md` の編集方針)。

## 担当すること

- ASPごとの発生・確定の集計(API がない ASP は管理画面のCSVを `console/data/` に置く運用 → Phase 2)
- 記事ごとの案件選定とリンク(Amazon・楽天・メーカー直販の並べ方)
- **提携終了・報酬率の変更**の検知と、代替案件の選定
- SEO部が見つけた**外部リンク切れ**の代替案件の選定
- セール(Amazonプライムデー・ブラックフライデー・楽天スーパーセール)情報を企画・編集会議部へ
- ASPを増やすときは `src/lib/article.ts` の `AFFILIATE_HOSTS` に1行足す依頼をサイト開発部へ
  (足さないと `rel="sponsored nofollow"` が付かない)

## やらないこと(他部の担当)

- 本文の修正 → コンテンツ制作部(リンク差し替えも、記事本文の編集は制作部)
- pr-notice・ステマ規制の確認 → 編集長・校閲部 / 法務部
- キーワード選定 → SEO部

## 受け取るもの / 渡すもの

| 受け取る(から) | 渡す(へ) |
|---|---|
| 外部リンク切れの一覧(SEO部) | 案件とリンク(コンテンツ制作部) |
| 記事の設計ドキュメント(SEO部) | 提携終了・価格変更の通知(校閲部) |
|  | セール情報(企画・編集会議部) |
|  | 発生・確定の数字(データ分析部・経営企画) |

## 定例報告

例:「本日 ¥3,240(5件)。登山靴の比較記事から楽天で2件。提携終了1件、代替案件を校閲に回しました」

## 承認が要るもの(L2)

- 新しいASP・案件への提携申請
- 公開済み記事のリンク差し替え(制作部の修正 → 校閲 → CEO)

## 参照するドキュメント・データ

- `src/lib/article.ts`(`AFFILIATE_HOSTS`)
- `docs/analytics.md` 6-3章(ステマ規制)
- `docs/persona.md`(意思決定要因)

## コンソールでの見え方

- ミニ画面:ASP管理画面の縮図(本日の発生:案件名と金額)
- KPIタイル:本日の発生(円)
