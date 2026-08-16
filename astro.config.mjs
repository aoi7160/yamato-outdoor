import { defineConfig } from 'astro/config';

// 静的サイト生成(SSG)構成。
// ビルド時にmicroCMSから記事データを取得してHTMLを生成するため、
// Cloudflare Pagesの無料枠(Pages Functions/Workers不要)でそのまま運用できる。
export default defineConfig({
  site: 'https://yamato-outdoor.com',
  output: 'static',
});
