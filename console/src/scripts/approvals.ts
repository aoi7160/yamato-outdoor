/**
 * 承認トレイに積まれる依頼(デモ)。設定の「承認依頼」の件数だけ、上から積む。
 * Phase 3で、各部が実際に積んだ依頼(data/events の approval)に置き換える。
 *
 * 依頼ごとに「詳細」を持つ。CEOが承認トレイから離れずに中身を確かめられるように、
 * 対象のページ(公開中の記事・下書きプレビュー・PR)へのリンク、変更点、本文の変更前/変更後、
 * メールの文面などを入れる。部が依頼を積むときは、この形で根拠を添える。
 */
import type { Settings } from '../lib/settings';

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
};

export type ApprovalDetail = {
  /** 何を・なぜ、の要約(1〜2文) */
  summary: string;
  links?: ApprovalLink[];
  changes?: string[];
  diffs?: ApprovalDiff[];
  /** 外部への連絡の文面など、そのまま読ませたい長文 */
  draft?: { label: string; text: string };
  /** デザイン案の見本(SVG文字列。部が用意した画像に置き換える) */
  imageSvg?: string;
};

export type ApprovalItem = {
  id: string;
  /** 依頼元の部の id */
  from: string;
  type: '記事公開' | 'mainへのマージ' | 'リンク差し替え' | 'グッズ登録' | 'SNS投稿' | '外部への連絡';
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

const TEMPLATES: ApprovalItem[] = [
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
      links: [
        { label: '公開中の記事を開く', href: NIGHT_HIKE },
        { label: '下書きプレビュー', href: `${SITE_URL}/preview/`, note: 'デモのため実際の下書きはありません。本番では microCMS の下書きのプレビューURLが入ります' },
      ],
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
