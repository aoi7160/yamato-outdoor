/**
 * Cloudflare Access の検証(二重の鍵)。
 *
 * コンソールはAccessの内側で配信するが、設定漏れ(プレビューURLに鍵がかかっていない等)で
 * GA4やSearch Consoleの数字が外に出ないように、/api/* では Access が付けるJWTを自分でも検証する。
 * 検証に必要な環境変数が無いときは**データを返さない**(閉じる側に倒す)。
 *
 *   CF_ACCESS_TEAM_DOMAIN  例: aoi.cloudflareaccess.com(Zero Trust → 設定 → チームドメイン)
 *   ALLOWED_EMAILS         見てよいメールアドレス(カンマ区切り)
 */

let certsCache = { team: '', at: 0, keys: [] };

const b64urlToBytes = (s) => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
};
const b64urlJson = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

async function getKeys(team) {
  if (certsCache.team === team && Date.now() - certsCache.at < 60 * 60 * 1000) return certsCache.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`Accessの公開鍵を取得できません(${res.status})`);
  const { keys } = await res.json();
  certsCache = { team, at: Date.now(), keys };
  return keys;
}

function readToken(request) {
  const h = request.headers.get('Cf-Access-Jwt-Assertion');
  if (h) return h;
  const cookie = request.headers.get('Cookie') ?? '';
  return cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1] ?? '';
}

/** @returns {Promise<{ ok: true, email: string } | { ok: false, status: number, reason: string }>} */
export async function verifyAccess(request, env) {
  const team = (env.CF_ACCESS_TEAM_DOMAIN ?? '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const allowed = (env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (!team || allowed.length === 0)
    return { ok: false, status: 503, reason: 'CF_ACCESS_TEAM_DOMAIN と ALLOWED_EMAILS が未設定です(console/SETUP.md の手順3)' };

  const token = readToken(request);
  if (!token) return { ok: false, status: 401, reason: 'Accessを通っていません' };
  const [h, p, sig] = token.split('.');
  try {
    const header = b64urlJson(h);
    const payload = b64urlJson(p);
    const jwk = (await getKeys(team)).find((k) => k.kid === header.kid);
    if (!jwk) return { ok: false, status: 401, reason: '鍵が一致しません' };
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(sig), new TextEncoder().encode(`${h}.${p}`));
    if (!valid) return { ok: false, status: 401, reason: '署名が不正です' };
    if (payload.iss !== `https://${team}`) return { ok: false, status: 401, reason: '発行元が違います' };
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return { ok: false, status: 401, reason: '期限切れです' };
    const email = String(payload.email ?? '').toLowerCase();
    if (!allowed.includes(email)) return { ok: false, status: 403, reason: 'このメールアドレスには許可がありません' };
    return { ok: true, email };
  } catch (e) {
    return { ok: false, status: 401, reason: `検証できません(${e instanceof Error ? e.message : e})` };
  }
}
