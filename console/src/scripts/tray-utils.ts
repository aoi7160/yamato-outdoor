/**
 * 承認トレイの画面で使う、DOMに触らない処理(テストできるように分けてある)。
 *
 *   wordDiff     … 変更前/変更後のどこが変わったかを、語(和文は1文字)単位で出す
 *   readPasted   … 差し込み欄に貼られたもの(URL・<a>タグ・ASPのリンクコード)からURLを取り出し、ドメインを確かめる
 *   applyFills   … 本文の {{key}} を貼られたURLに置き換える。空欄の任意の欄は、その <li> を行ごと外す
 *   ageDays      … 依頼が積まれてから何日たったか
 */
import type { ApplyFill } from './approvals';

export type DiffPart = { t: 'eq' | 'del' | 'ins'; s: string };

const tokens = (s: string) => s.match(/[A-Za-z0-9_.:/?#=&%+-]+|\s+|[^\sA-Za-z0-9_]/g) ?? [];

/**
 * 語単位のLCS。長すぎる(表の比較で数十万マスになる)ときは null を返し、画面は色を付けずに並べる。
 * 戻り値は前後の両方を復元できる並び(eq は両方、del は変更前だけ、ins は変更後だけ)。
 */
export function wordDiff(before: string, after: string, maxCells = 2_500_000): DiffPart[] | null {
  const a = tokens(before);
  const b = tokens(after);
  const n = a.length;
  const m = b.length;
  if (n * m > maxCells) return null;
  // 後ろから埋める LCS の長さ表(1行ずつ持つと復元できないので、全体を Uint32Array で持つ)
  const w = m + 1;
  const L = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i * w + j] = a[i] === b[j] ? L[(i + 1) * w + j + 1] + 1 : Math.max(L[(i + 1) * w + j], L[i * w + j + 1]);
    }
  }
  const out: DiffPart[] = [];
  const push = (t: DiffPart['t'], s: string) => {
    const last = out.at(-1);
    if (last && last.t === t) last.s += s;
    else out.push({ t, s });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('eq', a[i]);
      i++;
      j++;
    } else if (L[(i + 1) * w + j] >= L[i * w + j + 1]) push('del', a[i++]);
    else push('ins', b[j++]);
  }
  while (i < n) push('del', a[i++]);
  while (j < m) push('ins', b[j++]);
  return out;
}

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return '';
  }
};
export const hostMatches = (host: string, domains: string[]) => domains.some((d) => host === d || host.endsWith(`.${d}`));

export type Pasted = { url: string; error?: string; host?: string };

/**
 * 差し込み欄に貼られた文字から、使うURLを1つ決める。
 * - ASPのテキストリンクのコード(<a href="…">…</a><img …>)をそのまま貼っても、href だけを取り出す
 * - かんたんリンク・バナーのスクリプトは使わない約束(CLAUDE.md)なので、はっきり断る
 */
export function readPasted(raw: string, fill: Pick<ApplyFill, 'hosts'>): Pasted {
  const v = raw.trim();
  if (!v) return { url: '' };
  if (/<script\b/i.test(v))
    return { url: '', error: 'かんたんリンク(スクリプト)のコードです。もしもの「テキストリンク」を選んで、そのURLかコードを貼ってください' };
  const href = /\shref\s*=\s*["']([^"']+)["']/i.exec(v)?.[1];
  let url = (href ?? v).replace(/&amp;/g, '&').trim();
  if (/^\/\//.test(url)) url = `https:${url}`;
  if (/^http:\/\//i.test(url)) url = url.replace(/^http:/i, 'https:');
  const host = hostOf(url);
  if (!host || !/^https:\/\//i.test(url)) return { url: '', error: 'URLの形になっていません。https:// で始まるリンクを貼ってください' };
  if (fill.hosts?.length && !hostMatches(host, fill.hosts))
    return { url: '', host, error: `${host} のリンクは、この欄では使えません(受け付けるのは ${fill.hosts.join(' / ')})` };
  return { url, host };
}

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export type Applied = {
  html: string;
  /** 必須なのに空欄(またはエラー)の欄 */
  missing: ApplyFill[];
  /** 空欄なので行ごと外した任意の欄 */
  dropped: ApplyFill[];
  /** 本文に残ってしまった {{…}}(定義の無いキー) */
  leftover: string[];
  /** 置き換えたあとに残ったリンクの数(buy-box の中の <li>) */
  links: number;
};

/** 本文の {{key}} を値に置き換える。values は readPasted を通したURL(空文字は未入力) */
export function applyFills(html: string, fills: ApplyFill[], values: Record<string, string>): Applied {
  let out = html;
  const missing: ApplyFill[] = [];
  const dropped: ApplyFill[] = [];
  for (const f of fills) {
    const token = `{{${f.key}}}`;
    const v = (values[f.key] ?? '').trim();
    if (v) {
      out = out.split(token).join(attr(v));
      continue;
    }
    if (f.required) missing.push(f);
    else dropped.push(f);
    // その欄を使っている <li> を行ごと外す(前の改行・字下げも一緒に)
    out = out.replace(new RegExp(`[ \\t]*<li\\b(?:(?!</li>)[\\s\\S])*?\\{\\{${f.key}\\}\\}[\\s\\S]*?</li>\\n?`, 'g'), '');
  }
  // リンクが1つも残らなかった購入リンクの箱は、箱ごと外す(空の箱を読者に見せない)
  out = out.replace(/\n?<div class="buy-box">(?:(?!<\/div>)[\s\S])*?<ul class="buy-box__links">\s*<\/ul>(?:(?!<\/div>)[\s\S])*?<\/div>/g, '');
  const leftover = [...new Set(out.match(/\{\{[a-z0-9_-]+\}\}/g) ?? [])];
  const links = (out.match(/<ul class="buy-box__links">[\s\S]*?<\/ul>/g) ?? []).reduce((n, ul) => n + (ul.match(/<li\b/g) ?? []).length, 0);
  return { html: out, missing, dropped, leftover, links };
}

/** 積まれてからの日数(日本時間の日付で数える) */
export function ageDays(createdAt: string | undefined, now = new Date()): number | null {
  if (!createdAt) return null;
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return null;
  const day = (ms: number) => Math.floor((ms + 9 * 3600_000) / 86_400_000);
  return Math.max(0, day(now.getTime()) - day(t));
}

export const ageLabel = (d: number | null) => (d === null ? '' : d === 0 ? '今日' : d === 1 ? '昨日' : `${d}日前`);
