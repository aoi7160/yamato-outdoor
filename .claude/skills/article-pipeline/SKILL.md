---
name: article-pipeline
description: YAMATO OUTDOORの記事制作パイプラインを1記事分実行する。企画→調査→執筆→トンマナ確認→事実確認→最終チェックを専用エージェントに順番に任せ、合格・保留の記事だけをmicroCMSの下書きに回して、運営者向けシートを作る。「次の記事を作って」「パイプラインを回して」「/article-pipeline」で使う。
---

# 記事制作パイプライン(1記事分)

引数: `[スラッグまたは主対策KW] [--trial]`
- 記事を指定しなければ、企画担当がコンテンツマップから選ぶ
- `--trial` は試運転。全工程の出力ファイルの要点を、最後にまとめて運営者に見せる

## 0. 始める前に

1. `CLAUDE.md` と `docs/content-pipeline/README.md`(設計と決定事項)と `docs/content-pipeline/rules.md` を読む
2. 作業フォルダ `../yamato-outdoor-editorial/content/` と `../yamato-outdoor-editorial/content/content-map.md`・`../yamato-outdoor-editorial/content/experience-log.md` があることを確認する。
   作業フォルダは**非公開リポジトリ** `aoi7160/yamato-outdoor-editorial` にある(このリポジトリはpublicなので、下書き・取材の回答・実体験の記録を置かない)。
   - 無ければ、セッションに `aoi7160/yamato-outdoor-editorial` を追加して、このリポジトリと同じ階層(`../yamato-outdoor-editorial`)にcloneする
   - 追加できなければ止めて運営者に伝える。**作業フォルダをこのリポジトリの中に作って代用しない**
3. `docs/content-pipeline/style-guide.md` 11「確認待ちの矛盾」に未決定の項目があれば、最後の報告で一覧にする(止める必要はない)

## 1〜6. 工程

各工程はAgentツールで専用エージェントに任せる。プロンプトには**スラッグと作業フォルダのパスだけ**を渡し、
エージェントには自分の指示ファイル(`.claude/agents/*.md`)に従わせる。
**自分で本文を書いたり直したりしない。** 受け渡しはすべてファイルで行う。

| # | エージェント | 入力 | 出力 | 次へ進む条件 |
|---|---|---|---|---|
| 1 | `article-planner` | content-map / experience-log | `00-brief.md`(+ `interview.md`) | 判定が「着手する」 |
| 2 | `article-researcher` | 00 / interview | `01-design.md` | 疑問リスト・見出し構成表・出典表がそろっている |
| 3 | `article-writer` | 01 / interview | `02-draft.md` `02-draft-selfcheck.md` | 自己点検の「体験の文」と「対応付けた数」が一致 |
| 4 | `article-style-editor` | 02 | `03-styled.md` `03-style-notes.md` | 出力が2つともある |
| 5 | `article-fact-checker` | 01 / interview / 03 | `04-checked.md` `04-factcheck.md` | 照合表に未処理が無い |
| 6 | `article-final-checker` | 00〜04 | `05-final-check.md`(+ `06-operator-sheet.md`) | 合否が出ている |

ファイルはすべて `../yamato-outdoor-editorial/content/pipeline/<スラッグ>/` に置く。

**次へ進む条件を満たさなければ、同じエージェントにもう一度だけやり直させる。**
2回目も満たさなければ止めて、何が足りないかを運営者に報告する。

### 差し戻し

最終チェックが「差し戻し」を出したら、05に書かれた工程からやり直す(その後の工程も全部やり直す)。
**差し戻しは1記事につき2回まで。** 3回目が必要なら止めて、05の理由を添えて運営者に渡す。

## 7. microCMSへの下書き保存(合格・保留のときだけ)

保存方法は `docs/content-pipeline/README.md`「決定事項」に従う。決定前・手段が使えないときは
**保存しない**で、`06-operator-sheet.md` の冒頭に「microCMS: 未保存(手動で貼り付け)」と書き、
貼り付ける値(タイトル・スラッグ・概要・カテゴリ・タグ・faq・review系・contentHtml)を
06の末尾に「貼り付け用」として出す。

どの方法でも守ること(`rules.md` R4):

- `status=draft` だけ。公開しない
- 同じスラッグの記事が既にあれば保存しない
- `reviewRating` は空

## 8. 後片付け

1. `../yamato-outdoor-editorial/content/content-map.md` の状態を更新する:
   合格 → `公開待ち` / 保留 → `実体験待ち` / 止めた → `制作中(停止:理由)`
2. 非公開リポジトリ(`../yamato-outdoor-editorial`)の変更を `main` にコミットしてpushする
3. 公開リポジトリ側に変更があった場合だけ(`correction-log.md` など)、`CLAUDE.md` のブランチ運用に従ってコミットする

## 9. 運営者への報告

短く、この順で。

1. 記事名と判定(合格 / 保留 / 差し戻しで停止)
2. `06-operator-sheet.md` の「あなたが埋める箇所」の件数と、最初の3件
3. 運営者に選んでほしいこと(締め・タイトル案など)
4. 確認待ちの矛盾(未決定のものがあれば)

`--trial` のときは、これに加えて工程1〜6の出力ファイルそれぞれについて
「何を判断したか」を3行ずつ添え、ファイルへのパスを示す。
