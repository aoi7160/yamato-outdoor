import { createClient } from 'microcms-js-sdk';
import type { MicroCMSListResponse, MicroCMSImage } from 'microcms-js-sdk';

const serviceDomain = import.meta.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = import.meta.env.MICROCMS_API_KEY;

// MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が未設定の場合はclientをnullにする。
// microCMSアカウント作成前でもビルドが落ちないようにするための措置。
export const client = serviceDomain && apiKey ? createClient({ serviceDomain, apiKey }) : null;

// microCMS「記事(articles)」APIのスキーマに対応する型。
// フィールド設計は docs/microcms-schema.md を参照。
export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Article = {
  id: string;
  publishedAt: string;
  revisedAt: string;
  title: string;
  slug: string;
  description: string;
  thumbnail?: MicroCMSImage;
  content: string;
  category?: Category;
  tags?: string[];
  // 監修者(任意)。監修者を立てない記事もあるので全て省略可にする。
  supervisorName?: string;
  supervisorTitle?: string;
  supervisorBio?: string;
  supervisorImage?: MicroCMSImage;
};

// microCMSへ新規記事(下書き)を作成する時に渡す入力。
// category は id 参照(スラッグではなく microCMS のコンテンツID)。
export type NewArticleInput = {
  title: string;
  slug: string;
  description: string;
  content: string;
  categoryId: string;
  tags?: string[];
  supervisorName?: string;
  supervisorTitle?: string;
  supervisorBio?: string;
};

// microCMS未接続・一時的な障害時でもビルド・表示が落ちないよう、取得失敗時は空の結果にフォールバックする。
export const getArticles = async (
  queries?: Record<string, unknown>,
): Promise<MicroCMSListResponse<Article>> => {
  if (!client) return { contents: [], totalCount: 0, offset: 0, limit: 0 };
  try {
    return await client.getList<Article>({ endpoint: 'articles', queries });
  } catch {
    return { contents: [], totalCount: 0, offset: 0, limit: 0 };
  }
};

export const getArticleBySlug = async (slug: string): Promise<Article | null> => {
  if (!client) return null;
  try {
    const res = await client.getList<Article>({
      endpoint: 'articles',
      queries: { filters: `slug[equals]${slug}`, limit: 1 },
    });
    return res.contents[0] ?? null;
  } catch {
    return null;
  }
};

export const getAllArticleSlugs = async (): Promise<string[]> => {
  if (!client) return [];
  try {
    const res = await client.getList<Article>({
      endpoint: 'articles',
      fields: ['slug'],
      limit: 100,
    });
    return res.contents.map((a) => a.slug);
  } catch {
    return [];
  }
};

// カテゴリのslugから、記事作成時に必要なmicroCMS内部IDを引く。
export const getCategoryIdBySlug = async (slug: string): Promise<string | null> => {
  if (!client) return null;
  try {
    const res = await client.getList<Category>({
      endpoint: 'categories',
      queries: { filters: `slug[equals]${slug}`, limit: 1 },
    });
    return res.contents[0]?.id ?? null;
  } catch {
    return null;
  }
};

// 平日パイプライン(seo-researcher→outdoor-researcher→writer→editor)の最終ステップ。
// 「下書き」状態でmicroCMSに保存する(公開はしない。isDraft:trueがそれを保証する)。
// 書き込みには WRITE 権限を持つ APIキーが必要(microCMS管理画面のAPIキー設定で書き込みを許可すること)。
export const createArticleDraft = async (input: NewArticleInput): Promise<string> => {
  if (!client) throw new Error('microCMSクライアントが未初期化です(.envを確認してください)');
  const result = await client.create({
    endpoint: 'articles',
    content: {
      title: input.title,
      slug: input.slug,
      description: input.description,
      content: input.content,
      category: input.categoryId,
      tags: input.tags,
      supervisorName: input.supervisorName,
      supervisorTitle: input.supervisorTitle,
      supervisorBio: input.supervisorBio,
    },
    isDraft: true,
  });
  return result.id;
};

// 画面プレビュー用: 下書き状態のコンテンツをcontentId + draftKeyで取得する。
export const getArticleDraft = async (
  contentId: string,
  draftKey: string,
): Promise<Article | null> => {
  if (!client) return null;
  try {
    return await client.getListDetail<Article>({
      endpoint: 'articles',
      contentId,
      queries: { draftKey },
    });
  } catch {
    return null;
  }
};
