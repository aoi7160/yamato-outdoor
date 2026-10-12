/**
 * デモの台本。設定の数字(lib/settings.ts)から、19:00の定例ヒアリングの1日分を組み立てる。
 *
 * 部の定義(agents/*.md)を増やすと、その部も自動で台本に入る(個別の台詞がない部は汎用の台詞)。
 * 台詞や画面の中身を足したいときは、ANSWERS / SCREENS / TILES に id をキーにして足す。
 */
import type { ClientAgent } from '../lib/org';
import type { Settings } from '../lib/settings';
import { approvalItems, type ApprovalItem } from './approvals';
import { num, yen } from './store';

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
  'サロモン X ULTRA 4 GTX(楽天)',
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
  peaks: ReturnType<typeof nextPeaks>;
  affiliate: { label: string; amount: number }[];
  goods: { label: string; amount: number }[];
  approvals: ApprovalItem[];
  pending: number;
  nextAuditDay: string;
};

/** 取り込んだ実データ(その日の種類別の合計)。あればデモの金額の代わりに使う */
export type RealTotals = { date: string; affiliate: { amount: number; count: number }; goods: { amount: number; count: number } };

export function makeContext(s: Settings, pending: number, today = new Date(), real?: RealTotals | null): DemoContext {
  const rnd = seeded(today.toDateString());
  const v = s.values;
  const md = real ? real.date.slice(5).replace('-', '/') : '';
  // 実データは明細を持たないので、件数で割って「実データ」として流す
  const affiliate = real
    ? split(real.affiliate.amount, Math.max(real.affiliate.amount > 0 ? 1 : 0, real.affiliate.count), rnd).map((amount) => ({
        label: `ASPの発生(実データ ${md})`,
        amount,
      }))
    : split(v.affiliateAmount, v.affiliateCount, rnd).map((amount, i) => ({
        label: AFFILIATE_ITEMS[(i + Math.floor(rnd() * AFFILIATE_ITEMS.length)) % AFFILIATE_ITEMS.length],
        amount,
      }));
  const goods = real
    ? split(real.goods.amount, Math.max(real.goods.amount > 0 ? 1 : 0, real.goods.count), rnd).map((amount) => ({
        label: `販売(実データ ${md})`,
        amount,
      }))
    : split(v.suzuriAmount, v.suzuriCount, rnd).map((amount, i) => ({
        label: GOODS_ITEMS[(i + Math.floor(rnd() * GOODS_ITEMS.length)) % GOODS_ITEMS.length],
        amount,
      }));
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return {
    s,
    peaks: nextPeaks(today),
    affiliate,
    goods,
    approvals: approvalItems(s),
    pending,
    nextAuditDay: `${next.getMonth() + 1}/1`,
  };
}

/* ---------- KPIタイル ---------- */

export type Tile = { label: string; value: string; sub?: string };

const TILES: Record<string, (c: DemoContext) => Tile> = {
  planning: (c) => ({ label: '次の需要の山まで', value: `${c.peaks[0]?.days ?? '—'}日`, sub: c.peaks[0]?.name }),
  seo: (c) => ({ label: '10位以内のKW', value: `${num(c.s.values.top10)}件`, sub: `AI引用 ${c.s.values.aiCitations}件` }),
  content: (c) => ({ label: '公開・更新(本日)', value: `${c.s.values.publishedUpdated}本`, sub: `下書き ${c.s.values.draftsReady}本` }),
  editorial: (c) => ({ label: '審査(本日)', value: `${c.s.values.reviewed}本`, sub: `差し戻し ${c.s.values.rejects}件` }),
  creative: (c) => ({ label: '納品(本日)', value: `${c.s.values.assets}点`, sub: 'alt設定 100%' }),
  dev: (c) => ({ label: 'mainのビルド', value: 'OK', sub: `LCP ${c.s.values.lcp}s・INP ${c.s.values.inp}ms` }),
  affiliate: (c) => ({ label: '本日の発生', value: yen(sum(c.affiliate)), sub: `${c.affiliate.length}件` }),
  sns: () => ({ label: 'SNS経由の登録', value: '—', sub: '準備中' }),
  goods: (c) => ({ label: 'SUZURI(トリブン)', value: yen(sum(c.goods)), sub: `${c.goods.length}点` }),
  analytics: (c) => ({ label: '本日のPV', value: num(c.s.values.pv), sub: `自然検索 ${c.s.values.organicShare}%` }),
  legal: (c) => ({ label: '未解決の指摘', value: '0件', sub: `次の監査 ${c.nextAuditDay}` }),
};

export const tileFor = (a: ClientAgent, c: DemoContext): Tile =>
  TILES[a.id]?.(c) ?? { label: a.kpi[0]?.label ?? '本日', value: '—', sub: a.kpi[0]?.source };

export const sum = (xs: { amount: number }[]) => xs.reduce((t, x) => t + x.amount, 0);

/* ---------- ミニ画面 ---------- */

export type Row = { label: string; value: string; tone?: 'good' | 'warn' | 'bad' | 'total' };
export type Screen = { title: string; rows: Row[] };

const SCREENS: Record<string, (c: DemoContext) => Screen> = {
  'demand-calendar': (c) => ({
    title: '需要カレンダー',
    rows: c.peaks.map((p, i) => ({ label: p.name, value: `あと${p.days}日`, tone: i === 0 ? 'warn' : undefined })),
  }),
  'rank-tracker': (c) => ({
    title: 'Rank Tracker — 今日の変動',
    rows: [
      { label: 'サロモン 登山靴', value: '5位 →' },
      { label: 'ナイトハイク 装備', value: '9位 ↑3', tone: 'good' },
      { label: '登山靴 防水 比較', value: '14位 ↑2', tone: 'good' },
      { label: '渓流 入門 装備', value: '圏外' },
      { label: '10位以内', value: `${num(c.s.values.top10)}件`, tone: 'total' },
    ],
  }),
  'microcms-drafts': (c) => {
    const titles = ['冬キャンプの暖房、何を選ぶか', '紅葉の六甲山、日帰りの装備', '渓流釣りを始める前に揃えるもの', '雨の日の山、レインウェアの選び方'];
    const rows: Row[] = titles.slice(0, Math.max(1, c.s.values.draftsReady)).map((t, i) => ({
      label: t,
      value: i === 0 && c.s.values.rejects > 0 ? '差し戻し' : '校閲待ち',
      tone: i === 0 && c.s.values.rejects > 0 ? 'bad' : 'warn',
    }));
    rows.push({ label: 'ナイトハイクの始め方(リライト)', value: '承認待ち', tone: 'good' });
    return { title: 'microCMS — 下書き', rows };
  },
  checklist: (c) => ({
    title: '公開前チェックリスト',
    rows: [
      { label: '表記ゆれ・数字と単位', value: '✓', tone: 'good' },
      { label: 'タイトル30〜35字・概要80〜120字', value: '✓', tone: 'good' },
      { label: '価格・スペックの出典と確認日', value: c.s.values.rejects > 0 ? '✕' : '✓', tone: c.s.values.rejects > 0 ? 'bad' : 'good' },
      { label: 'pr-notice(広告の明示)', value: '✓', tone: 'good' },
      { label: 'persona.md との整合', value: '✓', tone: 'good' },
    ],
  }),
  'production-queue': (c) => {
    const items = ['サムネ:冬キャンプの暖房', '図解:秋のレイヤリング', 'サムネ:紅葉の六甲山', '図解:渓流の装備リスト', 'グッズ清書:冬ステッカー', 'シネマグラフ候補'];
    return {
      title: '制作キュー',
      rows: items.slice(0, Math.max(c.s.values.assets + 1, 3)).map((t, i) => ({
        label: t,
        value: i < c.s.values.assets ? '納品' : '制作中',
        tone: i < c.s.values.assets ? 'good' : undefined,
      })),
    };
  },
  'build-vitals': (c) => ({
    title: 'Build / Core Web Vitals',
    rows: [
      { label: 'main ビルド', value: 'OK', tone: 'good' },
      { label: 'LCP p75', value: `${c.s.values.lcp}s`, tone: c.s.values.lcp <= 2.5 ? 'good' : 'bad' },
      { label: 'INP p75', value: `${c.s.values.inp}ms`, tone: c.s.values.inp <= 200 ? 'good' : 'bad' },
      { label: 'CLS p75', value: '0.02', tone: 'good' },
      { label: 'スクロール中のfps', value: '60', tone: 'good' },
    ],
  }),
  'asp-dashboard': () => ({ title: 'ASP管理画面 — 本日の発生', rows: [] }),
  'suzuri-sales': () => ({ title: 'SUZURI — 本日の売上', rows: [] }),
  'post-queue': () => ({
    title: '投稿キュー — 予約一覧',
    rows: [
      { label: '07:00 記事告知(X)', value: '準備中', tone: 'warn' },
      { label: '12:00 装備の図解(Instagram)', value: '準備中', tone: 'warn' },
      { label: '20:00 山行の記録(Threads)', value: '準備中', tone: 'warn' },
    ],
  }),
  'ga4-today': (c) => ({
    title: 'GA4 — 本日',
    rows: [
      { label: 'PV', value: num(c.s.values.pv) },
      { label: '自然検索の割合', value: `${c.s.values.organicShare}%` },
      { label: 'soft CV', value: `${c.s.values.softCv}件`, tone: c.s.values.softCv > 0 ? 'good' : undefined },
      { label: 'よく読まれた記事', value: 'サロモン登山靴' },
    ],
  }),
  audit: () => ({
    title: '監査 — 月次',
    rows: [
      { label: '外部送信の公表(/privacy)', value: '一致', tone: 'good' },
      { label: '広告表記・ステマ規制', value: 'OK', tone: 'good' },
      { label: '画像の権利', value: 'OK', tone: 'good' },
      { label: 'グッズの商標', value: '確認中', tone: 'warn' },
    ],
  }),
};

export const screenFor = (a: ClientAgent, c: DemoContext): Screen =>
  SCREENS[a.screen]?.(c) ?? { title: a.name, rows: [{ label: '本日の作業', value: '予定どおり' }] };

/** 売上が積み上がっていくミニ画面の行 */
export function moneyRows(items: { label: string; amount: number }[], emptyLabel: string): Row[] {
  if (items.length === 0) return [{ label: emptyLabel, value: '—' }];
  return [
    ...items.slice(-4).map((x) => ({ label: x.label, value: `+${yen(x.amount)}`, tone: 'good' as const })),
    { label: '本日の合計', value: yen(sum(items)), tone: 'total' as const },
  ];
}

/* ---------- 台詞 ---------- */

/** 作業中に活動ログへ流す一言 */
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
};

const ANSWERS: Record<string, (c: DemoContext) => string> = {
  planning: (c) => {
    const [p0, p1] = c.peaks;
    return `次の需要の山「${p0?.name}」まで${p0?.days}日。その次の「${p1?.name}」(${p1?.days}日後)に向けた比較記事を発注しました`;
  },
  seo: (c) =>
    `10位以内は${num(c.s.values.top10)}件。「ナイトハイク 装備」が9位に上がりました。AI回答での引用は${c.s.values.aiCitations}件です`,
  content: (c) =>
    `下書き${c.s.values.draftsReady}本を校閲に出しました。本日の公開・更新は${c.s.values.publishedUpdated}本です`,
  editorial: (c) =>
    `${c.s.values.reviewed}本審査、${c.s.values.rejects}本差し戻し。公開済み記事の価格・廃番チェックは異常なしです`,
  creative: (c) => `サムネ・図解を${c.s.values.assets}点納品。altも設定済みです`,
  dev: (c) => `mainのビルドOK。LCP ${c.s.values.lcp}秒・INP ${c.s.values.inp}msで基準内です`,
  affiliate: (c) =>
    c.affiliate.length > 0
      ? `本日の発生は${yen(sum(c.affiliate))}(${c.affiliate.length}件)。提携状況に変化はありません`
      : '本日の発生はまだありません。登山靴の記事の案件の並び順を見直す案を作っています',
  sns: () => 'アカウントの準備待ちです。投稿案を3本キューに溜めています',
  goods: (c) =>
    c.goods.length > 0
      ? `SUZURIで${c.goods.length}点、トリブン${yen(sum(c.goods))}です`
      : '本日の販売はありません。冬の新作ラフを作成中で、商標を法務に確認依頼しました',
  analytics: (c) =>
    `本日${num(c.s.values.pv)}PV(自然検索${c.s.values.organicShare}%)。soft CVは${c.s.values.softCv}件です`,
  legal: (c) => `確認依頼は0件。${c.nextAuditDay}の月次監査に向けて外部送信一覧を照合中です`,
};

const answerFor = (a: ClientAgent, c: DemoContext) => ANSWERS[a.id]?.(c) ?? '本日の作業は予定どおりです';

/* ---------- 台本 ---------- */

export type ReportType = '定例' | '速報' | '相談' | '差し戻し' | '承認依頼' | '日報';

export type Step =
  | { t: number; kind: 'say'; from: string; text: string; type: ReportType }
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

  steps.push({ t: 0.4, kind: 'say', from: 'executive', type: '定例', text: '定例ヒアリングを始めます。各部、1〜2行でお願いします' });

  shown.forEach((a, i) => {
    const s = start + i * slot;
    const member = a.members.length > 0 ? i % a.members.length : 0;
    steps.push({ t: s, kind: 'log', agent: a.id, text: WORK[a.id] ?? '本日の作業を確認中' });
    steps.push({ t: s, kind: 'work', agent: a.id, member, on: true });
    steps.push({ t: s + slot * 0.15, kind: 'say', from: 'executive', type: '定例', text: `${a.short}部、今日どう?` });

    // 売上・CVは、その部が答えるまでに少しずつ入る
    const spread = (n: number, i2: number) => 1.5 + ((s + slot * 0.3 - 1.5) * (i2 + 1)) / (n + 1);
    if (a.id === 'affiliate')
      c.affiliate.forEach((x, k) => steps.push({ t: spread(c.affiliate.length, k), kind: 'money', agent: 'affiliate', ...x }));
    if (a.id === 'goods')
      c.goods.forEach((x, k) => steps.push({ t: spread(c.goods.length, k), kind: 'money', agent: 'goods', label: `SUZURI ${x.label}`, amount: x.amount }));
    if (a.id === 'analytics')
      for (let k = 0; k < c.s.values.softCv; k++) steps.push({ t: spread(c.s.values.softCv, k), kind: 'cv', label: 'soft CV(記事末から)' });

    steps.push({ t: s + slot * 0.3, kind: 'typing', from: a.id });
    steps.push({ t: s + slot * 0.5, kind: 'say', from: a.id, type: '定例', text: answerFor(a, c) });
    steps.push({ t: s + slot * 0.5, kind: 'tile', agent: a.id });
    steps.push({ t: s + slot * 0.55, kind: 'work', agent: a.id, member, on: false });
    if (a.id === 'content' && c.s.values.publishedUpdated > 0) steps.push({ t: s + slot * 0.5, kind: 'published' });

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
        }),
      );
  });

  const total = sum(c.affiliate) + sum(c.goods);
  steps.push({ t: L - 5, kind: 'typing', from: 'executive' });
  steps.push({
    t: L - 4,
    kind: 'say',
    from: 'executive',
    type: '日報',
    text:
      `${c.s.ceoName}さん、本日の合計は${yen(total)}です(アフィリエイト${yen(sum(c.affiliate))}・SUZURI${yen(sum(c.goods))})。` +
      (c.pending > 0 ? `決めてほしいことが${c.pending}件、承認トレイにあります` : '承認待ちはありません'),
  });
  steps.push({ t: L - 3.5, kind: 'log', agent: 'executive', text: `日報を${c.s.ceoName}さんに送信` });

  return steps.sort((x, y) => x.t - y.t);
}
