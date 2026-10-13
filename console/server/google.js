/**
 * Googleのサービスアカウントでアクセストークンを取る(GA4 Data API / Search Console API)。
 * 鍵(JSON)は Cloudflare の環境変数 GOOGLE_SERVICE_ACCOUNT_JSON に「シークレット」として入れる。
 * Workers には googleapis のライブラリが無いので、JWT(RS256)を WebCrypto で自前で署名する。
 */

const tokenCache = new Map(); // scope → { token, exp }

const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlText = (s) => b64url(new TextEncoder().encode(s));

function pemToPkcs8(pem) {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0)).buffer;
}

export function readServiceAccount(env) {
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    return sa.client_email && sa.private_key ? sa : null;
  } catch {
    return null;
  }
}

export async function googleToken(env, scope) {
  const sa = readServiceAccount(env);
  if (!sa) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON が未設定か、JSONとして読めません');
  const cached = tokenCache.get(scope);
  if (cached && cached.exp - 60 > Date.now() / 1000) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const aud = sa.token_uri ?? 'https://oauth2.googleapis.com/token';
  const unsigned = `${b64urlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64urlText(
    JSON.stringify({ iss: sa.client_email, scope, aud, iat: now, exp: now + 3600 }),
  )}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToPkcs8(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const res = await fetch(aud, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${b64url(sig)}` }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Googleの認証に失敗しました(${json.error_description ?? json.error ?? res.status})`);
  tokenCache.set(scope, { token: json.access_token, exp: now + (json.expires_in ?? 3600) });
  return json.access_token;
}

/** Googleのエラー応答を、何をすれば直るかが分かる文に寄せる */
export async function googleError(res, what) {
  let msg = '';
  try {
    msg = (await res.json())?.error?.message ?? '';
  } catch {
    /* 本文がJSONでない */
  }
  if (res.status === 403) return `${what}:サービスアカウントに閲覧権限がないか、APIが有効になっていません(${msg})`;
  if (res.status === 404) return `${what}:プロパティ/サイトが見つかりません。IDを確認してください(${msg})`;
  return `${what}:${res.status} ${msg}`;
}
