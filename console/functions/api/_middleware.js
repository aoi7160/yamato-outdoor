/**
 * /api/* の入口。Cloudflare Access のJWTを検証してから先に進める(server/access.js)。
 * ローカルで wrangler pages dev を使うときだけ、.dev.vars の
 * LOCAL_DEV_SKIP_ACCESS=1 で検証を飛ばせる(本番の環境変数には絶対に入れない)。
 */
import { verifyAccess } from '../../server/access.js';

export async function onRequest(context) {
  const { request, env, next } = context;
  const host = new URL(request.url).hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (!(isLocal && env.LOCAL_DEV_SKIP_ACCESS === '1')) {
    const v = await verifyAccess(request, env);
    if (!v.ok) return Response.json({ ok: false, error: v.reason }, { status: v.status, headers: { 'cache-control': 'no-store' } });
  }
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set('cache-control', 'no-store');
  out.headers.set('x-robots-tag', 'noindex');
  return out;
}
