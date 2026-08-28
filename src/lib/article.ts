/**
 * microCMSのリッチエディタが吐くHTMLを、記事ページ用に少しだけ加工する。
 *  - h2 / h3 にidを振って目次からアンカーで飛べるようにする
 *  - 目次データを抜き出す
 *  - table を横スクロール用のdivで包む(スマホで表が潰れるのを防ぐ)
 *  - img に loading="lazy" を足す
 * DOMParserはビルド時(Node)に無いので、素直に正規表現で処理している。
 */

export type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

export type PreparedArticle = {
  html: string;
  toc: TocItem[];
  /** 読了目安(分) */
  readingMinutes: number;
};

const stripTags = (html: string): string =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .trim();

/** 見出し文字列からURLに使えるidを作る。日本語はそのまま残さずに連番で逃がす。 */
const slugifyHeading = (text: string, index: number): string => {
  const ascii = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  return ascii ? `${ascii}-${index}` : `sec-${index}`;
};

export const prepareArticle = (source: string | undefined | null): PreparedArticle => {
  const toc: TocItem[] = [];
  if (!source) return { html: '', toc, readingMinutes: 0 };

  let index = 0;

  // 見出しにidを付けつつ目次を集める。既にidがあればそれを尊重する。
  let html = source.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_match, levelStr: string, attrs: string, inner: string) => {
      const level = Number(levelStr) as 2 | 3;
      const text = stripTags(inner);
      if (!text) return _match;

      index += 1;
      const existing = /\sid=["']([^"']+)["']/i.exec(attrs);
      const id = existing ? existing[1] : slugifyHeading(text, index);
      const nextAttrs = existing ? attrs : `${attrs} id="${id}"`;

      toc.push({ id, text, level });
      return `<h${level}${nextAttrs}>${inner}</h${level}>`;
    },
  );

  // 表は必ず横スクロールできる箱に入れる
  html = html.replace(/<table([\s\S]*?)<\/table>/gi, (match) => `<div class="table-scroll">${match}</div>`);

  // 画像の遅延読み込み(既にloading指定があるものは触らない)
  html = html.replace(/<img\b([^>]*?)\/?>/gi, (match, attrs: string) => {
    if (/\bloading\s*=/i.test(attrs)) return match;
    return `<img${attrs.replace(/\s+$/, '')} loading="lazy" decoding="async">`;
  });

  // 日本語の読む速度をおよそ600文字/分として概算
  const chars = stripTags(source).replace(/\s+/g, '').length;
  const readingMinutes = Math.max(1, Math.round(chars / 600));

  return { html, toc, readingMinutes };
};

/** 2026-08-07 のような表記にする。ドット区切りのほうが誌面が締まる。 */
export const formatDate = (value: string | undefined): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
};
