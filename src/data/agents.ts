export type AgentStatus = "healthy" | "degraded" | "down" | "active";

export interface Agent {
  id: string;
  name: string;
  subtitle: string;
  type: string;
  status: AgentStatus;
  icon: string;
  currentTask: string;
  progress: number;
  backlogCount: number;
  color?: string;
  heartbeatAt?: string;
  statusText?: string | null;
  metrics: {
    latency: number[];
    successRate: number[];
    activity: number[];
  };
}

export interface AgentEvent {
  id: string;
  agentId: string;
  agentName: string;
  type: string;
  message: string;
  ts: string;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  kind: string;
  weight: number;
}

const randMetricsEmpty = (len = 20) => Array.from({ length: len }, () => 0);

const formatCurrentTask = (subtitle: string) => {
  const dotParts = subtitle.split("•");
  if (dotParts[1]) return dotParts[1].trim();
  const slashParts = subtitle.split("/");
  if (slashParts[1]) return slashParts[1].trim();
  return subtitle;
};

const makeAgent = (
  id: string,
  name: string,
  subtitle: string,
  type: string,
  icon: string,
  status: AgentStatus = "healthy"
): Agent => {
  const base = createAgent({ id, name, subtitle, type, icon });
  return {
    ...base,
    status,
    currentTask: formatCurrentTask(subtitle),
    progress: status === "down" ? 0 : 65,
    backlogCount: 0,
  };
};

export const AGENTS: Agent[] = [
  makeAgent("solo-core", "SOLO OS CORE", "v2.28 stable • 10/10 online", "core", "🚀"),
  makeAgent("brain", "Brain", "Chief Orchestrator • Strategy planning", "orchestration", "🧠"),
  makeAgent("market-sentinel", "Market Sentinel", "Watches the market • Processing", "intelligence", "👁️", "active"),
  makeAgent("research", "Research", "Intelligence Gatherer • Audience profiling", "intelligence", "🔍", "active"),
  makeAgent("architect", "Architect", "Systems Designer • Architecture audit", "systems", "🏗️"),
  makeAgent("scheduler", "Scheduler", "Time Keeper • Queue management", "operations", "📅"),
  makeAgent("executor", "Executor", "Poster & Logger • Processing", "operations", "🤖", "active"),
  makeAgent("of-marketing", "OF Marketing", "OF Marketing pod • Processing", "marketing", "💌", "active"),
  makeAgent("trading-guardian", "Trading Guardian", "Emergency Services • Processing", "risk", "🛡️"),
  makeAgent("position-manager", "Position Manager", "Manages trades after entry • Processing", "trading", "🎯"),
  makeAgent("risk-manager", "Risk Manager", "Protects the account • Processing", "risk", "⚠️", "degraded"),
];

export const EDGES: Edge[] = [
  { id: "edge-core-brain", from: "solo-core", to: "brain", kind: "control", weight: 1 },
  { id: "edge-core-market", from: "solo-core", to: "market-sentinel", kind: "signal", weight: 0.9 },
  { id: "edge-core-research", from: "solo-core", to: "research", kind: "intel", weight: 0.85 },
  { id: "edge-core-architect", from: "solo-core", to: "architect", kind: "design", weight: 0.8 },
  { id: "edge-core-scheduler", from: "solo-core", to: "scheduler", kind: "ops", weight: 0.75 },
  { id: "edge-core-executor", from: "solo-core", to: "executor", kind: "ops", weight: 0.7 },
  { id: "edge-core-ofmkt", from: "solo-core", to: "of-marketing", kind: "campaign", weight: 0.7 },
  { id: "edge-core-trading", from: "solo-core", to: "trading-guardian", kind: "risk", weight: 0.65 },
  { id: "edge-core-position", from: "solo-core", to: "position-manager", kind: "risk", weight: 0.65 },
  { id: "edge-core-risk", from: "solo-core", to: "risk-manager", kind: "risk", weight: 0.65 },
  { id: "edge-brain-research", from: "brain", to: "research", kind: "handoff", weight: 0.8 },
  { id: "edge-brain-architect", from: "brain", to: "architect", kind: "handoff", weight: 0.7 },
  { id: "edge-research-ofmkt", from: "research", to: "of-marketing", kind: "insight", weight: 0.75 },
  { id: "edge-risk-position", from: "risk-manager", to: "position-manager", kind: "risk", weight: 0.8 },
  { id: "edge-trading-executor", from: "trading-guardian", to: "executor", kind: "ops", weight: 0.7 }
];

export const DEFAULT_DRAG_OFFSETS: Record<string, { x: number; y: number }> = {
  "solo-core": { x: 0, y: 0 },
  "risk-manager": { x: 180, y: -260 },
  "brain": { x: 0, y: -320 },
  "market-sentinel": { x: -180, y: -260 },
  "research": { x: -320, y: -80 },
  "architect": { x: -340, y: 140 },
  "scheduler": { x: -220, y: 320 },
  "executor": { x: 0, y: 360 },
  "of-marketing": { x: 220, y: 320 },
  "trading-guardian": { x: 340, y: 140 },
  "position-manager": { x: 320, y: -80 },
};

export const statusColor = (status: AgentStatus) => {
  switch (status) {
    case "healthy":
      return { bg: "hsl(152, 60%, 48%)", glow: "0 2px 12px hsl(152 60% 48% / 0.25)" };
    case "degraded":
      return { bg: "hsl(38, 70%, 55%)", glow: "0 2px 12px hsl(38 70% 55% / 0.25)" };
    case "down":
      return { bg: "hsl(0, 60%, 55%)", glow: "0 2px 12px hsl(0 60% 55% / 0.25)" };
    case "active":
    default:
      return { bg: "hsl(215, 80%, 60%)", glow: "0 2px 12px hsl(215 80% 60% / 0.25)" };
  }
};

export function createAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: "New Agent",
    subtitle: "Unassigned",
    type: "operations",
    status: "healthy",
    icon: "🤖",
    currentTask: "Awaiting orders",
    progress: 0,
    backlogCount: 0,
    metrics: {
      latency: randMetricsEmpty(),
      successRate: randMetricsEmpty(),
      activity: randMetricsEmpty(),
    },
    ...overrides,
  };
}

export function createEdge(from: string, to: string, kind: string = "data"): Edge {
  return {
    id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    from,
    to,
    kind,
    weight: 0.7,
  };
}

export const AGENT_TEMPLATE_MAP = new Map<string, Agent>();
AGENTS.forEach((agent) => {
  AGENT_TEMPLATE_MAP.set(agent.id, agent);
  AGENT_TEMPLATE_MAP.set(agent.name.toLowerCase(), agent);
});
