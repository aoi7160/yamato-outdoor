/**
 * サーバー側(Pages Functions)のテスト。外部APIは fetch を差し替えて模擬する。
 *   npm test
 * Accessの検証(署名・メール・期限・発行元)と、各連携の応答の読み取りを確かめる。
 */
import { verifyAccess } from '../server/access.js';
import { CONNECTORS } from '../server/connectors.js';
import { handleApi } from '../server/api.js';
import { checkArticle, AFFILIATE_HOSTS } from '../server/proofread.js';
import { decide, listApprovals } from '../server/notion.js';
import { putDraft } from '../server/cms.js';
import assert from 'node:assert/strict';

const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1' };
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const sign = async (payload, kid = 'k1') => {
  const u = `${b64({ alg: 'RS256', kid })}.${b64(payload)}`;
  const s = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(u));
  return `${u}.${Buffer.from(s).toString('base64url')}`;
};
let routes = {};
globalThis.fetch = async (url, init) => {
  const u = String(url);
  for (const [k, v] of Object.entries(routes)) if (u.includes(k)) return typeof v === 'function' ? v(u, init) : Response.json(v);
  throw new Error('unexpected fetch ' + u);
};
routes['/cdn-cgi/access/certs'] = { keys: [jwk] };
const env = { CF_ACCESS_TEAM_DOMAIN: 'aoi.cloudflareaccess.com', ALLOWED_EMAILS: 'ceo@example.com, other@example.jp' };
const req = (t) => new Request('https://basecamp.pages.dev/api/x', { headers: t ? { 'Cf-Access-Jwt-Assertion': t } : {} });
const exp = Math.floor(Date.now() / 1000) + 600;
const good = { iss: 'https://aoi.cloudflareaccess.com', email: 'CEO@example.com', exp };
assert.equal((await verifyAccess(req(await sign(good)), env)).ok, true);
assert.equal((await verifyAccess(req(await sign({ ...good, email: 'evil@x.com' })), env)).status, 403);
assert.equal((await verifyAccess(req(await sign({ ...good, exp: 1 })), env)).ok, false);
assert.equal((await verifyAccess(req(await sign({ ...good, iss: 'https://evil.cloudflareaccess.com' })), env)).ok, false);
const t = await sign(good); assert.equal((await verifyAccess(req(t.slice(0, -4) + 'AAAA'), env)).ok, false);
assert.equal((await verifyAccess(req(''), env)).status, 401);
assert.equal((await verifyAccess(req(t), {})).status, 503);
// Cookie でも通る
const cookieReq = new Request('https://basecamp.pages.dev/api/x', { headers: { Cookie: `a=1; CF_Authorization=${t}` } });
assert.equal((await verifyAccess(cookieReq, env)).ok, true);
console.log('access: OK');

// --- GA4 ---
routes = {
  'oauth2.googleapis.com/token': { access_token: 'tok', expires_in: 3600 },
  ':batchRunReports': { reports: [
    { rows: [{ metricValues: [{ value: '48' }, { value: '20' }, { value: '17' }] }] },
    { rows: [{ dimensionValues: [{ value: 'Organic Search' }], metricValues: [{ value: '11' }] }, { dimensionValues: [{ value: 'Direct' }], metricValues: [{ value: '9' }] }] },
    { rows: [{ dimensionValues: [{ value: 'cv_click' }], metricValues: [{ value: '3' }] }, { dimensionValues: [{ value: 'article_read' }], metricValues: [{ value: '5' }] }] },
    { rows: [{ dimensionValues: [{ value: 'サロモンの登山靴' }], metricValues: [{ value: '20' }] }] },
  ] },
  ':runReport': () => new Response(JSON.stringify({ error: { message: 'Field customEvent:cv_stage is not a valid dimension' } }), { status: 400 }),
};
const { generateKeyPairSync } = await import('node:crypto');
const pem = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
const genv = { GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'a@b.iam.gserviceaccount.com', private_key: pem }), GA4_PROPERTY_ID: 'properties/123' };
const g = await CONNECTORS.ga4.run(genv);
assert.deepEqual([g.pv, g.sessions, g.organicShare, g.softCv, g.articleReads], [48, 20, 55, 3, 5]);
assert.ok(g.note.includes('cv_stage'));
routes[':runReport'] = { rows: [{ dimensionValues: [{ value: 'soft' }], metricValues: [{ value: '2' }] }, { dimensionValues: [{ value: 'hard' }], metricValues: [{ value: '1' }] }] };
const g2 = await CONNECTORS.ga4.run(genv);
assert.equal(g2.softCv, 2); assert.equal(g2.note, '');
console.log('ga4:', JSON.stringify(g2));

// --- GSC ---
routes['searchAnalytics/query'] = (u) => { assert.ok(u.includes(encodeURIComponent('sc-domain:yamato-outdoor.com'))); return Response.json({ rows: [
  { keys: ['サロモン 登山靴'], clicks: 4, impressions: 120, position: 6.2 },
  { keys: ['ナイトハイク 装備'], clicks: 1, impressions: 80, position: 11.4 },
  { keys: ['登山靴 防水'], clicks: 0, impressions: 30, position: 9.9 },
] }); };
const s = await CONNECTORS.gsc.run(genv);
assert.deepEqual([s.clicks, s.impressions, s.top10, s.queries], [5, 230, 2, 3]);
console.log('gsc:', JSON.stringify(s));

// --- PSI(実ユーザー値あり / なし)---
routes['runPagespeed'] = { loadingExperience: { metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2140 }, INTERACTION_TO_NEXT_PAINT: { percentile: 130 }, CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 3 } } }, lighthouseResult: { categories: { performance: { score: 0.91 } } } };
const p1 = await CONNECTORS.psi.run({});
assert.deepEqual([p1.source, p1.lcp, p1.inp, p1.cls, p1.score], ['field-url', 2.1, 130, 0.03, 91]);
routes['runPagespeed'] = { loadingExperience: {}, lighthouseResult: { categories: { performance: { score: 0.88 } }, audits: { 'largest-contentful-paint': { numericValue: 1876 }, 'cumulative-layout-shift': { numericValue: 0.01 } } } };
const p2 = await CONNECTORS.psi.run({ PSI_API_KEY: 'k' });
assert.deepEqual([p2.source, p2.lcp, p2.inp], ['lab', 1.9, null]);
console.log('psi: OK');

// --- microCMS ---
const now = new Date().toISOString();
routes['microcms.io'] = (u, init) => { assert.equal(init.headers['X-MICROCMS-API-KEY'], 'key'); return Response.json({ totalCount: 12, contents: [
  { id: 'a', title: '今日公開', publishedAt: now, revisedAt: now }, { id: 'b', title: '昔の記事', publishedAt: '2026-01-01T00:00:00Z', revisedAt: '2026-01-02T00:00:00Z' } ] }); };
const m = await CONNECTORS.microcms.run({ MICROCMS_SERVICE_DOMAIN: 'yamato', MICROCMS_API_KEY: 'key' });
assert.deepEqual([m.total, m.publishedToday, m.publishedUpdatedToday], [12, 1, 1]);
console.log('microcms: OK');

// --- GitHub ---
routes['/commits/main/check-runs'] = { check_runs: [{ name: 'Cloudflare Pages', status: 'completed', conclusion: 'success', app: { slug: 'cloudflare-workers-and-pages' } }, { name: 'Cloudflare Pages', status: 'completed', conclusion: 'failure', app: { slug: 'cloudflare-workers-and-pages' } }] };
routes['/commits/main'] = { sha: 'abcdef1234', commit: { message: 'テスト\n詳細', committer: { date: now } } };
const gh = await CONNECTORS.github.run({});
assert.deepEqual([gh.state, gh.sha, gh.message], ['failed', 'abcdef1', 'テスト']);
console.log('github: OK');

// --- Clarity ---
const fakeKV = () => { const m = new Map(); return { m, get: async (k, t) => (m.has(k) ? (t === 'json' ? JSON.parse(m.get(k)) : m.get(k)) : null), put: async (k, v) => { m.set(k, v); } }; };
await assert.rejects(() => CONNECTORS.clarity.run({ CLARITY_API_TOKEN: 't' }), /KV/);
let clarityCalls = 0;
routes['clarity.ms'] = (u, init) => {
  clarityCalls++;
  assert.equal(init.headers.authorization, 'Bearer t');
  return Response.json([
    { metricName: 'Traffic', information: [{ totalSessionCount: '42', totalBotSessionCount: '3', distantUserCount: '30', PagesPerSessionPercentage: 1.8 }] },
    { metricName: 'DeadClickCount', information: [{ sessionsCount: '42', sessionsWithMetricPercentage: 7.14 }] },
    { metricName: 'RageClickCount', information: [{ sessionsWithMetricPercentage: 2.38 }] },
    { metricName: 'ScrollDepth', information: [{ averageScrollDepth: 61.5 }] },
    { metricName: 'EngagementTime', information: [{ totalTime: '120', activeTime: '45' }] },
  ]);
};
const cl = await CONNECTORS.clarity.run({ CLARITY_API_TOKEN: 't', BASECAMP_CACHE: fakeKV() });
assert.deepEqual([cl.sessions, cl.users, cl.deadClickRate, cl.rageClickRate, cl.scrollDepth, cl.activeTime, cl.quickbackRate], [42, 30, 7.14, 2.38, 61.5, 45, null]);
routes['clarity.ms'] = () => new Response('', { status: 429 });
await assert.rejects(() => CONNECTORS.clarity.run({ CLARITY_API_TOKEN: 't', BASECAMP_CACHE: fakeKV() }), /上限/);
console.log('clarity: OK');

// --- Bing ---
const d = (daysAgo) => `/Date(${Date.now() - daysAgo * 86400000}-0700)/`;
routes['GetRankAndTrafficStats'] = { d: [{ Date: d(1), Clicks: 3, Impressions: 50 }, { Date: d(2), Clicks: 1, Impressions: 20 }, { Date: d(30), Clicks: 9, Impressions: 900 }] };
routes['GetQueryStats'] = { d: [
  { Query: 'サロモン 登山靴', Clicks: 2, Impressions: 30, AvgImpressionPosition: 7.4, Date: d(3) },
  { Query: 'サロモン 登山靴', Clicks: 1, Impressions: 10, AvgImpressionPosition: 6.9, Date: d(10) },
  { Query: 'ナイトハイク', Clicks: 0, Impressions: 25, AvgImpressionPosition: 14.2, Date: d(3) },
] };
const bg = await CONNECTORS.bing.run({ BING_API_KEY: 'k' });
assert.deepEqual([bg.clicks, bg.impressions, bg.topQueries[0].query, bg.topQueries[0].clicks, bg.topQueries.length], [4, 70, 'サロモン 登山靴', 3, 2]);
routes['GetRankAndTrafficStats'] = () => Response.json({ ErrorCode: 3, Message: 'ERROR!!! InvalidApiKey' }, { status: 400 });
await assert.rejects(() => CONNECTORS.bing.run({ BING_API_KEY: 'bad' }), /InvalidApiKey.*APIキー/);
console.log('bing: OK');

// --- API(KVキャッシュ・Clarityは「取り直す」でもキャッシュ)---
routes['clarity.ms'] = () => { clarityCalls++; return Response.json([{ metricName: 'Traffic', information: [{ totalSessionCount: '5' }] }]); };
const kv = fakeKV();
const apiEnv = { LOCAL_DEV_SKIP_ACCESS: '1', CLARITY_API_TOKEN: 't', BASECAMP_CACHE: kv };
const pending = [];
const call = async (path) => (await handleApi(new Request('http://localhost' + path), apiEnv, (p) => pending.push(p))).json();
clarityCalls = 0;
const r1 = await call('/api/connectors/clarity'); await Promise.all(pending);
const r2 = await call('/api/connectors/clarity?fresh=1'); await Promise.all(pending);
assert.equal(r1.data.sessions, 5); assert.equal(r2.data.sessions, 5); assert.equal(clarityCalls, 1);
assert.ok(kv.m.has('connectors:clarity'));
const st = await call('/api/connectors');
assert.equal(st.connectors.find((c) => c.id === 'clarity').configured, true);
assert.equal(st.connectors.find((c) => c.id === 'bing').configured, false);
console.log('api cache: OK');
// --- 校閲チェック ---
const art = checkArticle({
  id: 'a', slug: 'test', title: '最強の登山靴7選', description: '登山靴について解説します。', tags: ['登山靴'],
  category: { slug: 'boots', genre: ['mountain-climbing'] },
  contentHtml: '<h2>選び方!</h2><p>ここを理解して選べば、ここを理解して選べば分かる。バックパックは軽いほうが良いと思う。疲れにくいと思う。歩きやすいと思う。</p><p>今日は晴れでした。気温は低いです。風が強いです。</p><img src="x.webp"><p>「サロモンは登山靴ですか？」が表示される。<a href="https://hb.afl.rakuten.co.jp/x">楽天</a></p>',
});
const bad = Object.fromEntries(art.checks.map((c) => [c.key, c.ok]));
assert.deepEqual(
  ['title', 'description', 'banned', 'yure', 'hiraku', 'ending', 'keitai', 'repeat', 'headings', 'alt', 'pr', 'internal', 'tags'].map((k) => bad[k]),
  Array(13).fill(false),
);
assert.equal(bad.marks, true, '「」の中の?は数えない(見出しの!は見出しのチェックで拾う)');
assert.equal(art.url, 'https://yamato-outdoor.com/mountain-climbing/boots/test/');
assert.ok(art.checks.find((c) => c.key === 'repeat').findings[0].includes('ここを理解して選べば'));
const okArt = checkArticle({ id: 'b', title: 'あ'.repeat(32), description: 'い'.repeat(100), tags: ['a', 'b', 'c'], contentHtml: '<p class="pr-notice">広告</p>' + ['一', '二', '三', '四'].map((x) => `<h2>${x}</h2><p>短い文だ。次の文である。<a href="/a/">内部</a></p>`).join('') });
assert.deepEqual(okArt.checks.filter((c) => !c.ok).map((c) => c.key), []);
// 校閲チェックのASP一覧が、公開サイト(src/lib/affiliate.ts)とずれていないか
{
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../../src/lib/affiliate.ts', import.meta.url), 'utf8');
  const siteHosts = [...src.matchAll(/hosts:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
  assert.ok(siteHosts.length > 0);
  assert.deepEqual([...AFFILIATE_HOSTS].sort(), [...siteHosts].sort(), 'console/server/proofread.js の AFFILIATE_HOSTS を src/lib/affiliate.ts に合わせる');
}
console.log('proofread: OK');

// --- 承認トレイ(Notion)---
const DB = '11112222333344445555666677778888';
const DS = '9999aaaabbbbccccddddeeeeffff0000';
const PAGE = '0123456789abcdef0123456789abcdef';
const nenv = { NOTION_TOKEN: 'secret_x', NOTION_APPROVALS_DB: `https://www.notion.so/${DB}?v=1` };
const sent = [];
const rt = (t) => [{ plain_text: t }];
routes = {
  [`api.notion.com/v1/databases/${DB}`]: (u, init) => { assert.equal(init.headers.authorization, 'Bearer secret_x'); return Response.json({ data_sources: [{ id: '9999aaaa-bbbb-cccc-dddd-eeeeffff0000' }] }); },
  [`/data_sources/${DS}/query`]: { results: [
    { id: '01234567-89ab-cdef-0123-456789abcdef', url: 'https://www.notion.so/p', created_time: now, properties: {
      件名: { type: 'title', title: rt('サロモンのリライト') }, 状態: { type: 'select', select: { name: '承認待ち' } }, 依頼元: { type: 'select', select: { name: 'editorial' } },
      種類: { type: 'select', select: { name: 'リライト' } }, 根拠: { type: 'rich_text', rich_text: rt('重複を検出\n語尾') }, 修正回数: { type: 'number', number: null } } },
  ] },
  [`/blocks/${PAGE}/children`]: (u, init) => {
    if (init?.method === 'PATCH') { sent.push(['append', JSON.parse(init.body)]); return Response.json({}); }
    return Response.json({ has_more: false, results: [
      { type: 'code', code: { rich_text: rt('{"diffs":[{"where":"見出し","before":"前","after":"後"}],"preview":{"contentId":"salomon","draftKey":"k1"}}') } },
      { type: 'heading_3', heading_3: { rich_text: rt('対応(2026-10-13 10:00)初回') } },
      { type: 'bulleted_list_item', bulleted_list_item: { rich_text: rt('自動チェックから作成') } },
    ] });
  },
  [`/pages/${PAGE}`]: (u, init) => {
    if (init?.method === 'PATCH') { sent.push(['props', JSON.parse(init.body)]); return Response.json({}); }
    return Response.json({ parent: { type: 'data_source_id', data_source_id: '9999aaaa-bbbb-cccc-dddd-eeeeffff0000' }, properties: { 修正回数: { type: 'number', number: 1 } } });
  },
  ['/pages/ffffffffffffffffffffffffffffffff']: { parent: { type: 'page_id', page_id: 'aaaa' }, properties: {} },
};
const items = await listApprovals(nenv);
assert.equal(items.length, 1);
assert.deepEqual([items[0].id, items[0].title, items[0].state, items[0].from, items[0].basis.length, items[0].round], [PAGE, 'サロモンのリライト', '承認待ち', 'editorial', 2, 0]);
assert.equal(items[0].detail.diffs[0].after, '後');
assert.equal(items[0].history[0].lines[0], '自動チェックから作成');
const dr = await decide(nenv, PAGE, { action: 'revise', size: '大きな修正', note: '常体に', comments: [{ where: '見出し', text: '短く' }] }, new Date('2026-10-13T12:00:00Z'));
assert.deepEqual([dr.state, dr.round], ['修正依頼', 2]);
const props = sent.find((x) => x[0] === 'props')[1].properties;
assert.equal(props.状態.select.name, '修正依頼');
assert.equal(props.修正の大きさ.select.name, '大きな修正');
assert.equal(props.修正の指示.rich_text[0].text.content, '常体に\n「見出し」短く');
const blocks = sent.find((x) => x[0] === 'append')[1].children;
assert.equal(blocks[0].heading_3.rich_text[0].text.content, 'CEOの判断(2026-10-13 21:00)修正依頼(大きな修正・2回目)');
assert.equal(blocks[2].bulleted_list_item.rich_text[0].text.content, '「見出し」:短く');
await assert.rejects(() => decide(nenv, PAGE, { action: 'revise' }), /指示/);
await assert.rejects(() => decide(nenv, PAGE, { action: 'delete' }), /種類/);
await assert.rejects(() => decide(nenv, 'ffffffffffffffffffffffffffffffff', { action: 'approve' }), /承認トレイの依頼ではありません/);
// API:書き込みは X-BaseCamp ヘッダーと同じオリジンのときだけ
const napi = { ...nenv, LOCAL_DEV_SKIP_ACCESS: '1' };
const post = (h) => handleApi(new Request(`http://localhost/api/approvals/${PAGE}`, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify({ action: 'approve' }) }), napi, () => {});
assert.equal((await post({})).status, 403);
assert.equal((await post({ 'X-BaseCamp': '1', Origin: 'https://evil.example' })).status, 403);
assert.equal((await post({ 'X-BaseCamp': '1', Origin: 'http://localhost' })).status, 200);
const lst = await (await handleApi(new Request('http://localhost/api/approvals?bodies=0'), napi, () => {})).json();
assert.equal(lst.items[0].detail, undefined);
const none = await (await handleApi(new Request('http://localhost/api/approvals'), { LOCAL_DEV_SKIP_ACCESS: '1' }, () => {})).json();
assert.deepEqual([none.configured, none.missing], [false, ['NOTION_TOKEN', 'NOTION_APPROVALS_DB']]);
// Accessを通っていなければ、読み書きとも閉じる
assert.equal((await handleApi(new Request('https://basecamp.example/api/approvals'), nenv, () => {})).status, 503);
console.log('approvals: OK');
// --- microCMSへの入稿(承認と同時に下書きとして)---
const cenv = { MICROCMS_SERVICE_DOMAIN: 'yamato', MICROCMS_API_KEY: 'read', MICROCMS_WRITE_KEY: 'write' };
const art2 = { title: 'T', slug: 'rokko-layering', description: 'D', category: 'wear', tags: ['六甲山', '冬'], html: '<p>本文</p>', faq: [{ question: 'Q', answer: 'A' }] };
let putBodies = [];
routes = {
  'yamato.microcms.io/api/v1/categories': (u, init) => { assert.equal(init.headers['X-MICROCMS-API-KEY'], 'read'); assert.ok(decodeURIComponent(u).includes('slug[equals]wear')); return Response.json({ contents: [{ id: 'cat-wear' }] }); },
  'yamato.microcms.io/api/v1/articles/rokko-layering?status=draft': (u, init) => {
    assert.equal(init.method, 'PUT'); assert.equal(init.headers['X-MICROCMS-API-KEY'], 'write');
    const b = JSON.parse(init.body); putBodies.push(b);
    return b.tags ? new Response('bad tags', { status: 400 }) : Response.json({ id: 'rokko-layering' });
  },
};
const pd = await putDraft(cenv, art2);
assert.equal(pd.editUrl, 'https://yamato.microcms.io/apis/articles/rokko-layering');
assert.deepEqual([putBodies[0].category, putBodies[0].tags, putBodies[0].contentHtml], ['cat-wear', '六甲山, 冬', '<p>本文</p>']);
assert.equal(putBodies[1].tags, undefined);
assert.ok(pd.dropped.some((x) => x.includes('タグ')) && pd.dropped.some((x) => x.includes('FAQ')));
await assert.rejects(() => putDraft({ MICROCMS_SERVICE_DOMAIN: 'yamato' }, art2), /MICROCMS_WRITE_KEY/);
await assert.rejects(() => putDraft(cenv, { ...art2, slug: '../x' }), /スラッグ/);
console.log('cms: OK');
console.log('ALL OK');
