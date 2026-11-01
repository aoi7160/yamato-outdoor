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

export type Pasted = {
  /** リンク先のURL(code のときはコードの中の href) */
  url: string;
  /** code のとき:本文に入れるコード(発行されたまま) */
  code?: string;
  /** 本文に入れる値(url なら URL、code ならコード)。エラーのときは空 */
  value: string;
  error?: string;
  /** 通すが気をつけてほしいこと(計測用画像が入っていない、など) */
  warn?: string;
  host?: string;
};

/** ASPのリンクコードとして通すタグ。これ以外のタグ・イベント属性・javascript: が入っていたら断る */
const CODE_TAGS = new Set(['a', 'img', 'br']);
export function codeProblem(code: string): string {
  if (/<\s*(script|iframe|style|object|embed|form)\b/i.test(code)) return 'スクリプトや埋め込みが入っています。もしもの「テキストリンク」のコードを貼ってください(かんたんリンク・バナーは使いません)';
  if (/\son[a-z]+\s*=/i.test(code) || /javascript:/i.test(code)) return '使えない書き方(イベント属性・javascript:)が入っています';
  const tags = [...code.matchAll(/<\/?\s*([a-z0-9-]+)/gi)].map((m) => m[1].toLowerCase());
  const bad = tags.find((t) => !CODE_TAGS.has(t));
  if (bad) return `<${bad}> は入れられません。テキストリンクのコード(<a>と<img>)だけを貼ってください`;
  return '';
}

/**
 * 差し込み欄に貼られた文字から、使うURLを1つ決める。
 * - ASPのテキストリンクのコード(<a href="…">…</a><img …>)をそのまま貼っても、href だけを取り出す
 * - かんたんリンク・バナーのスクリプトは使わない約束(CLAUDE.md)なので、はっきり断る
 */
export function readPasted(raw: string, fill: Pick<ApplyFill, 'hosts' | 'mode'>): Pasted {
  const v = raw.trim();
  const none = { url: '', value: '' };
  if (!v) return none;
  if (/<script\b/i.test(v))
    return { ...none, error: 'かんたんリンク(スクリプト)のコードです。もしもの「テキストリンク」を選んで、そのコードを貼ってください' };
  if (fill.mode === 'code') {
    if (!/<a\b[^>]*\shref\s*=/i.test(v)) return { ...none, error: 'リンクのコードではありません。ASPの管理画面で作った「テキストリンク」のコードを丸ごと貼ってください(URLだけでは貼れません)' };
    const problem = codeProblem(v);
    if (problem) return { ...none, error: problem };
  }
  const href = /\shref\s*=\s*["']([^"']+)["']/i.exec(v)?.[1];
  let url = (href ?? v).replace(/&amp;/g, '&').trim();
  if (/^\/\//.test(url)) url = `https:${url}`;
  if (/^http:\/\//i.test(url)) url = url.replace(/^http:/i, 'https:');
  const host = hostOf(url);
  if (!host || !/^https:\/\//i.test(url)) return { ...none, error: 'URLの形になっていません。https:// で始まるリンクを貼ってください' };
  if (fill.hosts?.length && !hostMatches(host, fill.hosts))
    return { ...none, host, error: `${host} のリンクは、この欄では使えません(受け付けるのは ${fill.hosts.join(' / ')})` };
  if (fill.mode === 'code') {
    // 発行されたまま入れる(改変しない)。前後の空白と改行だけ落とす
    const warn = /<img\b/i.test(v) ? undefined : '計測用の画像(<img …>)が入っていません。コードを最後までコピーしたか確かめてください';
    return { url, code: v, value: v, host, warn };
  }
  return { url, value: url, host };
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

/** 本文の {{key}} を値に置き換える。values は readPasted の value(url ならURL、code ならコード。空文字は未入力) */
export function applyFills(html: string, fills: ApplyFill[], values: Record<string, string>): Applied {
  let out = html;
  const missing: ApplyFill[] = [];
  const dropped: ApplyFill[] = [];
  for (const f of fills) {
    const token = `{{${f.key}}}`;
    const v = (values[f.key] ?? '').trim();
    if (v) {
      out = out.split(token).join(f.mode === 'code' ? v : attr(v));
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
