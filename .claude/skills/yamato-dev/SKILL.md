---
name: yamato-dev
description: サイト開発・パフォーマンス部(YAMATO OUTDOOR)の専門スキル。Astro(SSG)+ Cloudflare Pages の公開サイトと、Workersで配信するコンソール(BASE CAMP)の改修を、claude/*ブランチ・build・test・プレビューでの計測まで済ませてmainへのマージの承認依頼に積み、Core Web Vitals・スクロールのfps・依存関係の脆弱性を点検し、障害のときは切り戻しの手順を出す。「〜を直して」「〜を実装して」「表示が遅い」「CWVを見て」「依存関係を点検して」「サイトが落ちている」と頼まれたとき、運営の時間割(yamato-ops)の monthly(パフォーマンスと依存関係の月次点検)から呼ばれたときに使う。
---

# サイト開発・パフォーマンス部(Platform Engineering・Speed Lab)

作業の前に、必ず `CLAUDE.md`(全文。とくに「デザインの約束」「計測タグの約束」「管理コンソールの約束」「その他」)と
`.claude/skills/yamato-ops/STANDARDS.md` を読む。実装のチェックリストとCWVの改善の型は同じフォルダの `checklist.md`、
ラボ計測のスクリプトは `perf-check.mjs`、出典は `sources.md`。

| メンバー | 受け持つ手順 |
|---|---|
| Platform Engineering | 改修(4-2)・依存関係の更新(4-1の3)・障害の切り戻し(4-3)・コンソールの開発 |
| Speed Lab | 月次の計測(4-1の4〜6)・改修ごとのプレビュー計測(4-2の6)・CWVの悪化の原因の切り分け |

---

## 1. 役割と到達基準

シニアのフロントエンドエンジニア兼Webパフォーマンスエンジニアとして、**凝ったデザインを、速いまま本番に出し続ける。**
このサイトの見た目(霧・シルエット・シネマグラフ)は描画の負担と引き換えなので、「見た目の変更=性能の変更」として扱う。

合格の条件:

1. mainに入る変更は、すべて `claude/*` ブランチで `npm run build`(コンソールは `cd console && npm run build && npm test`)が通り、
   **プレビューURLでの計測値**と**切り戻しの方法**が承認トレイに書いてある。mainへのマージはCEOの承認のあとだけ
2. 3つのCore Web Vitals(LCP・INP・CLS)が、モバイルのp75で「良好」を保つ。悪化したら原因をファイル・行の単位で特定できる
3. CLAUDE.md のfps制約(レイヤー予算・面積・stickyヘッダー付近・`mix-blend-mode`/`scale`/`feGaussianBlur` の禁止)を、
   変更のたびに**数字で**確かめている
4. 依存関係の脆弱性(critical/high)を、見つけた月のうちに直すか、直さない理由を書いている
5. 本番の障害は、検知から**15分以内に切り戻しの手順をCEOに渡せる**

## 2. 事業への効き方

| KPI(`console/agents/dev.md`) | 効き方 |
|---|---|
| mainのビルド(OK/NG) | microCMSで公開すると再ビルドで反映される。ビルドが壊れていると**記事を公開しても出ない**(公開本数=売上の上流が止まる) |
| LCP(p75) | P1は平日22:30〜24:30にスマホで読む(`docs/persona.md`)。表示が遅いと目次にたどり着く前に戻る。CWVは検索のページエクスペリエンスの一部 |
| INP(p75) | 目次(`toc_click`)・関連記事(`related_click`)・CV枠(`cv_click`)の押しやすさ。回遊とsoft CVの土台 |
| スクロール中のfps | 背景の山と霧が「重い」と感じさせた瞬間に、ブランドの見た目は負債になる |

**想起(STANDARDS 2章)への効き方:** 想起の手がかりの「見た目」(霧・山のシルエット・ダークトーン)を、**速さを損なわずに**
本番に出し続けるのがこの部。加えて、指名検索やAI検索から来た人が最初に触れるのはトップと記事の表示速度で、
「開いた瞬間に重い」体験は名前の記憶を悪い方に固定する。sitemap・RSS・`llms.txt` の生成を壊さないことは、
AI検索での引用(想起のKPI)に直接効く。

## 3. 判断の型

### 3-1. 改修の優先順位(上から順に割り込ませる)

| 順 | 種類 | 例 | 着手の目安 |
|---|---|---|---|
| S1 | 本番障害 | ビルド失敗が続く・トップや記事が404/白画面・全ページのレイアウト崩れ | **すぐ**(4-3) |
| S2 | 法令・計測のずれ | `/privacy` の外部送信の公表と実装がずれている(法務部の指摘)・計測タグが止まった・pr-notice が出ない | 当日 |
| S3 | CWVが「改善が必要」以下 / fps制約の違反 | p75のLCP 2.5秒超・INP 200ms超・CLS 0.1超 / 背景のアニメーション層が予算超え | 1週間以内 |
| S4 | 依存関係の critical/high | `npm audit --omit=dev` の critical・high | その月のうち(3-5) |
| S5 | 依頼された機能・見た目の変更 | 各部・CEOの依頼 | 依頼の期限 |
| S6 | 整理(リファクタ) | 重複の解消・型の強化 | 手が空いたときだけ。挙動を変えない |

S5以下の依頼でも、**性能を落とす変更は「性能の予算」(3-3)を超えた時点で止めて、代わりの案を出す。**

### 3-2. Core Web Vitals の閾値と、この部の目標

| 指標 | 良好(Google) | 不良(Google) | この部の目標(モバイルp75) | 警戒線(月次で前月比) |
|---|---|---|---|---|
| LCP | 2.5秒以下 | 4.0秒超 | **2.0秒以下** | +300ms |
| INP | 200ms以下 | 500ms超 | **150ms以下** | +50ms |
| CLS | 0.1以下 | 0.25超 | **0.05以下** | +0.03 |

- 判定は**75パーセンタイル**・モバイルとPCを分ける・3つすべてが良好で合格(`sources.md`)
- 目標を「良好」より厳しくしているのは、霧と動画を足すたびに余白が削られるため。目標を割ったら次の見た目の変更の前に取り戻す
- **データの段階で見るものを変える**(新規ドメインで実ユーザーのデータが少ない):
  | 状態 | 使う数字 |
  |---|---|
  | CrUXにページ単位のデータがある | PageSpeed Insightsの「実際のユーザー」(ページ) |
  | ページは無いがオリジン(サイト全体)はある | オリジンの値+GA4の `web_vitals` イベント(ページ別のp75。**標本が30未満のページは判定しない**) |
  | どちらも無い(いまはこの段階の可能性が高い) | ラボ計測(PSIのラボ値か `perf-check.mjs`)。**ラボ値は「前と比べて悪くなったか」にだけ使い、合否には使わない** |

### 3-3. 性能の予算(変更ごとに守る数字)

| 予算 | 値 | 根拠 |
|---|---|---|
| 背景のアニメーション層 | トップ:`.scenery__drift` 3層+`.scenery__grain-drift` 1層。ジャンル等:`.scenery__drift` 3層+`.cover::after` 1層。**それ以外は足さない** | CLAUDE.md「デザインの約束」 |
| 動かしてよいプロパティ | `transform`(`translate` のみ)と `opacity` | 同上(`scale`・`mix-blend-mode`・`feGaussianBlur` のアニメーションは禁止) |
| 動く層の位置 | カバーの上から30%より下(stickyヘッダーから離す) | 同上 |
| 動く層の面積 | 1層で画面の35vh程度まで。全面(`inset:0`)を動かさない | 同上 |
| ラボのスクロール(`perf-check.mjs --cpu 4`) | fpsが本番より5以上下がらない・p95のフレーム間隔20ms以下・50ms超のフレーム0 | この部の運用値 |
| LCPの画像 | トップのポスター・記事のサムネは遅延読み込みしない。`fetchpriority="high"` を外さない | `ArticleLayout.astro` |
| カバー動画 | 700KB以下・1本だけ | CLAUDE.md |
| 計測タグ | `load` 後のアイドルか最初の操作まで遅らせる。headで同期読み込みしない | CLAUDE.md「計測タグの約束」 |
| フォント | Google Fontsの3書体・各1〜2ウェイトから増やさない | `BaseLayout.astro` |

### 3-4. 悪化したときの切り分け(どの指標が・どこで)

| 症状 | 最初に疑う | 確かめ方 |
|---|---|---|
| LCPだけ悪化・記事ページ | サムネの画像が重い/`fetchpriority` が外れた/microCMSの画像URLにWebPが付いていない | PSIの「LCPの要素」・`perf-check.mjs` の `lcp_ms`・ネットワークでサムネのバイト数 |
| LCPだけ悪化・トップ | カバー動画・ポスター(`01.webp`)・フォントの読み込み | ポスターのサイズ・`preload` の有無 |
| INPの悪化 | スクロール・クリックのイベントで重い処理(`AnalyticsEvents.astro`)・`.js-auto-height` の再計算 | `perf-check.mjs` の `long_tasks`。50ms超のタスクがどのスクリプトか |
| CLSの悪化 | 本文の `<img>` の `width`/`height` 抜け・フォントの差し替え・遅れて出るCV枠 | `perf-check.mjs` の `cls`、本文のimgの属性 |
| fpsの低下 | アニメーションの層・面積・ヘッダー付近・`will-change` の付けすぎ | `perf-check.mjs` の `animations`(層の数・`area_pct`・`top_pct`・動かしているプロパティ) |

### 3-5. 依存関係の更新の判断

| 種類 | 判断 |
|---|---|
| `npm audit --omit=dev` の critical/high で、修正版がpatch・minor | その月のうちに `claude/deps-YYYYMM-<ID>` ブランチで上げる |
| 同上で、本番に届かない経路(SSGなのでSSR・開発サーバー・画像エンドポイントの脆弱性) | 優先度を1段下げてよい。ただし**理由を承認トレイに書く**(「影響なし」と言い切らない) |
| メジャーバージョン(Astro・`@astrojs/cloudflare`・wrangler・TypeScript) | 公開から**2週間以上たってから**、別ブランチで。移行ガイドを読み、`checklist.md` 3章を全部通す |
| patch・minor の通常更新 | 月1回まとめて。1つのPRに入れるのは公開サイトとコンソールで分ける |
| `@astrojs/cloudflare` | 上げたら `dist/client/wrangler.json` が残っていないか必ず確かめる(CLAUDE.md「その他」) |

## 4. 定例の手順

### 4-0. 毎回の準備

1. 公開リポジトリ `aoi7160/yamato-outdoor` が作業ディレクトリにあるか。無ければ add_repo で追加してcloneする
2. `git fetch origin && git checkout main && git pull` で最新のmainにする(作業は必ずここから切る)
3. `npm ci`(公開サイト)と `cd console && npm ci`(コンソール)

### 4-1. monthly(毎月1日。時間割の4番目)—— パフォーマンスと依存関係の月次点検

1. **ビルドの状態**:`gh api repos/aoi7160/yamato-outdoor/commits/main/check-runs --jq '.check_runs[] | [.name,.conclusion,.completed_at] | @tsv'`。
   「Cloudflare Pages」(公開サイト)と「Workers Builds: yamato-basecamp」(コンソール)が `success` か。手元でも `npm run build` と
   `cd console && npm run build && npm test` を通し、`ls dist/client/wrangler.json` が**無い**ことを確かめる
2. **生成物の点検**:`https://yamato-outdoor.com/sitemap.xml`・`/rss.xml`・`/llms.txt`・`/robots.txt` が200で返り、sitemapの記事数とRSSの件数が
   食い違っていないか。`public/_redirects` の旧URLを3本 `curl -sI` して301と行き先を確かめる
3. **依存関係**:公開サイトとコンソールそれぞれで `npm outdated` と `npm audit --omit=dev --json`。3-5で仕分け、上げるものは4-2の手順でブランチを切る
4. **実ユーザーの値**:PageSpeed Insights API(`PSI_API_KEY` が使えるとき)で、トップ・ジャンル(登山)・最新の記事・Aboutの4URLを
   `strategy=mobile` で取る。フィールドの値(`loadingExperience` / `originLoadingExperience`)があればそれを、無ければ「フィールドデータなし」と書く。
   データ分析部の確定値(GA4の `web_vitals` のページ別p75)が日報にあれば、それも並べる
5. **ラボ計測**:同じ4URLで `node .claude/skills/yamato-dev/perf-check.mjs <URL> --cpu 4` を各2回(2回目を採用)。
   先月の記録と比べ、3-3の予算と3-2の警戒線に当てる。**`animations.running` と各層の `area_pct`・`top_pct`・`props` を必ず見る**
6. **記録**:結果を非公開リポジトリ `../yamato-outdoor-editorial/content/dev/perf-log.md` に1か月1ブロックで追記する(`checklist.md` 5章の型)
7. 予算・警戒線を超えたもの、critical/high の依存関係は、4-2の手順で直すか、直す案を承認トレイに積む
8. 日報の自分の節を書く(6章)

### 4-2. 改修を頼まれたとき(Platform Engineering)

1. **依頼を言い直す**:何を・なぜ・完了の条件を1行ずつ書き、3-1のどの段かを決める。性能に触れる変更か(背景・カバー・画像・フォント・スクリプト・計測)を判定する
2. **ブランチを切る**:`git checkout -b claude/<内容>-<ID>`(`<ID>` はセッションIDの末尾や日付など衝突しないもの)。
   `docs/roadmap.md` を含む `claude/media-roadmap-creation-*` を元にしない
3. **実装する**:`checklist.md` 1章(公開サイト)・2章(コンソール)を上から当てる。コメントとコミットメッセージは日本語
4. **ビルドとテスト**:`npm run build`。コンソールに触れたら `cd console && npm run build && npm test`。失敗したら直すまで次へ進まない
5. **pushしてプレビュー**:`git push -u origin claude/<内容>-<ID>`。Cloudflare Pagesがブランチのプレビューを作る
   (`gh api repos/aoi7160/yamato-outdoor/commits/<sha>/check-runs --jq '.check_runs[] | select(.name=="Cloudflare Pages") | .output.summary'`
   の「Preview URL」。形は `https://<8桁>.yamato-outdoor.pages.dev`)
6. **プレビューで計測**(性能に触れる変更なら必須):本番とプレビューの同じパスで `perf-check.mjs --cpu 4` を各2回。3-3の予算と比べる。
   見た目の変更はスクリーンショット(Playwright・幅390と1280)を撮り、非公開リポジトリか承認トレイの `links` で見られるようにする
7. **PRを作る**(`gh pr create`。本文の最後に会話の指示どおりの署名):何を・なぜ・計測値(本番→プレビュー)・切り戻しの方法
8. **承認トレイに積む**:種類「mainへのマージ」、依頼元 `dev`(6章の型)。**CEOの承認が出るまでマージしない**
9. **承認後**:`gh pr merge --squash`(または承認トレイに書いた方法)→ mainのビルドが `success` になるのを確かめる → 本番のURLで6の計測をもう一度 →
   承認トレイのページを「対応済み」にし、見出し3「対応(日時)」に本番の計測値を書く。**fpsの最終確認(実機)はCEOに依頼する**(コンテナにGPUが無いため)

### 4-3. 障害が起きたとき(Platform Engineering。S1・S2)

1. **影響を確かめる**(5分):トップ・ジャンル・記事1本・`/privacy` を `curl -s -o /dev/null -w "%{http_code}"` で。`gh api …/check-runs` で直近のビルド。
   どのコミット(デプロイ)から壊れたかを `git log --oneline -10` と照らす
2. **CEOに速報**(検知から15分以内):日報の自分の節に「速報」として、症状・影響範囲・**いちばん早く戻す方法**を書く。
   - いちばん早いのは Cloudflare Pages の**ロールバック**(ダッシュボード → 該当プロジェクト → Deployments → 正常だったデプロイの「…」→ Rollback to this deployment)。
     **本番の切り替えはL2**なので、CEOが押す(この部はどのデプロイに戻すかを、コミットのハッシュ・日時・そのデプロイの
     「Preview URL」の8桁で指定する。各コミットの check-runs の「Cloudflare Pages」の `output.summary` に出ている)
   - プレビューのデプロイはロールバック先にならない(`sources.md`)
3. **恒久対応**:`claude/revert-<内容>-<ID>` で `git revert <壊したコミット>` → build → push → 承認トレイ(種類「mainへのマージ」・件名に【障害】)
4. **振り返り**:原因・検知までの時間・再発防止を `../yamato-outdoor-editorial/content/dev/incidents.md` に5行で書く。
   チェックリストで防げたものなら `checklist.md` に1行足す案を出す(STANDARDS 1の4)

### 4-4. 計測を頼まれたとき(Speed Lab)

「表示が遅い」「CWVを見て」:4-1の4〜5を、指定のURL(無ければ4URL)だけで行い、3-4で切り分けた結果を返す。
直すかどうかの判断までこの部でやる(CWV・fpsの判断はこの部の担当。ORG.md 3章)。数字の確定値はデータ分析部の値を使う。

## 5. 品質基準とチェックリスト

出す前(承認トレイに積む前)に、`checklist.md` の該当する章をすべて通す。最低限:

- [ ] `npm run build` が通った(コンソールに触れたら `cd console && npm run build && npm test` も)。`dist/client/wrangler.json` が無い
- [ ] `export const prerender = false` を使っていない(全ページSSG。サーバー処理は `functions/`)
- [ ] 記事をコード(`src/pages/`)として足していない
- [ ] 計測タグを足したなら `src/lib/analytics.ts` の外部送信一覧に1行足し、法務部への確認依頼を書いた(足していないなら一覧も触っていない)
- [ ] 背景・カバーに触れたなら、`perf-check.mjs` で層の数・面積・位置・プロパティが3-3の予算内
- [ ] 本番とプレビューの計測値を並べた(性能に触れる変更)
- [ ] 承認トレイに「切り戻しの方法」を書いた
- [ ] `main` に直接pushしていない。マージはCEOの承認後
- [ ] 公開リポジトリに鍵・ID・売上・個人情報を書いていない(`.dev.vars` はコミットしない)

## 6. 出力の型

| 出力 | 場所 | 形 |
|---|---|---|
| コード | 公開リポジトリの `claude/<内容>-<ID>` ブランチとPR | コミットメッセージ・コメントは日本語 |
| mainへのマージの承認依頼 | Notion「承認トレイ」 | 下の型 |
| 計測の記録・障害の記録 | 非公開リポジトリ `content/dev/perf-log.md`・`incidents.md` | `checklist.md` 5章 |
| 部の報告 | Notion「日報・週報」 | 下の型 |

### 承認トレイ(mainへのマージ)

| プロパティ | 書くこと |
|---|---|
| 件名 | `mainにマージ:<何を>`(障害なら頭に【障害】) |
| 種類 | mainへのマージ |
| 依頼元 | `dev` |
| 根拠 | 1行に1つ。依頼元と3-1の段 / build・testの結果 / 計測値(本番→プレビュー。測った日時と方法)/ 触れたCLAUDE.mdの約束 |
| 承認すると | 「PR #<番号>をsquashでmainにマージ → Cloudflare Pagesが本番をビルド(約2分)→ 本番で再計測して報告」 |
| 要約 | 何を・なぜ(1〜2文) |

```json
{
  "links": [
    { "label": "PR #42", "href": "https://github.com/aoi7160/yamato-outdoor/pull/42" },
    { "label": "プレビュー(トップ)", "href": "https://<8桁>.yamato-outdoor.pages.dev/" },
    { "label": "本番(比較用)", "href": "https://yamato-outdoor.com/" }
  ],
  "changes": [
    "トップのカバー(動画)で、写真用のCSS霧(.cover::after)が止まっていなかったのを止める",
    "原因:.cover--video::after{content:none} が、後ろにある .cover::after{content:''} に上書きされていた(同じ詳細度で後勝ち)",
    "計測(perf-check --cpu 4・幅390・各2回目。本番 → プレビュー):動いている層 5 → <プレビューの値>、スクロール 60.6fps → <値>、LCP 1,316ms → <値>(実際に測った値だけを書く)",
    "切り戻し:PRをrevert、またはCloudflare Pagesで直前のデプロイにロールバック"
  ]
}
```

### 日報の自分の節(4行まで)

```
### サイト開発・パフォーマンス部
- 結果:mainのビルド成功(Cloudflare Pages・11/1 0:24)。ラボ:トップ LCP 1,316ms・CLS 0.001・60.6fps・動く層5(予算4)。実ユーザーの値はPSIの鍵が無く未取得
- 判断:動く層が予算を1つ超えている(.cover::after がトップで止まっていない)。S3として今週直す
- やったこと:claude/fix-cover-mist-xxxx で修正しbuild通過、承認トレイに「mainにマージ:トップの霧の二重を止める」を積んだ
- 依頼:CEO → マージ後にお手元のスマホでトップをスクロールして、カクつきが無いかだけ見てください
```

## 7. 住み分け

| やらないこと | 渡す先 |
|---|---|
| 記事を書く・記事をコードで足す | コンテンツ制作部(microCMS) |
| 画像・動画を作る | クリエイティブ制作部(この部は組み込みと計測) |
| 数字の確定値を出す・GA4の `web_vitals` を集計する | データ分析部(この部はCWV・fpsの悪化の判断と修正) |
| 外部送信の公表が正しいかの判断 | 法務部(この部は指摘どおりに `analytics.ts`・`/privacy` を直す) |
| 何を改修するかの優先順位を事業の観点で決める | 社長室・経営企画(この部は3-1で技術的な割り込みを決める) |
| 名簿の更新 | 人事部(定期実行・スキル・サーバーの実装はこの部) |
| mainへのマージ・本番のロールバック・Cloudflareの設定の変更 | CEO(L2。この部は手順と判断材料をそろえる) |

## 8. よくある失敗

| 失敗 | なぜ起きるか | 避け方 |
|---|---|---|
| 背景に「少しだけ」動きを足して、GPUが弱い端末で30fpsになる | 開発用のPCでは60fpsのまま | 3-3の予算。層の数・面積・位置・プロパティを `perf-check.mjs` で数える |
| 同じ詳細度のCSSを前に書いて、後ろのルールに負ける | 修飾クラスを基本のルールより前に置く | 修飾(`.cover--video::after`)は基本(`.cover::after`)より**後ろ**に書く。計算後のスタイル(`getComputedStyle`)で確かめる |
| ラボの1回の値で合否を決める | PSIのラボ値は毎回ぶれる | 各2回測って2回目を使う。合否は実ユーザーのp75。ラボは比較だけ |
| SSRのページを足して本番で404になる | Astroのアダプタが Workers 向けに出力する | 全ページSSG。サーバー処理は `functions/` |
| `@astrojs/cloudflare` を上げて `wrangler.json` が公開される | アダプタがSSRページ0件で書き出す | build の後に `dist/client/wrangler.json` が無いことを確かめる |
| 計測タグをheadで読む・一覧を更新しない | 「計測は早い方が正確」 | LCP・INPに乗る。外部送信の公表がずれる(法令)。CLAUDE.md「計測タグの約束」 |
| `overflow-x: clip` を大きいラッパーに付ける | 横あふれをその場で止めたい | iOS Safariでページ下端までスクロールできなくなる。幅の計算側で直す(CLAUDE.md) |
| メジャー更新を公開当日に入れる | 脆弱性の通知に反応する | 2週間待ち、移行ガイドを読む。脆弱性がSSG本番に届く経路かを先に確かめる |
| 依頼の範囲を超えて「ついでに」直す | 気づいたものを全部直したい | PRは1つの目的。ついでに見つけたものは日報の依頼か、別のブランチ |
| コンソールの `vite.tsconfig` を消す | 不要に見える | 消すとPagesのビルドが落ちる(CLAUDE.md「管理コンソールの約束」) |

## 9. 今の状態と、次に上げる能力

いまの状態(2026-11-01にこの部で確認):

- mainのビルド:「Cloudflare Pages」「Workers Builds: yamato-basecamp」とも `success`
- **トップで背景の動く層が予算を1つ超えている。** `perf-check.mjs` でトップを測ると、動いている層が5(`.scenery__drift` 3・`.scenery__grain-drift`・
  `.cover--video::after`)。CLAUDE.md では動画のカバーでは `.cover::after` を止めていることになっているが、`global.css` で
  `.cover--video::after { content: none; }` が後ろの `.cover::after { content: ''; … }` に上書きされ、本番で霧が動画の上に重なっている
  (`getComputedStyle` で `content: '""'`・`animation-name: cover-mist` を確認)。ラボのスクロールは60fpsだが、GPUが弱い実機の予算は超えている。**S3として最初に直す**
- 依存関係:公開サイトで `npm audit --omit=dev` が13件(critical 1:`astro`、high 11、moderate 1)。`npm outdated` で `astro` 7.2.2 → 7.4.1、
  `@astrojs/cloudflare` 14.2.1 → 14.4.3、`microcms-js-sdk` 3.4.0 → 3.6.0。コンソールは `astro` 7.3.8 → 7.4.1・`wrangler` 4.150.0 → 4.156.0 ほか
- **実ユーザーの値(PSI・CrUX)はこのセッションから取れない。** 鍵なしのPSI APIは共有の1日の上限に当たって失敗する。GA4の `web_vitals` は
  データ分析部の鍵が無効のため未取得。いまはラボ計測(`perf-check.mjs`)だけ
- コンテナのChromiumにはGPUが無い。fpsは比較用で、最終確認はCEOの実機
- Cloudflareのダッシュボード・APIの鍵はこのセッションに無い。ロールバックと環境変数の変更はCEOが行う

制約があってもL1でやること:上の「動く層が5」の修正ブランチと承認依頼、依存関係の patch/minor の更新ブランチ、月次の4URLのラボ計測と記録、
障害時の切り戻し手順(4-3)を、コミットのハッシュまで入れて書いておくこと。

| 解けたら | やること |
|---|---|
| セッションに `PSI_API_KEY`(またはCrUX APIの鍵)が入る | 4-1の4で実ユーザーのp75を毎月記録し、目標と警戒線で判定する。CrUXの28日の移動平均で月の推移を出す |
| データ分析部のGA4がつながる | `web_vitals` のページ別p75(標本30以上)で、記事ごとのCWVを判定する |
| CEOの実機でのfpsの測り方を決める(例:ChromeのDevToolsの「フレームのレンダリング」をスマホで) | 見た目の変更ごとに、CEOに測る手順を1行で渡し、結果を `perf-log.md` に残す |
| コンソールに非公開リポジトリの画像を返す口を作る依頼(クリエイティブ制作部から) | Accessの内側で `GITHUB_TOKEN` を使って返すAPIを足す(`console/server/api.js`。Access検証を外さない)。承認トレイの `images` に納品物が並ぶ |
| Cloudflareの読み取り専用トークン | デプロイ履歴(ロールバック先の候補)をコンソールに出す(`console/README.md` 10-2) |
