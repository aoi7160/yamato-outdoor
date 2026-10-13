# BASE CAMP — YAMATO OUTDOOR エージェント管理コンソール(定義)

> 挑戦の、ベースキャンプになる。(Mission)

AIエージェントで構成した「部」の稼働状況・成果・報告を1画面で見て、CEOが判断するための社内向けコンソール。
名前の「BASE CAMP」はMissionから。山に出ていく前に、荷を整え、天候を読み、次の一歩を決める場所。

- 組織とエージェントの定義 → `ORG.md` と `agents/*.md`
- このファイル → コンソールの画面・データ・作る順番

> **現状:Phase 1(デモ)＋ Phase 2 の一部(API連携)まで実装済み。**
> GA4・Search Console・PageSpeed・microCMS・GitHub はAPIで自動連携(環境変数を入れたものから実データになる)。
> ASP・SUZURIの売上はCSV/手入力。実データが無い数字はデモ(既定は立ち上げ期の実態に寄せた値)。
> **公開(Cloudflare)とAPIの設定手順は `SETUP.md`**(上から押していけば終わるように書いてある)。

## 動かし方

```sh
cd console
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ に出力
npm run check    # 型チェック
npm test         # サーバー側(Access検証・各API連携)のテスト

# APIまで含めてローカルで動かすとき(.dev.vars.example を .dev.vars にコピー)
npm run build && npx wrangler dev   # Workersと同じ形で、ページとAPIを一緒に動かす
```

| 画面 | パス | 中身 |
|---|---|---|
| 本日 | `/` | ダッシュボード。19:00の定例ヒアリングを台本で再生(1-1) |
| 承認トレイ | `/approvals/` | CEOが判断するL2の依頼(1-2) |
| 組織図 | `/org/` | `agents/*.md` から自動で作る(1-3) |
| 部の詳細 | `/agents/<id>/` | `agents/<id>.md` の本文をそのまま表示(1-4) |
| データ取り込み | `/data/` | ASP・SUZURIの売上をCSV/手入力で入れる(7章) |
| 設定 | `/settings/` | デモの数字の規模・CEOの表示名など(8章) |

主なファイル:

| 対象 | 場所 |
|---|---|
| 部の定義の読み込み・本部の色 | `src/lib/org.ts` |
| 設定の既定値・プリセット | `src/lib/settings.ts` |
| 取り込み元とAPIの調査結果 | `src/lib/sources.ts` |
| デモの台本・台詞・ミニ画面・KPIタイル | `src/scripts/demo.ts` |
| ダッシュボードの再生 | `src/scripts/dashboard.ts` |
| 承認トレイの依頼(デモ) | `src/scripts/approvals.ts` |
| CSVの読み込み(Shift_JIS対応・列の推測) | `src/scripts/csv.ts` |
| ブラウザ内の保存 | `src/scripts/store.ts` |
| API連携の一覧(画面用。候補も含む) | `src/lib/connectors.ts` |
| 実データの取得と、デモの値への割り当て | `src/scripts/real.ts` |
| API連携の本体 | `server/connectors.js` / `server/google.js` |
| /api/* の本体(Accessの検証 → 振り分け) | `server/api.js` / `server/access.js` |
| 配信の入口 | Workers:`server/worker.js` + `wrangler.jsonc`(いまの標準)/ Pages:`functions/api/[[path]].js` |
| 公開・API設定の手順 | `SETUP.md` |
| 見た目 | `src/styles/console.css` |

---

## 0. 前提として決めたこと

| 項目 | 決めたこと |
|---|---|
| 目的 | まずデモ(数字はイメージ)で見た目と組織を固め、そのあと実データ・実行につなぐ |
| 置き場所 | このリポジトリの `console/`。公開サイト(`src/`)のビルドには含めない |
| 配信 | 公開サイトとは別のCloudflareプロジェクト(Workers。`console/wrangler.jsonc`)。Cloudflare AccessでCEOだけが見られるようにする(`SETUP.md`)。旧いPagesの画面でも動く |
| CEO | 表示名は **AOI**(設定で変えられる) |
| デモの数字 | **いまの実態(立ち上げ期)に寄せる。** 規模は設定画面で変えられる(プリセット:立ち上げ期 / 3ヶ月後 / 1年後 / カスタム) |
| 売上の取り込み | 無料APIで自動取得できるものはなかった → **CSV**(ASP)と**手入力**(SUZURI)。ブラウザ内に保存(7章) |
| API連携 | **GA4・Search ConsoleはAPI**。ほかにもAPI・MCP・コネクタでつなげられるものは**どんどんつなぐ**(10章) |
| main | 入れてよい(CEO確認済み)。ただし**売上の実データはGitに載せない**(公開リポジトリのため) |
| 見た目 | YAMATOのブランド(山のシルエット・Zen Old Mincho / Zen Kaku Gothic New / Schibsted Grotesk・落ち着いた色)。組織の呼び方は会社のまま(本部・部) |
| 組織 | CEO → 社長室・経営企画 → 3本部(プロダクト・コンテンツ / ビジネス・レベニュー / コーポレート)→ 部 |
| 拡張 | 部は `agents/<id>.md` を1枚足せば増える。事業の軸足が決まっていないので増減前提 |
| 技術 | Astro(公開サイトと同じ。`agents/*.md` をビルド時に読む)。独自の `package.json` を `console/` に置く |

参考にした動画(とらとら株式会社 × Claude Code)との違い:

| 動画 | BASE CAMP |
|---|---|
| 社長は報告を聞くだけ | **CEOは報告を聞いて、承認だけする**(公開・外部送信はAIが勝手にやらない) |
| 3部署を横並び | 3本部・13部。本部ごとに折りたたみ、稼働中の部だけをダッシュボードに出す |
| 売上(アフィリ・note・LINE) | アフィリ発生・SUZURI売上・soft CV(LINE/メール)・記事の公開/更新数 |
| ポップな白基調 | 夜明け前の山の配色。背景に山のシルエット(静止画1枚) |

---

## 1. 画面

### 1-1. ダッシュボード(本日)— 動画の画面に相当するメイン

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ▲ YAMATO OUTDOOR × Claude Code  BASE CAMP │社員は全員AI|CEOは決めるだけ│● 稼働中 │DEMO│ 19:00:14 │
├──────────────┬───────────────────────────────────────────┬─────────────────┤
│ 社長室        │ プロダクト・コンテンツ本部   [▼]               │ 報告グループ(n)   │
│  CEO + 経営企画AI│  ┌部カード┐┌部カード┐┌部カード┐ …            │  経営企画AI:       │
│  承認待ち 3件 → │                                               │  「SEO部、今日どう?」│
├──────────────┤ ビジネス・レベニュー本部     [▼]               │  SEO部AI:          │
│ 集計ボード     │  ┌部カード┐┌部カード┐ …                        │  「3記事が10位以内…」│
│  アフィリ ¥    │                                               │   …               │
│  SUZURI ¥     │ コーポレート本部            [▼]               │                   │
│  LINE/メール 人 │  ┌部カード┐┌部カード┐                          │                   │
│  公開/更新 本  │                                               │                   │
│  売上合計 ¥    │                                               │                   │
├──────────────┴───────────────────────────────────────────┴─────────────────┤
│ 直近の発生(左)                          │ 活動ログ(右) 19:00:12 SEO部:順位チェック完了 │
└────────────────────────────────────────────────────────────────────────────┘
```

**部カード**(動画の「アフィリエイト部 | 記事×案件で稼ぐ」の1段に相当)

| 要素 | 中身 | 定義の出どころ |
|---|---|---|
| 見出し | 部名 | キャッチ(例:「SEO・検索戦略部|何を書くかを決める」) | `name` / `tagline` |
| ミニ画面 | その部が見ている管理画面の縮図(例:Rank Tracker、microCMS下書き一覧、投稿キュー) | `screen` |
| メンバー | 役割ごとの人形(2〜3体)。作業中の人形の上に「…」、発言中は光る | `members` |
| KPIタイル | その部の代表KPIを1つ大きく | `kpi[0]` |

- 本部は折りたためる。**スマホ(〜48rem)では本部ごとのタブ**に切り替え、部カードは縦積み。報告グループは下部シートにする
- 報告グループは、下端にいるときだけ新着を自動で追う。上に遡って読んでいる間は位置を動かさず、Slackのように
  「新着メッセージ ◯件 ↓」を出す(押すか、自分で下端まで戻ると消える)。古いメッセージは60件を超えると上から消すが、
  読んでいる位置はずらさない(`overflow-anchor: none` ＋ `appendChat` で補正)。
  (CEOはスマホで見ることが多い前提)。
- `standby` の部は半透明＋「準備中:◯◯が揃えば稼働」と、稼働の条件を出す。`planned` はダッシュボードに出さない。

### 1-2. 承認トレイ — 動画にない、BASE CAMPの肝

CEOが判断するのはここだけ。L2(公開・外部送信・お金が動く)の依頼が積まれる。

| 列 | 例 |
|---|---|
| 依頼元 | 編集長・校閲部 |
| 種類 | 記事公開 / mainへのマージ / SNS投稿 / 外部への連絡 / グッズ登録 / 予算 |
| 件名 | 「サロモン X ULTRA 4 GTX レビュー」を公開 |
| 根拠 | チェックリスト全項目OK・法務確認済み・pr-notice あり |
| リンク | microCMSの画面プレビュー / PR / 下書き |
| 操作 | 承認 / 差し戻し(理由を一言) |

Phase 1(デモ)では押しても状態が変わるだけ。Phase 3で実際の処理につなぐ。

### 1-3. 組織図

`ORG.md` の組織図をカードで描く。部をタップすると 1-4 へ。`status` 別に色分け。
「部を追加」ボタンは Phase 1 では `agents/_template.md` の場所と手順を出すだけ(コードの追加はGitで行う)。

### 1-4. 部の詳細

`agents/<id>.md` の本文(ミッション・担当・やらないこと・受け渡し・承認が要るもの)をそのまま表示し、
KPIの推移と直近の活動ログ・報告を並べる。**定義の文書とコンソールの表示を別に持たない**(ズレるため)。

### 1-5. 週次レポート

経営企画の週次KPIレポート(月曜)。本部ごとの数字、先週決めた優先3つの結果、今週の優先3つの案、CEOに決めてほしいこと。

---

## 2. データの持ち方

### 2-1. 本部(divisions)

本部は増減が少ないので、ここに固定で持つ(コンソールの `src/divisions.ts` に写す)。

| id | 名前 | 色トークン | 並び |
|---|---|---|---|
| `executive` | 社長室・経営企画 | `--div-exec`(朝焼けの橙) | 0 |
| `product-content` | プロダクト・コンテンツ本部 | `--div-product`(稜線の青) | 1 |
| `revenue` | ビジネス・レベニュー本部 | `--div-revenue`(苔の緑) | 2 |
| `corporate` | コーポレート本部 | `--div-corp`(岩の灰) | 3 |

### 2-2. 部(agents/*.md のフロントマター)

```yaml
id: seo                      # ファイル名と同じ。英小文字とハイフン
name: SEO・検索戦略部
short: SEO                   # 狭い画面・チャットの差出人に使う
tagline: 何を書くかを決める
division: product-content    # 2-1 の id
status: active               # active | standby | planned
standby_until: ""            # standby のとき、稼働の条件(例:「SOCIALS のURLが入ったら」)
order: 20                    # 本部内の並び
permission: L1               # L0 | L1 | L2(上限)
members:                     # 役割。コンソールの人形
  - SERP調査AI
  - 構成設計AI
  - 順位監視AI
kpi:                         # 先頭が部カードの代表KPI
  - { key: top10_keywords, label: 10位以内のクエリ, unit: 件, source: Search Console }
screen: rank-tracker         # 部カードのミニ画面の種類(コンソール側の部品名)
sources: [Search Console, Bing Webmaster Tools]
cadence:                     # 定例の時刻(実運用でRoutineにする)
  - { when: "daily 07:00", what: 順位・インデックス・リンク切れの差分 }
reports_to: executive
```

本文は見出しを揃える(`agents/_template.md`)。

### 2-3. イベント(活動ログ・報告・発生)

コンソールが表示する動きは、すべて1種類のイベントの列として扱う。デモでも実運用でも同じ形。

```ts
type ConsoleEvent = {
  at: string;              // ISO8601
  agent: string;           // 部の id(CEOは "ceo")
  kind: 'log' | 'report' | 'revenue' | 'cv' | 'approval' | 'reject';
  reportType?: '定例' | '速報' | '相談' | '差し戻し' | '承認依頼' | '日報';
  text: string;            // 1〜2行
  amount?: number;         // revenue のとき(円)
  count?: number;          // cv のとき(人)
  source?: string;         // 数字の出どころ(GA4 / A8.net / SUZURI など)
  demo?: boolean;          // デモ値なら true。画面に「DEMO」を出す
  link?: string;           // 下書き・PR・プレビューへのリンク
};
```

- Phase 1:`console/demo/timeline.json` に台本として持ち、時計に合わせて再生(動画と同じく19:00から早回し)。
- Phase 2:各部のRoutineが書いたものを、Cloudflare Accessの内側のストレージ(KV/R2)から読む(公開リポジトリには置かない)。

---

## 3. デモの台本(Phase 1)

動画の構成を踏襲し、**19:00:00から約60秒でループ**させる。

1. 19:00:00 経営企画AI「定例ヒアリングを始めます」
2. 部ごとに順番に「今日どう?」→ 部が1〜2行で回答 → 該当の部カードが光り、KPIタイルが数え上がる
3. 途中で `revenue` / `cv` イベントが下の「直近の発生」に流れ、集計ボードが増える
4. 校閲部の `差し戻し` が1回入る(書く部と審査する部が分かれていることを見せる)
5. 承認トレイに `承認依頼` が積まれ、社長室の「承認待ち」の数字が増える
6. 最後に経営企画AI → CEO「本日の合計 ¥◯◯ です。決めてほしいことが2件あります」

台本の数字は**立ち上げ期として不自然でない規模**にする(→ 6章の質問)。商品名は実在の記事
(`docs/articles/salomon-hiking-shoes.md` など)と、記事で扱う予定のジャンルから取る。

---

## 4. デザイン

- 背景:公開サイトと同じく山のシルエット(静止画1枚)。**動かさない**。
  コンソールは常時開いておく画面なので、`CLAUDE.md` のfps制約(レイヤー数・面積・stickyヘッダー付近)を
  サイト以上に厳しく守る。動くのは「アバターのリングと状態の点」「数字の書き換え」「チャットの追加」だけ。
- 配色:夜明け前の紺をベースに、本部ごとのアクセント色(2-1)。白基調の動画より暗いが、
  数字は明るく大きく(暗い画面で数字が読めないのが一番まずい)。ライト/ダークの両対応はしない(ダーク固定)。
- フォント:見出しの和文 = Zen Old Mincho / 本文・部名 = Zen Kaku Gothic New /
  数字・時計・英字 = Schibsted Grotesk(数字は `font-variant-numeric: tabular-nums`)。
- メンバー(人):顔は描かず、**本部色のリムライトで縁取ったシルエット**の丸いアバター(`src/components/Figure.astro`)。
  人ごとの違いは髪・帽子の輪郭と、細い線の小物(メガネ・ヘッドセット・ヘッドホン・社員証・ペン)。本部ごとに服の襟まわりが違う
  (経営企画=ダウンベスト / プロダクト=フーディー / レベニュー=シェルジャケット / コーポレート=ジャケット)。
  右下の点は状態(緑=待機・琥珀=作業中)、発言中は外周のリングが光る。
- 絵文字は使わず、線のアイコン(SVG)にする。

---

## 5. 作る順番

| Phase | 内容 | 完了の条件 |
|---|---|---|
| **0. 定義**(いま) | `ORG.md` / `agents/*.md` / このファイル | CEOがOKを出す |
| **1. デモ**(済) | Astroで 1-1〜1-4・設定・データ取り込み。`agents/*.md` を読んで描画、台本(3章)を再生 | スマホとPCで60fps前後(実測:idle 61 / スクロール 59〜60)、部の追加がファイル1枚で反映される |
| **2. 実データ**(一部済) | 済:GA4・Search Console・PageSpeed・microCMS・GitHub・Clarity・BingのAPI連携(10章)。残り:各部の定例をRoutine(Claude Codeの定期実行)にし、Notion(日報)・Googleカレンダー(MCP)も使ってイベントを書かせる。CSVの保存先をAccessの内側(KV/R2)へ。**イベントや売上は公開リポジトリにコミットしない** | 「DEMO」バッジが消える |
| **3. 実行** | 承認トレイの承認で、実際の公開・マージ・投稿の処理を起動する | CEOがスマホから承認して記事が公開される |

Phase 2以降で `agents/*.md` をClaude Codeのサブエージェント定義(`.claude/agents/`)に変換して、
**コンソールに出ている定義と、実際に動くエージェントの指示を同じファイルから作る。**

---

## 6. 決めたこと(CEO確認済み・2026-10-12)

- [x] デモの数字は**いまの実態に寄せる**。規模は設定で変えられるようにする → 8章
- [x] CEOの表示名は **AOI**
- [x] この定義とコンソールは `main` に入れてよい
- [x] 売上は「無料APIで自動連携できるならAPI、できなければCSV」→ 調べた結果、どこも成果を取るAPIがない → CSV/手入力 → 7章
- [x] (2026-10-13)アフィリエイト・SUZURIはCSVか手入力。**GA4・Search ConsoleはAPI連携。ほかもAPI・MCP・コネクタでつなげるものはどんどんつなぐ** → 10章
- [x] (2026-10-13)公開の手順は、リンク付きで5分で終わるようにする → `SETUP.md`

---

## 7. 売上データの取り込み

### 7-1. 調べた結果(2026年10月)

| 取り込み元 | 無料API | 取り込み方 | 理由 |
|---|---|---|---|
| A8.net | なし | CSV | 「成果データ連携API」は広告媒体(Google・Meta等)に成果を送るためのもので、自分の成果を取り出す用途ではない |
| もしもアフィリエイト | なし | CSV | 成果を取るAPIが見つからない |
| バリューコマース | 一部 | CSV | APIは商品検索用。成果レポートは取れない |
| アクセストレード | なし | CSV | 成果別レポートをCSVでダウンロードできる |
| Amazonアソシエイト | なし | CSV | PA-APIは商品情報用。紹介料のレポートはCSVで落とす |
| 楽天アフィリエイト | なし | CSV | 楽天ウェブサービスのAPIは商品検索用 |
| SUZURI | 一部 | 手入力 | 公式APIは無料だが商品・素材用で、売上(トリブン)を取る口がない。**販売中のアイテム数は自動取得できる**(Phase 2) |

APIの提供状況は変わりやすい。出たら `src/lib/sources.ts` を書き換え、Phase 2で自動取得にする。

### 7-2. 取り込みの仕組み

- `/data/` でCSVを選ぶ → 文字コード(UTF-8 / Shift_JIS)を自動で判別 → 見出し行を探し、
  「日付」「金額」「状態」の列を見出しから推測して初期値にする(ASPごとに列が違い、仕様も変わるので決め打ちしない)。
- 「数えない状態」(例:`否認|キャンセル|無効`)に当たる行は除く。日ごとの合計(金額・件数)にして保存する。
- 同じ日を2回取り込んでも二重にならない(日付単位で上書き)。選んだ列は取り込み元ごとに覚え、次回の初期値にする。
- CSVがないもの(SUZURI)は手入力。
- 「設定 → 実データを使う」(既定ON)のあいだ、ダッシュボードのアフィリエイト・SUZURIが**取り込んだ最新日の合計**になり、
  集計ボードに「実データ M/D」と出る(台本の台詞・日報の合計もその数字になる)。ほかの数字はデモのまま。

### 7-3. 保存先(大事)

**ブラウザの localStorage だけ。** サーバーにもGitにも送らない。リポジトリが公開なので、
売上のCSVや数字を `console/` に置いてコミットしないこと(ローカルに置くなら `console/data/private/`。`.gitignore` 済み)。
別の端末で見るとデータは空になる。複数端末で見たくなったら、Phase 2で Cloudflare Access の内側
(Workers + KV/R2)に保存先を移す。

---

## 8. 設定

`/settings/` で変えた値は、そのブラウザに保存される。

| 項目 | 中身 |
|---|---|
| CEOの表示名 | 既定 AOI |
| プリセット | 立ち上げ期(いまの実態)/ 3ヶ月後の目標 / 1年後の目標 / カスタム。値を1つでも変えるとカスタム |
| 1日あたりの値 | アフィリエイト(額・件数)、SUZURI(トリブン・点数)、PV、自然検索の割合、soft CV、10位以内KW、AI引用、公開・更新、下書き、審査、差し戻し、納品、承認依頼、LCP、INP |
| 台本1周の長さ | 30〜300秒(既定60秒) |
| 準備中の部も出す | SNS部などをダッシュボードに出す |
| 実データを使う | 既定ON。API連携(10章)と取り込んだCSV(7章)で実データがある数字は、デモの代わりにそれを使う |

プリセットの数字そのものを直したいときは `src/lib/settings.ts` の `PRESETS` を書き換える
(「立ち上げ期」は実態に合わせて随時更新する。プリセットを選んでいるブラウザには、書き換えた値がそのまま反映される)。
設定画面に項目を足すときは `DemoValues` と `VALUE_FIELDS` に1行ずつ足す。

---

## 9. 配信(Cloudflare Pages。CEOの作業)

**手順は `SETUP.md`。** Cloudflare(5分)→ Google(10分)→ microCMS(1分)の順。

`astro.config.mjs` で `vite.tsconfig` を `console/tsconfig.json` に固定している。これがないと、
親(公開サイト)の `tsconfig.json` を読みにいき、親の `node_modules` が無いPagesのビルドで
`Tsconfig not found astro/tsconfigs/strict` と落ちる。Nodeのバージョンは `.node-version`(22)。

---

## 10. API連携

### 10-1. 仕組み

```
ブラウザ(BASE CAMP)── GET /api/connectors/<id> ──▶ server/worker.js(Workers)→ server/api.js
                                                     │ ① Access のJWTを検証(server/access.js)。設定が無ければ返さない
                                                     │ ② エッジのキャッシュにあれば返す(連携ごとのttl)
                                                     ▼
                                       server/connectors.js ──▶ GA4 / Search Console / PageSpeed / microCMS / GitHub
```

- 鍵(GoogleのサービスアカウントJSON・APIキー)は**Cloudflareの環境変数(シークレット)にだけ**置く。ブラウザには渡らない。
- 結果のキャッシュは Workers KV(`BASECAMP_CACHE`。`server/cache.js`)。workers.dev ではCloudflareの通常のキャッシュが効かないため。KVが無い環境では Cache API。
- 届いた数字は `src/scripts/real.ts` でデモの値に上書きする。ダッシュボードは周ごとに組み直すので、
  遅れて届いた連携(PageSpeedは初回20秒ほど)も次の周から反映される。10分ごとに取り直す。
- 実データになった数字は、KPIタイルに「実データ」の印、上のバーに「実データ:GA4・…」と出る。
- 失敗・未設定の連携はデモのまま。理由は「データ連携」画面に出る。

| 連携 | 数字 | キャッシュ | 必要な環境変数 |
|---|---|---|---|
| GA4 | 本日のPV・セッション・自然検索の割合・soft CV(`cv_click`)・読了・よく読まれた記事 | 10分 | `GOOGLE_SERVICE_ACCOUNT_JSON` `GA4_PROPERTY_ID` |
| Search Console | 直近7日(昨日まで)のクリック・表示回数・10位以内のクエリ数・上位クエリ | 6時間 | `GOOGLE_SERVICE_ACCOUNT_JSON`(`GSC_SITE_URL` 任意) |
| PageSpeed Insights | LCP・INP・CLS(実ユーザー値。無ければラボ値)・スコア | 6時間 | なし(`PSI_API_KEY` 推奨) |
| microCMS | 本日の公開・更新本数・最近の更新 | 10分 | `MICROCMS_SERVICE_DOMAIN` `MICROCMS_API_KEY` |
| GitHub | mainの最新コミットとCloudflare Pagesのビルド成否 | 5分 | なし(`GITHUB_TOKEN` 任意) |
| Microsoft Clarity | 直近24時間のセッション・デッドクリック・レイジクリック・スクロールの深さ | 3時間(1日10回の制限のため。KV必須) | `CLARITY_API_TOKEN` |
| Bing Webmaster Tools | 直近7日のクリック・表示回数・上位クエリ | 6時間 | `BING_API_KEY`(`BING_SITE_URL` 任意) |

### 10-2. 次につなぐ候補

「どんどんつなぐ」方針。候補と必要なものは `src/lib/connectors.ts`(画面の「データ連携」にも出る)。

| 候補 | 方法 | 数字 | 必要なもの |
|---|---|---|---|
| SUZURI API | API | 販売中のアイテム数 | 無料トークン |
| Cloudflare | API | デプロイ履歴・Web Analytics | 読み取り専用トークン |
| LINE公式アカウント | API | 友だち数 | LINEの開設 |
| Instagram | API | フォロワー・保存・リーチ | プロアカウント＋Facebookページ |
| X | API | フォロワー・インプレッション | 有料。SNS部の稼働後に判断 |
| Slack | MCP(Claudeに接続済み) | 日報の通知 | Notionで足りなければ |

見送り:Ahrefs(有料のため。2026-10)。Notion・Googleカレンダーは「Claude経由」でつなぐ(`SETUP.md` 手順9・10)。

### 10-4. Claude経由の書き込み先

| 先 | 場所 | 中身 |
|---|---|---|
| Notion | ワークスペース「YAMATO OUTDOOR」→ ページ「YAMATO BASE CAMP」→ データベース「日報・週報」(data source `collection://e0c28f6f-7f0a-49cd-ba50-e5d98e871da2`) | 経営企画の日報(毎日)・週報(月曜)。プロパティ:タイトル(`YYYY-MM-DD 日報`)・日付・種類・状態(未読/確認済み)・売上合計・アフィリエイト・SUZURI・PV・soft CV・公開・更新・検索クリック(7日)・決めてほしいこと・明日の優先3つ。**数字は実データだけ。デモ値は書かない** |
| Googleカレンダー | メインのアカウントの「YAMATO BASE CAMP」カレンダー(Claudeにつないでいるアカウントに「予定の変更」で共有) | 需要の山(終日)・編集会議(毎週月曜10:00)・公開予定日 |

### 10-3. 連携を足す手順

1. `server/connectors.js` に関数を足し、`CONNECTORS` に `{ needs, ttl, run }` で登録する
2. `src/lib/connectors.ts` の該当行を `kind: 'live'` にする(無ければ足す)
3. `src/scripts/real.ts` の `LIVE_IDS` に id を足し、`applyResult` でデモのどの値に当てるかを書く
4. `test/server.test.mjs` に応答の読み取りのテストを足して `npm test`
5. 必要な環境変数を `SETUP.md` の表に足す
