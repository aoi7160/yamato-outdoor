import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// 基本は静的サイト生成(SSG)。ビルド時にmicroCMSから記事データを取得してHTML化する。
// 画面プレビュー(下書き確認)ページだけは export const prerender = false を付けて
// リクエスト時にレンダリングする(Cloudflare Pages Functions、無料枠内で動作)。
// これはEmDashで問題になった「Dynamic Workers」(有料プラン必須の機能)とは別物。
export default defineConfig({
  site: 'https://yamato-outdoor.com',
  output: 'static',
  adapter: cloudflare(),
});
