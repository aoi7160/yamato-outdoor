/**
 * 承認トレイに積まれる依頼(デモ)。設定の「承認依頼」の件数だけ、上から積む。
 * Phase 3で、各部が実際に積んだ依頼(data/events の approval)に置き換える。
 */
import type { Settings } from '../lib/settings';

export type ApprovalItem = {
  id: string;
  /** 依頼元の部の id */
  from: string;
  type: '記事公開' | 'mainへのマージ' | 'リンク差し替え' | 'グッズ登録' | 'SNS投稿' | '外部への連絡';
  title: string;
  basis: string[];
  /** 承認すると何が起きるか(Phase 3で実際に起きること) */
  effect: string;
};

const TEMPLATES: ApprovalItem[] = [
  {
    id: 'ap-publish-night-hike',
    from: 'editorial',
    type: '記事公開',
    title: '「ナイトハイクの始め方」のリライトを公開',
    basis: ['公開前チェックリスト 全項目OK', 'ヘッドランプの価格を公式で確認(出典・確認日あり)', 'アフィリエイトなし(pr-notice不要)'],
    effect: 'microCMSで公開 → サイトが再ビルドされる',
  },
  {
    id: 'ap-merge-toc',
    from: 'dev',
    type: 'mainへのマージ',
    title: '記事ページの目次まわりの余白を調整',
    basis: ['npm run build 成功', 'スクロール中 60fps(実測)', 'プレビューURLで表示確認済み'],
    effect: 'mainにマージ → 本番に反映',
  },
  {
    id: 'ap-affiliate-swap',
    from: 'affiliate',
    type: 'リンク差し替え',
    title: '登山靴の記事:提携終了した案件を楽天のリンクに差し替え',
    basis: ['SEO部がリンク切れを検知', '代替案件は同じ商品・同等の報酬率', '校閲済み'],
    effect: '制作部が本文を修正 → 公開',
  },
  {
    id: 'ap-goods-sticker',
    from: 'goods',
    type: 'グッズ登録',
    title: '冬の新作ステッカーをSUZURIに登録',
    basis: ['法務:商標の類似なし(J-PlatPat)', 'デザインはクリエイティブ部で清書済み', 'トリブン設定 ¥300'],
    effect: 'SUZURIに商品を登録して販売開始',
  },
  {
    id: 'ap-partner-sample',
    from: 'partnership',
    type: '外部への連絡',
    title: 'ヘッドランプのメーカーへサンプル提供の依頼',
    basis: ['媒体資料を添付', '広告表記の扱いは法務で確認済み'],
    effect: 'CEOの名前でメールを送信',
  },
];

export const approvalItems = (s: Settings) =>
  TEMPLATES.slice(0, Math.max(0, Math.min(TEMPLATES.length, Math.round(s.values.approvals))));

export const APPROVAL_MAX = TEMPLATES.length;
