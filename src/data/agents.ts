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

// Static roster of configured agents (labels only — no simulated metrics).
const noMetrics = () => ({ latency: [] as number[], successRate: [] as number[], activity: [] as number[] });

export const AGENTS: Agent[] = [
  { id: "brain", name: "Brain", subtitle: "Chief Orchestrator", type: "orchestrator", status: "healthy", icon: "🧠", currentTask: "", progress: 0, backlogCount: 0, metrics: noMetrics() },
  { id: "research", name: "Research", subtitle: "Intelligence Gatherer", type: "intelligence", status: "healthy", icon: "🔍", currentTask: "", progress: 0, backlogCount: 0, metrics: noMetrics() },
  { id: "scheduler", name: "Scheduler", subtitle: "Time Keeper", type: "operations", status: "healthy", icon: "📅", currentTask: "", progress: 0, backlogCount: 0, metrics: noMetrics() },
  { id: "architect", name: "Architect", subtitle: "Systems Designer", type: "design", status: "healthy", icon: "🏗️", currentTask: "", progress: 0, backlogCount: 0, metrics: noMetrics() },
  { id: "scout", name: "Scout", subtitle: "Horizon Watcher", type: "intelligence", status: "healthy", icon: "🔭", currentTask: "", progress: 0, backlogCount: 0, metrics: noMetrics() },
  { id: "contentcmd", name: "Content Command", subtitle: "Narrative Engine", type: "content", status: "healthy", icon: "📝", currentTask: "", progress: 0, backlogCount: 0, metrics: noMetrics() },
  { id: "webagency", name: "WebAgency", subtitle: "Digital Craftsman", type: "web", status: "healthy", icon: "🌐", currentTask: "", progress: 0, backlogCount: 0, metrics: noMetrics() },
  { id: "thewire", name: "The Wire", subtitle: "Signal Tower", type: "comms", status: "healthy", icon: "📡", currentTask: "", progress: 0, backlogCount: 0, metrics: noMetrics() },
  { id: "flipengine", name: "FlipEngine", subtitle: "Commerce Engine", type: "commerce", status: "healthy", icon: "🔄", currentTask: "", progress: 0, backlogCount: 0, metrics: noMetrics() },
  { id: "videographer", name: "Videographer", subtitle: "Visual Storyteller", type: "media", status: "healthy", icon: "🎬", currentTask: "", progress: 0, backlogCount: 0, metrics: noMetrics() },
  { id: "analyst", name: "Analyst", subtitle: "Pattern Reader", type: "analytics", status: "healthy", icon: "📊", currentTask: "", progress: 0, backlogCount: 0, metrics: noMetrics() },
  { id: "skoolmaster", name: "Skool Master", subtitle: "Knowledge Architect", type: "education", status: "healthy", icon: "🎓", currentTask: "", progress: 0, backlogCount: 0, metrics: noMetrics() },
];
export const EDGES: Edge[] = [
  { id: "e1", from: "core", to: "brain", kind: "control", weight: 1 },
  { id: "e2", from: "core", to: "research", kind: "data", weight: 0.8 },
  { id: "e3", from: "core", to: "scheduler", kind: "control", weight: 0.9 },
  { id: "e4", from: "core", to: "architect", kind: "control", weight: 0.7 },
  { id: "e5", from: "core", to: "scout", kind: "data", weight: 0.6 },
  { id: "e6", from: "core", to: "contentcmd", kind: "data", weight: 0.8 },
  { id: "e7", from: "core", to: "webagency", kind: "control", weight: 0.5 },
  { id: "e8", from: "core", to: "thewire", kind: "comms", weight: 1 },
  { id: "e9", from: "core", to: "flipengine", kind: "data", weight: 0.3 },
  { id: "e10", from: "core", to: "videographer", kind: "data", weight: 0.7 },
  { id: "e11", from: "core", to: "analyst", kind: "data", weight: 0.9 },
  { id: "e12", from: "core", to: "skoolmaster", kind: "data", weight: 0.4 },
  { id: "e13", from: "brain", to: "research", kind: "handoff", weight: 0.8 },
  { id: "e14", from: "brain", to: "scheduler", kind: "handoff", weight: 0.7 },
  { id: "e15", from: "research", to: "contentcmd", kind: "data", weight: 0.6 },
];

export const statusColor = (status: AgentStatus) => {
  switch (status) {
    case "healthy": return { bg: "hsl(152, 60%, 48%)", glow: "0 2px 12px hsl(152 60% 48% / 0.25)" };
    case "degraded": return { bg: "hsl(38, 70%, 55%)", glow: "0 2px 12px hsl(38 70% 55% / 0.25)" };
    case "down": return { bg: "hsl(0, 60%, 55%)", glow: "0 2px 12px hsl(0 60% 55% / 0.25)" };
    case "active": return { bg: "hsl(215, 80%, 60%)", glow: "0 2px 12px hsl(215 80% 60% / 0.25)" };
  }
};

export function createAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: `agent-${Date.now()}-${crypto.randomUUID().slice(0, 4)}`,
    name: "New Agent",
    subtitle: "Unassigned",
    type: "operations",
    status: "healthy",
    icon: "🤖",
    currentTask: "Awaiting orders",
    progress: 0,
    backlogCount: 0,
    metrics: {
      latency: [],
      successRate: [],
      activity: [],
    },
    ...overrides,
  };
}

export function createEdge(from: string, to: string, kind: string = "data"): Edge {
  return {
    id: `edge-${Date.now()}-${crypto.randomUUID().slice(0, 4)}`,
    from,
    to,
    kind,
    weight: 0.7,
  };
}
