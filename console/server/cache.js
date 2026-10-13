/**
 * 外部APIの結果のキャッシュ。
 *
 * Workers KV(wrangler.jsonc の BASECAMP_CACHE)があればそれを使う。workers.dev では
 * Cloudflareの通常のキャッシュ(Cache API)が効かないため。KVが無いとき(ローカルや Pages)は Cache API を使う。
 */
const PREFIX = 'connectors:';

export const hasPersistentCache = (env) => !!env.BASECAMP_CACHE;

export async function getCached(env, key) {
  try {
    if (env.BASECAMP_CACHE) return await env.BASECAMP_CACHE.get(PREFIX + key, 'json');
    if (typeof caches === 'undefined') return null;
    const hit = await caches.default.match(new Request(`https://basecamp-cache.internal/${key}`));
    return hit ? await hit.json() : null;
  } catch {
    return null;
  }
}

/** @param {(p: Promise<unknown>) => void} waitUntil */
export function putCached(env, key, value, ttl, waitUntil) {
  try {
    if (env.BASECAMP_CACHE) {
      waitUntil(env.BASECAMP_CACHE.put(PREFIX + key, JSON.stringify(value), { expirationTtl: Math.max(60, ttl) }));
      return;
    }
    if (typeof caches === 'undefined') return;
    waitUntil(
      caches.default.put(
        new Request(`https://basecamp-cache.internal/${key}`),
        Response.json(value, { headers: { 'cache-control': `max-age=${ttl}` } }),
      ),
    );
  } catch {
    /* キャッシュに置けなくても、返す値は変わらない */
  }
}
