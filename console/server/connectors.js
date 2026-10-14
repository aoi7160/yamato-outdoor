/**
 * サーバー側の連携(Cloudflare Pages Functions から呼ぶ)。
 * 1つの連携 = { id, needs(必要な環境変数), ttl(キャッシュ秒), run(env) }。
 * 連携を足すときはここに1つ足し、画面側の一覧(src/lib/connectors.ts)にも同じ id で1行足す。
 *
 * 返す値は「その日の数字」。日付は日本時間で数える。
 */
import { hasPersistentCache } from './cache.js';
import { googleError, googleToken, readServiceAccount } from './google.js';
import { proofread } from './proofread.js';

const TZ = 'Asia/Tokyo';
export const ymd = (d = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(d); // YYYY-MM-DD
const daysAgo = (n) => ymd(new Date(Date.now() - n * 86_400_000));

const SITE = 'https://yamato-outdoor.com/';
const REPO = 'aoi7160/yamato-outdoor';

/* ---------- GA4(Google Analytics Data API) ---------- */

async function ga4(env) {
  const prop = String(env.GA4_PROPERTY_ID ?? '').replace(/\D/g, '');
  const token = await googleToken(env, 'https://www.googleapis.com/auth/analytics.readonly');
  const today = { startDate: 'today', endDate: 'today' };
  const call = async (method, body) => {
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${prop}:${method}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw Object.assign(new Error(await googleError(res, 'GA4')), { status: res.status });
    return res.json();
  };

  const batch = await call('batchRunReports', {
    requests: [
      { dateRanges: [today], metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }, { name: 'activeUsers' }] },
      { dateRanges: [today], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }] },
      {
        dateRanges: [today],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['cv_click', 'article_read'] } } },
      },
      { dateRanges: [today], dimensions: [{ name: 'pageTitle' }], metrics: [{ name: 'screenPageViews' }], limit: 3, orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }] },
    ],
  });
  const [totals, channels, events, pages] = batch.reports;
  const mv = (row, i) => Number(row?.metricValues?.[i]?.value ?? 0);
  const pv = mv(totals.rows?.[0], 0);
  const sessions = mv(totals.rows?.[0], 1);
  const organic = (channels.rows ?? []).filter((r) => r.dimensionValues[0].value === 'Organic Search').reduce((t, r) => t + mv(r, 0), 0);
  const eventOf = (name) => (events.rows ?? []).filter((r) => r.dimensionValues[0].value === name).reduce((t, r) => t + mv(r, 0), 0);

  // soft CV は cv_click のうち cv_stage=soft。cv_stage をGA4のカスタムディメンションに
  // 登録していないと絞り込めないので、そのときは cv_click 全体を数えて注記する
  let softCv = eventOf('cv_click');
  let note = 'cv_stage がカスタムディメンション未登録のため、cv_click 全体を数えています';
  try {
    const r = await call('runReport', {
      dateRanges: [today],
      dimensions: [{ name: 'customEvent:cv_stage' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'cv_click' } } },
    });
    softCv = (r.rows ?? []).filter((x) => x.dimensionValues[0].value === 'soft').reduce((t, x) => t + mv(x, 0), 0);
    note = '';
  } catch {
    /* 未登録。上の注記のまま */
  }

  return {
    date: ymd(),
    pv,
    sessions,
    users: mv(totals.rows?.[0], 2),
    organicShare: sessions > 0 ? Math.round((organic / sessions) * 100) : 0,
    softCv,
    articleReads: eventOf('article_read'),
    topPages: (pages.rows ?? []).map((r) => ({ title: r.dimensionValues[0].value, pv: mv(r, 0) })),
    note,
  };
}

/* ---------- Search Console ---------- */

async function gsc(env) {
  const site = env.GSC_SITE_URL || 'sc-domain:yamato-outdoor.com';
  const token = await googleToken(env, 'https://www.googleapis.com/auth/webmasters.readonly');
  // 検索の数字は2〜3日遅れて確定する。直近7日(昨日まで)を、速報値込み(dataState: all)で見る
  const startDate = daysAgo(7);
  const endDate = daysAgo(1);
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ startDate, endDate, dimensions: ['query'], rowLimit: 5000, dataState: 'all' }),
  });
  if (!res.ok) throw Object.assign(new Error(await googleError(res, 'Search Console')), { status: res.status });
  const rows = (await res.json()).rows ?? [];
  const clicks = rows.reduce((t, r) => t + r.clicks, 0);
  const impressions = rows.reduce((t, r) => t + r.impressions, 0);
  return {
    range: `${startDate}〜${endDate}`,
    clicks,
    impressions,
    queries: rows.length,
    top10: rows.filter((r) => r.position <= 10).length,
    topQueries: [...rows]
      .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
      .slice(0, 5)
      .map((r) => ({ query: r.keys[0], position: Math.round(r.position * 10) / 10, clicks: r.clicks })),
  };
}

/* ---------- PageSpeed Insights(Core Web Vitals) ---------- */

async function psi(env) {
  const url = env.PSI_URL || SITE;
  const qs = new URLSearchParams({ url, strategy: 'mobile', category: 'performance' });
  if (env.PSI_API_KEY) qs.set('key', env.PSI_API_KEY);
  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${qs}`);
  if (!res.ok) {
    if (res.status === 429) throw Object.assign(new Error('PageSpeed Insights:回数制限。PSI_API_KEY を入れると安定します'), { status: 429 });
    throw Object.assign(new Error(await googleError(res, 'PageSpeed Insights')), { status: res.status });
  }
  const json = await res.json();
  // 実ユーザーの値(CrUX)があればそれを、無ければ(アクセスが少ない間は無い)ラボ値を使う
  const field = [json.loadingExperience, json.originLoadingExperience].find((x) => x?.metrics?.LARGEST_CONTENTFUL_PAINT_MS);
  const audits = json.lighthouseResult?.audits ?? {};
  const score = Math.round((json.lighthouseResult?.categories?.performance?.score ?? 0) * 100);
  if (field) {
    const m = field.metrics;
    return {
      source: field === json.loadingExperience ? 'field-url' : 'field-origin',
      lcp: Math.round((m.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? 0) / 100) / 10,
      inp: m.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
      cls: m.CUMULATIVE_LAYOUT_SHIFT_SCORE ? m.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100 : null,
      score,
    };
  }
  return {
    source: 'lab',
    lcp: Math.round((audits['largest-contentful-paint']?.numericValue ?? 0) / 100) / 10,
    inp: null, // ラボではINPは測れない
    cls: audits['cumulative-layout-shift']?.numericValue ?? null,
    score,
  };
}

/* ---------- microCMS ---------- */

async function microcms(env) {
  const res = await fetch(
    `https://${env.MICROCMS_SERVICE_DOMAIN}.microcms.io/api/v1/articles?limit=100&fields=id,title,publishedAt,revisedAt&orders=-revisedAt`,
    { headers: { 'X-MICROCMS-API-KEY': env.MICROCMS_API_KEY } },
  );
  if (!res.ok) throw Object.assign(new Error(`microCMS:${res.status}`), { status: res.status });
  const { contents = [], totalCount = 0 } = await res.json();
  const today = ymd();
  const day = (iso) => (iso ? ymd(new Date(iso)) : '');
  return {
    total: totalCount,
    publishedToday: contents.filter((c) => day(c.publishedAt) === today).length,
    publishedUpdatedToday: contents.filter((c) => day(c.publishedAt) === today || day(c.revisedAt) === today).length,
    recent: contents.slice(0, 4).map((c) => ({ title: c.title, revisedAt: c.revisedAt })),
  };
}

/* ---------- 企画(今月 docs/articles に入った記事の設計書) ---------- */

/**
 * 企画・編集会議部の「今月の企画本数」。企画が通ると、SEO部が docs/articles/<slug>.md(設計書)を作る(console/ORG.md 5章)。
 * mainに今月追加された設計書を数える(未マージのブランチの設計書は数えない)。
 */
async function plans(env, now = new Date()) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'yamato-basecamp' };
  if (env.GITHUB_TOKEN) headers.authorization = `Bearer ${env.GITHUB_TOKEN}`;
  // 日本時間の今月1日 0:00
  const jstNow = new Date(now.getTime() + 9 * 3600_000);
  const since = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), 1) - 9 * 3600_000).toISOString();
  const gh = async (path) => {
    const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, { headers });
    if (!res.ok) throw Object.assign(new Error(`GitHub:${res.status}`), { status: res.status });
    return res.json();
  };
  const commits = await gh(`/commits?path=docs/articles&since=${encodeURIComponent(since)}&per_page=20`);
  const added = new Map();
  for (const c of commits.slice(0, 20)) {
    const detail = await gh(`/commits/${c.sha}`);
    for (const f of detail.files ?? []) {
      const m = /^docs\/articles\/([^/]+)\.md$/.exec(f.filename);
      if (f.status === 'added' && m && m[1] !== 'README' && !added.has(m[1]))
        added.set(m[1], { slug: m[1], date: detail.commit?.committer?.date ?? c.commit?.committer?.date, url: `https://github.com/${REPO}/blob/main/${f.filename}` });
    }
  }
  const all = await gh('/contents/docs/articles');
  return {
    month: `${jstNow.getUTCFullYear()}-${String(jstNow.getUTCMonth() + 1).padStart(2, '0')}`,
    added: [...added.values()],
    total: (Array.isArray(all) ? all : []).filter((f) => f.name.endsWith('.md') && f.name !== 'README.md').length,
  };
}

/* ---------- GitHub(mainのビルド結果。Cloudflare Pagesが付けるチェック) ---------- */

async function github(env) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'yamato-basecamp' };
  if (env.GITHUB_TOKEN) headers.authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const [commitRes, checksRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${REPO}/commits/main`, { headers }),
    fetch(`https://api.github.com/repos/${REPO}/commits/main/check-runs`, { headers }),
  ]);
  if (!commitRes.ok || !checksRes.ok) {
    const bad = commitRes.ok ? checksRes : commitRes;
    const msg = (await bad.text()).slice(0, 120);
    const hint = bad.status === 403 || bad.status === 429 ? '(回数制限なら GITHUB_TOKEN を入れると解消)' : '';
    throw Object.assign(new Error(`GitHub:${bad.status} ${msg}${hint}`), { status: bad.status });
  }
  const commit = await commitRes.json();
  const checks = (await checksRes.json()).check_runs ?? [];
  const pages = checks.filter((c) => /cloudflare/i.test(c.name) || /cloudflare/i.test(c.app?.slug ?? ''));
  const state = pages.length === 0 ? 'unknown' : pages.some((c) => c.status !== 'completed') ? 'building' : pages.every((c) => c.conclusion === 'success') ? 'ok' : 'failed';
  return {
    state,
    sha: commit.sha?.slice(0, 7),
    message: String(commit.commit?.message ?? '').split('\n')[0],
    committedAt: commit.commit?.committer?.date,
    checks: pages.map((c) => ({ name: c.name, conclusion: c.conclusion ?? c.status })),
  };
}

/* ---------- Microsoft Clarity(Data Export API) ---------- */

// 1日10回まで(プロジェクトごと)。ttl を3時間にして1日8回以内に収め、KV(永続キャッシュ)が無いときは取りにいかない
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const metricKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '');

async function clarity(env) {
  if (!hasPersistentCache(env))
    throw new Error('Clarityは1日10回までのため、キャッシュ(KV:BASECAMP_CACHE)が無い環境では取りにいきません');
  const res = await fetch('https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1', {
    headers: { authorization: `Bearer ${env.CLARITY_API_TOKEN}`, 'content-type': 'application/json' },
  });
  if (!res.ok) {
    const why = { 401: 'トークンが無効か期限切れ', 403: 'このトークンに権限がない', 429: '今日の上限(10回)に達した' }[res.status] ?? '';
    throw Object.assign(new Error(`Clarity:${res.status} ${why}`), { status: res.status });
  }
  const list = await res.json();
  const info = (name) => (Array.isArray(list) ? list.find((m) => metricKey(m.metricName) === metricKey(name)) : null)?.information?.[0] ?? {};
  const traffic = info('Traffic');
  const rate = (name) => num(info(name).sessionsWithMetricPercentage);
  return {
    range: '直近24時間',
    sessions: num(traffic.totalSessionCount),
    bots: num(traffic.totalBotSessionCount),
    users: num(traffic.distantUserCount),
    pagesPerSession: num(traffic.PagesPerSessionPercentage),
    deadClickRate: rate('DeadClickCount'),
    rageClickRate: rate('RageClickCount'),
    quickbackRate: rate('QuickbackClick'),
    scrollDepth: num(info('ScrollDepth').averageScrollDepth),
    activeTime: num(info('EngagementTime').activeTime),
  };
}

/* ---------- Bing Webmaster Tools ---------- */

// Bingの日付は "/Date(1693497600000-0700)/" の形
const bingDate = (s) => Number(String(s ?? '').match(/\/Date\((-?\d+)/)?.[1] ?? NaN);

async function bing(env) {
  const site = env.BING_SITE_URL || SITE;
  const call = async (method) => {
    const res = await fetch(
      `https://ssl.bing.com/webmaster/api.svc/json/${method}?siteUrl=${encodeURIComponent(site)}&apikey=${encodeURIComponent(env.BING_API_KEY)}`,
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.ErrorCode) {
      const msg = String(body.Message ?? res.status).replace(/^ERROR!+\s*/, '');
      const hint = /InvalidApiKey/i.test(msg) ? '(APIキーが違う)' : /NotAuthorized|NotFound|Site/i.test(msg) ? '(サイトがBingに登録・確認されていない)' : '';
      throw Object.assign(new Error(`Bing:${msg}${hint}`), { status: res.status });
    }
    return Array.isArray(body.d) ? body.d : [];
  };
  const [traffic, queries] = await Promise.all([call('GetRankAndTrafficStats'), call('GetQueryStats')]);
  const since = Date.now() - 7 * 86_400_000;
  const recent = traffic.filter((r) => bingDate(r.Date) >= since);
  const byQuery = new Map();
  for (const q of queries) {
    const cur = byQuery.get(q.Query) ?? { query: q.Query, clicks: 0, impressions: 0, position: 0 };
    cur.clicks += q.Clicks ?? 0;
    cur.impressions += q.Impressions ?? 0;
    cur.position = q.AvgImpressionPosition ?? cur.position;
    byQuery.set(q.Query, cur);
  }
  return {
    range: '直近7日',
    clicks: recent.reduce((t, r) => t + (r.Clicks ?? 0), 0),
    impressions: recent.reduce((t, r) => t + (r.Impressions ?? 0), 0),
    topQueries: [...byQuery.values()]
      .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
      .slice(0, 5)
      .map((q) => ({ ...q, position: Math.round(q.position * 10) / 10 })),
  };
}

/* ---------- 一覧 ---------- */

export const CONNECTORS = {
  ga4: { needs: ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GA4_PROPERTY_ID'], ttl: 600, run: ga4 },
  gsc: { needs: ['GOOGLE_SERVICE_ACCOUNT_JSON'], ttl: 6 * 3600, run: gsc },
  psi: { needs: [], ttl: 6 * 3600, run: psi },
  // 校閲の自動チェック(server/proofread.js)。記事を全文読むので1時間に1回
  proofread: { needs: ['MICROCMS_SERVICE_DOMAIN', 'MICROCMS_API_KEY'], ttl: 3600, run: proofread },
  microcms: { needs: ['MICROCMS_SERVICE_DOMAIN', 'MICROCMS_API_KEY'], ttl: 600, run: microcms },
  github: { needs: [], ttl: 300, run: github },
  plans: { needs: [], ttl: 3600, run: plans },
  // Clarityは1日10回まで。3時間ごと(1日8回)にしか取りにいかず、「取り直す」でも取りにいかない
  clarity: { needs: ['CLARITY_API_TOKEN'], ttl: 3 * 3600, noFresh: true, run: clarity },
  bing: { needs: ['BING_API_KEY'], ttl: 6 * 3600, run: bing },
};

export function missingEnv(id, env) {
  const c = CONNECTORS[id];
  if (!c) return ['(不明な連携)'];
  const missing = c.needs.filter((k) => !env[k]);
  if (c.needs.includes('GOOGLE_SERVICE_ACCOUNT_JSON') && env.GOOGLE_SERVICE_ACCOUNT_JSON && !readServiceAccount(env))
    missing.push('GOOGLE_SERVICE_ACCOUNT_JSON(JSONとして読めません)');
  return missing;
}
