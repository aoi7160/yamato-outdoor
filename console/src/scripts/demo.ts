/**
 * 定例ヒアリングの台本。19:00の定例ヒアリングの1日分を組み立てる。
 *
 * 2つのモードがある。
 *   実データモード(設定の「実データを使う」がON・既定)… つないだAPIと取り込んだCSVから分かることだけを話す。
 *     分からないことは「未接続・未取り込みのため分からない」と言い、やっていない作業(発注・差し戻し・納品など)は言わない。
 *   デモモード(OFF)… 設定の数字から、それらしい1日を作って流す(すべてイメージ。チャットの冒頭でDEMOと断る)。
 *
 * 台詞は1文が基本。ビルドの失敗・CWVの基準超え・CSVが古いなど、CEOが動く必要があるときだけ
 * 3〜5文で「何が・どれくらい・何をしてほしいか」まで書く(alertsFor と各部の台詞で同じ条件を見る)。
 *
 * 部の定義(agents/*.md)を増やすと、その部も自動で台本に入る(個別の台詞がない部は汎用の台詞)。
 * 台詞や画面の中身を足したいときは、ANSWERS / SCREENS / TILES に id をキーにして足す。
 */
import type { ClientAgent } from '../lib/org';
import type { Settings } from '../lib/settings';
import { approvalItems, type ApprovalItem } from './approvals';
import type { RealState } from './real';
import { num, yen, type ImportedTotals } from './store';

/* ---------- 需要カレンダー ---------- */

const PEAKS = [
  { m: 3, d: 1, name: '渓流解禁' },
  { m: 4, d: 29, name: 'GW・春山' },
  { m: 6, d: 10, name: '梅雨' },
  { m: 7, d: 15, name: '夏山・プライムデー' },
  { m: 10, d: 15, name: '紅葉' },
  { m: 11, d: 27, name: 'ブラックフライデー' },
  { m: 12, d: 15, name: '雪山・冬キャンプ' },
];

export function nextPeaks(today = new Date(), count = 4) {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const list = [0, 1].flatMap((dy) =>
    PEAKS.map((p) => {
      const date = new Date(base.getFullYear() + dy, p.m - 1, p.d);
      return { name: p.name, days: Math.round((date.getTime() - base.getTime()) / 86_400_000) };
    }),
  );
  return list.filter((p) => p.days >= 0).sort((a, b) => a.days - b.days).slice(0, count);
}

/* ---------- 乱数(同じ日は同じ台本になるように日付で固定) ---------- */

function seeded(seedText: string) {
  let a = [...seedText].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 1779033703);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 合計 total を count 件に分ける(10円単位、最後の1件で端数を吸収) */
function split(total: number, count: number, rnd: () => number) {
  const n = Math.max(0, Math.round(count));
  if (n === 0 || total <= 0) return [];
  const w = Array.from({ length: n }, () => 0.4 + rnd());
  const sum = w.reduce((a, b) => a + b, 0);
  const parts = w.map((x) => Math.max(10, Math.round(((total * x) / sum) / 10) * 10));
  parts[n - 1] = Math.max(0, total - parts.slice(0, -1).reduce((a, b) => a + b, 0));
  return parts;
}

const AFFILIATE_ITEMS = [
  'サロモン X ULTRA 5 MID GTX(楽天)',
  'ペツル ヘッドランプ(Amazon)',
  'モンベル レインウェア(A8.net)',
  'ダイワ 渓流ロッド(もしも)',
  'スノーピーク チタンマグ(Amazon)',
  'グレゴリー ザック(バリューコマース)',
  'イワタニ カセットガスストーブ(楽天)',
  'ブラックダイヤモンド トレッキングポール(Amazon)',
];
const GOODS_ITEMS = ['ステッカー', 'Tシャツ', 'マグカップ', 'サコッシュ', 'キャップ'];

/* ---------- 文脈(1日分の数字) ---------- */

export type DemoContext = {
  s: Settings;
  /** 実データモード(分からないことは分からないと言う)。false はデモモード */
  grounded: boolean;
  today: Date;
  peaks: ReturnType<typeof nextPeaks>;
  affiliate: { label: string; amount: number }[];
  goods: { label: string; amount: number }[];
  approvals: ApprovalItem[];
  pending: number;
  nextAuditDay: string;
  /** API連携の結果(取得中・未接続・失敗の見分けに使う) */
  results: RealState['results'];
  /** 取り込んだCSV・手入力(種類ごとの最新日) */
  imported: ImportedTotals | null;
  /** API連携で取れた追加情報と、実データになった項目 */
  extra: RealState['extra'];
  realKeys: Set<string>;
};

export function makeContext(
  base: Settings,
  pending: number,
  today = new Date(),
  imported?: ImportedTotals | null,
  live?: RealState | null,
): DemoContext {
  const rnd = seeded(today.toDateString());
  const grounded = base.useReal;
  // API連携で取れた数字で、デモの値を上書きする
  const s: Settings = live ? { ...base, values: { ...base.values, ...live.values } } : base;
  const v = s.values;
  const realKeys = new Set<string>(live ? Object.keys(live.sources) : []);
  const imp = grounded ? (imported ?? null) : null;
  if (imp?.affiliate) realKeys.add('affiliateAmount');
  if (imp?.goods) realKeys.add('suzuriAmount');
  // 取り込んだ実データは明細を持たないので、その日の合計を1行で流す(件数で割って作った明細は出さない)
  const fromImport = (t: ImportedTotals['affiliate'], what: string) =>
    t && (t.amount > 0 || t.count > 0) ? [{ label: `${what} ${md(t.date)}分(${t.count}件)`, amount: t.amount }] : [];
  const affiliate = imp?.affiliate
    ? fromImport(imp.affiliate, 'ASPの発生')
    : grounded
      ? []
      : split(v.affiliateAmount, v.affiliateCount, rnd).map((amount, i) => ({
          label: AFFILIATE_ITEMS[(i + Math.floor(rnd() * AFFILIATE_ITEMS.length)) % AFFILIATE_ITEMS.length],
          amount,
        }));
  const goods = imp?.goods
    ? fromImport(imp.goods, '販売')
    : grounded
      ? []
      : split(v.suzuriAmount, v.suzuriCount, rnd).map((amount, i) => ({
          label: GOODS_ITEMS[(i + Math.floor(rnd() * GOODS_ITEMS.length)) % GOODS_ITEMS.length],
          amount,
        }));
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return {
    s,
    grounded,
    today,
    peaks: nextPeaks(today),
    affiliate,
    goods,
    approvals: approvalItems(s),
    pending,
    nextAuditDay: `${next.getMonth() + 1}/1`,
    results: live?.results ?? {},
    imported: imp,
    extra: live?.extra ?? {},
    realKeys,
  };
}

/** その項目を「分かっている」として出してよいか(デモモードは全部イメージとして出す) */
export const known = (c: DemoContext, key: string) => !c.grounded || c.realKeys.has(key);

/* ---------- 連携の状態(実データモードで「なぜ分からないか」を言うため) ---------- */

type ConnState = 'ok' | 'pending' | 'off' | 'error';

function conn(c: DemoContext, id: string): ConnState {
  const r = c.results[id];
  if (!r) return 'pending';
  if (r.ok) return 'ok';
  return r.configured === false ? 'off' : 'error';
}

/** 「Search Consoleが未接続のため」のような、分からない理由 */
function why(c: DemoContext, id: string, name: string) {
  const st = conn(c, id);
  if (st === 'pending') return `${name}から取得中のため`;
  if (st === 'off') return `${name}が未接続のため`;
  return `${name}の取得に失敗したため(${cut(c.results[id]?.error ?? '理由不明', 24)})`;
}

const STATE_TEXT: Record<ConnState, string> = { ok: '取得済み', pending: '取得中', off: '未接続', error: '取得失敗' };

const DAY = 86_400_000;
const daysSince = (iso: string, today: Date) => {
  const d = new Date(`${iso}T00:00:00`);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Number.isNaN(d.getTime()) ? 0 : Math.round((t.getTime() - d.getTime()) / DAY);
};

/** 取り込んだCSVがこれより古ければ、取り込み直してもらう */
const STALE_DAYS = 7;
/** 需要の山の何日前を公開目標にするか(Googleカレンダーの「公開目標」と同じ6週間) */
const PUBLISH_LEAD_DAYS = 42;

/** 公開目標日が1週間以内に来る需要の山 */
function publishDue(c: DemoContext) {
  return c.peaks
    .map((p) => ({ ...p, target: p.days - PUBLISH_LEAD_DAYS }))
    .find((p) => p.target >= 0 && p.target <= 7);
}

/** 月次の締め(事業報告部):月末3日間は回収、1〜3日はP&Lの確定、4〜5日は社内版の報告書 */
function closingPhase(today: Date): { kind: 'collect' | 'close' | 'report'; text: string } | null {
  const d = today.getDate();
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  if (d >= last - 2) return { kind: 'collect', text: `${today.getMonth() + 1}月の締めの回収` };
  if (d <= 3) return { kind: 'close', text: `月次P&Lの確定(${today.getMonth() + 1}/3)` };
  if (d <= 5) return { kind: 'report', text: `月次事業報告書の提出(${today.getMonth() + 1}/5)` };
  return null;
}

/**
 * CEOが動く必要があること(実データモードのみ)。日報でまとめて伝え、各部の台詞も同じ条件で長くする。
 * 条件を足すときは、ここと該当の部の台詞(GROUNDED)の両方に足す。
 */
export function alertsFor(c: DemoContext): string[] {
  if (!c.grounded) return [];
  const out: string[] = [];
  const v = c.s.values;
  const due = publishDue(c);
  if (due) out.push(`「${due.name}」の公開目標まであと${due.target}日`);
  if (c.extra.build?.state === 'failed') out.push('mainのビルド失敗');
  if (c.realKeys.has('lcp') && v.lcp > 2.5) out.push(`LCP ${sec(v.lcp)}秒(基準2.5秒)`);
  if (c.realKeys.has('inp') && v.inp > 200) out.push(`INP ${v.inp}ms(基準200ms)`);
  if (pvLooksBroken(c)) out.push('PVが0(計測タグの確認)');
  const dead = c.extra.clarity?.deadClickRate;
  if (dead != null && dead > 10) out.push(`デッドクリック${dead}%`);
  for (const [k, name] of [['affiliate', 'ASP'], ['goods', 'SUZURI']] as const) {
    const t = c.imported?.[k];
    if (t && daysSince(t.date, c.today) > STALE_DAYS) out.push(`${name}のデータが${daysSince(t.date, c.today)}日前で止まっている`);
  }
  const close = closingPhase(c.today);
  if (close) out.push(close.text);
  return out;
}

/** 昼を過ぎてもPVが0なら、記事が読まれていないより計測タグが止まっている方を疑う */
const pvLooksBroken = (c: DemoContext) => c.realKeys.has('pv') && c.s.values.pv === 0 && c.today.getHours() >= 12;

/* ---------- KPIタイル ---------- */

export type Tile = { label: string; value: string; sub?: string; real?: boolean };

const NA = '—';

const TILES: Record<string, (c: DemoContext) => Tile> = {
  planning: (c) => ({ label: '次の需要の山まで', value: `${c.peaks[0]?.days ?? NA}日`, sub: c.peaks[0]?.name, real: c.grounded }),
  seo: (c) =>
    c.realKeys.has('top10')
      ? { label: '10位以内のクエリ(7日)', value: `${num(c.s.values.top10)}件`, sub: `クリック ${num(c.extra.gscClicks ?? 0)}`, real: true }
      : c.grounded
        ? { label: '10位以内のクエリ(7日)', value: NA, sub: `Search Console ${STATE_TEXT[conn(c, 'gsc')]}` }
        : { label: '10位以内のKW', value: `${num(c.s.values.top10)}件`, sub: `AI引用 ${c.s.values.aiCitations}件` },
  content: (c) =>
    c.grounded
      ? {
          label: '公開・更新(本日)',
          value: c.realKeys.has('publishedUpdated') ? `${c.s.values.publishedUpdated}本` : NA,
          sub: c.realKeys.has('publishedUpdated') ? 'microCMS' : `microCMS ${STATE_TEXT[conn(c, 'microcms')]}`,
          real: c.realKeys.has('publishedUpdated'),
        }
      : { label: '公開・更新(本日)', value: `${c.s.values.publishedUpdated}本`, sub: `下書き ${c.s.values.draftsReady}本` },
  editorial: (c) =>
    c.grounded
      ? { label: '審査(本日)', value: NA, sub: '審査の記録 未接続' }
      : { label: '審査(本日)', value: `${c.s.values.reviewed}本`, sub: `差し戻し ${c.s.values.rejects}件` },
  creative: (c) =>
    c.grounded ? { label: '納品(本日)', value: NA, sub: '納品の記録 未接続' } : { label: '納品(本日)', value: `${c.s.values.assets}点`, sub: 'alt設定 100%' },
  dev: (c) => {
    const vitals = c.realKeys.has('lcp')
      ? `LCP ${c.s.values.lcp}s${c.realKeys.has('inp') ? `・INP ${c.s.values.inp}ms` : ''}`
      : c.grounded
        ? `PageSpeed ${STATE_TEXT[conn(c, 'psi')]}`
        : `LCP ${c.s.values.lcp}s・INP ${c.s.values.inp}ms`;
    return { label: 'mainのビルド', value: buildLabel(c), sub: vitals, real: !!c.extra.build || c.realKeys.has('lcp') };
  },
  affiliate: (c) =>
    known(c, 'affiliateAmount')
      ? { label: c.imported?.affiliate ? `発生(${md(c.imported.affiliate.date)}分)` : '本日の発生', value: yen(sum(c.affiliate)), sub: `${c.imported?.affiliate?.count ?? c.affiliate.length}件`, real: c.grounded }
      : { label: '発生', value: NA, sub: 'CSV未取り込み' },
  sns: () => ({ label: 'SNS経由の登録', value: NA, sub: '準備中' }),
  goods: (c) =>
    known(c, 'suzuriAmount')
      ? { label: c.imported?.goods ? `トリブン(${md(c.imported.goods.date)}分)` : 'SUZURI(トリブン)', value: yen(sum(c.goods)), sub: `${c.imported?.goods?.count ?? c.goods.length}点`, real: c.grounded }
      : { label: 'SUZURI(トリブン)', value: NA, sub: '未入力' },
  analytics: (c) =>
    known(c, 'pv')
      ? { label: '本日のPV', value: num(c.s.values.pv), sub: `自然検索 ${c.s.values.organicShare}%`, real: c.grounded }
      : { label: '本日のPV', value: NA, sub: `GA4 ${STATE_TEXT[conn(c, 'ga4')]}` },
  legal: (c) => (c.grounded ? { label: '未解決の指摘', value: NA, sub: `次の監査 ${c.nextAuditDay}` } : { label: '未解決の指摘', value: '0件', sub: `次の監査 ${c.nextAuditDay}` }),
  reporting: () => ({ label: '今月の営業利益(見込み)', value: NA, sub: 'P&L台帳(Notion) 未接続' }),
};

export const tileFor = (a: ClientAgent, c: DemoContext): Tile =>
  TILES[a.id]?.(c) ?? { label: a.kpi[0]?.label ?? '本日', value: '—', sub: a.kpi[0]?.source };

export const sum = (xs: { amount: number }[]) => xs.reduce((t, x) => t + x.amount, 0);

const BUILD_LABEL: Record<string, string> = { ok: 'OK', failed: '失敗', building: 'ビルド中', unknown: '—' };
const buildLabel = (c: DemoContext) =>
  c.extra.build ? (BUILD_LABEL[c.extra.build.state] ?? '—') : c.grounded ? STATE_TEXT[conn(c, 'github')] : 'OK';
/** 秒は小数1桁でそろえる(2 → 2.0) */
const sec = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
const cut = (s: string, n = 18) => (s.length > n ? `${s.slice(0, n)}…` : s);
const md = (iso: string) => {
  // 「2026-10-12」のような日付だけの文字列は、時差でずれないように文字のまま読む
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (ymd) return `${Number(ymd[2])}/${Number(ymd[3])}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}/${d.getDate()}`;
};

/* ---------- ミニ画面 ---------- */

export type Row = { label: string; value: string; tone?: 'good' | 'warn' | 'bad' | 'total' };
export type Screen = { title: string; rows: Row[] };

const SCREENS: Record<string, (c: DemoContext) => Screen> = {
  'demand-calendar': (c) => ({
    title: '需要カレンダー',
    rows: c.peaks.map((p, i) => ({ label: p.name, value: `あと${p.days}日`, tone: i === 0 ? 'warn' : undefined })),
  }),
  'rank-tracker': (c) =>
    c.extra.topQueries?.length
      ? {
          title: `Search Console — 直近7日`,
          rows: [
            ...c.extra.topQueries.slice(0, 4).map((q) => ({
              label: q.query,
              value: `${q.position}位・${q.clicks}クリック`,
              tone: q.position <= 10 ? ('good' as const) : undefined,
            })),
            ...(c.extra.bing ? [{ label: 'Bing(7日)', value: `${num(c.extra.bing.clicks)}クリック・${num(c.extra.bing.impressions)}表示` }] : []),
            { label: '10位以内のクエリ', value: `${num(c.s.values.top10)}件`, tone: 'total' as const },
          ],
        }
      : c.grounded
        ? { title: 'Search Console — 直近7日', rows: [{ label: 'Search Console', value: STATE_TEXT[conn(c, 'gsc')] }] }
        : {
    title: 'Rank Tracker — 今日の変動(DEMO)',
    rows: [
      { label: 'サロモン 登山靴', value: '5位 →' },
      { label: 'ナイトハイク 装備', value: '9位 ↑3', tone: 'good' },
      { label: '登山靴 防水 比較', value: '14位 ↑2', tone: 'good' },
      { label: '渓流 入門 装備', value: '圏外' },
      { label: '10位以内', value: `${num(c.s.values.top10)}件`, tone: 'total' },
    ],
  },
  'microcms-drafts': (c) => {
    if (c.extra.recent?.length)
      return {
        title: 'microCMS — 最近の更新',
        rows: c.extra.recent.map((r) => ({ label: r.title, value: `更新 ${md(r.revisedAt)}`, tone: 'good' as const })),
      };
    if (c.grounded) return { title: 'microCMS — 最近の更新', rows: [{ label: 'microCMS', value: STATE_TEXT[conn(c, 'microcms')] }] };
    const titles = ['冬キャンプの暖房、何を選ぶか', '紅葉の六甲山、日帰りの装備', '渓流釣りを始める前に揃えるもの', '雨の日の山、レインウェアの選び方'];
    const rows: Row[] = titles.slice(0, Math.max(1, c.s.values.draftsReady)).map((t, i) => ({
      label: t,
      value: i === 0 && c.s.values.rejects > 0 ? '差し戻し' : '校閲待ち',
      tone: i === 0 && c.s.values.rejects > 0 ? 'bad' : 'warn',
    }));
    rows.push({ label: 'ナイトハイクの始め方(リライト)', value: '承認待ち', tone: 'good' });
    return { title: 'microCMS — 下書き(DEMO)', rows };
  },
  checklist: (c) => {
    const items = ['表記ゆれ・数字と単位', 'タイトル30〜35字・概要80〜120字', '価格・スペックの出典と確認日', 'pr-notice(広告の明示)', 'persona.md との整合'];
    // 実データモードでは、項目だけ出して結果は出さない(審査の記録がまだつながっていない)
    if (c.grounded) return { title: '公開前チェックリスト(審査の記録 未接続)', rows: items.map((label) => ({ label, value: NA })) };
    const bad = (i: number) => i === 2 && c.s.values.rejects > 0;
    return {
      title: '公開前チェックリスト(DEMO)',
      rows: items.map((label, i) => ({ label, value: bad(i) ? '✕' : '✓', tone: bad(i) ? ('bad' as const) : ('good' as const) })),
    };
  },
  'production-queue': (c) => {
    if (c.grounded) return { title: '制作キュー', rows: [{ label: '納品の記録', value: '未接続' }] };
    const items = ['サムネ:冬キャンプの暖房', '図解:秋のレイヤリング', 'サムネ:紅葉の六甲山', '図解:渓流の装備リスト', 'グッズ清書:冬ステッカー', 'シネマグラフ候補'];
    return {
      title: '制作キュー(DEMO)',
      rows: items.slice(0, Math.max(c.s.values.assets + 1, 3)).map((t, i) => ({
        label: t,
        value: i < c.s.values.assets ? '納品' : '制作中',
        tone: i < c.s.values.assets ? 'good' : undefined,
      })),
    };
  },
  'build-vitals': (c) => {
    const b = c.extra.build;
    const lab = c.extra.psiSource === 'lab';
    const cls = c.extra.cls ?? (c.grounded ? null : 0.02);
    const v = c.s.values;
    const psi = STATE_TEXT[conn(c, 'psi')];
    return {
      title: 'Build / Core Web Vitals',
      rows: [
        {
          label: b?.sha ? `main ビルド(${b.sha})` : 'main ビルド',
          value: buildLabel(c),
          tone: b ? (b.state === 'ok' ? 'good' : b.state === 'failed' ? 'bad' : 'warn') : c.grounded ? undefined : 'good',
        },
        known(c, 'lcp')
          ? { label: lab ? 'LCP(ラボ値)' : 'LCP p75', value: `${v.lcp}s`, tone: v.lcp <= 2.5 ? 'good' : 'bad' }
          : { label: 'LCP', value: psi },
        known(c, 'inp')
          ? { label: 'INP p75', value: `${v.inp}ms`, tone: v.inp <= 200 ? 'good' : 'bad' }
          : { label: 'INP p75', value: conn(c, 'psi') === 'ok' ? '実測待ち' : psi },
        cls == null ? { label: 'CLS', value: psi } : { label: 'CLS', value: String(Math.round(cls * 100) / 100), tone: cls <= 0.1 ? 'good' : 'bad' },
      ],
    };
  },
  'asp-dashboard': (c) => ({ title: c.grounded ? 'ASP — 取り込んだCSVの最新日' : 'ASP管理画面 — 本日の発生', rows: [] }),
  'suzuri-sales': (c) => ({ title: c.grounded ? 'SUZURI — 入力した売上の最新日' : 'SUZURI — 本日の売上', rows: [] }),
  'post-queue': () => ({
    title: '投稿キュー — 予約一覧',
    rows: [
      { label: '07:00 記事告知(X)', value: '準備中', tone: 'warn' },
      { label: '12:00 装備の図解(Instagram)', value: '準備中', tone: 'warn' },
      { label: '20:00 山行の記録(Threads)', value: '準備中', tone: 'warn' },
    ],
  }),
  'ga4-today': (c) => {
    const cl = c.extra.clarity;
    const clarityRows: Row[] = [
      ...(cl?.deadClickRate != null
        ? [{ label: 'デッドクリック(Clarity)', value: `${cl.deadClickRate}%`, tone: cl.deadClickRate > 10 ? ('warn' as const) : undefined }]
        : []),
      ...(cl?.scrollDepth != null ? [{ label: 'スクロールの深さ(Clarity)', value: `${Math.round(cl.scrollDepth)}%` }] : []),
    ];
    if (!known(c, 'pv')) return { title: 'GA4 — 本日', rows: [{ label: 'GA4', value: STATE_TEXT[conn(c, 'ga4')] }, ...clarityRows] };
    const top = c.extra.topPages?.[0];
    return {
      title: 'GA4 — 本日',
      rows: [
        { label: 'PV', value: num(c.s.values.pv) },
        { label: '自然検索の割合', value: `${c.s.values.organicShare}%` },
        { label: 'soft CV', value: `${c.s.values.softCv}件`, tone: c.s.values.softCv > 0 ? 'good' : undefined },
        { label: 'よく読まれた記事', value: top ? cut(top.title, 14) : c.grounded ? NA : 'サロモン登山靴' },
        ...clarityRows,
      ],
    };
  },
  audit: (c) => {
    const items = ['外部送信の公表(/privacy)', '広告表記・ステマ規制', '画像の権利', 'グッズの商標'];
    if (c.grounded)
      return {
        title: `監査 — 次は${c.nextAuditDay}`,
        rows: [...items.map((label) => ({ label, value: NA })), { label: '監査の記録', value: '未接続' }],
      };
    return {
      title: '監査 — 月次(DEMO)',
      rows: [
        { label: items[0], value: '一致', tone: 'good' },
        { label: items[1], value: 'OK', tone: 'good' },
        { label: items[2], value: 'OK', tone: 'good' },
        { label: items[3], value: '確認中', tone: 'warn' },
      ],
    };
  },
  'pl-ledger': (c) => {
    const close = closingPhase(c.today);
    const last = new Date(c.today.getFullYear(), c.today.getMonth() + 1, 0);
    const sales = c.imported?.affiliate || c.imported?.goods;
    return {
      title: `今月の台帳 — ${c.today.getMonth() + 1}月`,
      rows: [
        {
          label: '売上(取り込み済みの最新日)',
          value: sales ? yen((c.imported?.affiliate?.amount ?? 0) + (c.imported?.goods?.amount ?? 0)) : c.grounded ? 'CSV未取り込み' : NA,
        },
        { label: '費用', value: 'P&L台帳 未接続' },
        { label: '作業時間', value: '作業時間ログ 未接続' },
        { label: '次の締め日', value: `${last.getMonth() + 1}/${last.getDate()}`, tone: close ? 'warn' : undefined },
      ],
    };
  },
};

export const screenFor = (a: ClientAgent, c: DemoContext): Screen =>
  SCREENS[a.screen]?.(c) ?? { title: a.name, rows: [{ label: '本日の作業', value: '予定どおり' }] };

/** 売上が積み上がっていくミニ画面の行 */
export function moneyRows(items: { label: string; amount: number }[], emptyLabel: string): Row[] {
  if (items.length === 0) return [{ label: emptyLabel, value: '—' }];
  return [
    ...items.slice(-4).map((x) => ({ label: x.label, value: `+${yen(x.amount)}`, tone: 'good' as const })),
    { label: '合計', value: yen(sum(items)), tone: 'total' as const },
  ];
}

/** 売上のミニ画面が空のときの1行(実データモードでは「0円」と「まだ分からない」を分ける) */
export function moneyEmptyLabel(c: DemoContext, kind: 'affiliate' | 'goods') {
  const t = c.imported?.[kind];
  if (t) return `${md(t.date)}分の発生なし`;
  if (c.grounded) return kind === 'affiliate' ? 'CSV未取り込み' : '売上 未入力';
  return kind === 'affiliate' ? 'まだ発生していません' : 'まだ売れていません';
}

/* ---------- 台詞 ---------- */

/** 作業中に活動ログへ流す一言(デモ) */
const WORK: Record<string, string> = {
  planning: '需要カレンダーから明日の発注を作成中',
  seo: '順位・インデックス・リンク切れの差分を確認中',
  content: '下書きを入稿中',
  editorial: '公開前チェックリストを確認中',
  creative: 'サムネイルを書き出し中',
  dev: 'mainのビルドとCore Web Vitalsを確認中',
  affiliate: 'ASPの発生をCSVと突き合わせ中',
  sns: '投稿案をキューに整理中',
  goods: 'SUZURIの売上を確認中',
  analytics: '本日の数字を集計中',
  legal: '外部送信一覧と /privacy を照合中',
  reporting: '本日の売上・費用・作業時間を台帳に記帳中',
};

/** 実データモードの活動ログ。コンソールが実際にやっていること(データの取得)だけを書く */
const WORK_GROUNDED: Record<string, string> = {
  planning: '需要カレンダーを確認',
  seo: 'Search Console・Bingの直近7日を取得',
  content: 'microCMSの更新を取得',
  dev: 'GitHubのビルド結果とPageSpeed Insightsを取得',
  affiliate: '取り込み済みのASPのCSVを確認',
  goods: '入力済みのSUZURIの売上を確認',
  analytics: 'GA4・Clarityの数字を取得',
};

/** デモの台詞(設定の数字から作るイメージ) */
const ANSWERS: Record<string, (c: DemoContext) => string> = {
  planning: (c) => {
    const [p0, p1] = c.peaks;
    return `次の需要の山「${p0?.name}」まで${p0?.days}日。その次の「${p1?.name}」(${p1?.days}日後)に向けた比較記事を発注しました`;
  },
  seo: (c) => `10位以内は${num(c.s.values.top10)}件。「ナイトハイク 装備」が9位に上がりました。AI回答での引用は${c.s.values.aiCitations}件です`,
  content: (c) => `下書き${c.s.values.draftsReady}本を校閲に出しました。本日の公開・更新は${c.s.values.publishedUpdated}本です`,
  editorial: (c) => `${c.s.values.reviewed}本審査、${c.s.values.rejects}本差し戻し。公開済み記事の価格・廃番チェックは異常なしです`,
  creative: (c) => `サムネ・図解を${c.s.values.assets}点納品。altも設定済みです`,
  dev: (c) => {
    const ok = c.s.values.lcp <= 2.5 && c.s.values.inp <= 200;
    return `mainのビルドOK。LCP ${c.s.values.lcp}秒・INP ${c.s.values.inp}msで${ok ? '基準内です' : '基準を超えています。改善案を作ります'}`;
  },
  affiliate: (c) =>
    c.affiliate.length > 0
      ? `本日の発生は${yen(sum(c.affiliate))}(${c.affiliate.length}件)。提携状況に変化はありません`
      : '本日の発生はまだありません。登山靴の記事の案件の並び順を見直す案を作っています',
  sns: () => 'アカウントの準備待ちです。投稿案を3本キューに溜めています',
  goods: (c) =>
    c.goods.length > 0
      ? `SUZURIで${c.goods.length}点、トリブン${yen(sum(c.goods))}です`
      : '本日の販売はありません。冬の新作ラフを作成中で、商標を法務に確認依頼しました',
  analytics: (c) => `本日${num(c.s.values.pv)}PV(自然検索${c.s.values.organicShare}%)。soft CVは${c.s.values.softCv}件です`,
  legal: (c) => `確認依頼は0件。${c.nextAuditDay}の月次監査に向けて外部送信一覧を照合中です`,
  reporting: (c) =>
    `本日の売上${yen(sum(c.affiliate) + sum(c.goods))}を台帳に記帳しました。月末の締めに向けて、費用2件の領収書が未回収です`,
};

/** 売上(CSV・手入力)の報告。古いデータしかないときは、取り込み直してほしいところまで言う */
function salesAnswer(c: DemoContext, kind: 'affiliate' | 'goods') {
  const t = c.imported?.[kind];
  const name = kind === 'affiliate' ? 'ASPの発生' : 'SUZURIのトリブン';
  const unit = kind === 'affiliate' ? '件' : '点';
  if (!t)
    return kind === 'affiliate'
      ? 'ASPのCSVがまだ取り込まれていないため、発生額は分かりません(「データ取り込み」から入れられます)'
      : 'SUZURIの売上がまだ入力されていないため、トリブンは分かりません(「データ取り込み」から入れられます)';
  const age = daysSince(t.date, c.today);
  const fact = `取り込み済みの最新は${md(t.date)}分で、${name}は${yen(t.amount)}(${t.count}${unit})です`;
  if (age <= STALE_DAYS) return fact;
  return [
    `${fact}。`,
    `${age}日前のデータなので、それ以降の売上はコンソールでは分かりません。`,
    kind === 'affiliate'
      ? 'ASP各社の管理画面から直近の成果のCSVを書き出して、「データ取り込み」に入れてください。'
      : 'SUZURIの管理画面で直近の売上を確認して、「データ取り込み」に入力してください。',
  ].join('');
}

/**
 * 実データモードの台詞。つないだデータで分かることだけを言う。
 * 1文が基本。alertsFor と同じ条件に当たったときだけ、3〜5文で「何が・どれくらい・何をしてほしいか」まで言う。
 */
const GROUNDED: Record<string, (c: DemoContext) => string> = {
  planning: (c) => {
    const [p0, p1] = c.peaks;
    const base = `次の需要の山は「${p0?.name}」まで${p0?.days}日、その次は「${p1?.name}」まで${p1?.days}日です`;
    const due = publishDue(c);
    if (!due) return base;
    return [
      `${base}。`,
      due.target === 0
        ? `今日が「${due.name}」の公開目標日(山の6週間前)です。`
        : `「${due.name}」の公開目標日(山の6週間前)まで、あと${due.target}日です。`,
      '目標どおりに出すなら、今週中に記事のテーマと担当を決める必要があります。',
      '発注の記録はまだコンソールにつながっていないので、決まったらカレンダーの編集会議の予定に書き込んでください。',
    ].join('');
  },
  seo: (c) => {
    if (!c.realKeys.has('top10')) return `${why(c, 'gsc', 'Search Console')}、検索の順位とクリックは分かりません`;
    const q = c.extra.topQueries?.[0];
    const bing = c.extra.bing ? `。Bingは${num(c.extra.bing.clicks)}クリック・${num(c.extra.bing.impressions)}表示です` : '';
    return (
      `直近7日で10位以内のクエリは${num(c.s.values.top10)}件・クリック${num(c.extra.gscClicks ?? 0)}回` +
      (q ? `で、いちばん多いのは「${q.query}」(${q.position}位)です` : 'です') +
      bing
    );
  },
  content: (c) => {
    if (!c.realKeys.has('publishedUpdated')) return `${why(c, 'microcms', 'microCMS')}、本日の公開・更新本数は分かりません`;
    const r = c.extra.recent?.[0];
    return `本日の公開・更新は${c.s.values.publishedUpdated}本です` + (r ? `(最近の更新は「${cut(r.title, 20)}」${md(r.revisedAt)})` : '');
  },
  editorial: () => '審査・差し戻しの記録はまだコンソールにつながっていないため、今日の件数は報告できません',
  creative: () => '制作・納品の記録はまだコンソールにつながっていないため、今日の点数は報告できません',
  dev: (c) => {
    const b = c.extra.build;
    const v = c.s.values;
    const lab = c.extra.psiSource === 'lab' ? '(ラボ値)' : '(実ユーザーのp75)';
    const lcpBad = c.realKeys.has('lcp') && v.lcp > 2.5;
    const inpBad = c.realKeys.has('inp') && v.inp > 200;
    // 表示速度が基準を超えているときに足す文
    const slow = [
      lcpBad ? `LCPが${sec(v.lcp)}秒${lab}で、基準の2.5秒より遅いです。` : '',
      inpBad ? `INPが${v.inp}msで、基準の200msより反応が遅いです。` : '',
      lcpBad || inpBad ? 'PageSpeed Insightsの「改善できる項目」で、どのファイルが重いかを確認してください。' : '',
    ];
    if (b?.state === 'failed')
      return [
        `mainのビルドが失敗しています(${b.sha}「${cut(b.message ?? '', 20)}」)。`,
        'サイトは直前に成功した版のまま表示されていますが、このコミット以降の変更は本番に出ていません。',
        'Cloudflare Pagesのビルドログで、失敗した行を確認してください。',
        ...slow,
      ].join('');
    const build =
      b?.state === 'ok' ? `mainのビルドはOK(${b.sha})` : b?.state === 'building' ? `mainはビルド中(${b.sha})` : `${why(c, 'github', 'GitHub')}ビルドの結果は不明`;
    if (!c.realKeys.has('lcp')) return `${build}です。${why(c, 'psi', 'PageSpeed Insights')}、表示速度は分かりません`;
    const inp = c.realKeys.has('inp') ? `・INP ${v.inp}ms` : '';
    if (!lcpBad && !inpBad)
      return `${build}、LCP ${sec(v.lcp)}秒${inp}${lab}で基準内です` + (c.realKeys.has('inp') ? '' : '(INPは実ユーザーの値がまだありません)');
    return [`${build}ですが、表示速度が基準を超えています。`, ...slow.slice(0, 2), '表示の遅さは検索の評価と途中の離脱の両方に効きます。', slow[2]].join('');
  },
  affiliate: (c) => salesAnswer(c, 'affiliate'),
  goods: (c) => salesAnswer(c, 'goods'),
  sns: () => 'SNSのアカウントが準備中のため、報告はありません',
  analytics: (c) => {
    const cl = c.extra.clarity;
    const dead = cl?.deadClickRate;
    if (!c.realKeys.has('pv')) {
      const head = `${why(c, 'ga4', 'GA4')}、今日のPVは分かりません`;
      return dead != null ? `${head}(Clarityのデッドクリックは${dead}%)` : head;
    }
    const v = c.s.values;
    if (pvLooksBroken(c))
      return [
        '今日のPVが、昼を過ぎても0のままです。',
        '記事が読まれていないというより、計測タグが止まっている可能性の方が高いです。',
        'CloudflareのProductionの環境変数にGA4の測定IDが入っているかと、公開サイトでタグが読み込まれているかを確認してください。',
      ].join('');
    const base = `本日${num(v.pv)}PV(自然検索${v.organicShare}%)、soft CVは${v.softCv}件`;
    if (dead == null) return `${base}です`;
    if (dead <= 10) return `${base}で、Clarityのデッドクリックは${dead}%です`;
    return [
      `${base}です。`,
      `Clarityでは、直近24時間のセッションの${dead}%でデッドクリック(押しても何も起きない場所のクリック)が出ています。`,
      '10%を超えているので、押せそうに見えて押せない場所があるはずです。',
      'Clarityのヒートマップで、どのページのどこが押されているかを確認してください。',
    ].join('');
  },
  legal: (c) => `次の月次監査は${c.nextAuditDay}です(監査の記録はまだつながっていないため、未解決の指摘の件数は出せません)`,
  reporting: (c) => {
    const head = 'P&L台帳と作業時間ログ(Notion)がまだつながっていないため、今月の営業利益は出せません';
    const close = closingPhase(c.today);
    if (!close) return head;
    const m = c.today.getMonth() + 1;
    const until = (day: number) => (day === c.today.getDate() ? '今日' : `あと${day - c.today.getDate()}日`);
    const notLinked = 'P&L台帳(Notion)はまだコンソールにつながっていないので';
    const lines: Record<typeof close.kind, string[]> = {
      collect: [
        `月末なので、${close.text}の時期です。`,
        '今月の費用の領収書・作業時間・山行の記録を集めてください。',
        `${((c.today.getMonth() + 1) % 12) + 1}/3に月次P&Lを確定するため、それまでにそろっている必要があります。`,
        `なお、${head}。`,
      ],
      close: [
        `${m}/3は月次P&Lの確定日です(${until(3)})。`,
        '先月分の売上(ASP・SUZURI)・費用・作業時間がそろっているかを確認してください。',
        `${notLinked}、数字はNotionで直接確認してください。`,
      ],
      report: [
        `${m}/5は月次事業報告書(社内版)の提出日です(${until(5)})。`,
        `${notLinked}、報告書の数字はNotionのP&L台帳から引いてください。`,
      ],
    };
    return lines[close.kind].join('');
  },
};

const answerFor = (a: ClientAgent, c: DemoContext) =>
  c.grounded
    ? (GROUNDED[a.id]?.(c) ?? 'この部のデータはまだコンソールにつながっていないため、本日の報告はありません')
    : (ANSWERS[a.id]?.(c) ?? '本日の作業は予定どおりです');

const workFor = (a: ClientAgent, c: DemoContext) =>
  c.grounded ? (WORK_GROUNDED[a.id] ?? 'データの接続待ち') : (WORK[a.id] ?? '本日の作業を確認中');

/* ---------- 台本 ---------- */

export type ReportType = '定例' | '速報' | '相談' | '差し戻し' | '承認依頼' | '日報';

export type Step =
  | { t: number; kind: 'say'; from: string; text: string; type: ReportType; href?: string }
  | { t: number; kind: 'typing'; from: string }
  | { t: number; kind: 'work'; agent: string; member: number; on: boolean }
  | { t: number; kind: 'log'; agent: string; text: string }
  | { t: number; kind: 'money'; agent: 'affiliate' | 'goods'; label: string; amount: number }
  | { t: number; kind: 'cv'; label: string }
  | { t: number; kind: 'tile'; agent: string }
  | { t: number; kind: 'published' };

export function buildScript(agents: ClientAgent[], c: DemoContext): Step[] {
  const L = Math.max(30, c.s.loopSeconds);
  const shown = agents.filter((a) => a.id !== 'executive');
  const steps: Step[] = [];
  const slot = (L - 10) / Math.max(1, shown.length);
  const start = 3;

  steps.push({
    t: 0.4,
    kind: 'say',
    from: 'executive',
    type: '定例',
    text: c.grounded
      ? '定例ヒアリングを始めます。各部、つながっているデータで分かることだけ、1〜2行でお願いします'
      : '定例ヒアリングを始めます(DEMO:数字と出来事はすべてイメージです)。各部、1〜2行でお願いします',
  });

  shown.forEach((a, i) => {
    const s = start + i * slot;
    const member = a.members.length > 0 ? i % a.members.length : 0;
    steps.push({ t: s, kind: 'log', agent: a.id, text: workFor(a, c) });
    steps.push({ t: s, kind: 'work', agent: a.id, member, on: true });
    steps.push({ t: s + slot * 0.15, kind: 'say', from: 'executive', type: '定例', text: `${a.short}部、今日どう?` });

    // 売上・CVは、その部が答えるまでに少しずつ入る(実データモードでは、分かっているものだけ)
    const spread = (n: number, i2: number) => 1.5 + ((s + slot * 0.3 - 1.5) * (i2 + 1)) / (n + 1);
    if (a.id === 'affiliate')
      c.affiliate.forEach((x, k) => steps.push({ t: spread(c.affiliate.length, k), kind: 'money', agent: 'affiliate', ...x }));
    if (a.id === 'goods')
      c.goods.forEach((x, k) => steps.push({ t: spread(c.goods.length, k), kind: 'money', agent: 'goods', label: `SUZURI ${x.label}`, amount: x.amount }));
    if (a.id === 'analytics' && known(c, 'softCv'))
      for (let k = 0; k < c.s.values.softCv; k++) steps.push({ t: spread(c.s.values.softCv, k), kind: 'cv', label: 'soft CV(記事末から)' });

    steps.push({ t: s + slot * 0.3, kind: 'typing', from: a.id });
    steps.push({ t: s + slot * 0.5, kind: 'say', from: a.id, type: '定例', text: answerFor(a, c) });
    steps.push({ t: s + slot * 0.5, kind: 'tile', agent: a.id });
    steps.push({ t: s + slot * 0.55, kind: 'work', agent: a.id, member, on: false });
    if (a.id === 'content' && known(c, 'publishedUpdated') && c.s.values.publishedUpdated > 0) steps.push({ t: s + slot * 0.5, kind: 'published' });

    // ここから下は、実際には起きていない出来事(差し戻し・承認依頼)。デモモードでだけ流す
    if (c.grounded) return;

    if (a.id === 'editorial' && c.s.values.rejects > 0)
      steps.push({
        t: s + slot * 0.75,
        kind: 'say',
        from: 'editorial',
        type: '差し戻し',
        text: '制作部へ:「冬キャンプの暖房」の下書き、ストーブの重量がメーカー公式と不一致です。出典URLと確認日を添えて直してください',
      });

    c.approvals
      .filter((ap) => ap.from === a.id)
      .forEach((ap, k) =>
        steps.push({
          t: s + slot * (0.85 + k * 0.05),
          kind: 'say',
          from: a.id,
          type: '承認依頼',
          text: `承認トレイに積みました:${ap.title}`,
          href: `/approvals/#${ap.id}`,
        }),
      );
  });

  steps.push({ t: L - 5, kind: 'typing', from: 'executive' });
  steps.push({ t: L - 4, kind: 'say', from: 'executive', type: '日報', text: dailyReport(c) });
  steps.push({ t: L - 3.5, kind: 'log', agent: 'executive', text: c.grounded ? '日報をチャットに掲載' : `日報を${c.s.ceoName}さんに送信` });

  return steps.sort((x, y) => x.t - y.t);
}

/** 経営企画の日報。実データモードでは、分かっている数字と、CEOに確認してほしいことだけを書く */
function dailyReport(c: DemoContext) {
  const ceo = c.s.ceoName;
  if (!c.grounded) {
    const total = sum(c.affiliate) + sum(c.goods);
    return (
      `${ceo}さん、本日の合計は${yen(total)}です(アフィリエイト${yen(sum(c.affiliate))}・SUZURI${yen(sum(c.goods))})。` +
      (c.pending > 0 ? `決めてほしいことが${c.pending}件、承認トレイにあります` : '承認待ちはありません')
    );
  }
  const facts: string[] = [];
  if (c.realKeys.has('pv')) facts.push(`PV ${num(c.s.values.pv)}`);
  const sale = (k: 'affiliate' | 'goods', name: string) => {
    const t = c.imported?.[k];
    facts.push(t ? `${name} ${yen(t.amount)}(${md(t.date)}分)` : `${name}は${k === 'affiliate' ? 'CSV未取り込み' : '未入力'}`);
  };
  sale('affiliate', 'ASP');
  sale('goods', 'SUZURI');
  const alerts = alertsFor(c);
  if (alerts.length === 0) return `${ceo}さん、本日は${facts.join('、')}で、急ぎで確認してほしいことはありません`;
  return [
    `${ceo}さん、本日は${facts.join('、')}です。`,
    `確認してほしいことが${alerts.length}件あります:${alerts.join(' / ')}。`,
    '中身は、各部の報告にそれぞれ書いてあります。',
  ].join('');
}
