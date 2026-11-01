/**
 * アフィリエイト(成果報酬型広告)のリンク先の定義。
 *
 * ここに該当するリンクには、記事本文の加工(`src/lib/article.ts`)で
 *  - `rel="sponsored nofollow"` を付ける(Googleのリンクスパム対策・景品表示法のステマ規制)
 *  - `data-affiliate="<ASP名>"` を付ける(GA4の `click_outbound` に `affiliate_network` として載る)
 *
 * ASPが出したリンクコードは、**中身を変えずにそのまま貼る**(1x1の計測用画像も残す)。
 * もしも・A8とも、リンクコードの改変(文言の変更・リンク部分だけを使うこと)を規約で禁じている。
 * 計測用画像は記事を開いたときにASPへ通信するので、使うASPは `src/lib/analytics.ts` の
 * `AFFILIATE_TRANSMISSIONS` に載せ、`/privacy` で公表する。
 *
 * 人に対する明示は、記事の冒頭に `<p class="pr-notice">` を置く(docs/workflow.md)。
 * **ASPを増やしたらここに1行足す。** 管理コンソールの校閲チェック
 * (`console/server/proofread.js`)にも同じ一覧があり、`cd console && npm test` で
 * ずれていないかを確かめている。
 *
 * ドメインは「そのドメイン自身か、そのサブドメイン」で判定する。
 */
export const AFFILIATE_NETWORKS: { network: string; hosts: string[] }[] = [
  { network: 'amazon', hosts: ['amazon.co.jp', 'amzn.to', 'amzn.asia'] },
  { network: 'rakuten', hosts: ['rakuten.co.jp'] },
  { network: 'yahoo', hosts: ['yahoo.co.jp'] },
  { network: 'moshimo', hosts: ['moshimo.com'] },
  { network: 'a8', hosts: ['a8.net'] },
  { network: 'valuecommerce', hosts: ['valuecommerce.com'] },
  { network: 'accesstrade', hosts: ['accesstrade.net'] },
  { network: 'afb', hosts: ['afi-b.com', 'affiliate-b.com'] },
  { network: 'linkshare', hosts: ['linksynergy.com'] },
  { network: 'rentracks', hosts: ['rentracks.jp'] },
  { network: 'felmat', hosts: ['felmat.net'] },
  { network: 'janet', hosts: ['j-a-net.jp'] },
  { network: 'trafficgate', hosts: ['trafficgate.net'] },
  { network: 'link-a', hosts: ['link-a.net'] },
];

/** 一覧をドメインだけに平らにしたもの(校閲チェックとの突き合わせ用) */
export const AFFILIATE_HOSTS: string[] = AFFILIATE_NETWORKS.flatMap((n) => n.hosts);

const matches = (host: string, domain: string): boolean => host === domain || host.endsWith(`.${domain}`);

/** ホスト名がどのASPのものか。該当しなければ null */
export const affiliateNetworkOf = (host: string): string | null =>
  AFFILIATE_NETWORKS.find((n) => n.hosts.some((d) => matches(host, d)))?.network ?? null;
