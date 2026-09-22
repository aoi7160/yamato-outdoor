/**
 * RSSフィード。
 *
 * 読者のためというより、**更新を自動で外に流すための出口**として置いている。
 * 公開したらIFTTTやZapierの無料枠でSNSへ自動投稿できるほか、
 * フィードリーダー経由での指名的な再訪も拾える(P1は指名検索が起きにくい層なので、
 * 「また来る理由」を検索以外にも作っておく)。
 */
import type { APIRoute } from 'astro';
import { getArticles } from '../lib/microcms';
import { articlePath } from '../lib/taxonomy';
import { SITE } from '../lib/site';

const cdata = (value: string): string => `<![CDATA[${value.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin ?? 'https://yamato-outdoor.com';
  const res = await getArticles({ limit: 20, orders: '-publishedAt' });

  const items = res.contents
    .filter((article) => article.slug)
    .map((article) => {
      const url = new URL(articlePath(article), origin).href;
      return `    <item>
      <title>${cdata(article.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
      ${article.category?.name ? `<category>${cdata(article.category.name)}</category>` : ''}
      <description>${cdata(article.description ?? '')}</description>
    </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${cdata(SITE.name)}</title>
    <link>${origin}/</link>
    <description>${cdata(SITE.tagline)}</description>
    <language>ja</language>
    <atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
