/**
 * 承認トレイ(Notionの「承認トレイ」データベース)の読み書き。
 *
 * 各部(Claude)は、Notion側に依頼を1件1ページで積む(Claude側のNotionコネクタで書く)。
 * コンソールはここを読み、CEOが押した「承認 / 修正依頼 / 差し戻し」を書き戻す。
 * 次にClaudeが承認トレイを処理するとき、その判断と指示を読んで動く(手順は console/README.md 11章)。
 *
 *   NOTION_TOKEN         Notionのインテグレーション(内部)のシークレット。「YAMATO BASE CAMP」ページに接続しておく
 *   NOTION_APPROVALS_DB  「承認トレイ」データベースのID(URLの notion.so/ の後ろの32文字)
 *
 * ページの書き方(Claudeが積むとき):
 *   プロパティ … 件名 / 状態(承認待ち) / 依頼元(部のid) / 種類 / 根拠(1行に1つ) / 承認すると / 要約
 *   本文       … ```json のコードブロックを1つ。中身は DETAIL の形(links・changes・diffs・draft・images・preview)
 *   判断の履歴 … 見出し3「CEOの判断(日時)…」/「対応(日時)…」+ 箇条書き。コンソールはこれを会話のように並べる
 */
const API = 'https://api.notion.com/v1';
const VERSION = '2025-09-03';

/** 状態は、この5つ以外は扱わない(Notionで手で足されても、コンソールからは書かない) */
export const STATES = ['承認待ち', '修正依頼', '承認', '差し戻し', '対応済み'];
const SIZES = ['小さな修正', '大きな修正'];
const LIMIT = { note: 2000, comment: 1000, comments: 30, where: 200 };

const cleanId = (s) => String(s ?? '').replace(/-/g, '').match(/[0-9a-f]{32}/i)?.[0]?.toLowerCase() ?? '';

async function call(env, path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.NOTION_TOKEN}`,
      'notion-version': VERSION,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = await res.json();
      msg = j.message ?? j.code ?? msg;
    } catch {}
    // よくある設定漏れは、どこを直せばいいかまで言う
    if (res.status === 401) msg = 'NOTION_TOKEN が正しくありません';
    if (res.status === 404) msg = '承認トレイが見つかりません。NOTION_APPROVALS_DB と、インテグレーションを「YAMATO BASE CAMP」ページに接続したかを確認してください';
    throw Object.assign(new Error(`Notion:${msg}`), { status: res.status });
  }
  return res.json();
}

/** データベースID → データソースID(2025-09-03以降の問い合わせ先)。Workerが生きている間は覚えておく */
let dsCache = { db: '', ds: '' };
async function dataSource(env) {
  const db = cleanId(env.NOTION_APPROVALS_DB);
  if (!db) throw new Error('NOTION_APPROVALS_DB の形式が正しくありません(32文字のID)');
  if (dsCache.db === db) return dsCache.ds;
  const d = await call(env, `/databases/${db}`);
  const ds = cleanId(d.data_sources?.[0]?.id);
  if (!ds) throw new Error('Notion:承認トレイのデータソースが見つかりません');
  dsCache = { db, ds };
  return ds;
}

/* ---------- 読み取り ---------- */

const plain = (rt) => (rt ?? []).map((t) => t.plain_text ?? '').join('');
function prop(p) {
  if (!p) return null;
  if (p.type === 'title') return plain(p.title);
  if (p.type === 'rich_text') return plain(p.rich_text);
  if (p.type === 'select') return p.select?.name ?? null;
  if (p.type === 'number') return p.number;
  if (p.type === 'date') return p.date?.start ?? null;
  return null;
}
const lines = (s) => String(s ?? '').split('\n').map((x) => x.trim()).filter(Boolean);

/** 本文のブロック(最大300個)。コードブロックの中身と、判断の履歴を取り出す */
async function readBody(env, pageId) {
  const blocks = [];
  let cursor;
  for (let i = 0; i < 3; i++) {
    const q = new URLSearchParams({ page_size: '100' });
    if (cursor) q.set('start_cursor', cursor);
    const r = await call(env, `/blocks/${pageId}/children?${q}`);
    blocks.push(...r.results);
    if (!r.has_more) break;
    cursor = r.next_cursor;
  }
  let detail = null;
  let detailError = '';
  const history = [];
  for (const b of blocks) {
    const v = b[b.type] ?? {};
    const text = plain(v.rich_text);
    if (b.type === 'code' && !detail) {
      try {
        detail = JSON.parse(text);
      } catch {
        detailError = '本文のJSONが読めません(Claudeが書き直す必要があります)';
      }
    } else if (b.type === 'heading_3' && /^(CEOの判断|対応)/.test(text)) {
      history.push({ by: text.startsWith('CEO') ? 'ceo' : 'agent', title: text, lines: [] });
    } else if (history.length && (b.type === 'bulleted_list_item' || b.type === 'paragraph') && text) {
      history.at(-1).lines.push(text);
    }
  }
  return { detail, detailError, history };
}

/**
 * 依頼の一覧。承認待ち・修正依頼は本文(詳細・履歴)まで読む。判断済みは直近10件だけ本文を読む。
 * bodies=false なら本文は読まない(件数と件名だけ。ナビのバッジ・ダッシュボード用)
 */
export async function listApprovals(env, { bodies = true } = {}) {
  const ds = await dataSource(env);
  const r = await call(env, `/data_sources/${ds}/query`, {
    method: 'POST',
    body: JSON.stringify({ page_size: 50, sorts: [{ timestamp: 'created_time', direction: 'descending' }] }),
  });
  const items = r.results
    .filter((p) => !p.archived && !p.in_trash)
    .map((p) => {
      const P = p.properties ?? {};
      return {
        id: cleanId(p.id),
        notionUrl: p.url,
        createdAt: p.created_time,
        title: prop(P['件名']) ?? '(件名なし)',
        state: STATES.includes(prop(P['状態'])) ? prop(P['状態']) : '承認待ち',
        from: prop(P['依頼元']) ?? '',
        type: prop(P['種類']) ?? '',
        basis: lines(prop(P['根拠'])),
        effect: prop(P['承認すると']) ?? '',
        summary: prop(P['要約']) ?? '',
        instruction: prop(P['修正の指示']) ?? '',
        size: prop(P['修正の大きさ']) ?? '',
        round: prop(P['修正回数']) ?? 0,
        decidedAt: prop(P['判断日時']),
      };
    });
  if (!bodies) return items;
  let decidedRead = 0;
  await Promise.all(
    items.map(async (it) => {
      const open = it.state === '承認待ち' || it.state === '修正依頼';
      if (!open && decidedRead++ >= 10) return;
      Object.assign(it, await readBody(env, it.id));
    }),
  );
  return items;
}

/* ---------- 書き戻し(CEOの判断) ---------- */

const text = (s) => {
  // Notionのテキストは1かたまり2000字まで。長いときは分けて入れる
  const out = [];
  for (let i = 0; i < s.length; i += 2000) out.push({ type: 'text', text: { content: s.slice(i, i + 2000) } });
  return out.length ? out : [{ type: 'text', text: { content: '' } }];
};
const block = (type, s) => ({ object: 'block', type, [type]: { rich_text: text(s) } });
const cap = (s, n) => String(s ?? '').trim().slice(0, n);

/** 日本時間の「2026-10-13 21:40」 */
const jst = (d) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 16).replace('T', ' ');

/**
 * @param {{ action: 'approve' | 'reject' | 'revise' | 'reopen', note?: string, size?: string, comments?: { where: string, text: string }[] }} input
 */
export async function decide(env, rawId, input, now = new Date()) {
  const id = cleanId(rawId);
  if (!id) throw Object.assign(new Error('依頼のIDが正しくありません'), { status: 400 });
  const action = input?.action;
  if (!['approve', 'reject', 'revise', 'reopen'].includes(action)) throw Object.assign(new Error('判断の種類が正しくありません'), { status: 400 });

  // 承認トレイのページ以外には書かない(インテグレーションが見られる別のページを書き換えさせない)
  const ds = await dataSource(env);
  const page = await call(env, `/pages/${id}`);
  const parent = cleanId(page.parent?.data_source_id ?? page.parent?.database_id);
  if (parent !== ds && parent !== cleanId(env.NOTION_APPROVALS_DB))
    throw Object.assign(new Error('承認トレイの依頼ではありません'), { status: 403 });

  const note = cap(input.note, LIMIT.note);
  const comments = (Array.isArray(input.comments) ? input.comments : [])
    .slice(0, LIMIT.comments)
    .map((c) => ({ where: cap(c?.where, LIMIT.where), text: cap(c?.text, LIMIT.comment) }))
    .filter((c) => c.text);
  const size = SIZES.includes(input.size) ? input.size : '小さな修正';
  if (action === 'revise' && !note && comments.length === 0)
    throw Object.assign(new Error('修正依頼には、全体への指示か箇所ごとの指示を1つ以上書いてください'), { status: 400 });

  const round = (prop(page.properties?.['修正回数']) ?? 0) + (action === 'revise' ? 1 : 0);
  const state = { approve: '承認', reject: '差し戻し', revise: '修正依頼', reopen: '承認待ち' }[action];
  const props = {
    状態: { select: { name: state } },
    判断日時: { date: { start: now.toISOString() } },
  };
  if (action === 'revise') {
    const summary = [note, ...comments.map((c) => `「${c.where}」${c.text}`)].filter(Boolean).join('\n');
    Object.assign(props, {
      修正の指示: { rich_text: text(summary) },
      修正の大きさ: { select: { name: size } },
      修正回数: { number: round },
    });
  }
  await call(env, `/pages/${id}`, { method: 'PATCH', body: JSON.stringify({ properties: props }) });

  // 判断の履歴をページ本文に足す(Claudeは次の処理でこれを読む)
  const label = action === 'revise' ? `修正依頼(${size}・${round}回目)` : action === 'reopen' ? '判断の取り消し' : state;
  const children = [block('heading_3', `CEOの判断(${jst(now)})${label}`)];
  if (note) children.push(block('bulleted_list_item', action === 'revise' ? `全体:${note}` : `メモ:${note}`));
  for (const c of comments) children.push(block('bulleted_list_item', `「${c.where || '(箇所の指定なし)'}」:${c.text}`));
  await call(env, `/blocks/${id}/children`, { method: 'PATCH', body: JSON.stringify({ children }) });
  return { id, state, round };
}

export const notionMissing = (env) => ['NOTION_TOKEN', 'NOTION_APPROVALS_DB'].filter((k) => !env[k]);
