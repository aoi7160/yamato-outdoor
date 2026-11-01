---
id: sns
name: SNS部
short: SNS
summary: "SNSで記事と登山の記録を届け、サイトとLINEに人を呼ぶ"
tagline: 投稿から、サイトとLINEへ流す
division: revenue
status: standby
standby_until: "src/lib/site.ts の SOCIALS にURLが入ったら(少なくとも1つ)"
order: 20
permission: L1
members:
  - Trend Radar
  - Social Studio
  - Social Insights
kpi:
  - { key: followers, label: フォロワー(合計), unit: 人, source: 各SNS }
  - { key: sns_to_site, label: SNSからの流入, unit: セッション, source: GA4 }
  - { key: soft_cv_from_sns, label: SNS経由のLINE/メール登録, unit: 人, source: GA4(cv_click) }
screen: post-queue
sources: [X, Instagram, TikTok, Threads, Facebook, GA4]
cadence:
  - { when: "weekly mon", what: "投稿キューの補充・翌週と翌々週の投稿カレンダー・トレンド調査(スキル yamato-sns。準備中は投稿しない)" }
  - { when: "daily 19:00", what: 定例ヒアリングに回答 }
reports_to: executive
staff:
  - { name: "Trend Radar", label: "SNSの話題の調査", does: "SNSで今どんな登山の話題が伸びているかを調べ、投稿のネタと時間帯を決める。", where: "Web検索 / 非公開リポジトリ(content/sns/trends)", runs: "スキル yamato-sns(トレンド調査)。運営の時間割(yamato-ops)の weekly で実行。頼まれたときも実行", state: on-call, skills: ["SNSの話題の調査", "媒体ごとの特徴", "投稿時間の検討"], kpi: "見つけた伸びている話題の数", growth: "アカウントができたら、反応の良い投稿の型を毎週見直す" }
  - { name: "Social Studio", label: "SNS投稿の制作", does: "記事の告知や登山の記録を、SNSごとの投稿文にして、投稿の予定表に並べる(投稿はCEO)。", where: "非公開リポジトリ(content/sns)/ 稼働後はNotion承認トレイ", runs: "スキル yamato-sns(運用設計・投稿キュー・カレンダー)。運営の時間割(yamato-ops)の weekly で実行。頼まれたときも実行", state: on-call, skills: ["投稿文の制作", "投稿の予定表", "広告であることの表示"], kpi: "1週間分の投稿の準備率", growth: "アカウントができたら、記事の公開に合わせて告知を自動で準備する" }
  - { name: "Social Insights", label: "SNSの分析", does: "SNSからサイトやLINEにどれだけ人が来たかを測り、効いた投稿を見つける。", where: "非公開リポジトリ(content/sns/results・benchmarks)/ SNSからの流入はデータ分析部の数字", runs: "スキル yamato-sns(運用分析)。運営の時間割(yamato-ops)の weekly で実行(媒体の数字は稼働後、CEOから受け取ったとき)。頼まれたときも実行", state: on-call, skills: ["媒体ごとの反応の分析", "サイトへの流入の計測", "流入元の目印づけ"], kpi: "SNSからサイトに来た人の数", growth: "アカウントができたら、投稿の型ごとに効果を判断する" }
---

## ミッション

記事と山の記録を、SNSで「次に行く日」を考えている人に届け、サイトとLINE・メールに流す。
動画の「X運用部 | 投稿→LINEへ自動で流す」に相当。

## 担当すること

- 投稿の企画・文面(投稿キューに積む。予約と投稿はCEO)
- 準備中(`SOCIALS` が空)のあいだも、運用設計・プロフィール文・投稿キュー・週の投稿カレンダーを作り続ける(投稿はしない。手順はスキル `yamato-sns`)
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
