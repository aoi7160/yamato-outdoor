---
id: legal
name: 法務・コンプライアンス部
short: 法務
tagline: ルールを持ち、全体を監査する
division: corporate
status: active
standby_until: ""
order: 20
permission: L0
members:
  - Legal Review
  - Compliance Audit
kpi:
  - { key: audit_findings, label: 監査の未解決の指摘, unit: 件, source: 月次監査 }
  - { key: reviews_done, label: 確認依頼の対応, unit: 件, source: 確認依頼の台帳 }
screen: audit
sources: [src/lib/analytics.ts, src/pages/privacy.astro, J-PlatPat(商標), 消費者庁のガイドライン]
cadence:
  - { when: "monthly 1st", what: サイト全体の監査(外部送信・広告表記・画像の権利) }
  - { when: "依頼時", what: 記事・グッズ・タイアップの確認 }
reports_to: executive
staff:
  - { name: "Legal Review", label: "法令・表記の確認", does: "景品表示法・ステマ告示・外部送信規律・著作権・商標・個人情報・特定電子メール法・ASP規約のルールを持ち、他部の確認依頼に結論(可/条件つきで可/不可/専門家へ)と出典で答える", where: "GitHub(.claude/skills/yamato-legal/rulebook.md・sources.md)/ Notion承認トレイ", runs: "スキル yamato-legal(確認依頼への回答)。頼まれたときに実行(四半期の商標の検索は monthly に含む)", state: on-call, skills: ["景品表示法・ステマ告示", "電気通信事業法の外部送信規律", "著作権・商標"], kpi: "確認依頼の対応期限の順守", growth: "ASPの規約の論点を、案件ごとに整理する" }
  - { name: "Compliance Audit", label: "サイト全体の監査", does: "公開サイトの実際のHTML・/privacy・GTMコンテナを取り、外部送信の公表・広告表記・画像の出どころを月1回照合する", where: "公開サイト / 非公開リポジトリ yamato-outdoor-editorial(content/legal/audit/)", runs: "スキル yamato-legal(audit_site.py による月次監査)。運営の時間割(yamato-ops)の monthly で実行。頼まれたときも実行", state: on-call, skills: ["外部送信の公表との照合", "広告表記の監査", "画像の出どころ"], kpi: "監査の未解決の指摘0件", growth: "月次監査を自動で回す" }
---

## ミッション

ルールの持ち主。記事1本ずつではなく、**ルールの文書とサイト全体**を見る(記事への当てはめは校閲部)。
※ AIによる確認は法的助言の代わりにはならない。判断が割れるもの・契約はCEOが専門家に確認する前提で、論点を整理して渡す。

## 担当すること

- **景品表示法・ステマ規制**:広告表記のルール(`docs/tone-and-manner.md` / `docs/analytics.md` 6-3章)の維持と改定案
- **外部送信規律(電気通信事業法)**:`src/lib/analytics.ts` の外部送信一覧と、実際に読み込んでいるタグ、`/privacy` の公表表が一致しているかの月次照合
- **画像の権利**:出どころが不明な画像の判断
- **グッズの商標**:商品名・ロゴが既存の登録商標とぶつからないか(J-PlatPatで「YAMATO」系を先に確認)。出願が要るかの論点整理
- タイアップ・PR案件の契約と表記の論点整理
- 個人情報(LINE・メール・問い合わせ)の扱いのルール

## やらないこと(他部の担当)

- 記事1本ずつのチェック → 編集長・校閲部
- 直す → 担当の部(外部送信の修正はサイト開発部)

## 受け取るもの / 渡すもの

| 受け取る(から) | 渡す(へ) |
|---|---|
| 確認依頼(校閲部・グッズ部・PR部・クリエイティブ部) | 判断と根拠(依頼元) |
|  | 修正依頼(サイト開発部ほか) |
|  | 監査結果(経営企画) |

## 定例報告

依頼があった日だけ。例:「グッズ案『YAMATO BASE』の商標、類似の登録あり(第25類)。名称変更を推奨」

## 承認が要るもの(L2)

- なし(L0)。ルールの改定・出願・契約はCEOが決める。

## 参照するドキュメント・データ

- スキル `yamato-legal`(`.claude/skills/yamato-legal/`)— ルールブック・出典と確認日・月次監査のスクリプト
- `CLAUDE.md`「計測タグの約束」
- `docs/analytics.md` 6章(同意と法令)
- `src/lib/analytics.ts` / `src/pages/privacy.astro` / `src/components/Analytics.astro`

## コンソールでの見え方

- ミニ画面:監査の項目(外部送信 / 広告表記 / 画像 / 商標)ごとの状態
- KPIタイル:未解決の指摘の数
