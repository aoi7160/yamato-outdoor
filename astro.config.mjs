import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// 基本は静的サイト生成(SSG)。ビルド時にmicroCMSから記事データを取得してHTML化する。
// 画面プレビュー(下書き確認)ページだけは export const prerender = false を付けて
// リクエスト時にレンダリングする(Cloudflare Pages Functions、無料枠内で動作)。
// これはEmDashで問題になった「Dynamic Workers」(有料プラン必須の機能)とは別物。
export default defineConfig({
  site: 'https://yamato-outdoor.com',
  output: 'static',
  adapter: cloudflare(),
  integrations: [
    sitemap({
      // noindexのページ(/sns)と、下書き確認用のプレビューページは載せない。
      // サイトマップに入れたURLはGoogleに「これを登録してほしい」と伝える意味になるため、
      // インデックスさせないページを混ぜると指示が矛盾する。
      filter: (page) => !page.includes('/sns') && !page.includes('/preview'),
    }),
  ],
});
