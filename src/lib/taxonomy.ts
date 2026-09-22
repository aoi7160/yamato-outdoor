/**
 * サイトの階層を決める定義。
 *
 *   /                                     トップ(ジャンルを選ぶ)
 *   /mountain-climbing/                   ジャンル(登山)
 *   /mountain-climbing/gear/              ジャンル内のカテゴリ(登山のギア)
 *   /mountain-climbing/gear/<記事slug>/    記事
 *
 * ジャンルはコード側で固定し(3つしかなく、写真もコピーも用意が要るため)、
 * その下のカテゴリはmicroCMSの `categories` で自由に増やせる。
 */
import type { Article, Category } from './microcms';

export type GenreSlug = 'mountain-climbing' | 'fishing' | 'camp';

export type GenreDef = {
  slug: GenreSlug;
  name: string;
  /** 画面に出す短いコピー */
  tagline: string;
  /** meta descriptionと構造化データ用 */
  description: string;
  /** 記事を出していく領域か、これから着手する領域か */
  status: 'active' | 'upcoming';
  image: string;
  imageAlt: string;
  imageSize: { w: number; h: number };
  /** カバーで大きく使うときの表示位置。縦長写真は中央だと空しか映らない */
  coverPosition: string;
};

export const GENRES: GenreDef[] = [
  {
    slug: 'mountain-climbing',
    name: '登山',
    tagline: '一歩が重いほど、頂は近づいている。',
    description:
      '登山カテゴリ。装備検証・レビュー・ルート情報など、実体験ベースでファクトチェックした一次情報を発信。',
    status: 'active',
    image: '/media/category/mountain-climbing.webp',
    imageAlt: '霧に包まれた稜線を歩く登山者たち',
    imageSize: { w: 1500, h: 2000 },
    coverPosition: 'center 42%',
  },
  {
    slug: 'fishing',
    name: '釣り',
    tagline: '何も起きない時間ほど、価値がある。',
    description: '釣りカテゴリ。実際に通い、検証した上でコンテンツ化していく領域。',
    status: 'upcoming',
    image: '/media/category/fishing.webp',
    imageAlt: '水辺に置かれた釣り椅子と竿',
    imageSize: { w: 1125, h: 2000 },
    coverPosition: 'center 58%',
  },
  {
    slug: 'camp',
    name: 'キャンプ',
    tagline: '火ひとつで、夜は変わる。',
    description: 'キャンプカテゴリ。実際に泊まり、検証した上でコンテンツ化していく領域。',
    status: 'upcoming',
    image: '/media/category/camp.webp',
    imageAlt: '星空の下に張られたテント',
    imageSize: { w: 1459, h: 2000 },
    coverPosition: 'center 80%',
  },
];

export const getGenre = (slug: string | undefined): GenreDef | undefined =>
  GENRES.find((g) => g.slug === slug);

/**
 * microCMSのカテゴリで `genre` を設定し忘れた場合の受け皿。
 * カテゴリ側にgenreを設定すれば、そちらが優先される(基本はそちらで運用する)。
 *
 * 現行のカテゴリ一覧は docs/microcms-schema.md の「カテゴリ設計」を参照。
 * 全部が登山配下なので、ここに無いslugも最終的にmountain-climbingへ落ちる。
 * 釣り・キャンプの記事を出し始めたら、必ずカテゴリ側のgenreを設定すること
 * (未設定は `getCategories()` がビルドログに警告を出す)。
 */
const FALLBACK_GENRE: Record<string, GenreSlug> = {
  boots: 'mountain-climbing',
  backpack: 'mountain-climbing',
  wear: 'mountain-climbing',
  accessories: 'mountain-climbing',
  beginner: 'mountain-climbing',
  route: 'mountain-climbing',
};

export const genreSlugOf = (category?: Category | null): GenreSlug => {
  const fromCms = category?.genre as GenreSlug | undefined;
  if (fromCms && GENRES.some((g) => g.slug === fromCms)) return fromCms;
  return FALLBACK_GENRE[category?.slug ?? ''] ?? 'mountain-climbing';
};

/** 記事のURL。カテゴリ未設定の記事は登山の「初心者・持ち物」扱いにして、リンク切れを作らない。 */
export const articlePath = (article: Pick<Article, 'slug' | 'category'>): string => {
  const genre = genreSlugOf(article.category);
  const category = article.category?.slug ?? 'beginner';
  return `/${genre}/${category}/${article.slug}/`;
};

export const categoryPath = (category: Category): string =>
  `/${genreSlugOf(category)}/${category.slug}/`;

export const genrePath = (slug: string): string => `/${slug}/`;
