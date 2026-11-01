#!/usr/bin/env node
// 人事部の機械チェック(名簿と各部スキルの照合)。読むだけで、ファイルは書き換えない。
// 使い方:リポジトリのルートで `node .claude/skills/yamato-hr/roster_audit.mjs`
// 定期実行(scheduled tasks)はここでは見られない。list_triggers の結果と突き合わせるのは SKILL.md の手順で行う。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const AGENTS_DIR = join(ROOT, 'console/agents');
const SKILLS_DIR = join(ROOT, '.claude/skills');
const SUBAGENTS_DIR = join(ROOT, '.claude/agents');

if (!existsSync(AGENTS_DIR)) {
  console.error('console/agents が見つかりません。リポジトリのルートで実行してください。');
  process.exit(1);
}

// STANDARDS.md 7章の9見出し(見出しの文言に含まれるべき語)
const HEADINGS = [
  '役割と到達基準',
  '事業への効き方',
  '判断の型',
  '定例の手順',
  '品質基準',
  '出力の型',
  '住み分け',
  'よくある失敗',
  '今の状態',
];
const SLOTS = ['morning', 'evening', 'weekly', 'monthly'];

// staff の1行を読む。必須は name / does / where / runs(値は "" で囲む)と state。
// label・kpi・growth(文字列)や skills(配列)など、console/src/lib/org.ts の Staff 型にある任意の項目が増えても読めるようにする。
function parseStaff(line) {
  const m = line.match(/^\s*-\s*\{(.*)\}\s*$/);
  if (!m) return null;
  const body = m[1];
  const get = (key) => body.match(new RegExp(`(?:^|[\\s,])${key}:\\s*"([^"]*)"`))?.[1];
  const state = body.match(/(?:^|[\s,])state:\s*([\w-]+)/)?.[1];
  const s = { name: get('name'), does: get('does'), where: get('where'), runs: get('runs'), state };
  return Object.values(s).every((v) => typeof v === 'string') ? s : null;
}

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : '';
}

function field(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return m ? m[1].trim() : '';
}

function listBlock(fm, key) {
  const lines = fm.split('\n');
  const out = [];
  let inBlock = false;
  for (const line of lines) {
    if (line.startsWith(`${key}:`)) { inBlock = true; continue; }
    if (inBlock) {
      if (/^\s+-\s/.test(line)) out.push(line);
      else if (/^\S/.test(line)) break;
    }
  }
  return out;
}

// 運営の時間割(yamato-ops)で、どの部がどの枠に入っているか
const opsPath = join(SKILLS_DIR, 'yamato-ops/SKILL.md');
const opsSlots = {};
if (existsSync(opsPath)) {
  const ops = readFileSync(opsPath, 'utf8');
  for (const slot of SLOTS) {
    const sec = ops.split(new RegExp(`^### ${slot}`, 'm'))[1];
    if (!sec) continue;
    const body = sec.split(/^### /m)[0];
    for (const m of body.matchAll(/`yamato-([a-z-]+)`/g)) {
      (opsSlots[m[1]] ??= new Set()).add(slot);
    }
  }
}

const findings = [];
const totals = { auto: 0, 'on-call': 0, defined: 0, other: 0 };
const rows = [];

for (const file of readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md') && !f.startsWith('_')).sort()) {
  const text = readFileSync(join(AGENTS_DIR, file), 'utf8');
  const fm = frontmatter(text);
  const id = field(fm, 'id');
  const status = field(fm, 'status');
  const members = listBlock(fm, 'members').map((l) => l.replace(/^\s*-\s*/, '').trim());
  const staffLines = listBlock(fm, 'staff');
  const staff = [];
  for (const line of staffLines) {
    const parsed = parseStaff(line);
    if (!parsed) { findings.push(`[書式] ${id}: staff の行に name / does / where / runs("" で囲む)/ state がそろっていません → ${line.trim()}`); continue; }
    staff.push(parsed);
  }
  if (staff.length === 0) findings.push(`[名簿] ${id}: staff が空です`);

  // members と staff の名前の一致
  for (const n of members) if (!staff.some((s) => s.name === n)) findings.push(`[名簿] ${id}: members の「${n}」が staff にいません`);
  for (const s of staff) if (!members.includes(s.name)) findings.push(`[名簿] ${id}: staff の「${s.name}」が members にいません`);

  // スキルの有無と9見出し
  const skillPath = join(SKILLS_DIR, `yamato-${id}/SKILL.md`);
  let skillText = '';
  let headingMissing = [];
  if (existsSync(skillPath)) {
    skillText = readFileSync(skillPath, 'utf8');
    const sfm = frontmatter(skillText);
    if (field(sfm, 'name') !== `yamato-${id}`) findings.push(`[スキル] yamato-${id}: フロントマターの name が yamato-${id} ではありません`);
    if (!field(sfm, 'description')) findings.push(`[スキル] yamato-${id}: description がありません`);
    const h2 = skillText.split('\n').filter((l) => /^## /.test(l));
    headingMissing = HEADINGS.filter((h) => !h2.some((l) => l.includes(h)));
    for (const h of headingMissing) findings.push(`[9見出し] yamato-${id}: 「${h}」の見出し(##)がありません`);
    // 時間割で呼ばれる枠の手順がスキルにあるか
    for (const slot of opsSlots[id] ?? []) {
      if (!new RegExp(`^###.*${slot}`, 'm').test(skillText)) findings.push(`[時間割] yamato-${id}: 時間割の ${slot} から呼ばれるが、スキルに「### ${slot}」の手順が見当たりません`);
    }
  } else if (status !== 'planned') {
    findings.push(`[スキル] ${id}: .claude/skills/yamato-${id}/SKILL.md がありません(status: ${status})`);
  }

  for (const s of staff) {
    totals[s.state in totals ? s.state : 'other'] += 1;
    if (!(s.state in totals)) findings.push(`[state] ${id}/${s.name}: state「${s.state}」は auto / on-call / defined のどれでもありません`);
    if (s.state === 'defined') findings.push(`[state] ${id}/${s.name}: 定義だけ(defined)。配置の案が要ります`);
    if (s.state === 'auto' && !/(定期実行|サーバー|server\/)/.test(s.runs)) findings.push(`[state] ${id}/${s.name}: auto なのに runs に定期実行・サーバーの記述がありません`);

    // runs に書かれた実体が存在するか
    for (const m of s.runs.matchAll(/(?:スキル\s*)?\b(yamato-[a-z-]+|write-article|article-pipeline|article-learn)\b/g)) {
      const name = m[1];
      if (!existsSync(join(SKILLS_DIR, name, 'SKILL.md'))) findings.push(`[実体] ${id}/${s.name}: runs のスキル「${name}」がありません`);
    }
    for (const m of s.runs.matchAll(/\b(article-[a-z-]+)\b/g)) {
      const name = m[1];
      if (['article-pipeline', 'article-learn'].includes(name)) continue;
      if (!existsSync(join(SUBAGENTS_DIR, `${name}.md`)) && !existsSync(join(SKILLS_DIR, name))) findings.push(`[実体] ${id}/${s.name}: runs のサブエージェント「${name}」がありません`);
    }
    for (const m of s.runs.matchAll(/server\/([a-z-]+\.js)/g)) {
      if (!existsSync(join(ROOT, 'console/server', m[1]))) findings.push(`[実体] ${id}/${s.name}: runs の console/server/${m[1]} がありません`);
    }
    // runs に書いた時間割の枠と、yamato-ops の時間割の一致
    if (/yamato-ops/.test(s.runs)) {
      for (const slot of SLOTS) {
        if (s.runs.includes(slot) && !(opsSlots[id]?.has(slot))) findings.push(`[時間割] ${id}/${s.name}: runs に ${slot} とあるが、yamato-ops の ${slot} に yamato-${id} がいません`);
      }
    }
  }

  const count = (st) => staff.filter((s) => s.state === st).length;
  rows.push(`| ${id} | ${status} | ${staff.length} | ${count('auto')} | ${count('on-call')} | ${count('defined')} | ${existsSync(skillPath) ? (headingMissing.length ? `あり(見出し不足${headingMissing.length})` : 'あり(9見出し)') : 'なし'} | ${[...(opsSlots[id] ?? [])].join('・') || '—'} |`);
}

const all = totals.auto + totals['on-call'] + totals.defined + totals.other;
console.log(`# 名簿の機械チェック(${new Date().toISOString().slice(0, 10)})\n`);
console.log(`名簿 ${all}人:自動で稼働 ${totals.auto} / 頼むと動く ${totals['on-call']} / 定義だけ ${totals.defined}${totals.other ? ` / 不明 ${totals.other}` : ''}\n`);
console.log('| 部 | status | 人数 | auto | on-call | defined | スキル | 時間割 |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of rows) console.log(r);
console.log(`\n## 指摘(${findings.length}件)\n`);
if (findings.length === 0) console.log('- なし');
for (const f of findings) console.log(`- ${f}`);
console.log('\n※ 定期実行の登録・接続・最後の実行結果は、このスクリプトでは見られない。SKILL.md 4章の手順で list_triggers と照合する。');
