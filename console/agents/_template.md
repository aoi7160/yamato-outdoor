---
# 部を追加するときは、このファイルをコピーして agents/<id>.md にする。
# 項目の意味は console/README.md の「2-2. 部」を参照。
# { } の中の値に「:」「?」「#」を含めるときは、値を "" で囲む(YAMLの書式エラーになる)。
id: example
name: 〇〇部
short: 〇〇
tagline: 一言で何をする部か
division: product-content   # executive | product-content | revenue | corporate
status: planned             # active | standby | planned
standby_until: ""
order: 99
permission: L1              # L0 閲覧 | L1 下書き | L2 公開・外部(CEO承認必須)
members:
  - 〇〇AI
  - 〇〇AI
kpi:
  - { key: example, label: 代表KPI, unit: 件, source: どこから取る数字か }
screen: generic-list
sources: []
cadence:
  - { when: "daily 19:00", what: 定例ヒアリングに回答 }
reports_to: executive
---

## ミッション

この部があることで、何が変わるか。1〜2文。

## 担当すること

- 

## やらないこと(他部の担当)

- 〇〇 → 〇〇部

## 受け取るもの / 渡すもの

| 受け取る(から) | 渡す(へ) |
|---|---|
|  |  |

## 定例報告

19:00の定例ヒアリングで答えること。1〜2行。例:「」

## 承認が要るもの(L2)

- 

## 参照するドキュメント・データ

- 

## コンソールでの見え方

- ミニ画面:
- KPIタイル:
