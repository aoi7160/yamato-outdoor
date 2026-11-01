# 起動用プロンプト

新しいClaude Codeのセッションで、記事制作パイプラインを動かすときに貼るプロンプト。
仕組みの詳細はリポジトリ側(`docs/content-pipeline/`・`.claude/`)にあるので、
プロンプトは短く、**状況とその日のゴールだけ**を伝える。

---

## A. 構築を再開するとき(決定事項を伝えて、組み込みまで進める)

```
YAMATO OUTDOORの記事制作パイプラインの構築を再開してください。

まず次を読んでください。
- CLAUDE.md
- docs/content-pipeline/README.md(設計書。10の決定事項は下に書きます)
- docs/content-pipeline/rules.md / style-guide.md / correction-log.md
- .claude/agents/article-*.md と .claude/skills/article-pipeline・article-learn

決定事項:
- D1 作業フォルダ: 
- D2 microCMSへの保存: 
- D3 実行方法: 
- D4 通信の許可: 
- D5 コンテンツマップ: 
- D6 トンマナの矛盾 C1〜C10: 
- D7 公開済み記事の設計書の置き場所: 
- D8 目印入り記事をビルドで除外する: 

やってほしいこと:
1. 決定事項をREADMEと各ファイルに反映する(矛盾が解消した項目は style-guide.md 11 から消し、tone-and-manner.md を直す)
2. 決定に必要な組み込み(保存方法・実行方法・安全装置)を実装する
3. 実装前に、変更内容の一覧を見せて承認を取る
4. 承認後、1本目を /article-pipeline <記事> --trial で試運転し、全工程の出力を見せる

ルール:
- docs/content-pipeline/rules.md に反する出力は不合格(特にR1 実体験の境界)
- 推測で決めない。分からないことは質問する
- microCMSには下書きとしてのみ保存する
```

## B. いつもの1本(継続運用)

```
/article-pipeline
```

記事を指定するときは `/article-pipeline 岩湧山 登山` のように主対策KWかスラッグを付ける。

## C. 公開したあと

```
/article-learn <スラッグ>
```

公開版の `contentHtml` を作業フォルダの `90-published.html` に貼ってから実行する。

---

## 元のプロンプトから変えた点

| 元のプロンプト | 変更 | 理由 |
|---|---|---|
| 「リポジトリ内のルールの場所をまず探して確認」 | 読むファイルを名指し | 探す手間と、見落としを無くす |
| 「トンマナ基準書(style-guide.md)を書き出す」 | 作成済み(`style-guide.md`)。以後は `/article-learn` で育てる | 毎回書き直すと基準が揺れる |
| 「実測値・体験・感想はAIが作らない」 | 「付け足し」の7種類と判定テストまで具体化(rules R1-2) | 「作らない」だけでは、回答を膨らませる過程の付け足しを防げない |
| 「事実は出典URLを残す」 | ソース種別と確認方法(ページを開いたか)を必須に(R2-2・R2-3) | 検索結果の要約だけで確認した数字を防ぐ |
| 「下書き(Markdown)」 | フロントマター+HTML本文 | microCMSの `contentHtml` に変換なしで入れるため |
| 記載なし | リポジトリがpublicである前提を追加(README 3-1) | 未公開の下書き・実体験記録が誰でも読める状態を避ける |
| 記載なし | 実行環境の通信制限を前提に追加(README 7-0) | 現在の環境ではメーカー公式のページも開けない |
