# 出典(SEO・検索戦略部)

スキルの判断の根拠にした公式ドキュメント。確認方法はすべて `fetch_page.py` でページ本文を開いて確認。
**半年に1回、またはGoogleのコアアップデートの告知があったら開き直す。** 内容が変わっていたらスキルの該当の節を直す提案をする。

| 何の根拠か | 要点(本文から) | URL | 種別 | 確認日 |
|---|---|---|---|---|
| LLMO(3-8)・AI流入の数え方(3-9) | AI Overviews・AI Modeに出るための追加の要件や特別な最適化は無く、SEOのベストプラクティスがそのまま当てはまる。AI機能経由のトラフィックはSearch Consoleの検索パフォーマンス「ウェブ」の合計に含まれる | https://developers.google.com/search/docs/appearance/ai-features?hl=en | 一次(Google) | 2026-11-01 |
| 段階戦略・量産しない(3-1・8章) | 生成AIなどで、利用者に価値を足さずに多数のページを作ることはスパムポリシー「大量生成コンテンツの不正使用(Scaled content abuse)」の例。作り方は問わない | https://developers.google.com/search/docs/essentials/spam-policies?hl=en | 一次(Google) | 2026-11-01 |
| 同上(アフィリエイトの扱い) | 同ページのサイトの評判に関するポリシーで、「適切に扱われた(rel付きの)アフィリエイトリンクをページ内に置くこと」は違反の例に当たらないと明記 | https://developers.google.com/search/docs/essentials/spam-policies?hl=en | 一次(Google) | 2026-11-01 |
| 平均掲載順位・CTRの定義(3-7・3-9) | 掲載順位は1が最上位の相対的な位置。CTR=クリック÷表示回数。データは正規URLに集計される | https://support.google.com/webmasters/answer/7042828?hl=en | 一次(Google) | 2026-11-01 |
| 人のためのコンテンツ | Googleの「有用で信頼性の高い、ユーザー第一のコンテンツの作成」。設計書の「誰に・なぜ」の根拠 | https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=en | 一次(Google) | 2026-11-01(目次の取得のみ。本文の引用はしていない) |

## 採用しなかった数字

- **掲載順位ごとのCTRの業界平均**:調査会社ごとに1位のCTRが2割前後〜4割弱まで割れ、同じ調査でもSERPの形で大きく振れる(2026-11-01の検索結果の要約のみ。原典は開いていない)。
  原典を確かめていないため事実として書かず、SKILL 3-7では「この部の運用値」として下限寄りの暫定基準を置いた。自サイトの数字がたまったら置き換える
