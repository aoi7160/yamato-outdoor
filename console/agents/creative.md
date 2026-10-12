---
id: creative
name: クリエイティブ制作部
short: クリエイティブ
tagline: 写真の前に、伝わる形を
division: product-content
status: active
standby_until: ""
order: 50
permission: L1
members:
  - サムネイルAI
  - 図解AI
  - 映像AI
kpi:
  - { key: assets_delivered, label: 納品した制作物, unit: 点, source: 制作キュー }
  - { key: alt_coverage, label: alt設定率, unit: "%", source: 公開記事の画像 }
  - { key: video_size_kb, label: カバー動画のサイズ, unit: KB, source: public/media/ }
screen: production-queue
sources: [制作キュー, Veo(動画生成), ffmpeg]
cadence:
  - { when: "daily 19:00", what: 定例ヒアリングに回答 }
reports_to: executive
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
