# 出典(編集長・校閲部)

記事への当てはめ(`SKILL.md` 3-4)の根拠。**ルールの正は法務部**(`.claude/skills/yamato-legal/rulebook.md` と同じフォルダの `sources.md`)で、
ここには校閲部が当てはめのときに自分で開いて確かめたものだけを置く。確認方法はすべて `fetch_page.py` でページ本文を開いて確認。
法務部の出典と食い違ったら、法務部に確認を依頼する(自分で解釈を決めない)。

| 何の根拠か | 要点(本文から) | URL | 種別 | 確認日 |
|---|---|---|---|---|
| ステマ規制の施行と対象 | 令和5年10月1日からステルスマーケティングは景品表示法違反。規制されるのは広告主(商品・サービスを供給する事業者)で、依頼を受けたインフルエンサー等の第三者は対象外 | https://www.caa.go.jp/policies/policy/representation/fair_labeling/stealth_marketing/ | 一次(消費者庁) | 2026-11-01 |
| アフィリエイトサイトの冒頭表示(C1の「小さい・薄いは不可」の根拠) | Q13:冒頭に「アフィリエイト広告を利用しています」等と書いても、文字のサイズや色も踏まえて一般消費者に明瞭であることが必要 | https://www.caa.go.jp/policies/policy/representation/fair_labeling/faq/stealth_marketing/ | 一次(消費者庁) | 2026-11-01 |
| 規制の対象者 | Q1:規制対象は表示内容の決定に関与した事業者(広告主)。アフィリエイターは原則対象外(広告主と共同して供給する例外あり) | 同上 | 一次(消費者庁) | 2026-11-01 |
| 優良誤認・有利誤認(C3・B4) | 優良誤認(5条1号):品質・規格などを実際より著しく優良と示す表示。有利誤認(5条2号):価格・取引条件を著しく有利と誤認させる表示。性能の表示は合理的な根拠の提出を求められうる(不実証広告規制) | https://www.caa.go.jp/policies/policy/representation/fair_labeling/representation_regulation/ | 一次(消費者庁) | 2026-11-01 |
| レビューの質(D3・A1の考え方) | Googleのレビュー記事のガイダンス:自分の体験の証拠を示す・定量的な測定値・利点と欠点を自分の調査に基づいて・前のモデルからの変化 | https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews?hl=en | 一次(Google) | 2026-11-01 |

## 確かめられなかったもの

- 消費者庁の告示本文・運用基準のPDF(`…/stealth_marketing/assets/…pdf`)は2026-11-01に403で取得できなかった。運用基準の節番号の引用は法務部のルールブックに従う
