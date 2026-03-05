import { useEffect, useRef, useCallback, useContext } from "react";
import type { Agent, AgentEvent, AgentStatus } from "@/data/agents";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";

const STATUS_OPTIONS: AgentStatus[] = ["healthy", "active", "degraded", "down"];
const TASKS: Record<string, string[]> = {
  brain: ["Campaign orchestration", "Strategy planning", "Priority rebalancing"],
  research: ["Trend scan", "Competitor analysis", "Audience profiling"],
  scheduler: ["Queue management", "Post scheduling", "Calendar sync"],
  architect: ["System design review", "Architecture audit", "Blueprint drafting"],
  scout: ["Opportunity detection", "Market scanning", "Signal tracking"],
  contentcmd: ["Content pipeline", "Draft carousel", "Caption writing"],
  webagency: ["Client deliverables", "Landing page build", "A/B test setup"],
  thewire: ["Signal relay", "Broadcast dispatch", "Channel monitoring"],
  flipengine: ["Payment processing", "Revenue optimization", "Checkout flow"],
  videographer: ["Video pipeline", "Reel rendering", "Thumbnail generation"],
  analyst: ["Revenue analysis", "KPI dashboard", "Funnel reporting"],
  skoolmaster: ["Course updates", "Student onboarding", "Curriculum review"],
};

const EVENT_TYPES = ["kickoff", "report", "alert", "emit", "draft", "render", "insight", "relay", "error", "decision"];
const EVENT_MESSAGES = [
  "Processing new batch of tasks",
  "Metrics updated — performance nominal",
  "Detected anomaly in data stream",
  "Handoff complete to downstream agent",
  "New priority signal received",
  "Cache invalidated — refreshing state",
  "Pipeline stage completed successfully",
  "Retrying failed operation (attempt 2/3)",
  "Scaling resources for peak load",
  "Checkpoint saved — state persisted",
  "Dependency resolved — unblocking queue",
  "Health check passed — all systems go",
  "Rate limit approaching — throttling",
  "New configuration deployed",
  "Backlog cleared — awaiting input",
];

let eventCounter = 100;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useSimulation(
  agents: Agent[],
  onAgentsChange: (agents: Agent[]) => void,
  onNewEvent: (event: AgentEvent) => void,
  killSwitchActive: boolean = false
) {
  let simulationSpeed = 1500;
  let logRetention = 50;
  try {
    const raw = localStorage.getItem("solo-os-settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.system?.simulationSpeed) simulationSpeed = parsed.system.simulationSpeed;
      if (parsed.system?.logRetention) logRetention = parsed.system.logRetention;
    }
  } catch {}

  const agentsRef = useRef(agents);
  agentsRef.current = agents;

  // Progress ticking
  useEffect(() => {
    if (killSwitchActive) return;
    const interval = setInterval(() => {
      const updated = agentsRef.current.map((a) => {
        if (a.status === "down") return a;
        const delta = Math.random() * 4 + 1;
        let newProgress = a.progress + delta;
        let newTask = a.currentTask;
        if (newProgress >= 100) {
          newProgress = Math.random() * 15 + 5;
          const tasks = TASKS[a.id] || ["Processing"];
          newTask = pickRandom(tasks.filter((t) => t !== a.currentTask)) || tasks[0];
        }
        const shift = (arr: number[]) => [...arr.slice(1), Math.random()];
        return {
          ...a,
          progress: Math.min(newProgress, 100),
          currentTask: newTask,
          metrics: {
            latency: shift(a.metrics.latency),
            successRate: shift(a.metrics.successRate),
            activity: shift(a.metrics.activity),
          },
        };
      });
      onAgentsChange(updated);
    }, simulationSpeed);
    return () => clearInterval(interval);
  }, [onAgentsChange, simulationSpeed, killSwitchActive]);

  // Status changes — every 8-15s
  useEffect(() => {
    if (killSwitchActive) return;
    const scheduleNext = () => {
      const delay = 8000 + Math.random() * 7000;
      return setTimeout(() => {
        const current = agentsRef.current;
        const idx = Math.floor(Math.random() * current.length);
        const agent = current[idx];
        const oldStatus = agent.status;
        let newStatus: AgentStatus;
        const roll = Math.random();
        if (roll < 0.4) newStatus = "healthy";
        else if (roll < 0.7) newStatus = "active";
        else if (roll < 0.9) newStatus = "degraded";
        else newStatus = "down";

        if (newStatus !== oldStatus) {
          const updated = current.map((a, i) =>
            i === idx
              ? {
                  ...a,
                  status: newStatus,
                  progress: newStatus === "down" ? 0 : a.progress,
                  currentTask: newStatus === "down" ? "Halted" : a.currentTask,
                }
              : a
          );
          onAgentsChange(updated);

          if (newStatus === "down") {
            toast.error(`${agent.name} went down`, { description: "Agent is offline" });
          } else if (oldStatus === "down") {
            toast.success(`${agent.name} is back online`, { description: `Status: ${newStatus}` });
          } else if (newStatus === "degraded") {
            toast.warning(`${agent.name} degraded`, { description: "Performance impacted" });
          }
        }
        timerRef.current = scheduleNext();
      }, delay);
    };
    const timerRef = { current: scheduleNext() };
    return () => clearTimeout(timerRef.current);
  }, [onAgentsChange, killSwitchActive]);

  // Generate events — every 3-6s
  useEffect(() => {
    if (killSwitchActive) return;
    const interval = setInterval(() => {
      const current = agentsRef.current;
      const agent = pickRandom(current);
      const event: AgentEvent = {
        id: `ev-sim-${eventCounter++}`,
        agentId: agent.id,
        agentName: agent.name,
        type: pickRandom(EVENT_TYPES),
        message: pickRandom(EVENT_MESSAGES),
        ts: new Date().toISOString(),
      };
      onNewEvent(event);
    }, 3000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [onNewEvent, killSwitchActive]);
}
