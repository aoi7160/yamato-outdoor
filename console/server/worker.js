/**
 * Cloudflare Workers で配信したときの入口(wrangler.jsonc の main)。
 * /api/* は server/api.js、それ以外はビルドした静的ファイル(dist/)を返す。
 */
import { handleApi } from './api.js';

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api' || pathname.startsWith('/api/')) return handleApi(request, env, (p) => ctx.waitUntil(p));
    return env.ASSETS.fetch(request);
  },
};
