/**
 * ブラウザ内の保存(localStorage)。設定・承認の判断・取り込んだ売上データを持つ。
 *
 * - プライベートウィンドウなどで localStorage が使えないときは、既定値で動く(保存されないだけ)
 * - **売上データはこのブラウザの外に出さない。** 公開リポジトリなのでGitにも載せない
 *   (Phase 2で Cloudflare Access の内側のストレージに移す。console/README.md 5章)
 */
import { DEFAULT_SETTINGS, PRESETS, type Settings } from '../lib/settings';

const KEY = {
  settings: 'basecamp:settings:v1',
  approvals: 'basecamp:approvals:v1',
  imports: 'basecamp:imports:v1',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ---------- 設定 ---------- */

export function loadSettings(): Settings {
  const saved = read<Partial<Settings>>(KEY.settings, {});
  // 保存されているプリセットが無くなっていたら(PRESETS から消した等)既定に戻す
  const preset =
    saved.preset === 'custom' || (saved.preset && saved.preset in PRESETS) ? saved.preset : DEFAULT_SETTINGS.preset;
  // プリセット選択中は、保存値ではなくプリセットの値を使う(プリセット側を直したら反映されるように)
  const values =
    preset === 'custom'
      ? { ...DEFAULT_SETTINGS.values, ...(saved.values ?? {}) }
      : { ...PRESETS[preset].values };
  return { ...DEFAULT_SETTINGS, ...saved, preset, values };
}

export const saveSettings = (s: Settings) => write(KEY.settings, s);
export const resetSettings = () => {
  try {
    localStorage.removeItem(KEY.settings);
  } catch {
    /* 保存できない環境では何もしない */
  }
};

/* ---------- 承認トレイ ---------- */

export type Decision = { state: 'approved' | 'rejected'; at: string; note?: string };
export const loadDecisions = () => read<Record<string, Decision>>(KEY.approvals, {});
export const saveDecisions = (d: Record<string, Decision>) => write(KEY.approvals, d);

/* ---------- 取り込んだ売上データ ---------- */

export type DailyRow = { date: string; amount: number; count: number };
export type ImportedSource = {
  rows: DailyRow[];
  updatedAt: string;
  /** どこから入れたか(ファイル名 / 手入力) */
  origin: string;
  /** CSVの列の対応付け(次回の取り込みで初期値にする) */
  mapping?: { date: string; amount: string; status?: string; excludeStatus?: string };
};
export const loadImports = () => read<Record<string, ImportedSource>>(KEY.imports, {});
export const saveImports = (d: Record<string, ImportedSource>) => write(KEY.imports, d);

export type ImportedTotal = { date: string; amount: number; count: number };
/** 種類ごと(ASP / SUZURI)の、取り込み済みの最新日の合計。取り込んでいない種類は null */
export type ImportedTotals = { affiliate: ImportedTotal | null; goods: ImportedTotal | null };

export function latestImported(kindOf: (sourceId: string) => 'affiliate' | 'goods' | undefined): ImportedTotals | null {
  const imports = loadImports();
  const out: ImportedTotals = { affiliate: null, goods: null };
  // ASPとSUZURIは取り込む日がずれるので、最新日は種類ごとに見る
  // (まとめて見ると、SUZURIだけ新しい日に「ASPの発生 ¥0」と出てしまう)
  for (const kind of ['affiliate', 'goods'] as const) {
    const rows = Object.entries(imports)
      .filter(([id]) => kindOf(id) === kind)
      .flatMap(([, src]) => src.rows);
    const latest = rows.reduce((d, r) => (r.date > d ? r.date : d), '');
    if (!latest) continue;
    const day = rows.filter((r) => r.date === latest);
    out[kind] = {
      date: latest,
      amount: day.reduce((t, r) => t + r.amount, 0),
      count: day.reduce((t, r) => t + r.count, 0),
    };
  }
  return out.affiliate || out.goods ? out : null;
}

/* ---------- 表示の小物 ---------- */

export const yen = (n: number) => `¥${Math.round(n).toLocaleString('ja-JP')}`;
export const num = (n: number) => Math.round(n).toLocaleString('ja-JP');
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
