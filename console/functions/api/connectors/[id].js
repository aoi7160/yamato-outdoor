/**
 * GET /api/connectors/<id> … その連携の数字を返す。
 * 外部APIの回数制限があるので、結果は連携ごとの ttl だけエッジにキャッシュする
 * (?fresh=1 で取り直し)。キャッシュはAccessの検証(_middleware)を通った後にだけ読む。
 */
import { CONNECTORS, missingEnv } from '../../../server/connectors.js';

export async function onRequestGet({ params, request, env, waitUntil }) {
  const id = String(params.id);
  const c = CONNECTORS[id];
  if (!c) return Response.json({ ok: false, error: '不明な連携です' }, { status: 404 });
  const missing = missingEnv(id, env);
  if (missing.length) return Response.json({ ok: false, configured: false, missing }, { status: 200 });

  const url = new URL(request.url);
  const cacheKey = new Request(`https://basecamp-cache.internal/connectors/${id}`);
  const cache = caches.default;
  if (url.searchParams.get('fresh') !== '1') {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  try {
    const data = await c.run(env);
    const res = Response.json(
      { ok: true, configured: true, fetchedAt: new Date().toISOString(), data },
      { headers: { 'cache-control': `max-age=${c.ttl}` } },
    );
    waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  } catch (e) {
    return Response.json(
      { ok: false, configured: true, error: e instanceof Error ? e.message : String(e) },
      { status: 200 },
    );
  }
}
