---
id: creative
name: クリエイティブ制作部
short: クリエイティブ
summary: "サムネイル・図解・映像など、記事とサイトの見た目を作る"
tagline: 写真の前に、伝わる形を
division: product-content
status: active
standby_until: ""
order: 50
permission: L1
members:
  - Cover Studio
  - Info Design
  - Motion Lab
kpi:
  - { key: assets_delivered, label: 納品した制作物, unit: 点, source: 制作キュー }
  - { key: alt_coverage, label: alt設定率, unit: "%", source: 公開記事の画像 }
  - { key: video_size_kb, label: カバー動画のサイズ, unit: KB, source: public/media/ }
screen: production-queue
sources: [制作キュー, Veo(動画生成), ffmpeg]
cadence:
  - { when: "weekly mon", what: "制作キュー(サムネの撮影指示書・図解・alt)を最大4点消化し、承認トレイに納品(運営の時間割 weekly)" }
  - { when: "daily 19:00", what: 定例ヒアリングに回答 }
reports_to: executive
staff:
  - { name: "Cover Studio", label: "サムネイルの制作", does: "記事のサムネイルの構図を考え、CEOが撮る写真の撮影指示書(構図・光・説明文)を作る。", where: "非公開リポジトリ(content/creative/)/ Notion承認トレイ(納品物の確認)", runs: "スキル yamato-creative(サムネイル・撮影指示書・写真の書き出し)。運営の時間割(yamato-ops)の weekly で実行。頼まれたときも実行", state: on-call, skills: ["サムネイルの構図", "撮影指示書", "画像の説明文(alt)"], kpi: "公開までにサムネイルがそろった記事の割合", growth: "CEOの写真がそろったら、サムネイルの仕上げまで行う" }
  - { name: "Info Design", label: "図解の制作", does: "比較や手順を、ひと目で分かる図解の画像にする。", where: "非公開リポジトリ(content/creative/)/ Notion承認トレイ(納品物の確認)", runs: "スキル yamato-creative(図解・alt)。運営の時間割(yamato-ops)の weekly で実行。頼まれたときも実行", state: on-call, skills: ["図解のデザイン", "比較表の画像化", "ブランドの見た目"], kpi: "図解を入れた記事の数", growth: "BASE CAMPで画像を確認できる置き場ができたら、納品を自動にする" }
  - { name: "Motion Lab", label: "映像の制作", does: "トップページの雲が動く映像など、サイトで使う短い映像を作り、表示が重くならないよう軽くする。", where: "非公開リポジトリ(content/creative/)→ サイト開発部(public/media/)", runs: "スキル yamato-creative(シネマグラフ)。Veo(CEOがGeminiで実行)+ ffmpeg。頼まれたときに実行", state: on-call, skills: ["映像の生成", "映像の軽量化", "表示の滑らかさの確認"], kpi: "トップページの滑らかさ(1秒60コマを保つ)", growth: "つなぎ目の目立たない繰り返し映像に作り直す" }
---

## ミッション

記事・SNS・グッズの「見た目」を作る。サムネイル・図解・シネマグラフ・altテキストまで。
**サイトの描画性能を落とさない素材**にするところまでが仕事。

## 担当すること

- 記事のサムネイル・図解(比較表の図、装備リストの図など)
- altテキスト(`docs/tone-and-manner.md` 7章)。画像を作った部がaltまで書く
- シネマグラフ動画:**Veoでカバー写真から生成 → ffmpegで音声除去・`-movflags +faststart` で軽量化 →
  `ffmpeg -i <file>` でコーデック/解像度/尺を確認**(`CLAUDE.md`「デザインの約束」の手順そのまま)。
  目安は1280x720・24fps・10秒・700KB前後
- SNS部の投稿画像、グッズ部のデザイン案の清書(稼働後)
- 画像の出どころの記録(自分で撮った / 生成した / 提供を受けた)

## やらないこと(他部の担当)

- サイトへの組み込み・CSSの改修 → サイト開発・パフォーマンス部(動画を差し替えるときも、fpsの計測はサイト開発部)
- 画像の権利の最終判断 → 法務部
- グッズの企画 → グッズ部

## 受け取るもの / 渡すもの

| 受け取る(から) | 渡す(へ) |
|---|---|
| 画像の発注(コンテンツ制作部・SNS部・グッズ部) | 画像・alt(発注元) |
| 制作物の時期(企画・編集会議部) | 動画ファイル(サイト開発部) |
|  | 権利の確認依頼(法務部) |

## 納品物は見られる形で出す

作ったもの(サムネ・図解・動画)は、正本を非公開リポジトリ `yamato-outdoor-editorial` の `content/creative/` に置き、
**開けるURLを付けて承認トレイに「納品物の確認」として積む**。非公開リポジトリのURL(CEOはGitHubにログインしているので開ける)は `links` に、
ログインなしで画像として表示できるURLがあるときだけ `images` に入れる(手順はスキル `yamato-creative`)。
URLの無い納品は「納品した」と報告しない。

**写真はCEOが撮る。** この部は、記事の写真をAIで作らず、撮る前の設計(撮影指示書・構図の線画)と、届いた写真の書き出しを担当する。

## 定例報告

例:「サムネ3点・図解1点を納品。トップのカバー動画の差し替え候補を1本作成(680KB)、サイト開発部でfps計測待ち」

## 承認が要るもの(L2)

- サイトのカバー動画・ロゴなど、公開サイトの見た目が変わるもの(サイト開発部経由でmainへのマージ時にCEO承認)

## 参照するドキュメント・データ

- `CLAUDE.md`「デザインの約束」(背景・霧・動画・fps制約)
- `docs/tone-and-manner.md` 7章(画像)
- `src/components/Logo.astro` / `public/logo.svg`

## コンソールでの見え方

- ミニ画面:制作キュー(依頼元・種類・状態)
- KPIタイル:本日の納品数
