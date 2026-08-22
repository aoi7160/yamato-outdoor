// サイトのカテゴリ構成。CLAUDE.mdの事業フォーカス(登山優先 → 釣り・キャンプ)に対応する。
// microCMSの「カテゴリ」コンテンツのslugと一致させること。
// status: 'active' = 記事を公開していく領域 / 'upcoming' = 今後1年で着手予定、まだ記事はない領域
export type CategoryStatus = 'active' | 'upcoming';

export type CategoryDef = {
  slug: string;
  name: string;
  /** 画面には出さない。meta descriptionと構造化データ(JSON-LD)専用のSEO文言。 */
  description: string;
  /** 画面に出す短いコピー。ブランドの声で書く。 */
  tagline: string;
  status: CategoryStatus;
};

export const categories: CategoryDef[] = [
  {
    slug: 'mountain-climbing',
    name: '登山',
    description:
      '登山カテゴリ。装備検証・レビュー・ルート情報など、実体験ベースでファクトチェックした一次情報を発信。',
    tagline: '軽さより、確かさを選ぶ。',
    status: 'active',
  },
  {
    slug: 'fishing',
    name: '釣り',
    description:
      '釣りカテゴリ。今後1年でメンバーが実際に行い、検証した上でコンテンツ化していく予定の領域。',
    tagline: '待つことも、釣りのうち。',
    status: 'upcoming',
  },
  {
    slug: 'camp',
    name: 'キャンプ',
    description:
      'キャンプカテゴリ。今後1年でメンバーが実際に行い、検証した上でコンテンツ化していく予定の領域。',
    tagline: '火ひとつで、夜は変わる。',
    status: 'upcoming',
  },
];

export const getCategoryBySlug = (slug: string): CategoryDef | undefined =>
  categories.find((c) => c.slug === slug);
