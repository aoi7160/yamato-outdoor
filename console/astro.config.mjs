import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

// 社内向けコンソール。全ページ静的(SSG)で dist/ に出力する。
// 公開サイト(リポジトリ直下)とは別のCloudflare Pagesプロジェクトで配信し、
// Cloudflare Accessで閲覧者を絞る前提(console/README.md の「配信」)。
export default defineConfig({
  output: 'static',
  devToolbar: { enabled: false },
  vite: {
    // 親(公開サイト)の tsconfig.json を読みにいかないように、使う tsconfig を固定する。
    // 指定しないと、ルートの node_modules が無い環境(このコンソールだけをビルドする
    // Cloudflare Pages)で「astro/tsconfigs/strict が見つからない」とビルドが落ちる。
    tsconfig: fileURLToPath(new URL('./tsconfig.json', import.meta.url)),
  },
});
