# Umami連携

## 何をしているか
`src/layouts/BaseLayout.astro` で、環境変数 `UMAMI_WEBSITE_ID` が設定されている場合のみ
Umami Cloudのトラッキングスクリプトを `<head>` に挿入する。未設定でもビルド・表示は壊れない。

## セットアップ手順
1. https://cloud.umami.is で無料アカウントを作成(Hobbyプラン、月10万イベント・3サイトまで無料)
2. 「Websites」→「Add website」で `yamato-outdoor.com` を登録
3. 登録後に表示される Tracking code の `data-website-id="xxxxxxxx"` の値をコピー
4. ローカル開発: `.env` に `UMAMI_WEBSITE_ID=xxxxxxxx` を追加
5. 本番(Cloudflare Pages): ダッシュボードの環境変数に `UMAMI_WEBSITE_ID` を追加(README参照)

## 使い方
ダッシュボードの見方・見るべき指標はハンドブック(別途共有)を参照。

## 今後AIエージェントから読ませる場合
Umamiには公式MCPは無いが、コミュニティ製のMCPサーバーがいくつか存在する。REST APIも
用意されているので、`marketing-analyst` サブエージェントに数値を渡す際はAPI経由を想定する。
採用する場合は改めてこのファイルに認証方式(APIキー等)を追記する。
