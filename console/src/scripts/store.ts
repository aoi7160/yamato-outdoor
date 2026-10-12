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

/** 取り込みデータの最新日と、その日の種類別の合計 */
export function latestImported(kindOf: (sourceId: string) => 'affiliate' | 'goods' | undefined) {
  const imports = loadImports();
  let latest = '';
  for (const src of Object.values(imports)) for (const r of src.rows) if (r.date > latest) latest = r.date;
  if (!latest) return null;
  const sum = { affiliate: { amount: 0, count: 0 }, goods: { amount: 0, count: 0 } };
  for (const [id, src] of Object.entries(imports)) {
    const kind = kindOf(id);
    if (!kind) continue;
    for (const r of src.rows)
      if (r.date === latest) {
        sum[kind].amount += r.amount;
        sum[kind].count += r.count;
      }
  }
  return { date: latest, ...sum };
}

/* ---------- 表示の小物 ---------- */

export const yen = (n: number) => `¥${Math.round(n).toLocaleString('ja-JP')}`;
export const num = (n: number) => Math.round(n).toLocaleString('ja-JP');
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
