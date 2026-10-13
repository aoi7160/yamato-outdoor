# BASE CAMP を公開する(CEO向けの設定手順)

上から順に押していけば終わるように書いてある。Cloudflareの部分(手順1〜3)は**5分**、
Googleの部分(手順4)は**10分**、microCMS(手順5)は1分。手順4・5は後日でもよい
(やるまでは、その数字がデモのまま出るだけ)。

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
この2つが入るまで、GA4などの数字は**出ない**(デモのまま)。

1. チームドメインを確認する:**https://one.dash.cloudflare.com/** →「設定(Settings)」→
   「チーム名とドメイン(Team name and domain)」に出ている `◯◯.cloudflareaccess.com`
2. 手順1のプロジェクト →「設定(Settings)」→「**変数とシークレット**(Variables and Secrets)」→「追加(Add)」

   | 変数名 | 種類 | 値 |
   |---|---|---|
   | `CF_ACCESS_TEAM_DOMAIN` | テキスト | `◯◯.cloudflareaccess.com`(1で確認したもの) |
   | `ALLOWED_EMAILS` | テキスト | Cloudflareにログインしているメールアドレス(複数ならカンマ区切り) |

3. 「デプロイ(Deploy)」を押して保存する(Workersは保存と同時に反映される)

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

**`LOCAL_DEV_SKIP_ACCESS` は本番に絶対に入れない**(ローカル開発用。入れても localhost 以外では無視するが、念のため)。

---

## うまくいかないとき

| 症状 | 見るところ |
|---|---|
| ビルドが失敗する | Build command・Deploy command の頭に `cd console &&` が付いているか。Project name が `yamato-basecamp`(`console/wrangler.jsonc` の `name`)と同じか |
| URLを開いてもログイン画面が出ない | 手順2の2。シークレットウィンドウで確認 |
| 数字がずっとデモのまま | 「データ連携」画面の状態。「未設定」なら足りない変数名が出る。環境変数を入れたあと保存(デプロイ)したか |
| 「CF_ACCESS_TEAM_DOMAIN と ALLOWED_EMAILS が未設定です」 | 手順3 |
| 「このメールアドレスには許可がありません」 | `ALLOWED_EMAILS` とログインしたメールアドレスが一致しているか |
