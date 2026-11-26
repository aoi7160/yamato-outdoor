/**
 * 承認トレイ(D1。もとは Notion の「承認トレイ」データベース → server/notion.js)。
 *
 * Notion の無料枠のブロック上限で書けなくなったため、記録は Human OS の Worker の D1(種類 yamato_tray)に移した。
 * このコンソールは service binding(wrangler.jsonc の HUMAN_OS。相手は Human OS の YamatoStore)で読み書きする。
 * インターネットを通らないので、合言葉やトークンは要らない。各部(Claude)は Human OS の記録API(/admin/life)で積む。
 *
 * 1件の中身(項目名は Notion のころと同じ日本語):
 *   件名 / 状態(承認待ち) / 依頼元(部のid) / 種類 / 根拠(1行に1つ) / 承認すると / 要約
 *   詳細 … DETAIL の形(links・changes・diffs・article・images・preview)。Notion の本文の ```json の中身にあたる
 *   履歴 … [{ by: 'ceo' | 'agent', title: 'CEOの判断(日時)…', lines: [...] }]。コンソールはこれを会話のように並べる
 *   修正の指示 / 修正の大きさ / 修正回数 / 判断日時
 */
import { putDraft } from './cms.js';

const KIND = 'yamato_tray';

/** 状態は、この5つ以外は扱わない */
export const STATES = ['承認待ち', '修正依頼', '承認', '差し戻し', '対応済み'];
const SIZES = ['小さな修正', '大きな修正'];
const LIMIT = { note: 2000, comment: 1000, comments: 50, where: 300 };

const cleanId = (s) => String(s ?? '').trim().match(/^[0-9A-Za-z_-]{1,64}$/)?.[0] ?? '';
const lines = (s) => (Array.isArray(s) ? s : String(s ?? '').split('\n')).map((x) => String(x).trim()).filter(Boolean);
const cap = (s, n) => String(s ?? '').trim().slice(0, n);
/** 日本時間の「2026-10-13 21:40」 */
const jst = (d) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 16).replace('T', ' ');

export const trayMissing = (env) => (env.HUMAN_OS ? [] : ['HUMAN_OS']);

function detailOf(r) {
  const d = r['詳細'];
  if (d && typeof d === 'object') return { detail: d, detailError: '' };
  if (typeof d === 'string' && d.trim()) {
    try {
      return { detail: JSON.parse(d), detailError: '' };
    } catch {
      return { detail: null, detailError: '詳細のJSONが読めません(Claudeが書き直す必要があります)' };
    }
  }
  return { detail: null, detailError: '' };
}

const historyOf = (r) =>
  (Array.isArray(r['履歴']) ? r['履歴'] : [])
    .filter((h) => h && typeof h === 'object')
    .map((h) => ({ by: h.by === 'ceo' ? 'ceo' : 'agent', title: String(h.title ?? ''), lines: lines(h.lines) }));

function toItem(r) {
  const state = STATES.includes(r['状態']) ? r['状態'] : '承認待ち';
  return {
    id: r.id,
    createdAt: r.createdAt,
    title: r['件名'] || '(件名なし)',
    state,
    from: r['依頼元'] ?? '',
    type: r['種類'] ?? '',
    basis: lines(r['根拠']),
    effect: r['承認すると'] ?? '',
    summary: r['要約'] ?? '',
    instruction: r['修正の指示'] ?? '',
    size: r['修正の大きさ'] ?? '',
    round: Number(r['修正回数']) || 0,
    decidedAt: r['判断日時'] ?? null,
  };
}

/**
 * 依頼の一覧(新しい順に100件)。承認待ち・修正依頼は詳細と履歴まで返す。判断済みは直近10件だけ。
 * bodies=false なら詳細は返さない(件数と件名だけ。ナビのバッジ・ダッシュボード用)
 */
export async function listApprovals(env, { bodies = true } = {}) {
  const rows = await env.HUMAN_OS.list(KIND, { limit: 100 });
  rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  let decidedRead = 0;
  return rows.map((r) => {
    const it = toItem(r);
    if (!bodies) return it;
    const open = it.state === '承認待ち' || it.state === '修正依頼';
    if (!open && decidedRead++ >= 10) return it;
    return { ...it, ...detailOf(r), history: historyOf(r) };
  });
}

/**
 * CEOの判断を書き戻す。
 * @param {{ action: 'approve' | 'reject' | 'revise' | 'reopen', note?: string, size?: string, comments?: { where: string, text: string }[], toCms?: boolean }} input
 */
export async function decide(env, rawId, input, now = new Date()) {
  const id = cleanId(rawId);
  if (!id) throw Object.assign(new Error('依頼のIDが正しくありません'), { status: 400 });
  const action = input?.action;
  if (!['approve', 'reject', 'revise', 'reopen'].includes(action)) throw Object.assign(new Error('判断の種類が正しくありません'), { status: 400 });

  const cur = await env.HUMAN_OS.get(KIND, id);
  if (!cur) throw Object.assign(new Error('承認トレイの依頼が見つかりません'), { status: 404 });

  const note = cap(input.note, LIMIT.note);
  const comments = (Array.isArray(input.comments) ? input.comments : [])
    .slice(0, LIMIT.comments)
    .map((c) => ({ where: cap(c?.where, LIMIT.where), text: cap(c?.text, LIMIT.comment) }))
    .filter((c) => c.text);
  const size = SIZES.includes(input.size) ? input.size : '小さな修正';
  if (action === 'revise' && !note && comments.length === 0)
    throw Object.assign(new Error('修正依頼には、全体への指示か箇所ごとの指示を1つ以上書いてください'), { status: 400 });

  // 記事の依頼を承認するとき、希望があればmicroCMSに下書きとして入稿してから「承認」にする(失敗したら状態は変えない)
  let cms = null;
  if (action === 'approve' && input.toCms) {
    const { detail } = detailOf(cur);
    if (!detail?.article) throw Object.assign(new Error('この依頼には記事の本文がありません'), { status: 400 });
    cms = await putDraft(env, detail.article);
  }

  const round = (Number(cur['修正回数']) || 0) + (action === 'revise' ? 1 : 0);
  const state = { approve: '承認', reject: '差し戻し', revise: '修正依頼', reopen: '承認待ち' }[action];
  const patch = { id, 状態: state, 判断日時: now.toISOString() };
  if (action === 'revise') {
    patch['修正の指示'] = [note, ...comments.map((c) => `「${c.where}」${c.text}`)].filter(Boolean).join('\n');
    patch['修正の大きさ'] = size;
    patch['修正回数'] = round;
  }

  // 判断の履歴を足す(Claudeは次の処理でこれを読む)
  const label = action === 'revise' ? `修正依頼(${size}・${round}回目)` : action === 'reopen' ? '判断の取り消し' : state;
  const entry = { by: 'ceo', title: `CEOの判断(${jst(now)})${label}`, lines: [] };
  if (note) entry.lines.push(action === 'revise' ? `全体:${note}` : `メモ:${note}`);
  for (const c of comments) entry.lines.push(`「${c.where || '(箇所の指定なし)'}」:${c.text}`);
  if (cms) {
    entry.lines.push(`microCMSに下書きとして入稿(コンテンツID ${cms.contentId})。公開はmicroCMSの画面で行う:${cms.editUrl}`);
    if (cms.dropped.length) entry.lines.push(`入稿できなかった項目(microCMSで手で入れる):${cms.dropped.join('、')}`);
  }
  patch['履歴'] = [...historyOf(cur), entry];
  await env.HUMAN_OS.save(KIND, [patch]);
  return { id, state, round, cms };
}
