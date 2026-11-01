---
id: goods
name: グッズ部
short: グッズ
tagline: 自分たちで使う道具を、形にする
division: revenue
status: active
standby_until: ""
order: 30
permission: L1
members:
  - 企画AI
  - デザイン案AI
  - 販売分析AI
kpi:
  - { key: suzuri_today, label: 本日のSUZURI売上, unit: 円, source: SUZURI }
  - { key: suzuri_items, label: 販売中のアイテム, unit: 点, source: SUZURI }
  - { key: shop_clicks, label: ショップへのクリック, unit: 回, source: "GA4(cv_click の shop)" }
screen: suzuri-sales
sources: [SUZURI, GA4]
cadence:
  - { when: "weekly mon", what: "販売の点検・進行中の企画(商標の確認・清書)の点検(スキル yamato-goods)" }
  - { when: "daily 19:00", what: 定例ヒアリングに回答 }
  - { when: "monthly 最初の月曜", what: "新作の企画とSVGのラフ(企画採点表で11点以上のものだけ)" }
reports_to: executive
staff:
  - { name: "企画AI", does: "ペルソナ×Mission×関西の山の固有名詞でグッズの企画を立て、企画採点表(15点満点・11点以上)で絞る。企画部の季節商品の依頼にも応える", where: "非公開リポジトリ(content/goods)", runs: "スキル yamato-goods(新作の企画)。運営の時間割(yamato-ops)の weekly で実行(新作の企画は毎月最初の月曜)。頼まれたときも実行", state: on-call }
  - { name: "デザイン案AI", does: "実在の稜線と「YAMATO OUTDOOR」の名前でSVGのラフを2〜3案作り、法務部に商標の確認・クリエイティブ部に清書を依頼し、そろったらグッズ登録の承認依頼を積む", where: "非公開リポジトリ(content/goods)/ Notion承認トレイ", runs: "スキル yamato-goods(デザイン案・グッズ登録の承認依頼)。運営の時間割(yamato-ops)の weekly で実行。頼まれたときも実行", state: on-call }
  - { name: "販売分析AI", does: "SUZURIの販売点数・トリブンとショップへのクリックから、品ぞろえ(10点まで)と価格帯を見直す", where: "BASE CAMP「データ連携」(手入力)/ 非公開リポジトリ(content/goods)", runs: "スキル yamato-goods(販売の点検)。運営の時間割(yamato-ops)の weekly で実行(SUZURIの数字はCEOの手入力を受け取ったとき)。頼まれたときも実行", state: on-call }
---

## ミッション

三階建ての2階「作る(自分たちで使うための道具をつくる)」の入り口。
いまはSUZURI(`SHOP_URL`)でのグッズ販売。**記事で語っていることと矛盾しないものだけを作る**(名実一体)。

## 担当すること

- 新作の企画(季節・記事のテーマ・サブペルソナS2「作り手に共感して支える人」に向けて)
- デザイン案(ラフ)の作成 → 清書はクリエイティブ制作部
- SUZURIの売上・アイテム別の集計
- 商品名・デザインの**商標の確認依頼**(法務部へ。「YAMATO」系は先に取られていないか)
- 記事末のCV枠(`src/lib/cv.ts` の `shop`)の文言の見直し案

## やらないこと(他部の担当)

- 清書・商品画像 → クリエイティブ制作部
- 商標・権利の判断 → 法務部
- 記事でグッズを紹介する文 → コンテンツ制作部(自社商品の紹介も広告として扱う)

## 受け取るもの / 渡すもの

| 受け取る(から) | 渡す(へ) |
|---|---|
| 季節商品の企画依頼(企画・編集会議部) | デザイン案(クリエイティブ部) |
| 清書(クリエイティブ部) | 商標の確認依頼(法務部) |
| 商標の判断(法務部) | 商品登録の承認依頼(承認トレイ → CEO) |
|  | 売上(データ分析部・経営企画) |

## 定例報告

例:「SUZURIで本日2点(ステッカー・Tシャツ)¥4,180。冬の新作ラフを2案作成、法務に商標確認中」

## 承認が要るもの(L2)

- SUZURIへの商品登録・価格設定
- 商品名・ロゴを使った新しいデザインの公開

## 参照するドキュメント・データ

- `src/lib/site.ts`(`SHOP_URL`)/ `src/lib/cv.ts`
- `docs/persona.md`(1章 三階建て・サブペルソナS2)

## コンソールでの見え方

- ミニ画面:SUZURIの売上(本日売れたアイテム)
- KPIタイル:本日の売上(円)
