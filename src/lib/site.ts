/**
 * サイト全体で使う定数。SNSのURLはここだけ書き換えればヘッダー・フッター・記事末尾に反映される。
 * まだアカウントを作っていないものは、URLを空文字にしておけば表示されない。
 */
export const SITE = {
  name: 'YAMATO OUTDOOR',
  tagline: '山と生きる。山と挑む。',
} as const;

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
