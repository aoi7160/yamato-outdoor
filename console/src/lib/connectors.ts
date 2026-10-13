/**
 * データ連携の一覧(画面の「データ連携」に出る)。
 *
 *   live      … つないである(API)。環境変数を入れれば動く。サーバー側は server/connectors.js
 *   csv       … CSV / 手入力(ASP・SUZURIの売上。lib/sources.ts)
 *   candidate … つなげられるが、まだつないでいない(次の候補)
 *
 * 「どんどんつなげる」方針。新しくつなぐときは、server/connectors.js に処理を足し、
 * ここの kind を live にして、scripts/real.ts で画面の数字に割り当てる。
 */
export type ConnectorKind = 'live' | 'csv' | 'candidate';
export type ConnectorMethod = 'API' | 'MCP' | 'CSV' | '手入力';

export type Connector = {
  id: string;
  name: string;
  kind: ConnectorKind;
  method: ConnectorMethod;
  /** どの部の、何の数字になるか */
  feeds: string;
  /** つなぐのに要るもの(費用・アカウント・環境変数) */
  needs: string;
  /** console/SETUP.md の見出し(つなぎ方) */
  setup?: string;
};

export const CONNECTORS: Connector[] = [
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    kind: 'live',
    method: 'API',
    feeds: 'データ分析部:PV・自然検索の割合・soft CV・よく読まれた記事',
    needs: '無料。サービスアカウント+ GA4_PROPERTY_ID',
    setup: '手順4 Google(GA4・Search Console・PageSpeed)',
  },
  {
    id: 'gsc',
    name: 'Google Search Console',
    kind: 'live',
    method: 'API',
    feeds: 'SEO・検索戦略部:10位以内のクエリ数・クリック・表示回数(直近7日)',
    needs: '無料。GA4と同じサービスアカウント',
    setup: '手順4 Google(GA4・Search Console・PageSpeed)',
  },
  {
    id: 'psi',
    name: 'PageSpeed Insights',
    kind: 'live',
    method: 'API',
    feeds: 'サイト開発部:LCP・INP・CLS(実ユーザー値が無い間はラボ値)',
    needs: '無料。APIキーなしでも動くが、回数制限に当たりやすいので PSI_API_KEY 推奨',
    setup: '手順4 Google(GA4・Search Console・PageSpeed)',
  },
  {
    id: 'microcms',
    name: 'microCMS',
    kind: 'live',
    method: 'API',
    feeds: 'コンテンツ制作部:本日の公開・更新本数・最近更新した記事',
    needs: '無料。公開サイトと同じ MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY',
    setup: '手順5 microCMS',
  },
  {
    id: 'github',
    name: 'GitHub(mainのビルド結果)',
    kind: 'live',
    method: 'API',
    feeds: 'サイト開発部:mainの最新コミットとCloudflare Pagesのビルド成否',
    needs: '不要(公開リポジトリ)。設定なしで動く',
  },
  {
    id: 'asp',
    name: 'ASP各社(A8.net・もしも・バリューコマース・アクセストレード・Amazon・楽天)',
    kind: 'csv',
    method: 'CSV',
    feeds: 'アフィリエイト部:発生額・件数',
    needs: '成果を取り出すAPIがどこにも無い → 管理画面のCSVを取り込む',
  },
  {
    id: 'suzuri-sales',
    name: 'SUZURI(売上)',
    kind: 'csv',
    method: '手入力',
    feeds: 'グッズ部:トリブン・販売点数',
    needs: 'APIで売上は取れない → 手入力',
  },
  {
    id: 'ahrefs',
    name: 'Ahrefs',
    kind: 'candidate',
    method: 'MCP',
    feeds: 'SEO・検索戦略部:順位追跡・被リンク・AI回答での引用(Brand Radar)',
    needs: 'Claudeに接続済み。各部の定例をClaudeで定期実行するとき(Phase 2)に使う',
  },
  {
    id: 'suzuri-api',
    name: 'SUZURI API(アイテム数)',
    kind: 'candidate',
    method: 'API',
    feeds: 'グッズ部:販売中のアイテム数',
    needs: '無料。SUZURI Developer でアクセストークンを発行',
  },
  {
    id: 'clarity',
    name: 'Microsoft Clarity',
    kind: 'candidate',
    method: 'API',
    feeds: 'データ分析部:デッドクリック・レイジクリック・スクロールの深さ',
    needs: '無料(Data Export API・1日10回まで)。Clarityの導入が先',
  },
  {
    id: 'bing',
    name: 'Bing Webmaster Tools',
    kind: 'candidate',
    method: 'API',
    feeds: 'SEO・検索戦略部:Bing / Copilot 経由の検索の数字',
    needs: '無料。Bing Webmaster ToolsでAPIキーを発行',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare(デプロイ履歴・Web Analytics)',
    kind: 'candidate',
    method: 'API',
    feeds: 'サイト開発部:デプロイ履歴 / データ分析部:Cookieなしのアクセス数',
    needs: '無料。読み取り専用のAPIトークン',
  },
  {
    id: 'line',
    name: 'LINE公式アカウント',
    kind: 'candidate',
    method: 'API',
    feeds: 'コミュニティ部:友だち数・ブロック数',
    needs: '無料(Messaging API)。LINE公式アカウントの開設が先',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    kind: 'candidate',
    method: 'API',
    feeds: 'SNS部:フォロワー・保存数・リーチ',
    needs: '無料(Graph API)。プロアカウント+Facebookページが必要',
  },
  {
    id: 'x',
    name: 'X',
    kind: 'candidate',
    method: 'API',
    feeds: 'SNS部:フォロワー・インプレッション',
    needs: 'APIは有料。費用に見合うかはSNS部の稼働後に判断',
  },
  {
    id: 'slack-notion-calendar',
    name: 'Slack / Notion / Googleカレンダー',
    kind: 'candidate',
    method: 'MCP',
    feeds: '経営企画:日報の送り先・編集会議の予定',
    needs: 'Claudeに接続済み。日報をどこで受け取りたいか決めればつなげる',
  },
];
