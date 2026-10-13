---
name: business-report
description: YAMATO OUTDOORの事業報告部の仕事一式。月次P&L(売上・費用・作業時間)の集計、月次事業報告書(社内版)、投資家・金融機関向けの事業報告書(対外版)、事業計画書の清書をPDFで作る。「事業報告書」「月次報告」「P&L」「収支」「事業計画書」「投資家向け」「金融機関向け」「登頂記録を報告書に」と言われたら使う。
---

# 事業報告部のスキル

事業報告部(`console/agents/reporting.md`)の手順・書式・過去の失敗をまとめた**知識のDB**。
報告書の品質を毎回同じにするため、作る前に必ずこの順で読む。

1. このファイル(全体の流れ)
2. 作る文書の書式:社内版 `references/style-internal.md` / 対外版 `references/style-external.md` / 計画書 `references/style-plan.md`
3. `references/lessons.md`(過去の失敗。同じことをしない)
4. 出す前に `references/checklist.md`

## 何を作るか

| 依頼 | 文書 | テーマ | ひな形 |
|---|---|---|---|
| 「◯月の報告書」「月次報告」 | 月次事業報告書(社内版)+ 月次P&L | internal | `templates/monthly-internal.json` |
| 「投資家に見せる」「金融機関向け」「対外用」 | 事業報告書(対外版) | external | `templates/external-period.json` |
| 「事業計画書」 | 事業計画書 | internal(対外なら external) | `references/style-plan.md` の構成 |
| 「P&Lを付けて」「収支」 | 月次P&Lだけ | — | `scripts/pl.py` の出力(Markdown) |

**読み手が分からないときは聞く**(社内か、投資家・金融機関か)。書き方も載せる情報も変わる。

## 標準の流れ(月次)

```
1. 事実を集める
   - やったこと : python3 scripts/git_activity.py <月初> <月末> --json act.json   (全ブランチ・日本時間)
   - お金と時間 : NotionのP&L台帳・作業時間ログをCSVで書き出す → python3 scripts/pl.py <フォルダ> <YYYY-MM>
   - 数字       : データ分析部の確定値(GA4・GSC・ASP・SUZURI)。BASE CAMPの「DEMO」は使わない
   - 山行       : Notionの山行DB(写真は受け取ったらすぐ保存を確認)
   - 方針       : 経営企画の案のうちCEOが承認したもの
   → 取れなかったものは「未確認」としてCEOに聞く。推測で埋めない
2. 構成ファイル(JSON)を書く
   - ひな形を作業用フォルダに複製し、◯ を埋める。写真は作業用フォルダの photos/ に置く
   - 文章は style-*.md に従う(対外版は言い換え表を必ず通す)
3. PDFにする
   - python3 scripts/report_pdf.py <spec.json>
   - python3 scripts/preview.py <out.pdf>  → 画像をReadで開いて、全ページを目で見る
4. チェックリスト(references/checklist.md)を上から確認
5. 承認トレイへ(P&Lの確定・対外版の送付はCEOの承認が要る。送るのはCEO本人)
6. PDFと構成ファイルをNotionの報告書アーカイブへ。新しい失敗があれば lessons.md に1行足してコミット
```

## 守ること(要点。詳細は各referenceに)

- **盛らない・漏らさない・出どころを残す。**お金の数字は台帳か確定値にあるものだけ
- 実データ(売上・費用・時間・写真)は**公開リポジトリに入れない**(このリポジトリは public)。置き場所はNotion
- P&Lは管理会計。計上は確定ベース、自分の人件費は入れず「時間あたり利益」で見る(`references/pl-definition.md`)
- CEOが言った目標は勝手に変えない。難しい点は見立てとして書く
- 対外版は「である調・(1)①■・実績:・写真とキャプション・活動の表」。社内の言葉を出さない
- 日付は日本時間。GitHubの時刻(UTC)は+9時間
- 図は凡例と数値ラベル付き・2系列まで。配色は `report_pdf.py` に固定(色覚多様性の検証済み)

## スクリプト

| ファイル | 役割 |
|---|---|
| `scripts/report_pdf.py` | JSONの構成ファイル → PDF。ブロック:h1 h2 h3 p ind sq result note bullets table photos image kpis bars hbars box spacer pagebreak |
| `scripts/preview.py` | PDF → 全ページを並べた画像(レイアウト確認用) |
| `scripts/pl.py` | 台帳のCSV → 月次P&L(Markdown / JSON)。不正な行・未回収の領収書も出す |
| `scripts/git_activity.py` | 全ブランチの作業を期間で集計(日別・未マージのブランチ) |

必要なもの:`pip install reportlab pypdfium2 pillow`。動作確認は `examples/ledger-sample/`(架空のデータ)で
`python3 scripts/pl.py examples/ledger-sample 2099-01` → 営業利益 ¥1,000・作業時間10.5時間になれば正しい。

## 構成ファイル(JSON)の書き方

```json
{
  "theme": "external",
  "output": "out.pdf",
  "title": "2026年◯月 事業報告書",
  "period": "2026年◯月1日 〜 2026年◯月◯日",
  "org": "アウトドアメディア YAMATO OUTDOOR",
  "blocks": [
    {"type": "h1", "text": "1　事業の成果"},
    {"type": "p", "text": "当期は、…"},
    {"type": "result", "text": "実績：…"},
    {"type": "table", "header": ["形態", "時期"], "widths": [20, 150], "rows": [["取材", "8月"]], "numeric_cols": [], "total_rows": []},
    {"type": "photos", "height": 60, "col_width": 50, "items": [["photos/a.jpg", "キャプション"]]},
    {"type": "bars", "title": "…", "series": ["系列1", "系列2"], "data": [["8/17", 3, 2]]},
    {"type": "hbars", "title": "…", "unit": "h", "data": [["記事", 12]]},
    {"type": "kpis", "items": [["¥12,000", "営業利益"]]},
    {"type": "box", "title": "見立て", "items": ["…"]}
  ]
}
```

- 表の列幅(mm)の合計は170以下。超えるとスクリプトが止まる
- 画像が無いとスクリプトが止まる(黙って抜かない)
- `\n` はセル内の改行になる。`<b>…</b>` はゴシック体(太字の代わり)
