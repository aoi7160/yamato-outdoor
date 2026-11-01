# クリエイティブ制作部 —— 出典と確認日

規格・ルールの根拠。値が変わっていないかは、使う前に見直す(とくにSNSの仕様は変わりやすい)。
ページ本文は `python3 -I .claude/skills/article-pipeline/fetch_page.py <URL> [語…]` で取る。

## サイト側の事実(リポジトリで確認・2026-11-01)

| 事実 | 場所 |
|---|---|
| サムネイルは記事ページで `width=1600 height=900`・`alt=記事タイトル`・`fetchpriority="high"` で描画される | `src/layouts/ArticleLayout.astro` |
| サムネイルが `og:image` になり、`twitter:card` は `summary_large_image` | `src/layouts/BaseLayout.astro` |
| 主写真に `saturate(0.86) contrast(1.04) brightness(0.92)` をかけ、下45%に暗いグラデーション(最大0.85)を重ねる | `src/styles/article.css` の `.article-figure` |
| 本文の画像は表示幅40rem(スマホは100vw)。microCMSの画像はWebP・srcset・遅延読み込みが自動で付く | `src/lib/article.ts` |
| 色とフォント(`--base` `#080b10` / `--ink` `#e7e5df` / `--ember-soft` `#4caf6e` ほか) | `src/styles/global.css` の `:root` |
| 承認トレイの `images` は `https:` のURLだけを表示し、`<img>` として読み込む(`data:` は捨てる) | `console/src/scripts/approvals.ts` / `console/src/pages/approvals.astro` |
| 現行のカバー動画:h264 High・1280x720・24fps・10秒・667,252バイト | `ffprobe public/media/hero/01-mist.mp4`(この部で測定) |

## 外部の規格

| 項目 | 内容 | 出典 | 確認日 |
|---|---|---|---|
| Discoverの画像 | 幅1,200px以上・16:9を推奨。`max-image-preview:large` かAMPで大きい画像が出る。サイトのロゴを `og:image` に使わない | https://developers.google.com/search/docs/appearance/google-discover | 2026-11-01 |
| 画像のalt | 情報に富む内容に。キーワードの羅列はスパムとみなされうる。CSSの背景画像はインデックスされない | https://developers.google.com/search/docs/appearance/google-images | 2026-11-01 |
| Facebookのリンクの画像 | 1200×630px以上、アスペクト比は1.91:1に近いほど切れない、8MB以下 | https://developers.facebook.com/docs/sharing/webmasters/images/ | 2026-11-01 |
| Xの summary_large_image | 2:1、最小300×157・最大4096×4096(旧開発者ページ。現行の docs.x.com の該当ページは取得できず。5MBの上限は第三者の情報のみで**未確認**) | https://dev.twitter.com/cards/types/summary-large-image.html(検索結果で確認) | 2026-11-01 |
| AIと著作権 | 文化審議会 著作権分科会 法制度小委員会「AIと著作権に関する考え方について」(令和6年3月)。判断は法務部 | https://www.bunka.go.jp/seisaku/chosakuken/aiandcopyright.html | 2026-11-01 |
| 生成AIの使用禁止ポリシー(Google) | Veo(Gemini)で作る動画に適用される | https://policies.google.com/terms/generative-ai/use-policy | 2026-11-01 |
| フォント | Zen Kaku Gothic New / Zen Old Mincho / Schibsted Grotesk はGoogle FontsのOFL | https://github.com/google/fonts(`ofl/` 以下) | 2026-11-01 |

## この部の運用値(外部の統計ではない)

- 図解の最小の文字36px(1080幅)・ラベル12個・ブロック7個・差し色1か所:スマホ幅360pxで12px相当を確保するための社内の初期値
- 継ぎ目のSSIM 0.90:現行の動画(0.79)とクロスフェード版(0.97)の測定から置いた社内の初期値。実機で跳びが見えたら見直す
- サムネの主役の帯(上から25〜55%):記事ページのグラデーション(下45%)から逆算した値
