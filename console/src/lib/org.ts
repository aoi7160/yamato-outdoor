/**
 * 組織の定義を読み込む。部の定義は console/agents/<id>.md の1枚1部で、
 * ここはそれをビルド時に集めて並べるだけ。部を増やすときにこのファイルは触らない。
 */
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export type DivisionId = 'executive' | 'product-content' | 'revenue' | 'corporate';
export type AgentStatus = 'active' | 'standby' | 'planned';

export type Division = {
  id: DivisionId;
  name: string;
  short: string;
  /** 本部の色。人形のバイザー・部カードの縁に使う */
  color: string;
  order: number;
};

/** 本部は増減が少ないので固定で持つ(console/README.md 2-1) */
export const DIVISIONS: Division[] = [
  { id: 'executive', name: '社長室・経営企画', short: '社長室', color: '#e0955a', order: 0 },
  { id: 'product-content', name: 'プロダクト・コンテンツ本部', short: 'プロダクト', color: '#7aa7d6', order: 1 },
  { id: 'revenue', name: 'ビジネス・レベニュー本部', short: 'レベニュー', color: '#5cbd7c', order: 2 },
  { id: 'corporate', name: 'コーポレート本部', short: 'コーポレート', color: '#b3bcc6', order: 3 },
];

export type Kpi = { key: string; label: string; unit: string; source: string };
export type Cadence = { when: string; what: string };

/** 名簿のメンバー1人。人事部が agents/<id>.md の staff に書く(agents/hr.md「名簿の書き方」) */
export type StaffState = 'auto' | 'on-call' | 'defined';
export type Staff = {
  /** チーム名(英語)。何をするかは label と does で書く */
  name: string;
  /** 日本語の短い肩書き(例:新規制作・リライト) */
  label?: string;
  does: string;
  where: string;
  runs: string;
  state: StaffState;
  /** 持っているスキル(3〜5個) */
  skills?: string[];
  /** 担当するKPI */
  kpi?: string;
  /** 次に伸ばす能力 */
  growth?: string;
};

export type AgentMeta = {
  id: string;
  name: string;
  short: string;
  tagline: string;
  division: DivisionId;
  status: AgentStatus;
  standby_until: string;
  order: number;
  permission: 'L0' | 'L1' | 'L2';
  members: string[];
  kpi: Kpi[];
  screen: string;
  sources: string[];
  cadence: Cadence[];
  reports_to: string;
  staff: Staff[];
};

export type Agent = AgentMeta & { Content: AstroComponentFactory };

type MdModule = { frontmatter: AgentMeta; Content: AstroComponentFactory; file: string };

const modules = import.meta.glob<MdModule>('../../agents/*.md', { eager: true });

export const AGENTS: Agent[] = Object.entries(modules)
  // _template.md のような「_」始まりは定義ではないので除く
  .filter(([path]) => !path.split('/').pop()!.startsWith('_'))
  .map(([, mod]) => ({
    ...mod.frontmatter,
    members: mod.frontmatter.members ?? [],
    kpi: mod.frontmatter.kpi ?? [],
    sources: mod.frontmatter.sources ?? [],
    cadence: mod.frontmatter.cadence ?? [],
    staff: mod.frontmatter.staff ?? [],
    standby_until: mod.frontmatter.standby_until ?? '',
    Content: mod.Content,
  }))
  .sort((a, b) => divisionOrder(a.division) - divisionOrder(b.division) || a.order - b.order);

function divisionOrder(id: DivisionId) {
  return DIVISIONS.find((d) => d.id === id)?.order ?? 99;
}

export const divisionOf = (id: DivisionId) => DIVISIONS.find((d) => d.id === id)!;

export const STATUS_LABEL: Record<AgentStatus, string> = {
  active: '稼働中',
  standby: '準備中',
  planned: '将来',
};

export const STAFF_STATE_LABEL: Record<StaffState, string> = {
  auto: 'Autopilot',
  'on-call': 'On call',
  defined: 'Bench',
};

/** 状態の日本語の説明(ツールチップ・凡例) */
export const STAFF_STATE_HINT: Record<StaffState, string> = {
  auto: '定期実行で自動で動いている',
  'on-call': 'スキルがあり、頼むと動く(定期実行の接続待ちを含む)',
  defined: '仕組みが無く、まだ動けない',
};

export const PERMISSION_LABEL = {
  L0: 'L0 閲覧',
  L1: 'L1 下書き',
  L2: 'L2 公開・外部',
} as const;

/** クライアントのスクリプトに渡す軽い形(本文の Content は渡さない) */
export const agentsForClient = () =>
  AGENTS.map(({ Content: _c, ...meta }) => ({ ...meta, color: divisionOf(meta.division).color }));
export type ClientAgent = ReturnType<typeof agentsForClient>[number];
