# ADR 0001: 事業基盤OSSの採用方針

- 日付: 2026-08-22
- ステータス: 採用

## 決定

Paperclip / agency-agents / agency-talent / OpenMontage / Activepieces / Listmonk / Twenty / Umami / Flowise
の9件(agency-agentsの派生含む)を調査し、以下の通り判定した。

| OSS | 判定 |
|---|---|
| agency-agents | 採用。`.claude/agents/` にペルソナを翻案して配置 |
| Umami | 採用。Umami Cloud無料Hobbyプランで開始 |
| Activepieces | 現時点では不採用。`docs/architecture.md` の症状が出たら再評価 |
| Twenty(CRM) | 現時点では不採用。同上 |
| Listmonk | 現時点では不採用。同上 |
| OpenMontage | 現時点では不採用。同上 |
| Paperclip | 不採用。組織運営メタファーが現体制(実質1人+友人3名)には過剰、かつ常駐サーバーが必要 |
| agency-talent | 不採用。本家agency-agentsの低活性な派生で、ライセンス表記も不明瞭 |
| Flowise | 不採用。2026-08-13に開発元がリポジトリをアーカイブ(サービス終了)しているため新規採用の対象外 |

## 経緯

年間固定費をできるだけ抑えたい方針のもと、「OSSだから使う」ではなく実際の事業フェーズから逆算して判定した。
現時点(記事0本、案件0件)で常駐サーバー・DBを必要とするツールを入れる理由が無いため、
サーバー不要かつ無料で始められる2件(agency-agents, Umami)のみを採用し、残りは
`docs/architecture.md` に「症状ベースのトリガー」として記録し、必要になった時点で
再調査する方針にした。

## 再評価する時の注意

このADRの判定は2026年8月時点の調査に基づく。スター数・ライセンス・MCP対応状況などは
変化が速い分野なので、再評価する際は必ず最新情報を確認し直すこと。特にStage 2・3で
名前が挙がっているツールは「例」であって「決定」ではない。
