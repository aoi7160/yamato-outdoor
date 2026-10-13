# データの取り方

報告書の事実は、すべてここに書いた場所から取る。**記憶や推測で書かない。**取れなかったものは
「未確認」と書いてCEOに聞く。

---

## 1. やったこと(リポジトリ)

```bash
python3 .claude/skills/business-report/scripts/git_activity.py 2026-10-01 2026-10-31 --json /tmp/act.json
```

- 全ブランチを `git fetch --all` してから、日本時間で日付を切って集計する
- **未マージのブランチも必ず見る**(デザイン試作・ロードマップなど、公開サイトに出ていない作業が残る)
- 出力の `by_day` は `report_pdf.py` の `bars` ブロックの `data` にそのまま使える
- 1件ずつの内容は `git show --stat <hash>` で確認。件名だけで「何をしたか」を書かない(件名が英語・抽象的なことがある)

Pull Request:

```bash
gh api "repos/aoi7160/yamato-outdoor/pulls?state=all&per_page=100" --jq '.[] | [.number, .title, .merged_at] | @tsv'
```

`merged_at` は**UTC**。報告書には日本時間(+9時間)で書く。15:00 UTC以降のマージは翌日の日付になる。

## 2. 数字

| 数字 | 出どころ | 誰から受け取るか |
|---|---|---|
| PV・流入元・CV | GA4(BASE CAMPのデータ連携) | データ分析部の確定値 |
| 検索順位・クリック | Search Console / Bing | データ分析部(順位の解釈はSEO部) |
| アフィリエイトの発生・確定 | 各ASPの管理画面 | アフィリエイト部 → データ分析部が確定 |
| SUZURIの売上 | SUZURIの売上明細 | グッズ部 → データ分析部が確定 |
| 費用 | 費用台帳(Notion)・領収書 | CEO |
| 作業時間 | 作業時間ログ(Notion) | CEO |
| 公開記事数 | microCMS(BASE CAMPのデータ連携) | コンテンツ制作部 |

デモの数字(BASE CAMPに「DEMO」と出ているもの)は報告書に**絶対に使わない**。

## 3. 計画・方針

- 事業ロードマップ:`git show origin/claude/media-roadmap-creation-6fiko8:docs/roadmap.md`(読むだけ。mainに入れない)
- 理念・想定読者:`docs/persona.md`(対外版の理念はここから一字一句そのまま)
- 直近の事業計画書:Notion「YAMATO BASE CAMP」/ 報告書アーカイブ
- サイトの仕組みの説明:`CLAUDE.md`、`docs/analytics.md`、`docs/workflow.md`

## 4. 山行(登頂記録)

- Notionの山行DB:山名・標高・日付・場所・参加人数・天気・ルート・使ったギア・写真・メモ
- 標高は国土地理院の値(山頂標識の値と違うときは標識の値を併記しない。国土地理院を正とする)
- **写真から読み取ったこと(天気・人数・岩場など)は推測**。下書きに書いたらCEOに確認してから確定する
- 写真はチャットで受け取ったら、すぐにファイルとして保存されているか確認する(lessons.md 3)

## 5. サイトの画面写真

公開サイト(yamato-outdoor.com)には、クラウドの作業環境からは接続できないことがある。その場合は手元でビルドして撮る。

```bash
npm ci && npm run build                          # microCMSの鍵が無くてもビルドは通る(カテゴリは「準備中」表示)
cd dist/client && python3 -m http.server 4321 &   # 配信
# Playwright(グローバル導入済み)で 1280×800 と 390×844(スマホ・2倍)を撮る
```

- Google Fontsが読み込めない環境では書体が置き換わる。**トップとジャンルページは見た目がほぼ変わらないので使える。
  Aboutは崩れるので使わない**
- 撮影の台本の例:このスキルの `scripts/` ではなく作業用フォルダに書く(撮影は報告書ごとに1回きりのため)

## 6. 置き場所(どこに何を残すか)

| もの | 置き場所 | 理由 |
|---|---|---|
| 書式・ルール・スクリプト(このスキル) | リポジトリ(`.claude/skills/business-report/`) | 公開されても困らない。品質を毎回同じにするため |
| P&L台帳・作業時間・山行・写真 | Notion「YAMATO BASE CAMP」 | 公開リポジトリに置かない(売上・個人の写真) |
| 完成したPDF | Notionの報告書アーカイブ(月ごとのページに添付) | 同上 |
| 報告書の構成ファイル(JSON) | 作業用フォルダ → 完成後はPDFと一緒にNotionへ | 次の月に複製して使う |
