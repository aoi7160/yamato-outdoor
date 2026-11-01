---
id: content
name: コンテンツ制作部
short: 制作
tagline: どう書くかを引き受ける
division: product-content
status: active
standby_until: ""
order: 30
permission: L1
members:
  - Story Studio
  - Publishing Ops
kpi:
  - { key: drafts_ready, label: 校閲に出した下書き, unit: 本, source: microCMS(下書き) }
  - { key: published_updated, label: 公開・更新, unit: 本, source: microCMS }
  - { key: first_pass_rate, label: 校閲の一発通過率, unit: "%", source: 校閲部の記録 }
screen: microcms-drafts
sources: [microCMS(下書き), docs/articles/]
cadence:
  - { when: "daily 19:00", what: 定例ヒアリングに回答 }
reports_to: executive
staff:
  - { name: "Story Studio", label: "新規制作・リライト", does: "コンテンツマップのキーワードで新規記事を書き(体験は目印で空け、でっち上げない)、自己点検を通して承認トレイに積む。公開記事のリライトと、CEO・校閲の修正依頼の反映も同じチームで受け持つ。体験が足りない記事は取材質問を作る", where: "Notion承認トレイ / Googleスプレッドシート / 非公開リポジトリ yamato-outdoor-editorial", runs: "スキル yamato-content(4章の毎回の手順4)+ write-article / article-pipeline。定期実行「YAMATO 記事の自動執筆」(月・木 5:52)は登録済みだが、Notion・Google Driveの接続が付いておらず書けていない(2026-11-01確認)。いまは頼まれたときに実行", state: on-call, skills: ["結論先出しの構成", "取材質問の設計", "比較表", "リライト", "体験の境界(R1)"], kpi: "校閲の一発通過率", growth: "公開記事の成績を見て、書きっぱなしにせずリライトを自分で起票する" }
  - { name: "Publishing Ops", label: "microCMSへの入稿", does: "承認された記事をmicroCMSに下書きとして入れる(公開はCEOが押す)。書き込みキーが無いときは貼り付け用の値を出す", where: "microCMS(下書き)", runs: "コンソールのサーバー(server/cms.js)。承認トレイで「承認」を押すと自動で実行。貼り付け用はスキル yamato-content(6章「入稿」)を頼まれたときに実行", state: auto, skills: ["microCMS入稿", "カテゴリ・タグ・FAQの整備", "下書きプレビュー"], kpi: "承認から下書き入稿までの時間", growth: "FAQ・レビューの構造化データまで自動で入れる" }
---

## ミッション

SEO部の設計ドキュメントをもとに、`docs/tone-and-manner.md` の文体で記事を書き、
microCMSの**下書き**として入れる。リライトもここ。公開はしない。

## 担当すること

- 新規記事の執筆(`content` リッチエディタ / 装飾が要るときは `contentHtml`。使い分けは `docs/workflow.md`)
- リライト(順位下落・前年モデル・価格改定・リンク差し替えなど、他部の「判断」を受けて直す)
- 校閲部の `差し戻し` への対応
- タイトル30〜35字・概要80〜120字・タグ3〜5個など、入稿の体裁をそろえる
- 書き手ブロック(`.profile`)・FAQ / レビューの構造化データ(`docs/tone-and-manner.md` 7-1・8-1章)
- 体験と一般論を混ぜない。**体験していないことを体験したように書かない**(CEOの実体験・実測値が要る箇所は空欄にして `相談`)

## やらないこと(他部の担当)

- キーワード・見出し構成を決める → SEO部(構成に異論があるときはSEO部に `相談`)
- 自分の記事のチェック → 編集長・校閲部(**自分で書いて自分で通さない**)
- 画像を作る → クリエイティブ制作部
- アフィリエイトリンクを選ぶ → アフィリエイト部
- 公開 → CEO承認後

## 受け取るもの / 渡すもの

| 受け取る(から) | 渡す(へ) |
|---|---|
| `docs/articles/<slug>.md`(SEO部) | microCMSの下書き(校閲部) |
| 画像・alt(クリエイティブ部) | 画像の発注(クリエイティブ部) |
| リンクと商品(アフィリエイト部) |  |
| 差し戻し(校閲部・法務部) |  |

## 記事を書いて承認トレイに積む

テーマ選びから公開直前の原稿までを書き、Notionの承認トレイに「記事公開」として積む(週2〜4本)。
手順はスキル `write-article`(`.claude/skills/write-article/SKILL.md`)。お手本の文体はサロモンの記事(削除済みの見本記事ナイトハイクの書き方は使わない)。
体験・実測が要る箇所は【要実測:…】などで空けておき、でっち上げない。
CEOがレビュー画面で付けたコメント・修正案(大きな修正を含む)の反映も、この部が行う。

## 定例報告

例:「下書き2本を校閲に出しました。昨日の差し戻し(価格の出典漏れ)は修正済み」

## 承認が要るもの(L2)

- microCMSでの「公開」(校閲部の通過 → 承認トレイ → CEO)

## 参照するドキュメント・データ

- `docs/tone-and-manner.md`(全章。とくに1章 文体・2章 表記・10章 公開前チェックリスト)
- `docs/persona.md`(矛盾したらこちらが正)
- `docs/workflow.md`(入稿手順・`content` と `contentHtml`)
- `docs/microcms-schema.md`
- **新しい記事をコードで足さない**(記事はmicroCMSにだけ入れる)

## コンソールでの見え方

- ミニ画面:microCMSの下書き一覧(状態:執筆中 / 校閲待ち / 差し戻し / 承認待ち)
- KPIタイル:今週の公開・更新本数
