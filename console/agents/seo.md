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
  - Search Intelligence
  - Content Architecture
  - Rank Watch
kpi:
  - { key: top10_keywords, label: 10位以内のクエリ, unit: 件, source: Search Console }
  - { key: clicks_7d, label: 検索クリック(7日), unit: 回, source: Search Console / Bing Webmaster Tools }
  - { key: ai_citations, label: AI回答での引用, unit: 件, source: 手で確認(主要なAI検索で週1回) }
  - { key: briefs_ready, label: 設計ドキュメント完成, unit: 本, source: docs/articles/ }
screen: rank-tracker
sources: [Search Console, Bing Webmaster Tools, GA4(流入種別 ai), サイト内リンクの自前チェック]
cadence:
  - { when: "daily 07:00", what: 順位・インデックス・外部リンク切れの差分 }
  - { when: "weekly mon 07:00", what: 順位が落ちた記事・前年モデルのままの記事の一覧 }
reports_to: executive
staff:
  - { name: "Search Intelligence", label: "検索結果と検索意図の調査", does: "コンテンツマップの「新規記事案」から次に書く候補を段階戦略・検索意図・共食いの確認で選び、SERP分析シート(上位が答えていない疑問)を作る", where: "Googleスプレッドシート「メディア Topic cluster」(読むだけ)/ Web検索 / 非公開リポジトリ yamato-outdoor-editorial(content/seo/)", runs: "スキル yamato-seo(3-2〜3-5・週次の「次に書く候補」)。運営の時間割(yamato-ops)の weekly で実行。write-article の経路Aもこの基準で選ぶ。頼まれたときも実行", state: on-call, skills: ["SERP分析", "検索意図の分類", "競合の空白の発見"], kpi: "狙ったキーワードの上位10位入り本数", growth: "YAMATO名義のSEOツールが入ったら、KDと流入の見込みで候補を並べる" }
  - { name: "Content Architecture", label: "構成・クラスター・内部リンク", does: "承認された記事の設計書(docs/articles/)と、内部リンク計画(どの記事・どのh2・どの段落・アンカー)・LLMOの指示を作る。大きな修正のときは構成の根拠を出し直す", where: "GitHub(docs/articles/・claude/*ブランチ)/ Notion承認トレイ", runs: "スキル yamato-seo(3-6・3-8・依頼時の設計書)。運営の時間割(yamato-ops)の weekly(内部リンクの穴)で実行。頼まれたときも実行", state: on-call, skills: ["トピッククラスター", "内部リンク設計", "カニバリ検出", "LLMO"], kpi: "孤立記事0本・共食い0件", growth: "記事が20本を超えたら、ピラー記事の設計に進む" }
  - { name: "Rank Watch", label: "順位・インデックス・リンク切れ", does: "Search Console・Bingの順位とインデックスの差分、サイト内リンク切れ(自前チェック)を見て、リライト候補を28日の閾値で判定する", where: "BASE CAMP「本日」/ Search Console / Bing / サイトマップ", runs: "数字はコンソールのサーバー(server/connectors.js)が開くたびに自動で取得。判定はスキル yamato-seo(3-7・3-10・linkcheck.py)で、運営の時間割(yamato-ops)の morning・weekly で実行。頼まれたときも実行", state: auto, skills: ["Search Console", "リンク切れ検知", "リライト判定"], kpi: "インデックス率", growth: "Search Consoleの数字を読めるようになったら、リライト候補を毎週自動で出す" }
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
  `llms.txt`(`src/pages/llms.txt.ts`)の内容の見直し案、AI回答での引用状況の追跡(GA4の流入種別 `ai` と、主要なAI検索での週1回の手確認。Ahrefsは有料のため見送り)
- 順位の追跡とGSCの分析(Search Console API。Bing / Copilot は Bing Webmaster Tools)
- **検知**:順位が落ちた記事 / 前年モデルのまま残っている記事 / 外部リンク切れ(サイト内の外部リンクを定期に叩いて確かめる自前チェック)
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

## 記事のテーマ選び(経路A:SEO部 → コンテンツ制作部)

キーワードの正はCEOのコンテンツマップ(Googleスプレッドシート「メディア Topic cluster」。IDはNotionの「連携先のメモ」)。
「新規記事案」シートの優先度順・「未着手」から選び、コンテンツ制作部に書かせる(スキル `write-article` の2)。
**マップに無いキーワードでは書かせない。** 良いキーワードを見つけたら「コンテンツマップへの追加提案」として承認トレイに積む。承認された記事は、設計の要点を `docs/articles/<slug>.md` に残す。
CEOの「大きな修正」で構成から見直すときは、この部がキーワードと見出しの根拠を出し直す。

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
