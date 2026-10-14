# BASE CAMP を公開する(CEO向けの設定手順)

上から順に押していけば終わるように書いてある。Cloudflareの部分(手順1〜3)は**5分**、
Googleの部分(手順4)は**10分**、microCMS(手順5)は1分。手順4・5は後日でもよい
(やるまでは、その数字が「—」と「未接続」で出るだけ)。

> 画面の文言は、Cloudflare・Googleの表示言語や時期で少し変わる。英語表記も併記してある。

---

## 手順1 コンソールを作る(2分)

Cloudflareの作成画面は「**Workers**」の画面(Set up your application)になっている。その画面のまま進める。

1. 開く → **https://dash.cloudflare.com/?to=/:account/workers-and-pages/create**
2. 「Gitリポジトリをインポート(Import a repository)」→ `aoi7160/yamato-outdoor` を選ぶ
3. 「Set up your application」の画面で、次のとおり入れる

   | 項目 | 入れる値 |
   |---|---|
   | Project name | `yamato-basecamp`(`console/wrangler.jsonc` の `name` と同じにする。違うとデプロイが止まる) |
   | Build command | `cd console && npm ci && npm run build` |
   | Deploy command | `cd console && npx wrangler deploy` |
   | Preview command | `cd console && npx wrangler versions upload` |
   | Enable Preview builds | **オフ**(作業ブランチごとのプレビューは要らない) |
   | Protect with Cloudflare Access | **オン**(これで鍵がかかる。手順2がほぼ済む) |

4. 「**Deploy**」→ 2〜3分でビルドとデプロイが終わる
   - URLは `https://yamato-basecamp.<アカウントのサブドメイン>.workers.dev`(プロジェクトの画面に出る)

> 公開サイト用の既存のプロジェクトは**触らない**。同じリポジトリから2つ目を作るだけ。
> コマンドの頭の `cd console &&` は消さない(コンソールは `console/` フォルダにあるため。消すと公開サイトの方がビルドされる)。

<details>
<summary>「Pages」の作成画面が出た場合(旧い画面)</summary>

「Pages」→「既存のGitリポジトリをインポート」で、プロジェクト名 `yamato-basecamp`・本番ブランチ `main`・
フレームワーク `Astro`・ビルドコマンド `npm run build`・ビルド出力 `dist`・ルートディレクトリ `console` にして
「保存してデプロイ」。鍵は「設定 → 一般 → アクセスポリシーを有効にする」→ Zero Trustの「Access → アプリケーション」で
そのアプリの「サブドメイン」の `*` を消して保存 → もう一度「アクセスポリシーを有効にする」。
環境変数は「設定 → 変数とシークレット」、入れた後は「デプロイを再試行」。

</details>

---

## 手順2 鍵がかかっていることを確かめる(1分)

1. 初めてZero Trustを使うときは、デプロイの途中か後で**チーム名**とプランを聞かれる。
   チーム名は何でもよい(例:`yamato`)。プランは **Free(50人まで0円)**
   (支払い方法の登録を求められることがあるが、Freeなら請求は0円)
2. ブラウザのシークレットウィンドウで手順1のURLを開き、
   **Cloudflareのログイン画面(メールでコードが届く画面)が出れば成功**
   - 中身が見えてしまったら:プロジェクトの「設定(Settings)」→「ドメインとルート(Domains & Routes)」で
     `workers.dev` の行の「Cloudflare Access」をオンにする

---

## 手順3 鍵の情報をコンソールに教える(1分)

コンソールは、Accessを通ったことを自分でも確かめてからデータを返す(設定漏れでデータが外に出ないように)。
この2つが入るまで、GA4などの数字は**出ない**(「—」と「取得失敗」になる)。

1. チームドメインを確認する:**https://one.dash.cloudflare.com/**(Cloudflare One)→ 左メニューの**いちばん下の「Settings」**
   → ページの**いちばん上の「Team domain」**に出ている `◯◯.cloudflareaccess.com` をコピー
   (右の「ON THIS PAGE」の「Team domain」を押すと飛べる。下の方の Admin controls / Plan / Permissions ではない)
2. 普通のダッシュボードに戻る:左上の「**Back to (メールアドレス)**」→ 左メニュー「**Workers & Pages**」→ **yamato-basecamp** を開く
   → 上のタブ「**Settings**」→「**Variables and Secrets**」→「**+ Add**」で、Type「**Text**」で2つ入れる
   - **「Build」の中にある「Variables and secrets」ではない**(すぐ下に「Deploy Hooks」「Build cache」が並んでいる方は
     ビルド中だけ使う変数で、コンソールからは読めない)。Settings の上の方にある、Build とは別の「Variables and Secrets」を使う
   - 「+ Add」を押すと入力の画面が開き、いちばん下に「**Deploy**」ボタンがある。これを押すと反映される(「Deployments」に新しい版が並ぶ)

   | 変数名 | 値 |
   |---|---|
   | `CF_ACCESS_TEAM_DOMAIN` | `◯◯.cloudflareaccess.com`(1でコピーしたもの) |
   | `ALLOWED_EMAILS` | Cloudflareにログインしているメールアドレス(Accessのログインで別のアドレスを使うなら、カンマ区切りで足す) |

3. 「**Deploy**」を押す。反映されたかは、コンソールの「データ連携」画面で分かる
   (「CF_ACCESS_TEAM_DOMAIN と ALLOWED_EMAILS が未設定です」と出たら、入れた場所が違う)

ここまでで公開は完了。URLをスマホのホーム画面に追加しておくと便利。
**GitHubのビルド結果**とPageSpeedの数字は、この時点で自動で出る(回数制限に当たると出ないことがある → 手順4の4・手順6)。

---

## 手順4 Google(GA4・Search Console・PageSpeed)をつなぐ(10分)

Googleの「サービスアカウント」(ロボット用のアカウント)を1つ作り、GA4とSearch Consoleに**閲覧だけ**の権限で招待する。

1. **APIを有効にする**:開く → **https://console.cloud.google.com/flows/enableapi?apiid=analyticsdata.googleapis.com,searchconsole.googleapis.com,pagespeedonline.googleapis.com**
   - プロジェクトが無ければ作る画面になる(名前は `yamato-basecamp` でよい)→「次へ」→「有効にする」
2. **サービスアカウントを作る**:開く → **https://console.cloud.google.com/iam-admin/serviceaccounts/create**
   - 名前:`basecamp-reader` →「作成して続行」→ ロールは**何も付けずに**「続行」→「完了」
   - 一覧に出た `basecamp-reader@◯◯.iam.gserviceaccount.com` を**コピー**しておく
3. **鍵(JSON)を作る**:一覧の `basecamp-reader` を開く →「キー」→「キーを追加」→「新しい鍵を作成」→ **JSON** → 作成
   - JSONファイルがダウンロードされる。**このファイルは人に送らない・Gitに入れない**
4. **PageSpeedのAPIキーを作る**:開く → **https://console.cloud.google.com/apis/credentials** →
   「認証情報を作成」→「APIキー」→ 作成されたキーをコピー
   (「キーを制限」→ APIの制限で「PageSpeed Insights API」だけにしておくと安全)
5. **GA4に招待する**:**https://analytics.google.com/** →「管理」(左下の歯車)→ プロパティ列の
   「**プロパティのアクセス管理**」→ 右上の「+」→「ユーザーを追加」→
   2でコピーしたアドレス・役割「**閲覧者**」・「招待メールで通知する」は**オフ** → 追加
   - 同じ「管理」→「**プロパティの詳細**」(または「プロパティ設定」)の右上に出ている**プロパティID**(数字だけ)をコピー
6. **Search Consoleに招待する**:開く → **https://search.google.com/search-console/users?resource_id=sc-domain%3Ayamato-outdoor.com**
   →「ユーザーを追加」→ 2でコピーしたアドレス・権限「**制限付き**」→ 追加
   - URLプレフィックスで登録している場合は、Search Consoleの左上でそのプロパティを選んでから「設定 → ユーザーと権限」
7. **Cloudflareに入れる**:手順1のプロジェクト →「設定(Settings)」→「変数とシークレット」→「追加」

   | 変数名 | 種類 | 値 |
   |---|---|---|
   | `GOOGLE_SERVICE_ACCOUNT_JSON` | **シークレット** | 3のJSONファイルをテキストエディタで開き、**中身を全部**貼る |
   | `GA4_PROPERTY_ID` | テキスト | 5でコピーした数字 |
   | `PSI_API_KEY` | シークレット | 4のAPIキー |
   | `GSC_SITE_URL` | テキスト | (URLプレフィックスで登録しているときだけ)`https://yamato-outdoor.com/` |

8. 「デプロイ(Deploy)」を押して保存する
9. コンソールの「**データ連携**」画面で、GA4・Search Console・PageSpeedが「**接続OK**」になれば完了
   - 「エラー:閲覧権限がない」と出たら、5・6の招待を確認(反映に数分かかることがある)

> soft CV(LINE・メール登録の押下)を正しく数えるには、GA4の「管理 → カスタム定義」で
> イベントパラメータ `cv_stage` をカスタムディメンション(範囲:イベント)として登録する
> (`docs/analytics.md` 2-3章)。未登録のあいだは `cv_click` 全体を数える。

---

## 手順5 microCMS をつなぐ(1分)

公開サイトと同じ値を入れる。公開サイトのPagesプロジェクト →「設定」→「変数とシークレット」で確認できる
(またはmicroCMSの管理画面 →「権限管理」→「APIキー」)。

| 変数名 | 種類 | 値 |
|---|---|---|
| `MICROCMS_SERVICE_DOMAIN` | テキスト | 公開サイトと同じ |
| `MICROCMS_API_KEY` | シークレット | 公開サイトと同じ(GETだけ許可したキーで十分) |

入れたら「デプロイ(Deploy)」を押して保存する。

---

## 手順6 (必要なときだけ)GitHubのトークン

GitHubのAPIは、トークンなしだと1時間60回の制限があり、Cloudflareの共有IPだと当たりやすい。
「データ連携」でGitHubが「エラー:回数制限」になるときだけ入れる。

1. 開く → **https://github.com/settings/personal-access-tokens/new**
2. 名前 `basecamp`・有効期限1年・Repository access「**Public repositories**(読み取りのみ)」→ 権限は何も足さずに作成
3. Cloudflareに `GITHUB_TOKEN`(シークレット)として入れて保存する

---

## 手順7 Microsoft Clarity をつなぐ(5分)

Clarity(無料のヒートマップ)を**公開サイトに入れて**から、コンソールに数字を出す。

1. **https://clarity.microsoft.com/** →「**+ New project**」→ 名前 `YAMATO OUTDOOR`・URL `https://yamato-outdoor.com` → 作成
2. 「Settings」→「Setup」に出る**プロジェクトID**(10文字ほどの英数字)をコピー
3. **公開サイト側**のCloudflareプロジェクト(コンソールではない方)→ Settings → 変数とシークレット(Production)に
   `CLARITY_ID`(テキスト)= 2のID を入れて、デプロイし直す(サイトにClarityのタグが入る。`/privacy` の外部送信一覧にも自動で載る)
4. Clarityに戻り「**Settings**」→「**Data Export**」→「**Generate new API token**」→ 名前 `basecamp`(空白なし)→ トークンをコピー
5. **コンソール**のCloudflareプロジェクト(yamato-basecamp)→ Settings →「Runtime variables and secrets」→「+ Add variable」
   - Type **Secret**・名前 `CLARITY_API_TOKEN`・値 = 4のトークン →「Deploy」

> ClarityのAPIは**1日10回まで**。コンソールは3時間ごと(1日8回)にしか取りにいかず、結果はKV(下の注)に置いておく。
> 「取り直す」ボタンでもClarityだけは取りにいかない。数字は直近24時間の分(セッション・デッドクリック・レイジクリック・スクロールの深さ)。

> **KV(キャッシュ)について**:`console/wrangler.jsonc` に `BASECAMP_CACHE` を書いてあり、次のデプロイで自動で作られる(無料枠)。
> デプロイが「KV」や「権限」のエラーで失敗したら、Claudeに伝える(手で作ってIDを書く方法に切り替える)。

---

## 手順8 Bing Webmaster Tools をつなぐ(3分)

1. **https://www.bing.com/webmasters/** にログイン(Microsoftアカウント)
2. 「サイトを追加」→「**Google Search Consoleからインポート**」を選ぶ(確認作業がいらない)→ `yamato-outdoor.com` を選んでインポート
3. 右上の**歯車(設定)**→「**APIアクセス**」→「**APIキー**」→ 生成してコピー
4. コンソールのCloudflareプロジェクト → Settings →「Runtime variables and secrets」→「+ Add variable」
   - Type **Secret**・名前 `BING_API_KEY`・値 = 3のキー →「Deploy」
   - Bingに登録したURLが `https://yamato-outdoor.com/` 以外(`www` 付きなど)なら、Text で `BING_SITE_URL` にそのURLを入れる

> Bingは登録してから数字が出るまで数日かかる。それまでは「接続OK」でも0のまま。

---

## 手順9 Notion(日報の置き場所)をつなぎ直す(3分)

Claudeにつながっている Notion を、**YAMATO用に作った個人のNotionアカウント**に切り替える
(いまは会社のアカウントのワークスペースにつながっているため。YAMATOのページは会社側に作らない)。

1. ブラウザで **https://www.notion.so/** を開き、右上(または左上のワークスペース名)から
   **YAMATO用のアカウントでログインしている状態**にする(会社のアカウントのままなら、いったんログアウトする)
2. **https://claude.ai/settings/connectors** を開く(claude.ai →左下の自分の名前→「設定」→「コネクタ」)
3. 「**Notion**」の「…」または「切断(Disconnect)」で、いまの接続を外す
4. もう一度「Notion」の「**接続(Connect)**」→ Notionの画面で、**YAMATO用のアカウント**と**ワークスペース**を選んで「アクセスを許可」
5. Claudeに「Notionつなぎ直した」と伝える → ClaudeがNotionに「YAMATO BASE CAMP」ページと「日報」データベースを作る

> 会社のアカウントでログインしたまま接続すると、また会社のワークスペースにつながる。手順1のログイン状態が大事。
> 反映されないときは、Claudeの会話(セッション)を新しく始めると読み込み直される。

---

## 手順10 Googleカレンダー(メインのアカウント)→ TimeTree(5分)

予定は **メインで使っているGoogleアカウントのカレンダー** に置く。Claudeにつながっているのは別のGoogleアカウントのカレンダーなので、
メインのアカウント側に**BASE CAMP専用のカレンダーを1つ作り、Claudeにつないでいるアカウントに「予定の変更」権限で共有する**
(Claudeはその1つのカレンダーにだけ書き込む。メインのアカウントのほかの予定は見えない)。

1. **PCでメインのGoogleアカウントにログイン**して **https://calendar.google.com/** を開く
2. 右上の歯車 →「設定」→「全般」→「タイムゾーン」を **(GMT+09:00) 日本標準時** にする
3. 左の「**他のカレンダー**」の「**+**」→「**新しいカレンダーを作成**」→ 名前 `YAMATO BASE CAMP`・タイムゾーン 日本標準時 →「カレンダーを作成」
4. 左の一覧の `YAMATO BASE CAMP` にマウスを乗せて「⋮」→「**設定と共有**」→「**特定のユーザーまたはグループと共有する**」
   →「ユーザーやグループを追加」→ 「Claudeにつないでいるアカウント」のメールアドレス・権限「**予定の変更**」→「送信」
5. Claudeにつないでいるアカウントのメールに届く招待メールの「このカレンダーを追加」を押す(届かなければ、そのアカウントでカレンダーを開くと左に出ていることもある)
6. Claudeに「カレンダー共有した」と伝える → Claudeが需要の山・編集会議などの予定を `YAMATO BASE CAMP` に入れる

**TimeTreeに出す(iPhone)**

1. iPhoneの「設定」→「カレンダー」→「アカウント」→「アカウントを追加」→ Google → **メインのGoogleアカウント**でログイン →「カレンダー」をオン
2. iPhoneの「カレンダー」アプリ →下の「カレンダー」→ `YAMATO BASE CAMP` にチェックが付いているか確認
3. TimeTreeアプリ → 設定 → iPhone(端末)のカレンダーを表示する項目をオンにして、`YAMATO BASE CAMP` を選ぶ
   (項目名はTimeTreeのバージョンで違う。「カレンダーの表示」「外部カレンダー」のような名前)
   - これは「表示」なので、Googleで予定が増えれば自動で出る。TimeTreeの**共有カレンダーに入れたい**ときは「インポート」を使う(1回きりのコピー)

> TimeTreeの公開APIは2023年に終了しているため、ClaudeからTimeTreeに直接は書けない。Googleカレンダーを経由する。

---

## 手順11 Notionの承認トレイをコンソールにつなぐ(3分)

承認トレイの依頼はNotionの「YAMATO BASE CAMP」→「承認トレイ」に積まれる。コンソールがそこを読み、
押した「承認・修正依頼・差し戻し」を書き戻せるように、Notionの**鍵(インテグレーション)**を作って渡す。

1. **https://www.notion.so/profile/integrations** を開く(YAMATO用のアカウントでログインした状態で)
2. 「**新しいインテグレーション**(New integration)」を押す
   - 名前:`BASE CAMP` / ワークスペース:**YAMATO OUTDOOR** / 種類:**内部**(Internal)→「保存」
3. 「**内部インテグレーションシークレット**(Internal Integration Secret)」の「表示」→「コピー」(`ntn_` から始まる長い文字列)
4. 同じ画面の「**機能**(Capabilities)」で、「コンテンツを読み取る」「コンテンツを更新」「コンテンツを挿入」の3つにチェックが入っていることを確認して保存
5. Notionで「**YAMATO BASE CAMP**」のページを開く → 右上の「**…**」→「**接続**(Connections)」→「**BASE CAMP**」を選んで「確認」
   (これで、このページの中だけをコンソールが読み書きできる。ほかのページは見えない)
6. 同じページの中の「**承認トレイ**」を開き、ブラウザのアドレスバーのURLをコピーする
   (`https://www.notion.so/` の後ろに32文字の英数字が付いた形。`?v=` より後ろは付いていてもよい)
7. Cloudflareのコンソールのプロジェクト(`yamato-basecamp`)→「**設定**(Settings)」→「**変数とシークレット**(Variables and Secrets)」→「**追加**」で2つ入れる
   - `NOTION_TOKEN` … 種類「**シークレット**(Secret)」/ 値:3でコピーした文字列
   - `NOTION_APPROVALS_DB` … 種類「テキスト」/ 値:6でコピーしたURL
   →「**デプロイ**(Deploy)」を押す
8. コンソールの「**データ連携**」→「Notion(承認トレイ)」が「接続OK」になれば完了。承認トレイの上の表示が「DEMO」から「Notion」に変わる

> 押した判断は、Notionの各依頼のページにも「CEOの判断(日時)…」として残る。Claudeは次に承認トレイを処理するとき、これを読んで動く。

---

## 入れる環境変数のまとめ

| 変数名 | 必須 | 種類 | 何に使うか |
|---|---|---|---|
| `CF_ACCESS_TEAM_DOMAIN` | ◯ | テキスト | Accessの検証(これが無いとAPIはデータを返さない) |
| `ALLOWED_EMAILS` | ◯ | テキスト | 見てよいメールアドレス |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | GA4・GSC | シークレット | Googleの認証 |
| `GA4_PROPERTY_ID` | GA4 | テキスト | GA4のプロパティID(数字) |
| `GSC_SITE_URL` | 任意 | テキスト | 既定は `sc-domain:yamato-outdoor.com` |
| `PSI_API_KEY` | 推奨 | シークレット | PageSpeed Insightsの回数制限よけ |
| `PSI_URL` | 任意 | テキスト | 計測するURL。既定はトップページ |
| `MICROCMS_SERVICE_DOMAIN` / `MICROCMS_API_KEY` | microCMS | テキスト / シークレット | 公開・更新の本数 |
| `GITHUB_TOKEN` | 任意 | シークレット | GitHub APIの回数制限よけ |
| `CLARITY_API_TOKEN` | Clarity | シークレット | ClarityのData Export API(1日10回) |
| `BING_API_KEY` | Bing | シークレット | Bing Webmaster ToolsのAPI |
| `BING_SITE_URL` | 任意 | テキスト | Bingに登録したURL。既定は `https://yamato-outdoor.com/` |
| `NOTION_TOKEN` | 承認トレイ | シークレット | Notionのインテグレーション(手順11) |
| `NOTION_APPROVALS_DB` | 承認トレイ | テキスト | 「承認トレイ」データベースのURLかID |

**`LOCAL_DEV_SKIP_ACCESS` は本番に絶対に入れない**(ローカル開発用。入れても localhost 以外では無視するが、念のため)。

---

## うまくいかないとき

| 症状 | 見るところ |
|---|---|
| ビルドが失敗する | Build command・Deploy command の頭に `cd console &&` が付いているか。Project name が `yamato-basecamp`(`console/wrangler.jsonc` の `name`)と同じか |
| URLを開いてもログイン画面が出ない | 手順2の2。シークレットウィンドウで確認 |
| 数字がずっと「—」のまま | 「データ連携」画面の状態。「未設定」なら足りない変数名が出る。環境変数を入れたあと保存(デプロイ)したか |
| 「CF_ACCESS_TEAM_DOMAIN と ALLOWED_EMAILS が未設定です」 | 手順3。「Build」の中の Variables and secrets に入れていないか(そこはビルド用で、コンソールからは読めない) |
| 「このメールアドレスには許可がありません」 | `ALLOWED_EMAILS` とログインしたメールアドレスが一致しているか |
