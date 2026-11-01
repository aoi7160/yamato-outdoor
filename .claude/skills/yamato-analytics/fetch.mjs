/**
 * データ分析部の取得スクリプト(読むだけ。どこにも書き込まない)。
 *
 *   node .claude/skills/yamato-analytics/fetch.mjs check                    … つながるかの点検(鍵・GA4・GSC・PSI)
 *   node .claude/skills/yamato-analytics/fetch.mjs public                   … 公開サイトから数える(公開・更新本数。鍵は要らない)
 *   node .claude/skills/yamato-analytics/fetch.mjs ga4 <開始日> <終了日>     … GA4の日別の数字(日本時間)
 *   node .claude/skills/yamato-analytics/fetch.mjs ga4pages <開始日> <終了日> … GA4のページ別の数字
 *   node .claude/skills/yamato-analytics/fetch.mjs gsc <開始日> <終了日> [all] … Search Console(既定は確定値のみ。all で速報込み)
 *   node .claude/skills/yamato-analytics/fetch.mjs gscpages <開始日> <終了日>  … Search Console のページ別
 *
 * 鍵:環境変数 GA4_SA_KEY_B64(サービスアカウントのJSONをbase64にしたもの)か GOOGLE_SERVICE_ACCOUNT_JSON。
 * GA4のプロパティID:環境変数 GA4_PROPERTY_ID(数字)。GSCのプロパティ:GSC_SITE_URL(無ければ sc-domain:yamato-outdoor.com)。
 * PSI:PSI_API_KEY(無いと共有の上限で失敗しやすい)。
 * **鍵の中身は表示しない。** 出力は数字と、取れなかった理由だけ。
 */
import crypto from 'node:crypto';

const SITE = 'https://yamato-outdoor.com';
const [, , mode = 'check', from, to, opt] = process.argv;

const sa = (() => {
  try {
    if (process.env.GA4_SA_KEY_B64) return JSON.parse(Buffer.from(process.env.GA4_SA_KEY_B64, 'base64').toString());
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch {
    return { broken: true };
  }
  return null;
})();

async function token(scope) {
  if (!sa) throw new Error('未接続:鍵の環境変数(GA4_SA_KEY_B64 / GOOGLE_SERVICE_ACCOUNT_JSON)が無い');
  if (sa.broken || !sa.private_key) throw new Error('未接続:鍵の環境変数を読めない(JSON/base64が壊れている)');
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: sa.client_email, scope, aud: sa.token_uri, iat: now, exp: now + 3600 })}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key).toString('base64url');
  const r = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`取得失敗:鍵が無効(${j.error ?? r.status}: ${j.error_description ?? ''})。SETUP.md 手順4の3で鍵を作り直す`);
  return j.access_token;
}

const prop = String(process.env.GA4_PROPERTY_ID ?? '').replace(/\D/g, '');
async function ga4(body, method = 'runReport') {
  if (!prop) throw new Error('未接続:GA4_PROPERTY_ID が無い');
  const t = await token('https://www.googleapis.com/auth/analytics.readonly');
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${prop}:${method}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`取得失敗:GA4 ${r.status} ${j.error?.message ?? ''}`);
  return j;
}

const gscSite = process.env.GSC_SITE_URL || 'sc-domain:yamato-outdoor.com';
async function gsc(body) {
  const t = await token('https://www.googleapis.com/auth/webmasters.readonly');
  const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gscSite)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`取得失敗:Search Console ${r.status} ${j.error?.message ?? ''}`);
  return j;
}

const rows = (rep) =>
  (rep.rows ?? []).map((x) => [...(x.dimensionValues ?? []).map((d) => d.value), ...(x.metricValues ?? []).map((m) => Number(m.value))]);
const out = (o) => console.log(JSON.stringify({ mode, fetched_at: new Date().toISOString(), ...o }, null, 1));

const run = {
  async check() {
    const res = {};
    try {
      await token('https://www.googleapis.com/auth/analytics.readonly');
      res.key = 'OK';
    } catch (e) {
      res.key = e.message;
    }
    if (res.key === 'OK') {
      try {
        await ga4({ dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }], metrics: [{ name: 'screenPageViews' }] });
        res.ga4 = 'OK';
      } catch (e) {
        res.ga4 = e.message;
      }
      try {
        await gsc({ startDate: from ?? '2026-01-01', endDate: to ?? '2026-01-02', rowLimit: 1 });
        res.gsc = 'OK';
      } catch (e) {
        res.gsc = e.message;
      }
    } else {
      res.ga4 = res.gsc = '鍵が使えないため未確認';
    }
    const psiKey = process.env.PSI_API_KEY ? `&key=${process.env.PSI_API_KEY}` : '';
    try {
      const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(SITE + '/')}&strategy=mobile&category=performance${psiKey}`);
      const j = await r.json();
      res.psi = r.ok ? `OK(フィールドデータ:${j.loadingExperience?.metrics ? 'ページあり' : j.originLoadingExperience?.metrics ? 'オリジンのみ' : 'なし'})` : `取得失敗:${(j.error?.message ?? r.status).toString().slice(0, 90)}`;
    } catch (e) {
      res.psi = `取得失敗:${e.message}`;
    }
    out(res);
  },

  async public() {
    const sm = await (await fetch(`${SITE}/sitemap.xml`)).text();
    const urls = [...sm.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
      loc: m[1].match(/<loc>([^<]+)/)?.[1],
      lastmod: m[1].match(/<lastmod>([^<]+)/)?.[1] ?? '',
    }));
    // 記事は /<ジャンル>/<カテゴリ>/<スラッグ>/ の3階層
    const articles = urls.filter((u) => /^https:\/\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/$/.test(u.loc ?? ''));
    const rss = await (await fetch(`${SITE}/rss.xml`)).text();
    const items = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => ({
      link: m[1].match(/<link>([^<]+)/)?.[1],
      pubDate: new Date(m[1].match(/<pubDate>([^<]+)/)?.[1] ?? '').toISOString().slice(0, 10),
    }));
    out({ sitemap_urls: urls.length, articles: articles.length, articles_detail: articles, rss_items: items });
  },

  async ga4() {
    const r = await ga4(
      {
        requests: [
          { dateRanges: [{ startDate: from, endDate: to }], dimensions: [{ name: 'date' }], metrics: ['screenPageViews', 'sessions', 'activeUsers', 'newUsers', 'engagedSessions'].map((name) => ({ name })) },
          { dateRanges: [{ startDate: from, endDate: to }], dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }] },
          {
            dateRanges: [{ startDate: from, endDate: to }],
            dimensions: [{ name: 'date' }, { name: 'eventName' }],
            metrics: [{ name: 'eventCount' }],
            dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['cv_click', 'article_read', 'related_click', 'toc_click', 'click_outbound', 'share', 'page_not_found', 'web_vitals'] } } },
          },
          { dateRanges: [{ startDate: from, endDate: to }], dimensions: [{ name: 'date' }, { name: 'newVsReturning' }], metrics: [{ name: 'activeUsers' }] },
        ],
      },
      'batchRunReports',
    );
    const [totals, channels, events, ret] = r.reports.map(rows);
    // カスタムディメンション(登録していないと失敗する。失敗は「未登録」と書く)
    const custom = {};
    for (const [key, dim, ev] of [
      ['cv_stage', 'customEvent:cv_stage', 'cv_click'],
      ['affiliate_network', 'customEvent:affiliate_network', 'click_outbound'],
      ['traffic_source_kind', 'customEvent:traffic_source_kind', 'page_view'],
      ['lcp_rating', 'customEvent:lcp_rating', 'web_vitals'],
      ['inp_rating', 'customEvent:inp_rating', 'web_vitals'],
      ['cls_rating', 'customEvent:cls_rating', 'web_vitals'],
    ]) {
      try {
        custom[key] = rows(
          await ga4({
            dateRanges: [{ startDate: from, endDate: to }],
            dimensions: [{ name: 'date' }, { name: dim }],
            metrics: [{ name: 'eventCount' }],
            dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: ev } } },
          }),
        );
      } catch (e) {
        custom[key] = `未登録または取得失敗:${e.message.slice(0, 80)}`;
      }
    }
    out({ range: `${from}〜${to}`, timezone: 'GA4プロパティのタイムゾーン(日本)', totals, channels, events, newVsReturning: ret, custom });
  },

  async ga4pages() {
    const r = await ga4({
      dateRanges: [{ startDate: from, endDate: to }],
      dimensions: [{ name: 'pagePath' }],
      metrics: ['screenPageViews', 'sessions', 'userEngagementDuration', 'engagedSessions'].map((name) => ({ name })),
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 200,
    });
    const ev = await ga4({
      dateRanges: [{ startDate: from, endDate: to }],
      dimensions: [{ name: 'pagePath' }, { name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['article_read', 'related_click', 'toc_click', 'cv_click', 'click_outbound', 'scroll_depth'] } } },
      limit: 2000,
    });
    out({ range: `${from}〜${to}`, pages: rows(r), events: rows(ev) });
  },

  async gsc() {
    const dataState = opt === 'all' ? 'all' : 'final';
    const [byDate, byQuery] = await Promise.all([
      gsc({ startDate: from, endDate: to, dimensions: ['date'], dataState, type: 'web' }),
      gsc({ startDate: from, endDate: to, dimensions: ['query'], rowLimit: 5000, dataState, type: 'web' }),
    ]);
    const q = byQuery.rows ?? [];
    const brand = q.filter((x) => /yamato\s*outdoor|やまと\s*あうとどあ|ヤマト\s*アウトドア|ヤマトアウトドア/i.test(x.keys[0]));
    const sum = (a, k) => a.reduce((t, x) => t + x[k], 0);
    out({
      range: `${from}〜${to}(太平洋時間の日付)`,
      dataState,
      byDate: byDate.rows ?? [],
      queries: q.length,
      queriesTop10: q.filter((x) => x.position <= 10).length,
      brand: { queries: brand.map((x) => x.keys[0]), clicks: sum(brand, 'clicks'), impressions: sum(brand, 'impressions') },
      topQueries: [...q].sort((a, b) => b.impressions - a.impressions).slice(0, 20),
    });
  },

  async gscpages() {
    const r = await gsc({ startDate: from, endDate: to, dimensions: ['page'], rowLimit: 1000, dataState: 'final', type: 'web' });
    out({ range: `${from}〜${to}(太平洋時間の日付)`, pages: r.rows ?? [] });
  },
};

if (!run[mode]) {
  console.error(`mode は ${Object.keys(run).join(' / ')} のどれか`);
  process.exit(1);
}
if (['ga4', 'ga4pages', 'gsc', 'gscpages'].includes(mode) && !(from && to)) {
  console.error('開始日と終了日(YYYY-MM-DD)を指定してください');
  process.exit(1);
}
run[mode]().catch((e) => {
  out({ error: e.message });
  process.exit(2);
});
