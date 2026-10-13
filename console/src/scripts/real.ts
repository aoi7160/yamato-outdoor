/**
 * 実データ(API連携)を取りにいき、ダッシュボードの数字に割り当てる。
 * つながっていないもの・失敗したものは、そのままデモの数字が使われる。
 *
 * ローカルの `npm run dev` では /api が無いので、何も取れずにデモのまま動く。
 */
import type { DemoValues } from '../lib/settings';

export type ConnectorResult = { ok: boolean; configured?: boolean; missing?: string[]; error?: string; fetchedAt?: string; data?: any };
export type RealState = {
  results: Record<string, ConnectorResult>;
  /** デモの値を上書きするもの */
  values: Partial<DemoValues>;
  /** 実データになった項目と、その出どころ */
  sources: Partial<Record<keyof DemoValues, string>>;
  /** デモの数字には無い追加の情報(画面の文言に使う) */
  extra: {
    build?: { state: string; sha?: string; message?: string };
    topPages?: { title: string; pv: number }[];
    topQueries?: { query: string; position: number; clicks: number }[];
    recent?: { title: string; revisedAt: string }[];
    gscClicks?: number;
    gscRange?: string;
    cls?: number | null;
    psiSource?: string;
    cvNote?: string;
  };
};

export const LIVE_IDS = ['ga4', 'gsc', 'psi', 'microcms', 'github'] as const;

async function getJson(url: string, timeoutMs: number): Promise<any> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal, credentials: 'same-origin' });
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('json')) return { ok: false, error: `APIがありません(${res.status})` };
    return await res.json();
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.name === 'AbortError' ? '時間切れ' : 'APIに届きません' };
  } finally {
    clearTimeout(timer);
  }
}

/** 1つの連携を取りにいく。PageSpeedは初回だけ20秒ほどかかる(以後6時間キャッシュ) */
export const fetchConnector = (id: string, fresh = false) =>
  getJson(`/api/connectors/${id}${fresh ? '?fresh=1' : ''}`, id === 'psi' ? 60_000 : 15_000) as Promise<ConnectorResult>;

export const fetchStatus = () => getJson('/api/connectors', 8000);

export function emptyReal(): RealState {
  return { results: {}, values: {}, sources: {}, extra: {} };
}

/** 連携の結果を、デモの値の上書きに変換する */
export function applyResult(state: RealState, id: string, r: ConnectorResult) {
  state.results[id] = r;
  if (!r.ok || !r.data) return;
  const d = r.data;
  const set = (k: keyof DemoValues, v: unknown, src: string) => {
    if (typeof v === 'number' && Number.isFinite(v)) {
      state.values[k] = v;
      state.sources[k] = src;
    }
  };
  if (id === 'ga4') {
    set('pv', d.pv, 'GA4');
    set('organicShare', d.organicShare, 'GA4');
    set('softCv', d.softCv, 'GA4');
    state.extra.topPages = d.topPages;
    state.extra.cvNote = d.note;
  }
  if (id === 'gsc') {
    set('top10', d.top10, 'Search Console');
    state.extra.topQueries = d.topQueries;
    state.extra.gscClicks = d.clicks;
    state.extra.gscRange = d.range;
  }
  if (id === 'psi') {
    set('lcp', d.lcp, 'PageSpeed');
    if (d.inp !== null) set('inp', d.inp, 'PageSpeed');
    state.extra.cls = d.cls;
    state.extra.psiSource = d.source;
  }
  if (id === 'microcms') {
    set('publishedUpdated', d.publishedUpdatedToday, 'microCMS');
    state.extra.recent = d.recent;
  }
  if (id === 'github') state.extra.build = { state: d.state, sha: d.sha, message: d.message };
}

/** すべての連携を並行して取りにいき、届いた順に onUpdate を呼ぶ。全部そろうと resolve する */
export function loadReal(onUpdate: (s: RealState) => void, fresh = false) {
  const state = emptyReal();
  return Promise.all(
    LIVE_IDS.map((id) =>
      fetchConnector(id, fresh).then((r) => {
        applyResult(state, id, r);
        onUpdate(state);
      }),
    ),
  ).then(() => state);
}

/** 実データになった項目の出どころ(重複なし) */
export const realSourceNames = (s: RealState | null) => [...new Set(Object.values(s?.sources ?? {}))];
