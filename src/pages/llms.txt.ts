/**
 * llms.txt。AI検索・生成AIのクローラー向けに、サイトの構造と記事一覧を
 * プレーンなMarkdownで示すファイル(https://llmstxt.org/ の提案する形式)。
 *
 * **実験的な取り組み。** 標準化されたものではなく、置いたからといって
 * 引用されるようになる保証はない。ただし生成コストはゼロで、
 * HTMLを読み解かせるより意図が伝わる。効果が見えなければ消してよい。
 */
import type { APIRoute } from 'astro';
import { getArticles } from '../lib/microcms';
import { GENRES, articlePath } from '../lib/taxonomy';

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin ?? 'https://yamato-outdoor.com';
  const res = await getArticles({ limit: 100, orders: '-publishedAt' });

  const lines: string[] = [
    '# YAMATO OUTDOOR',
    '',
    '> 山と生きる。山と挑む。登山・釣り・キャンプの装備とルートを、実際に使い、自分で量った数値で記録するアウトドアメディア。',
    '',
    '運営者は会社勤めをしながら月1〜2回、関西(六甲・金剛・比良・大峰)を中心に山に入っている。',
    'カタログ値の引き写しではなく、実測重量・悪条件での挙動・合わなかった点を同じ分量で書くことを編集方針にしている。',
    '',
    '## ジャンル',
    '',
    ...GENRES.map((genre) => `- [${genre.name}](${new URL(`/${genre.slug}/`, origin).href}): ${genre.description}`),
    '',
    '## 記事',
    '',
    ...res.contents
      .filter((article) => article.slug)
      .map(
        (article) =>
          `- [${article.title}](${new URL(articlePath(article), origin).href})${article.description ? `: ${article.description}` : ''}`,
      ),
    '',
    '## サイト情報',
    '',
    `- [このメディアについて](${new URL('/about', origin).href})`,
    `- [プライバシーポリシー・外部送信について](${new URL('/privacy', origin).href})`,
    `- [サイトマップ](${new URL('/sitemap.xml', origin).href})`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
