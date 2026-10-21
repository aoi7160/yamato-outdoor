/**
 * アフィリエイト(成果報酬型広告)のリンク先の定義。
 *
 * ここに該当するリンクには、記事本文の加工(`src/lib/article.ts`)で
 *  - `rel="sponsored nofollow"` を付ける(Googleのリンクスパム対策・景品表示法のステマ規制)
 *  - `data-affiliate="<ASP名>"` を付ける(GA4の `click_outbound` に `affiliate_network` として載る)
 *  - ASPの表示回数計測用の1x1画像を外す(下の「インプレッション画像」参照)
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
 * 1x1画像が付いてくる。これを残すと、記事を開いただけで読者の端末からASPへ
 * 通信が飛ぶ(電気通信事業法の外部送信に当たり、`/privacy` の公表と合わなくなる)うえ、
 * 記事の表示も1リクエストぶん重くなる。成果(クリック・発生)の計測には関係しない
 * ので、本文の加工で外す。ASPの管理画面の「表示回数」は数えられなくなるが、
 * クリック数はGA4の `click_outbound` で見られる。
 *
 * ASPのバナー画像(1x1でないもの)は外さない。**バナーは使わない**運用にしている
 * (デザインの約束と、上と同じ外部送信の理由。テキストリンクと `buy-box` を使う)。
 */
export const isImpressionPixel = (imgAttrs: string, host: string | null): boolean => {
  if (!host || !affiliateNetworkOf(host)) return false;
  const size = (name: string) => new RegExp(`\\s${name}\\s*=\\s*["']?1(px)?["'\\s>/]`, 'i').test(`${imgAttrs} `);
  return size('width') && size('height');
};
