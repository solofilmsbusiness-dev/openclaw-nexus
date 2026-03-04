export type AgentStatus = "healthy" | "degraded" | "down" | "active";

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: AgentStatus;
  icon: string;
  currentTask: string;
  progress: number;
  backlogCount: number;
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

const randMetrics = (len = 20) => Array.from({ length: len }, () => Math.random());

export const AGENTS: Agent[] = [
  { id: "brain", name: "Brain", type: "orchestrator", status: "healthy", icon: "🧠", currentTask: "Campaign orchestration", progress: 78, backlogCount: 3, metrics: { latency: randMetrics(), successRate: randMetrics(), activity: randMetrics() } },
  { id: "research", name: "Research", type: "intelligence", status: "active", icon: "🔍", currentTask: "Trend scan", progress: 45, backlogCount: 5, metrics: { latency: randMetrics(), successRate: randMetrics(), activity: randMetrics() } },
  { id: "scheduler", name: "Scheduler", type: "operations", status: "healthy", icon: "📅", currentTask: "Queue management", progress: 90, backlogCount: 1, metrics: { latency: randMetrics(), successRate: randMetrics(), activity: randMetrics() } },
  { id: "architect", name: "Architect", type: "design", status: "healthy", icon: "🏗️", currentTask: "System design review", progress: 60, backlogCount: 2, metrics: { latency: randMetrics(), successRate: randMetrics(), activity: randMetrics() } },
  { id: "scout", name: "Scout", type: "intelligence", status: "active", icon: "🔭", currentTask: "Opportunity detection", progress: 33, backlogCount: 7, metrics: { latency: randMetrics(), successRate: randMetrics(), activity: randMetrics() } },
  { id: "contentcmd", name: "Content Command", type: "content", status: "degraded", icon: "📝", currentTask: "Content pipeline", progress: 55, backlogCount: 12, metrics: { latency: randMetrics(), successRate: randMetrics(), activity: randMetrics() } },
  { id: "webagency", name: "WebAgency", type: "web", status: "degraded", icon: "🌐", currentTask: "Client deliverables", progress: 40, backlogCount: 8, metrics: { latency: randMetrics(), successRate: randMetrics(), activity: randMetrics() } },
  { id: "thewire", name: "The Wire", type: "comms", status: "healthy", icon: "📡", currentTask: "Signal relay", progress: 95, backlogCount: 0, metrics: { latency: randMetrics(), successRate: randMetrics(), activity: randMetrics() } },
  { id: "flipengine", name: "FlipEngine", type: "commerce", status: "down", icon: "🔄", currentTask: "Halted", progress: 0, backlogCount: 15, metrics: { latency: randMetrics(), successRate: randMetrics(), activity: randMetrics() } },
  { id: "videographer", name: "Videographer", type: "media", status: "active", icon: "🎬", currentTask: "Video pipeline", progress: 70, backlogCount: 4, metrics: { latency: randMetrics(), successRate: randMetrics(), activity: randMetrics() } },
  { id: "analyst", name: "Analyst", type: "analytics", status: "healthy", icon: "📊", currentTask: "Revenue analysis", progress: 85, backlogCount: 2, metrics: { latency: randMetrics(), successRate: randMetrics(), activity: randMetrics() } },
  { id: "skoolmaster", name: "Skool Master", type: "education", status: "degraded", icon: "🎓", currentTask: "Course updates", progress: 30, backlogCount: 9, metrics: { latency: randMetrics(), successRate: randMetrics(), activity: randMetrics() } },
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

export const SAMPLE_EVENTS: AgentEvent[] = [
  { id: "ev1", agentId: "brain", agentName: "Brain", type: "kickoff", message: "New campaign: OnlyFans tease + Hoodtorial waitlist", ts: "2026-03-02T17:08:36Z" },
  { id: "ev2", agentId: "research", agentName: "Research", type: "assignment", message: "Pulling 3 revenue-focused OF hooks + IG proof angles", ts: "2026-03-02T17:08:55Z" },
  { id: "ev3", agentId: "research", agentName: "Research", type: "report", message: "Findings: tease loops + countdown bundles win", ts: "2026-03-02T17:09:12Z" },
  { id: "ev4", agentId: "scheduler", agentName: "Scheduler", type: "publish", message: "Queued 5 posts across 3 platforms", ts: "2026-03-02T17:15:00Z" },
  { id: "ev5", agentId: "architect", agentName: "Architect", type: "emit", message: "System design review complete", ts: "2026-03-02T17:20:00Z" },
  { id: "ev6", agentId: "contentcmd", agentName: "Content Command", type: "draft", message: "Draft carousel: 5 slides ready for review", ts: "2026-03-02T17:25:00Z" },
  { id: "ev7", agentId: "scout", agentName: "Scout", type: "alert", message: "Detected trending topic: AI automation", ts: "2026-03-02T17:30:00Z" },
  { id: "ev8", agentId: "flipengine", agentName: "FlipEngine", type: "error", message: "Payment gateway timeout — retrying", ts: "2026-03-02T17:35:00Z" },
  { id: "ev9", agentId: "videographer", agentName: "Videographer", type: "render", message: "Video render complete: 45s reel", ts: "2026-03-02T17:40:00Z" },
  { id: "ev10", agentId: "analyst", agentName: "Analyst", type: "insight", message: "Revenue up 23% WoW — OF bundle converting", ts: "2026-03-02T17:45:00Z" },
  { id: "ev11", agentId: "thewire", agentName: "The Wire", type: "relay", message: "Broadcast: campaign update to all agents", ts: "2026-03-02T17:50:00Z" },
  { id: "ev12", agentId: "brain", agentName: "Brain", type: "decision", message: "Prioritizing content pipeline — backlog critical", ts: "2026-03-02T17:55:00Z" },
];

export const statusColor = (status: AgentStatus) => {
  switch (status) {
    case "healthy": return { bg: "hsl(160, 100%, 45%)", glow: "0 0 20px hsl(160 100% 45% / 0.5)" };
    case "degraded": return { bg: "hsl(35, 100%, 55%)", glow: "0 0 20px hsl(35 100% 55% / 0.5)" };
    case "down": return { bg: "hsl(0, 80%, 55%)", glow: "0 0 20px hsl(0 80% 55% / 0.5)" };
    case "active": return { bg: "hsl(210, 100%, 60%)", glow: "0 0 20px hsl(210 100% 60% / 0.5)" };
  }
};
