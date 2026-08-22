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
