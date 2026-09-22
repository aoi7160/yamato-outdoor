import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// 全ページ静的サイト生成(SSG)。ビルド時にmicroCMSから記事データを取得してHTML化する。
//
// このアダプタはCloudflare "Workers" 向けに出力するため、Pagesに配信している
// 現構成では `export const prerender = false` を付けたページは配信されず404になる。
// サーバー処理が要るものは functions/ のCloudflare Pages Functionsに置く
// (下書きプレビューの取得 functions/api/draft.js がその例)。
//
// アダプタ自体は、ビルド出力を dist/client に揃えるために残している。
export default defineConfig({
  site: 'https://yamato-outdoor.com',
  output: 'static',
  adapter: cloudflare(),
});
