/**
 * コンソールの設定(デモの数字の規模・CEOの表示名など)。
 *
 * 既定値は「立ち上げ期(いまの実態)」。画面の「設定」で変えた値はこのブラウザの
 * localStorage にだけ保存される(Gitにもサーバーにも送らない)。
 * 既定値そのものを変えたいときは PRESETS.now を書き換える。
 */

export type DemoValues = {
  /** 本日のPV */
  pv: number;
  /** 自然検索の割合(%) */
  organicShare: number;
  /** アフィリエイトの本日の発生額(円)と件数 */
  affiliateAmount: number;
  affiliateCount: number;
  /** SUZURIの本日のトリブン(作り手の取り分。円)と販売点数 */
  suzuriAmount: number;
  suzuriCount: number;
  /** soft CV(LINE・メール登録・SNSフォロー) */
  softCv: number;
  /** 本日の公開・更新本数 / 校閲に出した下書き */
  publishedUpdated: number;
  draftsReady: number;
  /** 校閲の審査数 / 差し戻し数 */
  reviewed: number;
  rejects: number;
  /** 10位以内のキーワード数 / AI回答での引用 */
  top10: number;
  aiCitations: number;
  /** クリエイティブの納品数 */
  assets: number;
  /** Core Web Vitals */
  lcp: number;
  inp: number;
  /** 1日に積まれる承認依頼の数 */
  approvals: number;
};

export type PresetId = 'now' | 'm3' | 'y1' | 'custom';

export const PRESETS: Record<Exclude<PresetId, 'custom'>, { label: string; note: string; values: DemoValues }> = {
  now: {
    label: '立ち上げ期(いまの実態)',
    note: '記事が少なく、LINE・メールの受け口もまだない状態。数字は小さく、0の日もある。',
    values: {
      pv: 45, organicShare: 55,
      affiliateAmount: 240, affiliateCount: 1,
      suzuriAmount: 0, suzuriCount: 0,
      softCv: 0,
      publishedUpdated: 1, draftsReady: 1,
      reviewed: 1, rejects: 1,
      top10: 3, aiCitations: 0,
      assets: 2,
      lcp: 2.1, inp: 140,
      approvals: 2,
    },
  },
  m3: {
    label: '3ヶ月後の目標',
    note: '季節記事が回り始め、LINEの受け口ができた状態。',
    values: {
      pv: 300, organicShare: 65,
      affiliateAmount: 1800, affiliateCount: 4,
      suzuriAmount: 1000, suzuriCount: 1,
      softCv: 2,
      publishedUpdated: 2, draftsReady: 2,
      reviewed: 2, rejects: 1,
      top10: 25, aiCitations: 1,
      assets: 4,
      lcp: 1.9, inp: 120,
      approvals: 3,
    },
  },
  y1: {
    label: '1年後の目標',
    note: '三階建ての「作る」が回り、SNSとコミュニティが稼働している状態。',
    values: {
      pv: 2000, organicShare: 72,
      affiliateAmount: 12000, affiliateCount: 18,
      suzuriAmount: 4800, suzuriCount: 4,
      softCv: 12,
      publishedUpdated: 3, draftsReady: 3,
      reviewed: 3, rejects: 1,
      top10: 150, aiCitations: 6,
      assets: 6,
      lcp: 1.8, inp: 110,
      approvals: 4,
    },
  },
};

export type Settings = {
  ceoName: string;
  preset: PresetId;
  values: DemoValues;
  /** 台本1周の秒数(19:00:00 から何秒で日報まで行くか) */
  loopSeconds: number;
  /** 準備中(standby)の部もダッシュボードに出す */
  showStandby: boolean;
  /** 集計ボードのアフィリエイト・SUZURIに、取り込んだ実データを使う */
  useImported: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  ceoName: 'AOI',
  preset: 'now',
  values: { ...PRESETS.now.values },
  loopSeconds: 60,
  showStandby: false,
  useImported: false,
};

/** 設定画面のフォームの並び。ここに足せば画面にも出る */
export const VALUE_FIELDS: { group: string; fields: { key: keyof DemoValues; label: string; unit: string; step?: number }[] }[] = [
  {
    group: 'お金',
    fields: [
      { key: 'affiliateAmount', label: 'アフィリエイトの発生額', unit: '円' },
      { key: 'affiliateCount', label: 'アフィリエイトの発生件数', unit: '件' },
      { key: 'suzuriAmount', label: 'SUZURIのトリブン', unit: '円' },
      { key: 'suzuriCount', label: 'SUZURIの販売点数', unit: '点' },
    ],
  },
  {
    group: '読者',
    fields: [
      { key: 'pv', label: 'PV', unit: 'PV' },
      { key: 'organicShare', label: '自然検索の割合', unit: '%' },
      { key: 'softCv', label: 'soft CV(LINE・メール・フォロー)', unit: '件' },
      { key: 'top10', label: '10位以内のキーワード', unit: '件' },
      { key: 'aiCitations', label: 'AI回答での引用', unit: '件' },
    ],
  },
  {
    group: '制作',
    fields: [
      { key: 'publishedUpdated', label: '公開・更新', unit: '本' },
      { key: 'draftsReady', label: '校閲に出した下書き', unit: '本' },
      { key: 'reviewed', label: '校閲の審査', unit: '本' },
      { key: 'rejects', label: '差し戻し', unit: '件' },
      { key: 'assets', label: 'クリエイティブの納品', unit: '点' },
      { key: 'approvals', label: '承認依頼', unit: '件' },
    ],
  },
  {
    group: 'サイトの速さ',
    fields: [
      { key: 'lcp', label: 'LCP(p75)', unit: '秒', step: 0.1 },
      { key: 'inp', label: 'INP(p75)', unit: 'ms' },
    ],
  },
];
