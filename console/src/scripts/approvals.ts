/**
 * 承認トレイの依頼。
 *
 *   実データモード … Notionの「承認トレイ」データベース(server/notion.js)。各部(Claude)が積み、CEOの判断を書き戻す
 *   デモモード / Notion未接続 … 下の TEMPLATES(デモ)。設定の「承認依頼」の件数だけ上から積み、判断はこのブラウザにだけ保存する
 *
 * 依頼ごとに「詳細」を持つ。CEOが承認トレイから離れずに中身を確かめられるように、
 * 対象のページ(公開中の記事・下書きプレビュー・PR)へのリンク、変更点、本文の変更前/変更後、
 * メールの文面などを入れる。部が依頼を積むときは、この形で根拠を添える。
 */
import type { Settings } from '../lib/settings';
import { loadDecisions, saveDecisions, type Decision } from './store';

export const SITE_URL = 'https://yamato-outdoor.com';

export type ApprovalLink = {
  label: string;
  href: string;
  /** 補足(デモのため実際のページがない、など) */
  note?: string;
};

export type ApprovalDiff = {
  /** どこの変更か(見出し名など) */
  where: string;
  before: string;
  after: string;
  /** なぜこう直すと良いか(CEOが判断に時間をかけなくて済むように、必ず書く) */
  why?: string;
};

/** 部が書いた記事(承認されるとmicroCMSに下書きとして入稿する。server/cms.js) */
export type DraftArticle = {
  title: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  /** 本文のHTML(microCMSの contentHtml にそのまま入る) */
  html: string;
  faq: { question: string; answer: string }[];
  /** 主に狙う検索キーワード */
  keyword?: string;
  /** この記事の想定読者(persona.md をこの記事用に具体化したもの) */
  reader?: string;
  /** このテーマ・KWを選んだ理由 */
  why?: string;
};

export type ApprovalDetail = {
  /** 何を・なぜ、の要約(1〜2文) */
  summary: string;
  links?: ApprovalLink[];
  changes?: string[];
  diffs?: ApprovalDiff[];
  /** 外部への連絡の文面など、そのまま読ませたい長文 */
  draft?: { label: string; text: string };
  /** デザイン案の見本(SVG文字列。デモの依頼だけ。Notionの依頼からは受け取らない) */
  imageSvg?: string;
  /** 納品物・デザイン案の画像(https のURL) */
  images?: { src: string; alt?: string; caption?: string }[];
  /** microCMSの下書き。あれば下書きプレビューのURLを組み立てる */
  preview?: { contentId: string; draftKey: string };
  /** 部が書いた記事の全文。あれば「記事を読んでコメントする」画面で読める */
  article?: DraftArticle;
  /** microCMSにある記事(既存記事の修正など)。あれば「microCMSで直接直す」のボタンが出る */
  cms?: { contentId: string };
};

export type ApprovalItem = {
  id: string;
  /** 依頼元の部の id */
  from: string;
  type: string;
  title: string;
  basis: string[];
  /** 承認すると何が起きるか(Phase 3で実際に起きること) */
  effect: string;
  detail: ApprovalDetail;
};

const NIGHT_HIKE = `${SITE_URL}/mountain-climbing/how-to/night-hike-basics/`;
const SALOMON = `${SITE_URL}/mountain-climbing/boots/salomon-hiking-shoes/`;

// グッズ案の見本(冬のステッカー)。本番ではクリエイティブ部の清書データに置き換える
const STICKER_SVG = `<svg viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="冬ステッカーのデザイン案">
  <rect x="4" y="4" width="232" height="142" rx="22" fill="#0e151c" stroke="#cdd8e2" stroke-width="3"/>
  <path d="M28 108 L78 50 L100 74 L126 40 L182 108 Z" fill="#e8eef3"/>
  <path d="M78 50 L88 62 L82 66 L74 58 Z M126 40 L138 56 L130 60 L120 50 Z" fill="#9fb4c6"/>
  <circle cx="186" cy="44" r="9" fill="none" stroke="#cdd8e2" stroke-width="2.5"/>
  <text x="120" y="130" text-anchor="middle" font-family="'Schibsted Grotesk', sans-serif" font-size="17" font-weight="700" letter-spacing="3" fill="#e8eef3">YAMATO OUTDOOR</text>
</svg>`;

// デモの記事(記事レビューの画面を試すため)。【要実測】はCEOの体験が要る箇所の印
const DEMO_ARTICLE_HTML = `<p>11月の六甲山は、街の服のまま登ると山頂で震える。【要実測:山頂(931m)の気温と風速。日付と時刻も】</p>
<p>この記事では、初冬の六甲山を日帰りで歩くときの服を、行動中と休憩中に分けて決める。結論は「汗をかかない薄さで歩き、止まったら1枚足す」だ。</p>
<h2>結論:行動中は薄く、止まったら足す</h2>
<p>登りで汗をかくと、稜線の風で一気に冷える。行動中はベースレイヤーと薄いフリースで歩き、休憩のたびにダウンを羽織る。</p>
<p>【体験を入れる:有馬側に下りたときに、どこで何を脱いだか】</p>
<h2>初冬の六甲の気温と風</h2>
<p>麓と山頂では、気温がおよそ5〜6℃違う(標高差による一般的な目安)。【要確認:気象庁のデータで、11月の神戸と六甲山頂の平均気温】</p>
<h2>ベースレイヤーは汗冷えで選ぶ</h2>
<p>綿のTシャツは汗を吸ったまま乾かないので、止まった瞬間に体温を奪う。メリノウールか化繊のものを選ぶ。</p>`;

const TEMPLATES: ApprovalItem[] = [
  {
    id: 'ap-article-rokko-layering',
    from: 'content',
    type: '記事公開',
    title: '新しい記事:初冬の六甲山を日帰りで歩く服装(公開前の確認)',
    basis: ['企画:「雪山・冬キャンプ」(12/15)の6週間前に公開', '文体はサロモンの記事に合わせた', '【要実測】が2か所・【要確認】が1か所(CEOの山行で埋める)'],
    effect: 'microCMSに下書きとして入稿 → microCMSの画面で公開',
    detail: {
      summary: 'デモの記事です。「記事を読んでコメントする」で、本文を選んでコメントや修正案を付けられます。',
      article: {
        title: '初冬の六甲山を日帰りで歩く服装 気温を測って試した重ね着',
        slug: 'rokko-early-winter-layering',
        description: '11月の六甲山を日帰りで歩くときの服を、行動中と休憩中に分けて決める。汗冷えしない重ね方と、止まったときに足す1枚を、実測した気温と一緒に書く。',
        category: 'wear',
        tags: ['六甲山', 'レイヤリング', '冬の低山'],
        html: DEMO_ARTICLE_HTML,
        faq: [{ question: '初冬の六甲山にダウンは要りますか?', answer: '行動中は要りませんが、山頂で休むなら薄手のものを1枚持っていくと安心です。' }],
        keyword: '六甲山 服装 冬',
        reader: '関西で働きながら月1〜2回登る人。冬も六甲・金剛には行くが、寒さで何を着るか毎回迷っている',
        why: '「雪山・冬キャンプ」の需要の山(12/15)の前に、本格的な雪山より先に要る「寒い低山の服装」を押さえる。既存の登山靴の記事から内部リンクできる',
      },
    },
  },
  {
    id: 'ap-publish-night-hike',
    from: 'editorial',
    type: '記事公開',
    title: '「ナイトハイクの始め方」のリライトを公開',
    basis: ['公開前チェックリスト 全項目OK', 'ヘッドランプの明るさの記述を本文とFAQでそろえた(出典・確認日あり)', 'アフィリエイトなし(pr-notice不要)'],
    effect: 'microCMSで公開 → サイトが再ビルドされる',
    detail: {
      summary:
        'ヘッドランプの明るさが、本文(「四百ルーメンあれば充分すぎる」)とFAQ(「200〜400ルーメン」)で食い違っていたのを、FAQ側の幅にそろえる。あわせて確認日を入れる。',
      // デモには実際の下書きが無いので、下書きプレビューのリンクは出さない
      // (Notionの依頼で preview に contentId と draftKey が入っていれば、プレビューのリンクが出る)
      links: [{ label: '公開中の記事を開く', href: NIGHT_HIKE }],
      changes: [
        '「灯りの話」→「ルーメンより、配光と電池の持ち」の明るさの記述を、FAQと同じ「二百〜四百ルーメン」にそろえる',
        'FAQ「ヘッドランプはどれくらいの明るさが必要ですか?」に確認日を入れる',
        '更新日を今日にする(タイトル・URLは変えない)',
      ],
      diffs: [
        {
          where: '灯りの話 → ルーメンより、配光と電池の持ち',
          before:
            '四百ルーメンあれば充分すぎる。むしろ強い光をずっと点けていると、光の外が真っ暗に見えて、かえって地形が読めなくなる。',
          after:
            '登山道を歩くだけなら、二百〜四百ルーメンあれば充分だ。むしろ強い光をずっと点けていると、光の外が真っ暗に見えて、かえって地形が読めなくなる。',
        },
        {
          where: 'よくある質問 → ヘッドランプはどれくらいの明るさが必要ですか?',
          before: '登山道を歩くだけなら200〜400ルーメンで十分です。',
          after: '登山道を歩くだけなら200〜400ルーメンで十分です(2026年10月に主要メーカーの公式仕様で確認)。',
        },
      ],
    },
  },
  {
    id: 'ap-merge-toc',
    from: 'dev',
    type: 'mainへのマージ',
    title: '記事ページの目次まわりの余白を調整',
    basis: ['npm run build 成功', 'スクロール中 60fps(実測)', 'プレビューURLで表示確認済み'],
    effect: 'mainにマージ → 本番に反映',
    detail: {
      summary: 'スマホで目次の項目どうしが詰まって押し間違えやすいので、項目の上下の余白を広げる。デザインの約束(目次はh2のみ)は変えない。',
      links: [
        { label: 'いまの表示(本番)', href: NIGHT_HIKE },
        { label: 'GitHubのプルリクエスト', href: 'https://github.com/aoi7160/yamato-outdoor/pulls', note: 'デモのため該当のPRはありません。本番では変更のPRとプレビューURLが入ります' },
      ],
      changes: ['src/styles/article.css:目次の項目の上下の余白 0.35rem → 0.6rem', '押せる範囲(タップ領域)が縦44px以上になる', '見た目の変更はスマホ幅のみ(48rem以下)'],
      diffs: [
        {
          where: 'src/styles/article.css(目次の項目)',
          before: '.toc a { padding: 0.35rem 0; }',
          after: '.toc a { padding: 0.35rem 0; }\n@media (max-width: 48rem) { .toc a { padding: 0.6rem 0; } }',
        },
      ],
    },
  },
  {
    id: 'ap-affiliate-swap',
    from: 'affiliate',
    type: 'リンク差し替え',
    title: '登山靴の記事:提携終了した案件を楽天のリンクに差し替え',
    basis: ['SEO部がリンク切れを検知', '代替案件は同じ商品・同等の報酬率', '校閲済み'],
    effect: '制作部が本文を修正 → 公開',
    detail: {
      summary: '「サロモンの登山靴」記事の実レビューの節にある購入リンクの提携が終わり、リンク先が案件終了のページになっている。同じ商品の楽天のリンクに差し替える。',
      links: [{ label: '対象の記事を開く', href: SALOMON }],
      changes: [
        '「X ULTRA 5 MID GORE-TEXで岩湧山を歩いた実レビュー」の節末の購入リンク1か所',
        '差し替え後も rel="sponsored nofollow" が自動で付く(楽天は AFFILIATE_HOSTS に登録済み)',
        '冒頭の広告表記(pr-notice)はそのまま',
      ],
      diffs: [
        {
          where: 'X ULTRA 5 MID GORE-TEXで岩湧山を歩いた実レビュー → 購入リンク',
          before: '公式オンラインストアで見る(A8.net経由・提携終了)',
          after: '楽天市場で見る(サロモン X ULTRA 5 MID GORE-TEX)',
        },
      ],
    },
  },
  {
    id: 'ap-goods-sticker',
    from: 'goods',
    type: 'グッズ登録',
    title: '冬の新作ステッカーをSUZURIに登録',
    basis: ['法務:商標の類似なし(J-PlatPat)', 'デザインはクリエイティブ部で清書済み', 'トリブン設定 ¥300'],
    effect: 'SUZURIに商品を登録して販売開始',
    detail: {
      summary: '雪山シーズン(12月)に向けたステッカー。ロゴの山のシルエットに冬の稜線の陰影を足した。',
      links: [
        { label: 'SUZURIのショップ', href: 'https://suzuri.jp/yamato-outdoor/products' },
        { label: '商標の確認(J-PlatPat)', href: 'https://www.j-platpat.inpit.go.jp/' },
      ],
      changes: ['アイテム:ステッカー(透明)', '販売価格はSUZURIの原価＋トリブン ¥300', '販売開始は登録の承認後すぐ。記事末のグッズ枠にも出す'],
      imageSvg: STICKER_SVG,
    },
  },
  {
    id: 'ap-partner-sample',
    from: 'partnership',
    type: '外部への連絡',
    title: 'ヘッドランプのメーカーへサンプル提供の依頼',
    basis: ['媒体資料を添付', '広告表記の扱いは法務で確認済み'],
    effect: 'CEOの名前でメールを送信',
    detail: {
      summary: 'ナイトハイクの記事の次の更新で、実測(配光・電池の持ち)を載せるためのサンプル依頼。提供品で書く場合は記事に明記する。',
      links: [{ label: '記事(ナイトハイクの始め方)', href: NIGHT_HIKE }],
      draft: {
        label: '送るメールの文面',
        text: `件名:ヘッドランプのサンプルご提供のお願い(YAMATO OUTDOOR)

ご担当者様

アウトドアメディア「YAMATO OUTDOOR」を運営しております、AOIと申します。
当サイトでは、登山の装備を実際に使い、数字で比べる記事を掲載しています。

このたび、ナイトハイクの記事(${NIGHT_HIKE})の更新にあたり、
貴社のヘッドランプを実際の山で使い、配光と電池の持ちを計測したいと考えております。
つきましては、評価用のサンプルを1点ご提供いただけないでしょうか。

・記事では、ご提供品である旨を明記いたします(景品表示法に基づく広告表記)
・良い点だけでなく、気になった点もそのまま記載します
・公開前に、事実関係の確認のため原稿をお送りすることは可能です

媒体資料を添付いたします。ご検討のほど、よろしくお願いいたします。

YAMATO OUTDOOR
AOI`,
      },
    },
  },
];

export const approvalItems = (s: Settings) =>
  TEMPLATES.slice(0, Math.max(0, Math.min(TEMPLATES.length, Math.round(s.values.approvals))));

export const APPROVAL_MAX = TEMPLATES.length;

/* ---------- 承認トレイ(Notion とデモをまとめて扱う) ---------- */

export type TrayState = '承認待ち' | '修正依頼' | '承認' | '差し戻し' | '対応済み';
export type TrayHistory = { by: 'ceo' | 'agent'; title: string; lines: string[] };
export type TrayItem = ApprovalItem & {
  state: TrayState;
  round: number;
  size?: string;
  instruction?: string;
  history: TrayHistory[];
  /** Notionのページ(デモの依頼には無い) */
  notionUrl?: string;
  createdAt?: string;
  demo: boolean;
  /** 本文のJSONが読めなかったとき */
  detailError?: string;
};

export type TrayMode = 'notion' | 'demo' | 'local' | 'error';
export type Tray = {
  mode: TrayMode;
  items: TrayItem[];
  missing?: string[];
  error?: string;
  /** microCMSの管理画面のURLと、承認時に入稿できるか(Notionにつながっているときだけ) */
  cms?: { base: string; writable: boolean };
};

export type DecisionInput = {
  action: 'approve' | 'reject' | 'revise' | 'reopen';
  note?: string;
  size?: '小さな修正' | '大きな修正';
  comments?: { where: string; text: string }[];
  /** 承認と同時に、記事をmicroCMSに下書きとして入稿する */
  toCms?: boolean;
};

const LOCAL_STATE: Record<Decision['state'], TrayState> = { approved: '承認', rejected: '差し戻し', revise: '修正依頼' };

/** デモの依頼に、このブラウザに保存した判断を重ねる */
function demoTray(s: Settings): TrayItem[] {
  const d = loadDecisions();
  return approvalItems(s).map((it) => {
    const x = d[it.id];
    return {
      ...it,
      state: x ? LOCAL_STATE[x.state] : '承認待ち',
      round: x?.round ?? 0,
      size: x?.size,
      instruction: x?.state === 'revise' ? [x.note, ...(x.comments ?? []).map((c) => `「${c.where}」${c.text}`)].filter(Boolean).join('\n') : x?.note,
      history: [],
      demo: true,
    };
  });
}

/** https のURLだけ通す(Notionに書かれた javascript: などをリンクにしない) */
export const safeUrl = (u: unknown) => {
  try {
    const url = new URL(String(u));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
};

/** Notionの依頼(サーバーの応答)を、画面で使う形にそろえる。本文のJSONは信用せず、使う項目だけ型を確かめて拾う */
function fromNotion(x: any): TrayItem {
  const d = x.detail && typeof x.detail === 'object' ? x.detail : {};
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const id = /^[0-9a-f]{32}$/.test(x.id) ? x.id : '';
  const preview =
    d.preview && /^[A-Za-z0-9_-]{1,64}$/.test(d.preview.contentId) && /^[A-Za-z0-9_-]{1,128}$/.test(d.preview.draftKey)
      ? { contentId: d.preview.contentId, draftKey: d.preview.draftKey }
      : undefined;
  return {
    id: `ap-${id}`,
    from: str(x.from),
    type: str(x.type) || '依頼',
    title: str(x.title),
    basis: arr(x.basis).map(str),
    effect: str(x.effect),
    detail: {
      summary: str(x.summary) || str(d.summary),
      links: arr(d.links)
        .map((l: any) => ({ label: str(l?.label) || 'リンク', href: safeUrl(l?.href), note: str(l?.note) || undefined }))
        .filter((l) => l.href),
      changes: arr(d.changes).map(str).filter(Boolean),
      diffs: arr(d.diffs).map((v: any) => ({ where: str(v?.where), before: str(v?.before), after: str(v?.after), why: str(v?.why) || undefined })),
      article:
        d.article && typeof d.article === 'object' && str(d.article.html)
          ? {
              title: str(d.article.title),
              slug: str(d.article.slug),
              description: str(d.article.description),
              category: str(d.article.category),
              tags: arr(d.article.tags).map(str).filter(Boolean),
              html: str(d.article.html),
              faq: arr(d.article.faq)
                .map((f: any) => ({ question: str(f?.question), answer: str(f?.answer) }))
                .filter((f) => f.question && f.answer),
              keyword: str(d.article.keyword) || undefined,
              reader: str(d.article.reader) || undefined,
              why: str(d.article.why) || undefined,
            }
          : undefined,
      cms: d.cms && /^[A-Za-z0-9_-]{1,80}$/.test(d.cms.contentId) ? { contentId: d.cms.contentId } : undefined,
      draft: d.draft && typeof d.draft === 'object' ? { label: str(d.draft.label) || '文面', text: str(d.draft.text) } : undefined,
      images: arr(d.images)
        .map((i: any) => ({ src: safeUrl(i?.src), alt: str(i?.alt), caption: str(i?.caption) }))
        .filter((i) => i.src.startsWith('https:')),
      preview,
    },
    state: (['承認待ち', '修正依頼', '承認', '差し戻し', '対応済み'] as const).find((v) => v === x.state) ?? '承認待ち',
    round: typeof x.round === 'number' ? x.round : 0,
    size: str(x.size) || undefined,
    instruction: str(x.instruction) || undefined,
    history: arr(x.history).map((h: any) => ({ by: h?.by === 'ceo' ? 'ceo' : 'agent', title: str(h?.title), lines: arr(h?.lines).map(str) })),
    notionUrl: safeUrl(x.notionUrl) || undefined,
    createdAt: str(x.createdAt) || undefined,
    demo: false,
    detailError: str(x.detailError) || undefined,
  };
}

/** Notionのページid(32文字)。デモの依頼は null */
export const notionId = (it: TrayItem) => (it.demo ? null : it.id.replace(/^ap-/, ''));

/**
 * 承認トレイを読む。
 * 実データモードでは Notion。未接続ならデモの依頼(DEMOと明示)に切り替え、判断はこのブラウザに保存する。
 * bodies=false は件数だけ欲しいとき(ナビのバッジ・ダッシュボード)。Notionで本文を読む回数を減らす。
 */
export async function loadTray(s: Settings, bodies = true): Promise<Tray> {
  if (!s.useReal) return { mode: 'demo', items: demoTray(s) };
  try {
    const res = await fetch(`/api/approvals${bodies ? '' : '?bodies=0'}`, { credentials: 'same-origin' });
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('json')) return { mode: 'local', items: demoTray(s), error: `APIがありません(${res.status})` };
    const j = await res.json();
    if (j.configured === false) return { mode: 'local', items: demoTray(s), missing: j.missing };
    if (!j.ok) return { mode: 'error', items: [], error: j.error ?? '読み込めませんでした' };
    return {
      mode: 'notion',
      items: (j.items ?? []).map(fromNotion).filter((x: TrayItem) => x.id !== 'ap-'),
      cms: j.cms ? { base: safeUrl(j.cms.base).replace(/\/$/, ''), writable: !!j.cms.writable } : undefined,
    };
  } catch {
    return { mode: 'local', items: demoTray(s), error: 'APIに届きません' };
  }
}

/** 判断を送る。Notionの依頼はNotionへ、デモの依頼はこのブラウザへ */
export async function sendDecision(it: TrayItem, input: DecisionInput): Promise<{ ok: boolean; error?: string; cms?: { editUrl: string; dropped: string[] } }> {
  const id = notionId(it);
  if (!id) {
    const d = loadDecisions();
    if (input.action === 'reopen') {
      const { [it.id]: _removed, ...rest } = d;
      saveDecisions(rest);
    } else {
      const state = ({ approve: 'approved', reject: 'rejected', revise: 'revise' } as const)[input.action];
      d[it.id] = {
        state,
        at: new Date().toISOString(),
        note: input.note?.trim() || undefined,
        size: input.action === 'revise' ? input.size : undefined,
        comments: input.action === 'revise' ? input.comments : undefined,
        round: input.action === 'revise' ? (d[it.id]?.round ?? 0) + 1 : d[it.id]?.round,
      };
      saveDecisions(d);
    }
    return { ok: true };
  }
  try {
    const res = await fetch(`/api/approvals/${id}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'X-BaseCamp': '1' },
      body: JSON.stringify(input),
    });
    const j = await res.json().catch(() => ({}));
    return j.ok ? { ok: true, cms: j.cms ?? undefined } : { ok: false, error: j.error ?? `送れませんでした(${res.status})` };
  } catch {
    return { ok: false, error: 'APIに届きません' };
  }
}

/** 下書きプレビューのURL(microCMSの下書きがあるときだけ) */
export const previewUrl = (d: ApprovalDetail) =>
  d.preview
    ? `${SITE_URL}/preview/?contentId=${encodeURIComponent(d.preview.contentId)}&draftKey=${encodeURIComponent(d.preview.draftKey)}`
    : '';

/**
 * Notionが未接続のときに、Claudeへそのまま貼れる依頼文。
 * (Notionにつながっていれば、Claudeは承認トレイから直接読むので要らない)
 */
export function instructionText(it: TrayItem, input: DecisionInput) {
  const head = { approve: '承認します', reject: '差し戻します', revise: `修正を依頼します(${input.size ?? '小さな修正'})`, reopen: '判断を取り消します' }[
    input.action
  ];
  return [
    `承認トレイの「${it.title}」(${it.type}・${it.from}部から)を${head}。`,
    input.note ? `\n全体への指示:\n${input.note}` : '',
    ...(input.comments ?? []).map((c) => `\n「${c.where || '箇所の指定なし'}」について:\n${c.text}`),
    input.action === 'revise'
      ? '\n直したら、変更前/変更後が分かる形でもう一度承認トレイに積んでください。文体は docs/tone-and-manner.md に合わせること。'
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** microCMSの管理画面で、その記事の編集画面(既存記事は cms.contentId、部が書いた記事は入稿後のスラッグ) */
export function cmsEditUrl(tray: Tray, it: TrayItem) {
  const id = it.detail.cms?.contentId ?? (it.state === '承認' || it.state === '対応済み' ? it.detail.article?.slug : undefined);
  return tray.cms?.base && id ? `${tray.cms.base}/apis/articles/${encodeURIComponent(id)}` : '';
}
