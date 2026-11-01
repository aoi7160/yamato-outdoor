---
id: community
name: コミュニティ・イベント部
short: コミュニティ
tagline: 挑む輪を、広げる
division: revenue
status: planned
standby_until: "src/lib/site.ts の LINE_FRIEND_URL または NEWSLETTER_URL が入ったら standby → active"
order: 50
permission: L1
members:
  - CRM Studio
  - Event Lab
  - Concierge
kpi:
  - { key: line_friends, label: LINE友だち, unit: 人, source: LINE公式アカウント }
  - { key: newsletter_subs, label: メール登録, unit: 人, source: メール配信サービス }
  - { key: questions, label: 読者からの質問, unit: 件, source: 問い合わせフォーム }
screen: audience
sources: [LINE公式アカウント, メール配信サービス, 問い合わせフォーム(CONTACT_URL)]
cadence:
  - { when: "daily 19:00", what: 定例ヒアリングに回答 }
  - { when: "monthly", what: メルマガ(月1〜2回) }
reports_to: executive
staff:
  - { name: "CRM Studio", label: "LINE・メールの配信設計", does: "受け口の開設の判断材料・配信設計・ステップ配信・LINEとメルマガの配信文を下書きする(配信しない。受け口が空のあいだは配信文を積まず準備を進める)", where: "非公開リポジトリ yamato-outdoor-editorial(content/community/)/ Notion承認トレイ", runs: "スキル yamato-community(今週の配信案・開設の準備)。運営の時間割(yamato-ops)の weekly で実行。頼まれたときも実行", state: on-call, skills: ["ステップ配信", "配信文", "soft CVの導線"], kpi: "soft CV(LINE・メール登録)", growth: "受け口ができたら、記事の読者を配信につなぐ" }
  - { name: "Event Lab", label: "登山企画・イベント", does: "登山企画・イベントの企画書を、安全・旅行業法・個人情報の論点つきで作る", where: "非公開リポジトリ(content/community/events/)/ Notion承認トレイ", runs: "スキル yamato-community(企画書)。頼まれたときに実行(受け口が開いたら月初の weekly で棚卸し)", state: on-call, skills: ["企画書", "安全の論点", "旅行業法の確認"], kpi: "企画の採用数", growth: "読者が集まったら、関西の山での企画を形にする" }
  - { name: "Concierge", label: "問い合わせ対応", does: "問い合わせ・DMを分類して返信の下書きを作り、質問の要旨をSEO部・企画部に渡す(返信はCEO)", where: "Notion承認トレイ / 非公開リポジトリ(content/community/questions.md)", runs: "スキル yamato-community(返信の下書き)。頼まれたときに実行", state: on-call, skills: ["問い合わせの分類", "返信の下書き", "個人情報の扱い"], kpi: "返信までの時間", growth: "問い合わせの受け口ができたら、返信の下書きを自動にする" }
---

## ミッション

Visionの「挑む輪を広げていく」に直結する部。読者を「答えを探しに来た人」から「仲間」へ。
立ち上げ期のCVの主役である **soft CV(LINE・メール登録)** を、将来のリード(登山企画・イベント・グッズ)につなぐ。

## 担当すること

- メルマガの下書き(`src/lib/cv.ts` の約束:「装備の実測値と、関西の山の状況をまとめて月に1〜2回。宣伝だけのメールは送らない」)
- LINEの配信の下書き(新しい記事・道具の入荷)
- 読者からの質問の受け付けと分類(記事のネタとしてSEO部・企画部へ)
- 登山企画・イベントの企画案(三階建ての3階「送り出す」)

## やらないこと(他部の担当)

- 配信そのもの → CEOの承認後
- 個人情報の扱いのルール → 法務部

## 受け取るもの / 渡すもの

| 受け取る(から) | 渡す(へ) |
|---|---|
| 公開した記事(コンテンツ制作部) | 配信の承認依頼(承認トレイ → CEO) |
| 商品の入荷(グッズ部) | 読者の質問(SEO部・企画・編集会議部) |

## 定例報告

例:「LINE +3人(記事末から2人・SNSから1人)。質問2件、うち1件は記事化候補として企画に回しました」

## 承認が要るもの(L2)

- メルマガ・LINEの配信、イベントの告知、読者への個別返信

## 参照するドキュメント・データ

- スキル `yamato-community`(`.claude/skills/yamato-community/`)— 受け口の選び方・配信設計・返信テンプレ・企画書の型
- `src/lib/site.ts`(`LINE_FRIEND_URL` / `NEWSLETTER_URL` / `CONTACT_URL`)/ `src/lib/cv.ts`
- `docs/analytics.md` 7章(CV設計)
- `src/pages/privacy.astro`

## コンソールでの見え方

- 将来(`planned`)のあいだは組織図にだけ表示
- ミニ画面:登録者の推移 / KPIタイル:本日のLINE/メール登録
