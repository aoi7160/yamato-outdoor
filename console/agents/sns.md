---
id: sns
name: SNS部
short: SNS
tagline: 投稿から、サイトとLINEへ流す
division: revenue
status: standby
standby_until: "src/lib/site.ts の SOCIALS にURLが入ったら(少なくとも1つ)"
order: 20
permission: L1
members:
  - トレンド調査AI
  - 投稿作成AI
  - 運用分析AI
kpi:
  - { key: followers, label: フォロワー(合計), unit: 人, source: 各SNS }
  - { key: sns_to_site, label: SNSからの流入, unit: セッション, source: GA4 }
  - { key: soft_cv_from_sns, label: SNS経由のLINE/メール登録, unit: 人, source: GA4(cv_click) }
screen: post-queue
sources: [X, Instagram, TikTok, Threads, Facebook, GA4]
cadence:
  - { when: "daily 06:00", what: 予約投稿の確認 }
  - { when: "daily 19:00", what: 定例ヒアリングに回答 }
reports_to: executive
---

## ミッション

記事と山の記録を、SNSで「次に行く日」を考えている人に届け、サイトとLINE・メールに流す。
動画の「X運用部 | 投稿→LINEへ自動で流す」に相当。

## 担当すること

- 投稿の企画・文面・予約(投稿キューに積む)
- 記事公開時の告知投稿
- 季節の企画投稿(企画・編集会議部の発注)
- 各SNSの反応の集計と、伸びた投稿の型の共有
- SNSの並び順は `SOCIAL_ORDER`(X → Instagram → TikTok → Threads → Facebook)に合わせる

## やらないこと(他部の担当)

- 画像・動画を作る → クリエイティブ制作部
- リプライ・DMへの個別対応 → コミュニティ・イベント部(稼働後)。それまではCEO
- タイアップ投稿の判断 → PR・パートナーシップ部 / 法務部

## 受け取るもの / 渡すもの

| 受け取る(から) | 渡す(へ) |
|---|---|
| 公開した記事(コンテンツ制作部) | 投稿の承認依頼(承認トレイ → CEO) |
| 企画投稿の発注(企画・編集会議部) | 画像の発注(クリエイティブ部) |
| 画像(クリエイティブ部) | 反応の数字(データ分析部) |

## 定例報告

例:「3本投稿、Instagramの保存が多かったのは装備リストの図。LINE登録 +2人」

## 承認が要るもの(L2)

- 投稿そのもの(最初は1本ずつ承認。型が固まったら「定型の告知投稿は承認なし」にするかをCEOが決める)

## 参照するドキュメント・データ

- `src/lib/site.ts`(`SOCIALS` / `SOCIAL_ORDER`)
- `docs/tone-and-manner.md`(文体)
- `docs/persona.md`(タッチポイント)

## コンソールでの見え方

- ミニ画面:投稿キュー(予約時刻・SNS・状態)
- KPIタイル:SNS経由のLINE/メール登録
- 準備中のあいだ:「SOCIALSのURLが入ったら稼働」と表示
