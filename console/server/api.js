/**
 * コンソールのAPI(/api/*)の本体。Workers(server/worker.js)と Pages Functions(functions/api/[[path]].js)の
 * どちらから呼ばれても同じ動きをする。
 *
 *   GET /api/connectors        … 各連携の「設定済みか」だけ(数字は取りにいかない)
 *   GET /api/connectors/<id>   … その連携の数字(連携ごとの ttl だけキャッシュ。?fresh=1 で取り直し)
 *   GET  /api/approvals        … 承認トレイ(Notion)の依頼の一覧。キャッシュしない
 *   POST /api/approvals/<id>   … CEOの判断(承認 / 修正依頼 / 差し戻し / 取り消し)をNotionに書き戻す
 *
 * 書き込み(POST)は、Accessの検証に加えて、同じオリジンからの X-BaseCamp ヘッダー付きの要求だけ受け付ける
 * (Accessのログインのクッキーを使って、別のサイトから判断を勝手に送らせないため)。
 *
 * 入口で必ず Cloudflare Access のJWTを検証する(server/access.js)。
 * ローカル(localhost)だけ、LOCAL_DEV_SKIP_ACCESS=1 で検証を飛ばせる(本番の環境変数には入れない)。
 */
import { verifyAccess } from './access.js';
import { getCached, putCached } from './cache.js';
import { CONNECTORS, missingEnv } from './connectors.js';
import { decide, listApprovals, notionMissing } from './notion.js';
import { cmsBase } from './cms.js';

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
  const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean); // ['api', 'connectors', id?]
  if (parts[1] === 'approvals') return approvals(request, env, url, parts);
  if (request.method !== 'GET') return json({ ok: false, error: 'GETだけ受け付けます' }, 405);

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

  // 外部APIの回数制限よけのキャッシュ(server/cache.js)。
  // 1日の回数が厳しい連携(Clarity)は「取り直す」でもキャッシュを使う
  const fresh = url.searchParams.get('fresh') === '1' && !c.noFresh;
  if (!fresh) {
    const hit = await getCached(env, id);
    if (hit) return json(hit);
  }
  try {
    const body = { ok: true, configured: true, fetchedAt: new Date().toISOString(), data: await c.run(env) };
    putCached(env, id, body, c.ttl, waitUntil);
    return json(body);
  } catch (e) {
    return json({ ok: false, configured: true, error: e instanceof Error ? e.message : String(e) });
  }
}

/** 承認トレイ(Notion)。未設定なら configured:false を返し、画面はデモの依頼に切り替える */
async function approvals(request, env, url, parts) {
  const missing = notionMissing(env);
  if (parts.length === 2 && request.method === 'GET') {
    if (missing.length) return json({ ok: false, configured: false, missing });
    try {
      return json({
        ok: true,
        configured: true,
        fetchedAt: new Date().toISOString(),
        // microCMSの管理画面のURL(「microCMSで直接直す」用)と、承認時に入稿できるか
        cms: { base: cmsBase(env), writable: !!(env.MICROCMS_SERVICE_DOMAIN && env.MICROCMS_WRITE_KEY) },
        items: await listApprovals(env, { bodies: url.searchParams.get('bodies') !== '0' }),
      });
    } catch (e) {
      return json({ ok: false, configured: true, error: e instanceof Error ? e.message : String(e) });
    }
  }
  if (parts.length === 3 && request.method === 'POST') {
    const origin = request.headers.get('Origin');
    if (request.headers.get('X-BaseCamp') !== '1' || (origin && origin !== url.origin))
      return json({ ok: false, error: 'この画面以外からの送信は受け付けません' }, 403);
    if (missing.length) return json({ ok: false, configured: false, missing }, 503);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: '送信の形式が正しくありません' }, 400);
    }
    try {
      return json({ ok: true, ...(await decide(env, parts[2], body)) });
    } catch (e) {
      const status = e && typeof e === 'object' && 'status' in e && Number(e.status) >= 400 && Number(e.status) < 500 ? Number(e.status) : 502;
      return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, status);
    }
  }
  return json({ ok: false, error: '見つかりません' }, request.method === 'GET' ? 404 : 405);
}
