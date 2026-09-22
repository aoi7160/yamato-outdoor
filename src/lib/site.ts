/**
 * サイト全体で使う定数。SNSのURLはここだけ書き換えればヘッダー・フッター・記事末尾に反映される。
 * まだアカウントを作っていないものは、URLを空文字にしておけば表示されない。
 */
export const SITE = {
  name: 'YAMATO OUTDOOR',
  tagline: '山と生きる。山と挑む。',
} as const;

/**
 * SUZURIで販売しているグッズのショップURL。ヘッダーのカートアイコンの行き先。
 * 空文字のあいだはアイコンごと出さない(SNSと違って「準備中」ページに逃がす
 * 意味がないため)。
 */
export const SHOP_URL = 'https://suzuri.jp/yamato-outdoor/products';

export type SocialName = 'x' | 'instagram' | 'tiktok' | 'threads' | 'facebook';

/**
 * SNSの並び順。フォローもシェアもこの順に揃える
 * (場所によって順番が入れ替わると、それだけで雑に見える)。
 */
export const SOCIAL_ORDER: SocialName[] = ['x', 'instagram', 'tiktok', 'threads', 'facebook'];

/**
 * アカウントが用意できたら href に実URLを入れる。
 * 空のままなら「準備中」ページ(/sns)に向き、リンク切れにならない。
 */
export const SOCIALS: { name: SocialName; label: string; href: string }[] = [
  { name: 'x', label: 'X', href: '' },
  { name: 'instagram', label: 'Instagram', href: '' },
  { name: 'tiktok', label: 'TikTok', href: '' },
  { name: 'threads', label: 'Threads', href: '' },
  { name: 'facebook', label: 'Facebook', href: '' },
];

/** 準備中のSNSリンクの行き先。noindexの案内ページ(200を返す)。 */
export const SOCIAL_PENDING_PATH = '/sns';

/**
 * CV(コンバージョン)の行き先。**空文字ならその導線は画面に出ない。**
 * フォームを自前で作る必要はなく、まずはGoogleフォームのURLを入れれば動く
 * (Cloudflare Pagesは静的配信なので、フォームの受け口は外部に置くのがいちばん安い)。
 * 設計の考え方と計測の見方は docs/analytics.md の「CV設計」を参照。
 */

/** お問い合わせ。フッターと記事末に出る。GoogleフォームのURLで足りる */
export const CONTACT_URL: string = '';

/** 更新のメール通知 / 新作の先行案内。メールアドレスを集める受け口 */
export const NEWSLETTER_URL: string = '';

/** LINE公式アカウントの友だち追加リンク。日本のBtoCではメールより反応が良い */
export const LINE_FRIEND_URL: string = '';

/* 物販側の行き先は上の SHOP_URL を使う(記事末のCV枠とヘッダーのカートで共通)。 */

/** リンクの属性をまとめて作る。準備中のものは nofollow を付けて外部評価を渡さない。 */
export const socialLink = (s: { label: string; href: string }) => {
  const pending = !s.href;
  return {
    href: pending ? SOCIAL_PENDING_PATH : s.href,
    label: pending ? `${s.label}(準備中)` : s.label,
    rel: pending ? 'nofollow' : 'noopener noreferrer',
    target: pending ? undefined : '_blank',
    pending,
  };
};
