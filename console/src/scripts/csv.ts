/**
 * ASPのCSVを読む。日本のASPのCSVはShift_JISのことが多いので、UTF-8で読めなければShift_JISで読み直す。
 * 列の並びはASPごとに違い、仕様も変わるので、決め打ちせず「日付の列」「金額の列」を画面で選ばせる
 * (よくある見出しは guessColumns で初期値にする)。
 */
import type { DailyRow } from './store';

export function decode(buf: ArrayBuffer): { text: string; encoding: string } {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, ''), encoding: 'UTF-8' };
  } catch {
    return { text: new TextDecoder('shift_jis').decode(buf), encoding: 'Shift_JIS' };
  }
}

/** RFC 4180 相当(ダブルクォート・改行入りのセル・CRLF に対応)。タブ区切りも受ける */
export function parseCsv(text: string): string[][] {
  const firstLine = text.slice(0, text.indexOf('\n') >>> 0);
  const sep = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

/**
 * 見出し行を探す。先頭に説明行(「期間:〜」など)が付くCSVがあるので、
 * 上から10行のうち、セルの数が最も多い最初の行を見出しとみなす。
 */
export function findHeader(rows: string[][]) {
  const top = rows.slice(0, 10);
  const max = Math.max(...top.map((r) => r.length));
  const idx = Math.max(0, top.findIndex((r) => r.length === max));
  return { header: rows[idx]?.map((h) => h.trim()) ?? [], body: rows.slice(idx + 1) };
}

export function guessColumns(header: string[]) {
  const find = (re: RegExp) => header.find((h) => re.test(h)) ?? '';
  return {
    date: find(/発生日|成果発生|注文日|発送日|日時|日付|Date/i) || find(/日/),
    amount: find(/報酬額|成果報酬|紹介料|報酬|金額|Ad Fees|Earnings|Commission/i),
    status: find(/状態|ステータス|承認|Status/i),
  };
}

export function normalizeDate(v: string): string | null {
  const s = v.trim();
  let m = s.match(/(\d{4})\s*[\/\-年.]\s*(\d{1,2})\s*[\/\-月.]\s*(\d{1,2})/);
  if (!m) m = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return Number.isNaN(Date.parse(date)) ? null : date;
}

export function normalizeAmount(v: string): number | null {
  const cleaned = v.replace(/[¥￥円,\s]/g, '').replace(/[^\d.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** 日付ごとに合計する。除外する状態(例:「否認|キャンセル」)に当たる行は数えない */
export function aggregate(
  header: string[],
  body: string[][],
  map: { date: string; amount: string; status?: string; excludeStatus?: string },
) {
  const di = header.indexOf(map.date);
  const ai = header.indexOf(map.amount);
  const si = map.status ? header.indexOf(map.status) : -1;
  const exclude = (map.excludeStatus ?? '')
    .split(/[|,、]/)
    .map((x) => x.trim())
    .filter(Boolean);
  const byDate = new Map<string, DailyRow>();
  let skipped = 0;
  for (const r of body) {
    const date = di >= 0 ? normalizeDate(r[di] ?? '') : null;
    const amount = ai >= 0 ? normalizeAmount(r[ai] ?? '') : null;
    const status = si >= 0 ? (r[si] ?? '') : '';
    if (!date || amount === null || exclude.some((x) => status.includes(x))) {
      skipped++;
      continue;
    }
    const cur = byDate.get(date) ?? { date, amount: 0, count: 0 };
    cur.amount += amount;
    cur.count += 1;
    byDate.set(date, cur);
  }
  return { rows: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)), skipped };
}

/** 既存の行に、新しい行を日付単位で上書きして混ぜる(同じ日を2回取り込んでも二重にならない) */
export function mergeRows(prev: DailyRow[], next: DailyRow[]) {
  const map = new Map(prev.map((r) => [r.date, r]));
  for (const r of next) map.set(r.date, r);
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
