/**
 * sitemap.xml をビルド時に生成する。
 *
 * @astrojs/sitemap は使わない。記事の最終更新日(microCMSの revisedAt)を
 * `lastmod` に入れたいのと、`/preview` や `/sns` のようなnoindexのページを
 * 確実に除外したいため、必要な分だけ自分で書いている(依存も増えない)。
 *
 * Search Consoleには https://yamato-outdoor.com/sitemap.xml を登録する。
 */
import type { APIRoute } from 'astro';
import { getArticles, getCategories } from '../lib/microcms';
import { GENRES, articlePath, categoryPath, genreSlugOf } from '../lib/taxonomy';

type Entry = {
  path: string;
  lastmod?: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
};

const xmlEscape = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin ?? 'https://yamato-outdoor.com';

  const [articles, categories] = await Promise.all([
    getArticles({ limit: 100, orders: '-revisedAt' }),
    getCategories(),
  ]);

  // 記事の中でいちばん新しい更新日。トップと一覧のlastmodに使う。
  const latest = articles.contents
    .map((a) => a.revisedAt || a.publishedAt)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const entries: Entry[] = [
    // 末尾のスラッシュは canonical と揃える。ずれているとGoogleに別URLとして扱われる。
    { path: '/', lastmod: latest, changefreq: 'daily', priority: '1.0' },
    { path: '/about/', changefreq: 'monthly', priority: '0.6' },
    { path: '/privacy/', changefreq: 'monthly', priority: '0.2' },
    // リポジトリ側に直接置いてある記事(microCMS由来ではないので手で足す)。
    // このファイルを消すときは、この1行も一緒に消す。
    { path: '/mountain-climbing/how-to/night-hike-basics/', changefreq: 'monthly', priority: '0.9' },
  ];

  for (const genre of GENRES) {
    const inGenre = articles.contents.filter((a) => genreSlugOf(a.category) === genre.slug);
    entries.push({
      path: `/${genre.slug}/`,
      lastmod: inGenre.map((a) => a.revisedAt || a.publishedAt).sort().reverse()[0],
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  for (const category of categories) {
    const inCategory = articles.contents.filter((a) => a.category?.id === category.id);
    // 1本も記事が無いカテゴリは中身が空なので載せない
    if (inCategory.length === 0) continue;
    entries.push({
      path: categoryPath(category),
      lastmod: inCategory.map((a) => a.revisedAt || a.publishedAt).sort().reverse()[0],
      changefreq: 'weekly',
      priority: '0.7',
    });
  }

  for (const article of articles.contents) {
    if (!article.slug) continue;
    entries.push({
      path: articlePath(article),
      lastmod: article.revisedAt || article.publishedAt,
      changefreq: 'monthly',
      priority: '0.9',
    });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((entry) => {
    const lines = [`    <loc>${xmlEscape(new URL(entry.path, origin).href)}</loc>`];
    if (entry.lastmod) lines.push(`    <lastmod>${new Date(entry.lastmod).toISOString()}</lastmod>`);
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    lines.push(`    <priority>${entry.priority}</priority>`);
    return `  <url>\n${lines.join('\n')}\n  </url>`;
  })
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
