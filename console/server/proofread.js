/**
 * 校閲の自動チェック(編集長・校閲部)。
 *
 * microCMSの公開中の記事を、docs/tone-and-manner.md の「機械で判定できる項目」だけで調べる。
 * 項目ごとに「何を見たか(ルール)」「通ったか」「引っかかった箇所(抜き出し)」を返すので、
 * コンソールでは何をチェックして、どこがダメだったのかまで見える。
 *
 * 機械では判定できない項目(h2だけで筋が通るか・実測値か・合わなかった点の分量・persona.mdとの整合)は
 * ここでは見ない。それは校閲部(Claude)が読んで判断し、承認トレイに積む。
 *
 * ルールを足すときは RULES に1つ足し、docs/tone-and-manner.md の該当の節を `doc` に書く。
 */

const SITE = 'https://yamato-outdoor.com';

/* ---------- 本文の取り出し ---------- */

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
const strip = (html) => decode(String(html ?? '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function parse(html) {
  const h = String(html ?? '');
  const tags = (name) => [...h.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'gi'))].map((m) => strip(m[1]));
  // 段落(<p>)。表・リスト・コラム枠の中も <p> なら含める。pr-notice と書き手ブロックは除く
  const paragraphs = [...h.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)]
    .filter((m) => !/pr-notice|profile/.test(m[1]))
    .map((m) => strip(m[2]))
    .filter(Boolean);
  const links = [...h.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const images = [...h.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  return {
    h2: tags('h2'),
    h3: tags('h3'),
    h4: tags('h4'),
    paragraphs,
    text: strip(h),
    links,
    images,
    prNoticeFirst: /^\s*(<[^>]+>\s*)*<p\b[^>]*class\s*=\s*["'][^"']*pr-notice/i.test(h.slice(0, 600)) || /class\s*=\s*["'][^"']*pr-notice/i.test(h.slice(0, 1500)),
  };
}

/** 文に分ける(「。」で切る。カギ括弧の中の「。」では切らない) */
function sentences(paragraphs) {
  const out = [];
  for (const p of paragraphs) {
    let depth = 0;
    let buf = '';
    for (const ch of p) {
      buf += ch;
      if (ch === '「' || ch === '(' || ch === '(') depth++;
      if ((ch === '」' || ch === ')' || ch === ')') && depth > 0) depth--;
      if (ch === '。' && depth === 0) {
        out.push(buf.trim());
        buf = '';
      }
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out;
}

/** 全角を1、半角を0.5で数える(タイトル・概要の「全角◯字」) */
const zenLen = (s) => [...String(s ?? '')].reduce((n, ch) => n + (/[\x20-\x7e｡-ﾟ]/.test(ch) ? 0.5 : 1), 0);

/** 該当箇所を前後つきで抜き出す */
function excerpt(text, index, len, pad = 18) {
  const a = Math.max(0, index - pad);
  const b = Math.min(text.length, index + len + pad);
  return `${a > 0 ? '…' : ''}${text.slice(a, b)}${b < text.length ? '…' : ''}`;
}
function findAll(text, re, limit = 5) {
  const out = [];
  for (const m of text.matchAll(re)) {
    out.push({ match: m[0], at: excerpt(text, m.index, m[0].length) });
    if (out.length >= limit) break;
  }
  return out;
}

/* ---------- ルール ---------- */

const BANNED = ['最強', 'コスパ最強', '初心者必見', '保存版', '完全ガイド', '完全版', '徹底解説', '登山家', 'アドベンチャー'];

// docs/tone-and-manner.md 2-4 の「使わない形」(文脈で判断が要る語は入れない:靴・尾根・登山・ゴアテックス)
const YURE = [
  ['レインウエア', 'レインウェア'],
  ['バックパック', 'ザック'],
  ['リュック', 'ザック'],
  ['ヘッドライト', 'ヘッドランプ'],
  ['テン泊', 'テント泊'],
  ['通し歩き', '縦走'],
  ['逃げ道', 'エスケープルート'],
  ['ハイポサーミア', '低体温症'],
  ['補給食', '行動食'],
  ['ウェブサイト', 'Webサイト'],
  ['ウエブサイト', 'Webサイト'],
  ['WEBサイト', 'Webサイト'],
  ['六甲縦走', '六甲全山縦走'],
];
// 2-3 ひらく(熟語にまぎれにくいものだけ)
const HIRAKU = [
  ['下さい', 'ください'],
  ['殆ど', 'ほとんど'],
  ['僅か', 'わずか'],
  ['例えば', 'たとえば'],
  ['但し', 'ただし'],
  ['全て', 'すべて'],
  ['更に', 'さらに'],
  ['良い', 'よい'],
  ['居る', 'いる'],
];

/** 語尾(文末の「。」の手前)。「〜だろう」「〜と思う」はそのまま、ほかは最後の2文字で見る */
function ending(s) {
  const t = s.replace(/[。」)\s]+$/, '');
  const special = ['だろう', 'と思う', 'ている', 'ていた', 'である', 'できる', 'なる', 'ない'].find((e) => t.endsWith(e));
  return special ?? t.slice(-2);
}

/**
 * @typedef {{ key: string, label: string, doc: string, rule: string, ok: boolean, findings: string[] }} Check
 * @type {{ key: string, label: string, doc: string, rule: string, run: (a: any, p: ReturnType<typeof parse>, ss: string[]) => string[] }[]}
 */
const RULES = [
  {
    key: 'title',
    label: 'タイトルの長さ',
    doc: '5. タイトルと概要',
    rule: '全角30〜35字',
    run: (a) => {
      const n = zenLen(a.title);
      return n >= 30 && n <= 35 ? [] : [`全角${n}字:${a.title}`];
    },
  },
  {
    key: 'description',
    label: '概要の長さ',
    doc: '5. タイトルと概要',
    rule: '全角80〜120字。「〜について解説します」で終えない',
    run: (a) => {
      const d = String(a.description ?? '');
      const n = zenLen(d);
      return [
        ...(n >= 80 && n <= 120 ? [] : [`全角${n}字`]),
        ...(/(について|を)解説(します|しています)。?$/.test(d) ? ['「〜について解説します」で終わっている'] : []),
      ];
    },
  },
  {
    key: 'banned',
    label: '使わない語',
    doc: 'persona.md「使わない語」/ 5. タイトルの禁止',
    rule: `${BANNED.join('・')}・「〜選」(タイトル)`,
    run: (a, p) => [
      // 「アドベンチャーレース」は競技の名前なので除く
      ...BANNED.flatMap((w) =>
        findAll(`${a.title} ${a.description ?? ''} ${p.text}`, new RegExp(w === 'アドベンチャー' ? 'アドベンチャー(?!レース)' : w, 'g'), 2).map((f) => `「${w}」${f.at}`),
      ),
      ...(/\d+選/.test(a.title) ? [`タイトルに「〜選」:${a.title}`] : []),
    ],
  },
  {
    key: 'yure',
    label: '表記ゆれ',
    doc: '2-4. 表記ゆれの統一',
    rule: YURE.map(([x, y]) => `${x}→${y}`).join(' / '),
    run: (a, p) =>
      YURE.flatMap(([bad, good]) => {
        const hits = findAll(p.text, new RegExp(bad, 'g'), 3);
        return hits.length ? [`「${bad}」→「${good}」(${hits.length}か所〜)例:${hits[0].at}`] : [];
      }),
  },
  {
    key: 'hiraku',
    label: 'ひらく漢字',
    doc: '2-3. ひらく / とじる',
    rule: HIRAKU.map(([x, y]) => `${x}→${y}`).join(' / '),
    run: (a, p) =>
      HIRAKU.flatMap(([bad, good]) => {
        const hits = findAll(p.text, new RegExp(bad, 'g'), 3);
        return hits.length ? [`「${bad}」→「${good}」例:${hits[0].at}`] : [];
      }),
  },
  {
    key: 'marks',
    label: '記号',
    doc: '2-1. 基本',
    rule: '本文で「!」「?」を使わない。「...」ではなく「…」。「．」「,」を使わない',
    run: (a, p) => {
      // 「」の中(検索語・人の言葉の引用)は、そのまま書くので見ない
      const text = p.paragraphs.join(' ').replace(/「[^」]*」/g, '「」');
      return [
        ...findAll(text, /[!！?？]/g, 3).map((f) => `感嘆符・疑問符:${f.at}`),
        ...findAll(text, /\.\.\./g, 2).map((f) => `「...」:${f.at}`),
        ...findAll(text, /[．，]/g, 2).map((f) => `全角の「．」「,」:${f.at}`),
      ];
    },
  },
  {
    key: 'length',
    label: '一文の長さ',
    doc: '1. 文体(一文の長さ)',
    rule: '一文50字以内が目安。読点が3つ以上なら切る',
    run: (a, p, ss) => {
      const long = ss.filter((s) => zenLen(s) > 50).sort((x, y) => zenLen(y) - zenLen(x));
      const commas = ss.filter((s) => (s.match(/、/g) ?? []).length >= 3);
      return [
        ...(long.length ? [`50字を超える文が${long.length}文(全${ss.length}文)。いちばん長いもの(${zenLen(long[0])}字):${long[0]}`] : []),
        ...long.slice(1, 3).map((s) => `${zenLen(s)}字:${s}`),
        ...(commas.length ? [`読点が3つ以上の文が${commas.length}文。例:${commas[0]}`] : []),
      ];
    },
  },
  {
    key: 'ending',
    label: '語尾',
    doc: '1. 文体(語尾・断定)',
    rule: '同じ語尾を3回続けない。「〜だろう」「〜と思う」を続けない(自信のなさに読める)',
    run: (a, p, ss) => {
      const out = [];
      let run = 1;
      for (let i = 1; i < ss.length; i++) {
        if (ending(ss[i]) === ending(ss[i - 1])) run++;
        else run = 1;
        if (run === 3) out.push(`「〜${ending(ss[i])}」が3文続く:${ss[i - 2]} / ${ss[i - 1]} / ${ss[i]}`);
      }
      const weak = ss.filter((s) => /(だろう|と思う|かもしれない)。?$/.test(s));
      if (weak.length >= 3) out.push(`「〜だろう」「〜と思う」「〜かもしれない」で終わる文が${weak.length}文。例:${weak.slice(0, 2).join(' / ')}`);
      return out.slice(0, 6);
    },
  },
  {
    key: 'keitai',
    label: '常体と敬体',
    doc: '1. 文体(敬体・常体)',
    rule: '本文は常体(だ・である)。「〜しましょう」は使わない',
    run: (a, p, ss) => {
      const keitai = ss.filter((s) => /(です|ます|でした|ました|ません|でしょう)。?$/.test(s));
      const out = [];
      if (ss.length && keitai.length / ss.length > 0.1)
        out.push(`敬体の文が${keitai.length}文(全${ss.length}文の${Math.round((keitai.length / ss.length) * 100)}%)。例:${keitai[0]}`);
      out.push(...findAll(p.paragraphs.join(' '), /[^。]{0,12}ましょう/g, 2).map((f) => `「〜しましょう」:${f.at}`));
      return out;
    },
  },
  {
    key: 'person',
    label: '人称',
    doc: '1. 文体(一人称・二人称)',
    rule: '一人称は「私」。「筆者」「当サイトでは」「あなた」を使わない',
    run: (a, p) => ['筆者', '当サイトでは', 'あなた'].flatMap((w) => findAll(p.paragraphs.join(' '), new RegExp(w, 'g'), 2).map((f) => `「${w}」:${f.at}`)),
  },
  {
    key: 'repeat',
    label: '言葉の重複',
    doc: '(校閲の基本)',
    rule: '同じ句が続けて2回出ていない(コピペ・書き換え漏れ)',
    run: (a, p) => {
      const out = [];
      for (const para of p.paragraphs) {
        // 「ここを理解して選べば、ここを理解して選べば」のように、句が(読点をはさんで)続けて2回
        const m = para.match(/([^\s、。]{6,40})、?\1/);
        if (m) out.push(`「${m[1]}」が続けて2回:${excerpt(para, m.index ?? 0, m[0].length, 10)}`);
        if (out.length >= 3) break;
      }
      return out;
    },
  },
  {
    key: 'headings',
    label: '見出し',
    doc: '3. 見出し',
    rule: 'h2は4〜8本・h4は使わない・見出しは全角30字以内・「!」「?」「【】」「★」を使わない',
    run: (a, p) => [
      ...(p.h2.length < 4 || p.h2.length > 8 ? [`h2が${p.h2.length}本`] : []),
      ...(p.h4.length ? [`h4が${p.h4.length}本`] : []),
      ...[...p.h2, ...p.h3].filter((h) => zenLen(h) > 30).map((h) => `全角${zenLen(h)}字:${h}`),
      ...[...p.h2, ...p.h3].filter((h) => /[!！?？【】★]/.test(h)).map((h) => `記号:${h}`),
    ],
  },
  {
    key: 'alt',
    label: '画像のalt',
    doc: '7. 画像',
    rule: '本文の画像すべてにaltを書く',
    run: (a, p) => {
      const bad = p.images.filter((img) => !/\balt\s*=\s*["'][^"']+["']/i.test(img));
      return bad.length ? [`altが無い・空の画像が${bad.length}枚(全${p.images.length}枚)`] : [];
    },
  },
  {
    key: 'pr',
    label: '広告表記',
    doc: '10. 公開前チェックリスト(pr-notice)',
    rule: 'アフィリエイトのリンクがある記事は、冒頭に pr-notice を置く',
    run: (a, p, ss, ctx) => {
      const aff = p.links.filter((l) => ctx.isAffiliate(l));
      return aff.length && !p.prNoticeFirst ? [`アフィリエイトのリンクが${aff.length}本あるのに、冒頭に pr-notice が無い`] : [];
    },
  },
  {
    key: 'internal',
    label: '内部リンク',
    doc: '10. 公開前チェックリスト',
    rule: '本文中に内部リンクを2〜4本',
    run: (a, p) => {
      const n = p.links.filter((l) => l.startsWith('/') || l.startsWith(SITE)).length;
      return n >= 2 && n <= 4 ? [] : [`内部リンクが${n}本`];
    },
  },
  {
    key: 'tags',
    label: 'タグの数',
    doc: '8. 記事タグ',
    rule: 'タグは3〜5個',
    run: (a) => {
      const tags = Array.isArray(a.tags) ? a.tags : String(a.tags ?? '').split(/[,、]/).map((t) => t.trim()).filter(Boolean);
      return tags.length >= 3 && tags.length <= 5 ? [] : [`タグが${tags.length}個`];
    },
  },
];

/** チェックした項目の一覧(画面の「何を見たか」) */
export const RULE_LIST = RULES.map(({ key, label, doc, rule }) => ({ key, label, doc, rule }));

const AFFILIATE_HOSTS = [
  'a8.net', 'amazon.co.jp', 'amzn.to', 'amzn.asia', 'rakuten.co.jp', 'valuecommerce.com', 'moshimo.com',
  'link-a.net', 'accesstrade.net', 'rentracks.jp', 'felmat.net', 'yahoo.co.jp',
];
const isAffiliate = (href) => {
  const host = /^https?:\/\/([^/?#]+)/i.exec(href)?.[1]?.toLowerCase();
  return !!host && AFFILIATE_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
};

const FALLBACK_GENRE = { boots: 'mountain-climbing', backpack: 'mountain-climbing', wear: 'mountain-climbing', accessories: 'mountain-climbing', beginner: 'mountain-climbing', route: 'mountain-climbing' };
function articleUrl(a) {
  const g = Array.isArray(a.category?.genre) ? a.category.genre[0] : a.category?.genre;
  const genre = ['mountain-climbing', 'fishing', 'camp'].includes(g) ? g : FALLBACK_GENRE[a.category?.slug] ?? 'mountain-climbing';
  return `${SITE}/${genre}/${a.category?.slug ?? 'beginner'}/${a.slug}/`;
}

/** 記事1本を調べる */
export function checkArticle(a) {
  const html = a.contentHtml || a.content || '';
  const p = parse(html);
  const ss = sentences(p.paragraphs);
  const checks = RULES.map((r) => {
    let findings = [];
    try {
      findings = r.run(a, p, ss, { isAffiliate });
    } catch (e) {
      findings = [`チェックに失敗:${e instanceof Error ? e.message : e}`];
    }
    return { key: r.key, ok: findings.length === 0, findings: findings.slice(0, 6) };
  });
  return {
    id: a.id,
    title: a.title,
    url: a.slug ? articleUrl(a) : '',
    revisedAt: a.revisedAt,
    sentences: ss.length,
    chars: p.text.length,
    failed: checks.filter((c) => !c.ok).length,
    checks,
  };
}

/** 連携(server/connectors.js の proofread)。直近に更新した記事から最大10本 */
export async function proofread(env) {
  const fields = 'id,title,slug,description,content,contentHtml,tags,revisedAt,category.slug,category.genre';
  const res = await fetch(`https://${env.MICROCMS_SERVICE_DOMAIN}.microcms.io/api/v1/articles?limit=10&orders=-revisedAt&fields=${fields}`, {
    headers: { 'X-MICROCMS-API-KEY': env.MICROCMS_API_KEY },
  });
  if (!res.ok) throw Object.assign(new Error(`microCMS:${res.status}`), { status: res.status });
  const { contents = [] } = await res.json();
  const articles = contents.map(checkArticle);
  return {
    checkedAt: new Date().toISOString(),
    rules: RULE_LIST,
    articles,
    findings: articles.reduce((n, x) => n + x.failed, 0),
  };
}
