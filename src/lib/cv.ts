/**
 * CV(コンバージョン)の設計。
 *
 * このメディアは物販(YAMATO OUTDOORブランド)の手前にあるので、
 * 「いますぐ買う」ではなく **次にまた来る状態を作る** のがCVになる。
 * 段階を3つに分けて置き、どれがどの記事から発生したかをGA4で見る。
 *
 *   1. micro  … その場で終わる小さな反応(シェア、リンクのコピー、関連記事へ回遊)
 *   2. soft   … 連絡先を残す(メール登録・LINE友だち追加・SNSフォロー)   ← 立ち上げ期の主役
 *   3. hard   … 問い合わせ、ブランド側サイトへの遷移、購入
 *
 * 行き先(URL)は src/lib/site.ts にまとめてある。**空ならその枠は描画されない**ので、
 * 準備できたものから順に出していける。リンク切れも「準備中」表示も作らない。
 */
import { BRAND_URL, CONTACT_URL, LINE_FRIEND_URL, NEWSLETTER_URL } from './site';

export type CvStage = 'micro' | 'soft' | 'hard';

export type CvSlot = {
  /** GA4に送る識別子。`cv_click` イベントの cv_id になる */
  id: string;
  stage: CvStage;
  eyebrow: string;
  title: string;
  body: string;
  actionLabel: string;
  href: string;
  /** 別タブで開くか(外部サービスのフォームなど) */
  external: boolean;
};

/**
 * 記事末に置く候補。上から優先で、有効なもののうち先頭2件だけを出す。
 * 3つ以上並べると選べなくなり、かえってどれも押されない。
 */
export const CV_SLOTS: CvSlot[] = [
  {
    id: 'newsletter',
    stage: 'soft',
    eyebrow: 'Next trip',
    title: '次の山行の前に、1通だけ。',
    body: '装備の実測値と、関西の山の状況をまとめて月に1〜2回送ります。宣伝だけのメールは送りません。',
    actionLabel: 'メールで受け取る',
    href: NEWSLETTER_URL,
    external: true,
  },
  {
    id: 'line',
    stage: 'soft',
    eyebrow: 'LINE',
    title: '更新をLINEで受け取る。',
    body: '新しい記事と、道具の入荷を通知します。',
    actionLabel: '友だち追加',
    href: LINE_FRIEND_URL,
    external: true,
  },
  {
    id: 'brand',
    stage: 'hard',
    eyebrow: 'Gear',
    title: '自分たちで使うために作った道具。',
    body: 'この記事で書いた不満を、そのまま設計に持ち込んでいます。',
    actionLabel: 'ブランドを見る',
    href: BRAND_URL,
    external: true,
  },
  {
    id: 'contact',
    stage: 'hard',
    eyebrow: 'Contact',
    title: '検証してほしい道具、ありますか。',
    body: '取り上げてほしい装備やルートの相談を受け付けています。',
    actionLabel: '問い合わせる',
    href: CONTACT_URL,
    external: true,
  },
];

/** 行き先が入っているものだけを、指定の件数まで返す */
export const activeCvSlots = (limit = 2): CvSlot[] =>
  CV_SLOTS.filter((slot) => Boolean(slot.href)).slice(0, limit);
