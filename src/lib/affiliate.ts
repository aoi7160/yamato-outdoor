/**
 * アフィリエイト(成果報酬型広告)のリンク先の定義。
 *
 * ここに該当するリンクには、記事本文の加工(`src/lib/article.ts`)で
 *  - `rel="sponsored nofollow"` を付ける(Googleのリンクスパム対策・景品表示法のステマ規制)
 *  - `data-affiliate="<ASP名>"` を付ける(GA4の `click_outbound` に `affiliate_network` として載る)
 *  - ASPの表示回数計測用の1x1画像は外さない(下の「インプレッション画像」参照)
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

/**
 * インプレッション画像(ASPがリンクコードに同梱してくる1x1の計測用画像)か。
 *
 * A8.net・もしも・バリューコマースなどのリンクコードには、表示回数を数えるための
 * 1x1画像が付いてくる。以前は外部送信と表示の重さを避けるために本文の加工で外していたが、
 * もしも・A8.netは「広告コードからリンク部分のみを使用すること」「HTMLソースの一部を変更すること」を
 * 改変として禁じている(2026-11-01確認。support.a8.net の FAQ 2005/08/post_25・post_26、af.moshimo.com のヘルプと規約)。
 * そのため、この画像は**発行されたまま残す**(`src/lib/article.ts` は見分けて触らないだけ)。
 * 記事を開いただけでASPへ送信が起きるので、使っているASPは `src/lib/analytics.ts` の
 * `AFFILIATE_TRANSMISSIONS` に載せて `/privacy` で公表する。
 *
 * ASPのバナー画像(1x1でないもの)は外さない。**バナーは使わない**運用にしている
 * (デザインの約束と、上と同じ外部送信の理由。テキストリンクと `buy-box` を使う)。
 */
export const isImpressionPixel = (imgAttrs: string, host: string | null): boolean => {
  if (!host || !affiliateNetworkOf(host)) return false;
  const size = (name: string) => new RegExp(`\\s${name}\\s*=\\s*["']?1(px)?["'\\s>/]`, 'i').test(`${imgAttrs} `);
  return size('width') && size('height');
};
