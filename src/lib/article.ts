/**
 * microCMSのリッチエディタが吐くHTMLを、記事ページ用に少しだけ加工する。
 *  - h2 / h3 にidを振って目次からアンカーで飛べるようにする
 *  - 目次データを抜き出す
 *  - table を横スクロール用のdivで包む(スマホで表が潰れるのを防ぐ)
 *  - img に loading="lazy" を足す
 * DOMParserはビルド時(Node)に無いので、素直に正規表現で処理している。
 */

/**
 * microCMSの画像URLにWebP変換と幅指定を付ける。
 * microCMSの画像APIはクエリで変換できるので、アップロード時の形式が
 * JPEGやPNGでも、配信はWebPになる(対応していない古い環境向けにはfm指定を外せばよい)。
 */
export const microcmsImage = (url: string, width: number, quality = 78): string => {
  if (!url.includes('microcms-assets.io')) return url;
  const [base] = url.split('?');
  return `${base}?fm=webp&w=${width}&q=${quality}`;
};

/** 幅違いの候補を並べたsrcset。表示幅に合った画像だけが落ちてくる。 */
export const microcmsSrcSet = (url: string, widths: number[] = [640, 960, 1280, 1600]): string => {
  if (!url.includes('microcms-assets.io')) return '';
  return widths.map((w) => `${microcmsImage(url, w)} ${w}w`).join(', ');
};

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

  // 本文中の画像: WebP配信 + srcset + 遅延読み込み。
  // 記事の重さはほとんど画像で決まるので、ここは自動で効かせる。
  html = html.replace(/<img\b([^>]*?)\/?>/gi, (match, rawAttrs: string) => {
    let attrs = rawAttrs.replace(/\s+$/, '');
    const src = /\ssrc=["']([^"']+)["']/i.exec(attrs)?.[1];

    if (src && src.includes('microcms-assets.io')) {
      const srcset = microcmsSrcSet(src);
      attrs = attrs.replace(src, microcmsImage(src, 1280));
      if (srcset && !/\ssrcset=/i.test(attrs)) {
        attrs += ` srcset="${srcset}" sizes="(max-width: 48rem) 100vw, 40rem"`;
      }
    }
    if (!/\bloading\s*=/i.test(attrs)) attrs += ' loading="lazy" decoding="async"';
    return `<img${attrs}>`;
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

/**
 * タグの正規化。
 * microCMSのフィールドが「複数テキスト」なら配列、「テキストフィールド」なら
 * 「A, B, C」のような1本の文字列で届く。どちらでも同じ形にして返す。
 */
export const normalizeTags = (value: string[] | string | undefined | null): string[] => {
  if (!value) return [];
  const list = Array.isArray(value) ? value : value.split(/[,、\/｜|]/);
  return list.map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
};
