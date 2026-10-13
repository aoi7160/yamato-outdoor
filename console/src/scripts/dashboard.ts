/**
 * ダッシュボードの再生。台本(demo.ts)を時計に合わせて流し、画面を書き換える。
 * 動かすのは文字・数字と、opacityで切り替えるクラスだけ(console.css 冒頭の約束)。
 */
import type { ClientAgent } from '../lib/org';
import { sourceById } from '../lib/sources';
import { approvalItems } from './approvals';
import { buildScript, makeContext, moneyRows, screenFor, sum, tileFor, type DemoContext, type Row, type Step } from './demo';
import { loadReal, realSourceNames, type RealState } from './real';
import { esc, latestImported, loadDecisions, loadSettings, yen } from './store';

const HOLD_AFTER_END = 6; // 日報のあと、次の周に入るまでの余韻(秒)
const SPEAK_MS = 2600;
const FIRST_WAIT_MS = 2500; // 最初の周は、実データが届くのをこれだけ待ってから始める
const REFRESH_MS = 10 * 60 * 1000; // 実データの取り直し

export async function startDashboard() {
  const agents: ClientAgent[] = JSON.parse(document.getElementById('org-data')!.textContent || '[]');
  const s = loadSettings();
  const byId = new Map(agents.map((a) => [a.id, a]));

  // 準備中の部は、設定でONのときだけ出す
  const visible = agents.filter((a) => a.status === 'active' || (a.status === 'standby' && s.showStandby));
  document.querySelectorAll<HTMLElement>('.dept[data-status="standby"]').forEach((el) => {
    el.hidden = !s.showStandby;
  });
  hideEmptyDivisions();

  // CEO
  document.querySelectorAll('[data-ceo-name]').forEach((el) => (el.textContent = s.ceoName));
  const initial = document.querySelector('[data-ceo-initial]');
  if (initial) initial.textContent = s.ceoName.slice(0, 3).toUpperCase();
  setText('[data-member-count]', String(visible.length + 1));

  // 承認待ち(承認トレイと同じ数え方)
  const decisions = loadDecisions();
  const pending = approvalItems(s).filter((a) => !decisions[a.id]).length;
  setText('[data-pending]', String(pending));

  // 取り込んだ実データ(CSV・手入力)
  const real = s.useReal ? latestImported((id) => sourceById(id)?.kind) : null;
  if (real) {
    const chip = document.querySelector<HTMLElement>('[data-board-chip]');
    if (chip) {
      chip.textContent = `実データ ${real.date.slice(5).replace('-', '/')}`;
      chip.classList.add('chip--real');
    }
    const src = document.querySelector<HTMLElement>('[data-board-src]');
    if (src) {
      src.hidden = false;
      src.textContent = `アフィリエイト・SUZURIは「データ取り込み」の ${real.date} の合計。ほかの数字はデモ。`;
    }
  }

  setupTabs();

  // API連携の実データ(GA4・Search Consoleなど)。届いたものから次の周に反映する
  let live: RealState | null = null;
  const updateModeChip = () => {
    const chip = document.querySelector<HTMLElement>('[data-mode-chip]');
    if (!chip) return;
    const names = realSourceNames(live);
    if (live?.extra.build) names.push('GitHub');
    if (real) names.push('CSV');
    chip.textContent = names.length ? `実データ:${names.join('・')}|ほかはイメージ` : 'DEMO|数値はイメージ';
    chip.classList.toggle('chip--real', names.length > 0);
    chip.classList.toggle('chip--demo', names.length === 0);
  };
  if (s.useReal) {
    const first = loadReal((st) => {
      live = st;
      updateModeChip();
    });
    await Promise.race([first, new Promise((r) => setTimeout(r, FIRST_WAIT_MS))]);
    setInterval(() => loadReal((st) => (live = st)).then(updateModeChip), REFRESH_MS);
  }
  updateModeChip();

  let ctx = makeContext(s, pending, new Date(), real, live);
  let steps = buildScript(visible, ctx);
  const loopEnd = Math.max(30, s.loopSeconds) + HOLD_AFTER_END;

  let cursor = 0;
  let started = performance.now();
  let money = { affiliate: [] as DemoContext['affiliate'], goods: [] as DemoContext['goods'] };
  let cv = 0;
  let published = 0;
  let round = 0;

  const reset = () => {
    // 周ごとに、届いている実データで台本を組み直す
    ctx = makeContext(s, pending, new Date(), real, live);
    steps = buildScript(visible, ctx);
    cursor = 0;
    started = performance.now();
    money = { affiliate: [], goods: [] };
    cv = 0;
    published = 0;
    for (const a of visible) {
      const card = cardOf(a.id);
      if (!card) continue;
      const scr = screenFor(a, ctx);
      setIn(card, '[data-screen-title]', scr.title);
      if (a.id === 'affiliate') renderRows(card, moneyRows([], 'まだ発生していません'));
      else if (a.id === 'goods') renderRows(card, moneyRows([], 'まだ売れていません'));
      else renderRows(card, scr.rows);
      const tile = tileFor(a, ctx);
      setIn(card, '[data-tile-label]', tile.label);
      setIn(card, '[data-tile-value]', '—');
      setIn(card, '[data-tile-sub]', '');
      card.querySelector('.tile')?.classList.toggle('tile--real', !!tile.real);
    }
    updateBoard();
    const chat = document.querySelector('[data-chat]')!;
    if (round > 0) chat.insertAdjacentHTML('beforeend', `<li class="msg__divider">— 翌日 —</li>`);
    chat.insertAdjacentHTML('beforeend', `<li class="msg__divider">— 19:00 定例ヒアリング —</li>`);
    trimChildren(chat, 60);
    round++;
  };

  const updateBoard = () => {
    const aff = sum(money.affiliate);
    const goods = sum(money.goods);
    setText('[data-board="affiliate"]', yen(aff));
    setText('[data-board="goods"]', yen(goods));
    setText('[data-board="cv"]', `${cv}件`);
    setText('[data-board="published"]', `${published}本`);
    setText('[data-board="total"]', yen(aff + goods));
  };

  const run = (st: Step, clock: string) => {
    switch (st.kind) {
      case 'say': {
        addMessage(st.from, st.text, st.type);
        speak(st.from);
        setText('[data-typing]', '');
        break;
      }
      case 'typing': {
        const name = st.from === 'executive' ? '経営企画AI' : `${byId.get(st.from)?.short ?? ''}部AI`;
        setText('[data-typing]', `${name}が入力中…`);
        break;
      }
      case 'work': {
        const fig = cardOrOffice(st.agent)?.querySelector<HTMLElement>(`.fig[data-member="${st.member}"]`);
        fig?.classList.toggle('is-working', st.on);
        break;
      }
      case 'log':
        addFeed('[data-feed-log]', st.agent, `${labelOf(st.agent)}:${st.text}`, clock);
        break;
      case 'money': {
        money[st.agent].push({ label: st.label, amount: st.amount });
        const card = cardOf(st.agent);
        if (card) {
          renderRows(card, moneyRows(money[st.agent], ''), true);
          setIn(card, '[data-tile-value]', yen(sum(money[st.agent])));
          setIn(card, '[data-tile-sub]', `${money[st.agent].length}${st.agent === 'goods' ? '点' : '件'}`);
        }
        addFeed('[data-feed-money]', st.agent, st.label, clock, `+${yen(st.amount)}`);
        addFeed('[data-feed-log]', st.agent, `${labelOf(st.agent)}:発生 +${yen(st.amount)}`, clock);
        updateBoard();
        break;
      }
      case 'cv':
        cv++;
        addFeed('[data-feed-money]', 'analytics', st.label, clock, '+1件');
        updateBoard();
        break;
      case 'published':
        published = ctx.s.values.publishedUpdated;
        updateBoard();
        break;
      case 'tile': {
        const a = byId.get(st.agent);
        const card = cardOf(st.agent);
        if (a && card) {
          const tile = tileFor(a, ctx);
          setIn(card, '[data-tile-value]', tile.value);
          setIn(card, '[data-tile-sub]', tile.sub ?? '');
        }
        break;
      }
    }
  };

  const tick = () => {
    const elapsed = (performance.now() - started) / 1000;
    if (elapsed >= loopEnd) {
      reset();
      return;
    }
    const clock = clockText(Math.min(elapsed, loopEnd));
    setText('[data-clock]', clock);
    while (cursor < steps.length && steps[cursor].t <= elapsed) run(steps[cursor++], clock);
  };

  reset();
  tick();
  // 1秒に4回で十分(数字と文字の書き換えだけなので、rAFで毎フレーム回さない)
  setInterval(tick, 250);
}

/* ---------- 小物 ---------- */

const clockText = (sec: number) => {
  const t = 19 * 3600 + Math.floor(sec);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`;
};

const setText = (sel: string, text: string) =>
  document.querySelectorAll(sel).forEach((el) => {
    if (el.textContent !== text) el.textContent = text;
  });
const setIn = (root: Element, sel: string, text: string) => {
  const el = root.querySelector(sel);
  if (el && el.textContent !== text) el.textContent = text;
};

const cardOf = (id: string) => document.querySelector<HTMLElement>(`.dept[data-agent="${id}"]`);
const cardOrOffice = (id: string) =>
  id === 'executive' ? document.querySelector<HTMLElement>('.office') : cardOf(id);

function renderRows(card: HTMLElement, rows: Row[], markNew = false) {
  const ul = card.querySelector('[data-screen-rows]');
  if (!ul) return;
  ul.innerHTML = rows
    .map(
      (r, i) =>
        `<li class="${r.tone ? `is-${r.tone}` : ''}${markNew && i === rows.length - 2 ? ' is-new' : ''}"><span>${esc(r.label)}</span><span>${esc(r.value)}</span></li>`,
    )
    .join('');
}

function agentsData(): ClientAgent[] {
  return JSON.parse(document.getElementById('org-data')!.textContent || '[]');
}
let cache: Map<string, ClientAgent> | null = null;
const agentOf = (id: string) => (cache ??= new Map(agentsData().map((a) => [a.id, a]))).get(id);

const labelOf = (id: string) => (id === 'executive' ? '経営企画' : `${agentOf(id)?.short ?? id}部`);
const colorOf = (id: string) => agentOf(id)?.color ?? '#9ea6b0';

function addMessage(from: string, text: string, type: string) {
  const chat = document.querySelector<HTMLElement>('[data-chat]');
  if (!chat) return;
  const a = agentOf(from);
  const name = from === 'executive' ? 'Claude Code(経営企画・統括)' : `${a?.name ?? from}AI`;
  const avatar = from === 'executive' ? 'C' : (a?.short ?? from).slice(0, 2);
  const cls = type === '差し戻し' ? 'msg--reject' : type === '承認依頼' ? 'msg--approval' : type === '日報' ? 'msg--brief' : '';
  chat.insertAdjacentHTML(
    'beforeend',
    `<li class="msg ${cls}" style="--div:${colorOf(from)}">
      <span class="msg__avatar" aria-hidden="true">${esc(avatar)}</span>
      <div><span class="msg__name">${esc(name)}</span><span class="msg__type">${esc(type)}</span><br /><span class="msg__bubble">${esc(text)}</span></div>
    </li>`,
  );
  trimChildren(chat, 60);
  chat.scrollTop = chat.scrollHeight;
}

function addFeed(sel: string, agent: string, text: string, clock: string, amount?: string) {
  const ul = document.querySelector(sel);
  if (!ul) return;
  ul.querySelector('.feed__empty')?.remove();
  ul.insertAdjacentHTML(
    'afterbegin',
    `<li style="--div:${colorOf(agent)}"><time>${clock}</time><span>${esc(text)}</span>${amount ? `<span class="feed__amount">${esc(amount)}</span>` : ''}</li>`,
  );
  trimChildren(ul, 3, true);
}

function trimChildren(el: Element, max: number, fromEnd = false) {
  while (el.children.length > max) (fromEnd ? el.lastElementChild : el.firstElementChild)?.remove();
}

const speakTimers = new Map<string, number>();
function speak(id: string) {
  const root = cardOrOffice(id);
  if (!root) return;
  const targets = [root, ...root.querySelectorAll<HTMLElement>('.fig')].filter((el) => el.classList.contains('dept') || el.classList.contains('fig'));
  targets.forEach((el) => el.classList.add('is-speaking'));
  clearTimeout(speakTimers.get(id));
  speakTimers.set(
    id,
    window.setTimeout(() => targets.forEach((el) => el.classList.remove('is-speaking')), SPEAK_MS),
  );
}

function hideEmptyDivisions() {
  document.querySelectorAll<HTMLElement>('.division').forEach((sec) => {
    const any = [...sec.querySelectorAll<HTMLElement>('.dept')].some((d) => !d.hidden);
    sec.dataset.empty = any ? '' : '1';
    sec.hidden = !any;
    const tab = document.querySelector<HTMLElement>(`[data-tab="${sec.dataset.division}"]`);
    if (tab) tab.hidden = !any;
  });
}

function setupTabs() {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-tab]')];
  tabs.forEach((tab) =>
    tab.addEventListener('click', () => {
      const id = tab.dataset.tab;
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      document.querySelectorAll<HTMLElement>('.division').forEach((sec) => {
        sec.hidden = sec.dataset.empty === '1' || (id !== 'all' && sec.dataset.division !== id);
      });
    }),
  );
}
