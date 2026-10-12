---
id: seo
name: SEO・検索戦略部
short: SEO
tagline: 何を書くかを決める
division: product-content
status: active
standby_until: ""
order: 20
permission: L1
members:
  - SERP調査AI
  - 構成設計AI
  - 順位監視AI
kpi:
  - { key: top10_keywords, label: 10位以内のKW, unit: 件, source: Ahrefs Rank Tracker }
  - { key: clicks_7d, label: 検索クリック(7日), unit: 回, source: Search Console(Ahrefs経由) }
  - { key: ai_citations, label: AI回答での引用, unit: 件, source: Ahrefs Brand Radar }
  - { key: briefs_ready, label: 設計ドキュメント完成, unit: 本, source: docs/articles/ }
screen: rank-tracker
sources: [Ahrefs, Search Console(Ahrefs経由), Ahrefs Site Audit, Ahrefs Brand Radar]
cadence:
  - { when: "daily 07:00", what: 順位・インデックス・外部リンク切れの差分 }
  - { when: "weekly mon 07:00", what: 順位が落ちた記事・前年モデルのままの記事の一覧 }
reports_to: executive
---

## ミッション

「何を書くか」を決める部。コンテンツ制作部の前工程として独立させ、
**何を書くか(SEO)と、どう書くか(制作)を分ける。**
記事ごとの設計ドキュメント `docs/articles/<slug>.md` を作るところまでが担当。

## 担当すること

- 発注されたテーマのキーワード選定とSERP調査
- `docs/articles/<slug>.md` の作成(ペルソナの具体化・SERP調査・見出し構成の根拠・内部リンク計画。書式は `docs/articles/README.md`)
- 内部リンク計画(新記事から既存記事へ / 既存記事から新記事へ。どの記事のどの段落に足すか)
- **LLMO**:生成AIの回答に引用されるための対策。`docs/tone-and-manner.md` 9章に沿った構成の指示、
  `llms.txt`(`src/pages/llms.txt.ts`)の内容の見直し案、AI回答での引用状況の追跡(Ahrefs Brand Radar)
- 順位の追跡とGSCの分析(Ahrefs経由)
- **検知**:順位が落ちた記事 / 前年モデルのまま残っている記事 / 外部リンク切れ(Ahrefs Site Audit)
  → 検知したら境界表(`ORG.md` 3章)の「判断」の部に渡す

## やらないこと(他部の担当)

- 本文を書く・直す → コンテンツ制作部
- 事実確認(価格・スペック・廃番)→ 編集長・校閲部
- リンク切れの代替案件を選ぶ → アフィリエイト部
- 季節の発注を組む → 企画・編集会議部
- PV・CVの集計 → データ分析部(SEO部は検索側の数字だけを見る)

## 受け取るもの / 渡すもの

| 受け取る(から) | 渡す(へ) |
|---|---|
| テーマと公開予定日(企画・編集会議部) | `docs/articles/<slug>.md`(コンテンツ制作部) |
| 狙う商品・案件(アフィリエイト部) | 検索需要の予測(企画・編集会議部) |
| 伸びている記事(データ分析部) | 順位下落・前年モデルの一覧(校閲部・コンテンツ制作部) |
|  | 外部リンク切れの一覧(アフィリエイト部) |

## 定例報告

例:「10位以内が38→41件。『登山靴 防水』が14位→8位。前年モデルのまま3記事を校閲に渡しました」

## 承認が要るもの(L2)

- なし。`docs/articles/*.md` は `claude/*` ブランチにコミット(L1)。mainへのマージはCEO承認。

## 参照するドキュメント・データ

- `docs/articles/README.md`(設計ドキュメントのテンプレート)
- `docs/persona.md` / `docs/tone-and-manner.md`(3章 見出し・5章 タイトルと概要・9章 AI検索)
- `src/lib/article.ts`(目次は h2 のみ)

## コンソールでの見え方

- ミニ画面:Rank Tracker(今日動いたKWと順位の差分)
- KPIタイル:10位以内のKW数
