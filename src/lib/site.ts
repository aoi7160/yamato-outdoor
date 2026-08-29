/**
 * サイト全体で使う定数。SNSのURLはここだけ書き換えればヘッダー・フッター・記事末尾に反映される。
 * まだアカウントを作っていないものは、URLを空文字にしておけば表示されない。
 */
export const SITE = {
  name: 'YAMATO OUTDOOR',
  tagline: '山と生きる。山と挑む。',
} as const;

export type SocialName = 'x' | 'instagram' | 'tiktok' | 'threads' | 'facebook';

export const SOCIALS: { name: SocialName; label: string; href: string }[] = [
  { name: 'x', label: 'X', href: 'https://x.com/yamato_outdoor' },
  { name: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/yamato_outdoor/' },
  { name: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@yamato_outdoor' },
  { name: 'threads', label: 'Threads', href: 'https://www.threads.net/@yamato_outdoor' },
  { name: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/yamatooutdoor' },
];
