/**
 * 計測タグの設定。
 *
 * IDはすべて環境変数から読む。**未設定のタグは1バイトも出力されない**ので、
 * ローカル開発やPRプレビューでは本番のデータを汚さずに済む
 * (Cloudflare PagesのProductionにだけIDを入れる運用を想定している)。
 *
 * 変数名に `PUBLIC_` を付けていないのは docs/workflow.md の方針どおり。
 * ここで扱うIDは最終的にHTMLに載る公開情報だが、ビルド時に埋め込めば足りるので
 * ブラウザ向けの環境変数にする必要がない。
 *
 * 設定手順と各ツールの役割は docs/analytics.md にまとめてある。
 */

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const ANALYTICS = {
  /** Googleタグマネージャー(GTM-XXXXXXX)。これが入っていればタグはGTM側で管理する */
  gtmId: clean(import.meta.env.GTM_ID),
  /** GA4の測定ID(G-XXXXXXXXXX)。GTMを使わずGA4だけ入れたいときの直結用 */
  ga4Id: clean(import.meta.env.GA4_ID),
  /** Microsoft Clarity(ヒートマップ・セッション録画)のプロジェクトID */
  clarityId: clean(import.meta.env.CLARITY_ID),
  /** Metaピクセル。将来の広告用にオーディエンスを貯めたいときだけ入れる */
  metaPixelId: clean(import.meta.env.META_PIXEL_ID),
  /** X(旧Twitter)のピクセルID。同上 */
  xPixelId: clean(import.meta.env.X_PIXEL_ID),
  /** Search Consoleの所有権確認メタタグの値。DNS(TXT)で確認済みなら空でよい */
  gscVerification: clean(import.meta.env.GSC_VERIFICATION),
  /** '1' にすると、IDが入っていても一切タグを出さない(緊急停止用) */
  killSwitch: clean(import.meta.env.ANALYTICS_DISABLED) === '1',
} as const;

/** GTMを読む構成か(GTMがあればGA4はGTM側から配信する) */
export const usesGtm = !ANALYTICS.killSwitch && Boolean(ANALYTICS.gtmId);

/** GTMが無く、GA4だけを直接読む構成か */
export const usesDirectGa4 = !ANALYTICS.killSwitch && !ANALYTICS.gtmId && Boolean(ANALYTICS.ga4Id);

export const usesClarity = !ANALYTICS.killSwitch && Boolean(ANALYTICS.clarityId);
export const usesMetaPixel = !ANALYTICS.killSwitch && Boolean(ANALYTICS.metaPixelId);
export const usesXPixel = !ANALYTICS.killSwitch && Boolean(ANALYTICS.xPixelId);

/** タグが1つでも出るか。何も無ければ計測用のスクリプトごと省略する */
export const hasAnyTag = usesGtm || usesDirectGa4 || usesClarity || usesMetaPixel || usesXPixel;

/**
 * オプトアウト状態の保存先。localStorageに '1' が入っていれば、
 * Consent Modeを全拒否に落としたうえでClarityとピクセルを読み込まない。
 */
export const OPT_OUT_KEY = 'yamato-outdoor:analytics-opt-out';

/**
 * Consent Mode v2 で既定を「拒否」にする地域(EEA + 英国 + スイス)。
 * 同意バナーを置かない代わりに、この地域からの訪問は既定で計測しない。
 * 日本を含むそれ以外の地域は既定で許可し、/privacy のボタンで個別に止められる。
 */
export const CONSENT_DENIED_REGIONS = [
  'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR',
  'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MT', 'NL', 'NO', 'PL', 'PT',
  'RO', 'SE', 'SI', 'SK',
] as const;

/**
 * ページの種別。GA4のカスタムディメンションとして送り、
 * 「記事なのか一覧なのか」で数字を分けて見られるようにする。
 */
export type PageType =
  | 'home'
  | 'genre'
  | 'category'
  | 'article'
  | 'about'
  | 'privacy'
  | 'social'
  | 'preview'
  | 'not-found';

/**
 * 外部送信の一覧。
 *
 * 電気通信事業法の「外部送信規律」(2023年6月施行)は、利用者の端末から
 * 第三者へ情報を送信させる場合に、送信先と項目の**通知または公表**を求めている。
 * /privacy はこの配列をそのまま表にして公表しているので、
 * タグを足すときは必ずここにも1行足す(ここを更新しないとポリシーが実態と合わなくなる)。
 */
export type ExternalTransmission = {
  /** ツール名 */
  name: string;
  /** 送信先の事業者 */
  provider: string;
  /** 送信する情報 */
  data: string;
  /** 利用目的 */
  purpose: string;
  /** 送信先のプライバシーポリシー */
  policy: string;
  /** 送信先が用意しているオプトアウト手段(あれば) */
  optOut?: string;
};

/** 計測タグ。IDが入っているものだけを返す。 */
export const measurementTransmissions = (): ExternalTransmission[] =>
  [
    (usesGtm || usesDirectGa4) && {
      name: usesGtm ? 'Google アナリティクス 4 / Google タグマネージャー' : 'Google アナリティクス 4',
      provider: 'Google LLC',
      data: '閲覧したURL、参照元、滞在時間、スクロール量、クリックした要素、端末・ブラウザの種類、おおまかな地域、Cookieに保存された識別子',
      purpose: 'どの記事がどれだけ読まれたかを把握し、記事の改善に使うため',
      policy: 'https://policies.google.com/privacy',
      optOut: 'https://tools.google.com/dlpage/gaoptout',
    },
    usesClarity && {
      name: 'Microsoft Clarity',
      provider: 'Microsoft Corporation',
      data: 'ページ内のクリック位置、スクロール量、マウスやタップの動き、閲覧したURL、端末・ブラウザの種類、Cookieに保存された識別子',
      purpose: '記事のどこで読むのをやめているかを確認し、レイアウトを直すため',
      policy: 'https://privacy.microsoft.com/privacystatement',
    },
    usesMetaPixel && {
      name: 'Meta ピクセル',
      provider: 'Meta Platforms, Inc.',
      data: '閲覧したURL、参照元、端末・ブラウザの種類、Cookieに保存された識別子',
      purpose: '将来の広告配信に向けて、閲覧者の傾向をまとめて把握するため',
      policy: 'https://www.facebook.com/privacy/policy/',
      optOut: 'https://www.facebook.com/adpreferences/ad_settings',
    },
    usesXPixel && {
      name: 'X ピクセル',
      provider: 'X Corp.',
      data: '閲覧したURL、参照元、端末・ブラウザの種類、Cookieに保存された識別子',
      purpose: '将来の広告配信に向けて、閲覧者の傾向をまとめて把握するため',
      policy: 'https://x.com/ja/privacy',
      optOut: 'https://x.com/settings/account/personalization',
    },
  ].filter((item): item is ExternalTransmission => Boolean(item));

/**
 * 表示のために必ず通信が発生する外部サービス。
 * 計測目的ではないので止められないが、IPアドレスは相手に届くため併せて公表する。
 */
export const deliveryTransmissions: ExternalTransmission[] = [
  {
    name: 'Cloudflare Pages',
    provider: 'Cloudflare, Inc.',
    data: 'IPアドレス、リクエストしたURL、ブラウザの種類',
    purpose: 'サイトの配信と、攻撃・不正アクセスの防止のため',
    policy: 'https://www.cloudflare.com/privacypolicy/',
  },
  {
    name: 'Google Fonts',
    provider: 'Google LLC',
    data: 'IPアドレス、ブラウザの種類',
    purpose: 'ページで使うフォントを配信するため',
    policy: 'https://policies.google.com/privacy',
  },
  {
    name: 'microCMS(画像配信)',
    provider: '株式会社microCMS',
    data: 'IPアドレス、リクエストした画像のURL',
    purpose: '記事の画像を配信するため',
    policy: 'https://microcms.io/privacy-policy',
  },
];
