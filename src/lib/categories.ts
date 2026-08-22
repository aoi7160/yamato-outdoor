// サイトのカテゴリ構成。CLAUDE.mdの事業フォーカス(登山優先 → 釣り・キャンプ)に対応する。
// microCMSの「カテゴリ」コンテンツのslugと一致させること。
// status: 'active' = 記事を公開していく領域 / 'upcoming' = 今後1年で着手予定、まだ記事はない領域
export type CategoryStatus = 'active' | 'upcoming';

export type CategoryDef = {
  slug: string;
  name: string;
  description: string;
  status: CategoryStatus;
};

export const categories: CategoryDef[] = [
  {
    slug: 'tozan',
    name: '登山',
    description: '装備検証・レビュー・ルート情報。実体験ベースでファクトチェックした一次情報。',
    status: 'active',
  },
  {
    slug: 'fishing',
    name: '釣り',
    description: '今後1年でコンテンツ化していく領域。実際に行い、検証してから公開する。',
    status: 'upcoming',
  },
  {
    slug: 'camp',
    name: 'キャンプ',
    description: '今後1年でコンテンツ化していく領域。実際に行い、検証してから公開する。',
    status: 'upcoming',
  },
];

export const getCategoryBySlug = (slug: string): CategoryDef | undefined =>
  categories.find((c) => c.slug === slug);
