/**
 * コンソールのAPI(/api/*)の本体。Workers(server/worker.js)と Pages Functions(functions/api/[[path]].js)の
 * どちらから呼ばれても同じ動きをする。
 *
 *   GET /api/connectors        … 各連携の「設定済みか」だけ(数字は取りにいかない)
 *   GET /api/connectors/<id>   … その連携の数字(連携ごとの ttl だけキャッシュ。?fresh=1 で取り直し)
 *
 * 入口で必ず Cloudflare Access のJWTを検証する(server/access.js)。
 * ローカル(localhost)だけ、LOCAL_DEV_SKIP_ACCESS=1 で検証を飛ばせる(本番の環境変数には入れない)。
 */
import { verifyAccess } from './access.js';
import { CONNECTORS, missingEnv } from './connectors.js';

const json = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex', ...headers } });

/** @param {(p: Promise<unknown>) => void} waitUntil */
export async function handleApi(request, env, waitUntil) {
  const url = new URL(request.url);
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (!(isLocal && env.LOCAL_DEV_SKIP_ACCESS === '1')) {
    const v = await verifyAccess(request, env);
    if (!v.ok) return json({ ok: false, error: v.reason }, v.status);
  }
  if (request.method !== 'GET') return json({ ok: false, error: 'GETだけ受け付けます' }, 405);

  const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean); // ['api', 'connectors', id?]
  if (parts[1] !== 'connectors' || parts.length > 3) return json({ ok: false, error: '見つかりません' }, 404);

  if (parts.length === 2) {
    const list = Object.keys(CONNECTORS).map((id) => {
      const missing = missingEnv(id, env);
      return { id, configured: missing.length === 0, missing };
    });
    return json({ ok: true, connectors: list });
  }

  const id = parts[2];
  const c = CONNECTORS[id];
  if (!c) return json({ ok: false, error: '不明な連携です' }, 404);
  const missing = missingEnv(id, env);
  if (missing.length) return json({ ok: false, configured: false, missing });

  // 外部APIの回数制限よけのキャッシュ。workers.dev ではキャッシュが効かない(毎回取りにいく)が、動きは同じ
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(`https://basecamp-cache.internal/connectors/${id}`);
  if (cache && url.searchParams.get('fresh') !== '1') {
    const hit = await cache.match(cacheKey);
    if (hit) return json(await hit.json());
  }
  try {
    const body = { ok: true, configured: true, fetchedAt: new Date().toISOString(), data: await c.run(env) };
    if (cache) waitUntil(cache.put(cacheKey, Response.json(body, { headers: { 'cache-control': `max-age=${c.ttl}` } })));
    return json(body);
  } catch (e) {
    return json({ ok: false, configured: true, error: e instanceof Error ? e.message : String(e) });
  }
}
