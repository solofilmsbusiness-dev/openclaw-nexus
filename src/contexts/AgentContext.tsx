import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AGENT_TEMPLATE_MAP, EDGES, DEFAULT_DRAG_OFFSETS, createAgent, createEdge, type Agent, type AgentEvent, type AgentStatus, type Edge } from "@/data/agents";
import { useSimulation } from "@/hooks/useSimulation";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type AgentHealthRow = Tables<"agent_health"> & { heartbeat_at?: string | null };

const TEMPLATE_LOOKUP = AGENT_TEMPLATE_MAP;

const GRAPH_LAYOUT_STORAGE_KEY = "agent-graph-layout";

const AUTOSAVE_NAME = "__autosave__";
const AUTOSAVE_PROJECT = "__default__";
const DEFAULT_CONFIG_NAME = "official solo OS 2.6";

const SAMPLE_EVENTS = [
  {
    agent_name: "Brain",
    event_type: "status_ping",
    event_payload: { message: "Graph synced with Supabase live roster", severity: "info" },
  },
  {
    agent_name: "Scheduler",
    event_type: "autopost_check",
    event_payload: { message: "Autopost cadence verified", severity: "info" },
  },
  {
    agent_name: "Architect",
    event_type: "layout_update",
    event_payload: { message: "Official Solo OS 2.6 layout locked", severity: "info" },
  },
  {
    agent_name: "Executor",
    event_type: "deployment",
    event_payload: { message: "Latest preview deployed", severity: "success" },
  },
];

const cloneAgentTemplate = (agent: Agent): Agent => ({
  ...agent,
  metrics: {
    latency: [...agent.metrics.latency],
    successRate: [...agent.metrics.successRate],
    activity: [...agent.metrics.activity],
  },
});

const getTemplateForAgent = (key: string): Agent | undefined => {
  const template = TEMPLATE_LOOKUP.get(key) || TEMPLATE_LOOKUP.get(key.toLowerCase());
  return template ? cloneAgentTemplate(template) : undefined;
};

const slugifyAgentId = (value?: string | null) => {
  if (!value) return undefined;
  const direct = TEMPLATE_LOOKUP.get(value) || TEMPLATE_LOOKUP.get(value.toLowerCase());
  if (direct) return direct.id;
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
};

const normalizeStatus = (value?: string | null): AgentStatus => {
  switch ((value ?? "").toLowerCase()) {
    case "healthy":
    case "ok":
    case "online":
      return "healthy";
    case "down":
    case "offline":
    case "error":
      return "down";
    case "degraded":
    case "warning":
      return "degraded";
    case "active":
    case "running":
    default:
      return "active";
  }
};

type NormalizedHealth = {
  id: string;
  status: AgentStatus;
  heartbeatAt: string;
  statusText?: string | null;
  displayName?: string | null;
};

const toNormalizedHealth = (row: AgentHealthRow): NormalizedHealth | null => {
  const id = row.agent_id?.trim() || slugifyAgentId(row.agent_name);
  if (!id) return null;
  return {
    id,
    status: normalizeStatus(row.status),
    heartbeatAt: row.heartbeat_at ?? row.created_at ?? new Date().toISOString(),
    statusText: row.status_text ?? null,
    displayName: row.agent_name ?? null,
  };
};

type AgentEventRow = Tables<"agent_events">;
type ProjectScheduleRow = Tables<"project_schedule">;

const deriveEventMessage = (row: AgentEventRow): string => {
  const payload = row.event_payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    const candidate = record.message || record.text || record.summary || record.body || record.note;
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return row.event_type;
};

const METRIC_HISTORY_LENGTH = 24;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const METRIC_BASES: Record<AgentStatus, { latency: number; success: number; activity: number }> = {
  healthy: { latency: 0.28, success: 0.92, activity: 0.75 },
  active: { latency: 0.35, success: 0.85, activity: 0.88 },
  degraded: { latency: 0.65, success: 0.55, activity: 0.45 },
  down: { latency: 0.95, success: 0.05, activity: 0.08 },
};

const rollSeries = (series: number[] | undefined, sample: number) => {
  const baseSeries = Array.isArray(series) && series.length ? [...series] : Array(METRIC_HISTORY_LENGTH).fill(sample);
  const next = [...baseSeries.slice(-(METRIC_HISTORY_LENGTH - 1)), clamp01(sample)];
  return next;
};

const jitter = (value: number, variance = 0.05) => clamp01(value + (Math.random() * 2 - 1) * variance);

const getMetricSamples = (status: AgentStatus, backlogCount: number) => {
  const base = METRIC_BASES[status] ?? METRIC_BASES.active;
  const backlogLoad = Math.min(backlogCount / 10, 1);
  const latency = jitter(base.latency + backlogLoad * 0.2, 0.04);
  const success = jitter(base.success - backlogLoad * 0.3, 0.05);
  const activity = jitter(base.activity - (status === "down" ? 0.3 : backlogLoad * 0.1), 0.05);
  return { latency, success, activity };
};

const applyMetricSample = (agent: Agent, status: AgentStatus): Agent => {
  const backlog = agent.backlogCount ?? 0;
  const samples = getMetricSamples(status, backlog);
  return {
    ...agent,
    metrics: {
      latency: rollSeries(agent.metrics?.latency, samples.latency),
      successRate: rollSeries(agent.metrics?.successRate, samples.success),
      activity: rollSeries(agent.metrics?.activity, samples.activity),
    },
  };
};

const formatStatusChangeMessage = (prev: Agent | undefined, next: Agent) => {
  const statusSegment = prev ? `${prev.status.toUpperCase()} → ${next.status.toUpperCase()}` : `${next.status.toUpperCase()}`;
  const detail = next.statusText ?? prev?.statusText;
  return detail ? `${next.name} ${statusSegment} — ${detail}` : `${next.name} ${statusSegment}`;
};

const createDerivedEvent = (prev: Agent | undefined, next: Agent): AgentEvent => ({
  id: `status-${next.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  agentId: next.id,
  agentName: next.name,
  type: "status_change",
  message: formatStatusChangeMessage(prev, next),
  ts: new Date().toISOString(),
});

const publishSystemEvent = async (eventType: string, payload: Record<string, unknown>) => {
  try {
    await supabase.from("agent_events").insert({
      event_type: eventType,
      agent_name: "Mission Control",
      event_payload: payload,
    });
  } catch (error) {
    console.error("Failed to publish system event", error);
  }
};

const toAgentEvent = (row: AgentEventRow): AgentEvent => {
  const agentName = row.agent_name ?? "SYSTEM";
  const agentId = slugifyAgentId(row.agent_name) ?? "system";
  return {
    id: row.id,
    agentId,
    agentName,
    type: row.event_type ?? "event",
    message: deriveEventMessage(row),
    ts: row.created_at,
  };
};


interface LayoutData {
  dragOffsets: Record<string, { x: number; y: number }>;
  nodeSizes: Record<string, number>;
}

interface AgentContextValue {
  agents: Agent[];
  edges: Edge[];
  events: AgentEvent[];
  selectedAgentId: string | null;
  killSwitchActive: boolean;
  dragOffsets: Record<string, { x: number; y: number }>;
  nodeSizes: Record<string, number>;
  setSelectedAgentId: (id: string | null) => void;
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setEvents: React.Dispatch<React.SetStateAction<AgentEvent[]>>;
  setDragOffsets: React.Dispatch<React.SetStateAction<Record<string, { x: number; y: number }>>>;
  setNodeSizes: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  handleAgentsChange: (newAgents: Agent[]) => void;
  handleStatusChange: (id: string, status: AgentStatus) => void;
  handleAddAgent: (overrides: Partial<Agent>) => void;
  handleDeleteAgent: (id: string) => void;
  handleAddEdge: (from: string, to: string, kind: string) => void;
  handleDeleteEdge: (edgeId: string) => void;
  killAll: () => void;
  reviveAll: () => void;
  renameAgent: (id: string, name: string) => void;
  loadConfig: (agents: Agent[], edges: Edge[], layout?: LayoutData) => void;
  loadLastConfig: () => Promise<boolean>;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [edges, setEdges] = useState<Edge[]>(EDGES);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [dragOffsets, setDragOffsets] = useState<Record<string, { x: number; y: number }>>({ ...DEFAULT_DRAG_OFFSETS });
  const [nodeSizes, setNodeSizes] = useState<Record<string, number>>({});
  const [autosaveUserId, setAutosaveUserId] = useState<string | null>(null);

  const seededEventsRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setAutosaveUserId(data.user?.id ?? null);
    };
    init();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAutosaveUserId(session?.user?.id ?? null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GRAPH_LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.dragOffsets) setDragOffsets({ ...DEFAULT_DRAG_OFFSETS, ...parsed.dragOffsets });
      if (parsed.nodeSizes) setNodeSizes(parsed.nodeSizes);
    } catch {}
  }, []);

  const [liveDataActive, setLiveDataActive] = useState(false);

  const [liveEventsActive, setLiveEventsActive] = useState(false);

  useEffect(() => {
    try {
      const payload = JSON.stringify({ dragOffsets, nodeSizes });
      localStorage.setItem(GRAPH_LAYOUT_STORAGE_KEY, payload);
    } catch {}
  }, [dragOffsets, nodeSizes]);

  const applyHealthRecords = useCallback((rows: AgentHealthRow[]) => {
    if (!rows.length) return;
    const seen = new Set<string>();
    const normalized: NormalizedHealth[] = [];
    rows.forEach((row) => {
      const normalizedRow = toNormalizedHealth(row);
      if (!normalizedRow) return;
      if (seen.has(normalizedRow.id)) return;
      seen.add(normalizedRow.id);
      normalized.push(normalizedRow);
    });
    if (!normalized.length) return;
    setLiveDataActive(true);
    let nextAgents: Agent[] = [];
    const derivedEvents: AgentEvent[] = [];
    setAgents((prev) => {
      const normalizedMap = new Map(normalized.map((row) => [row.id, row]));
      const used = new Set<string>();
      const buildAgent = (row: NormalizedHealth, existing?: Agent): Agent => {
        const template = getTemplateForAgent(row.id) || (row.displayName ? getTemplateForAgent(row.displayName) : undefined);
        const fallback = createAgent({ id: row.id, name: row.displayName ?? row.id });
        const base = existing ?? template ?? fallback;
        const built: Agent = {
          ...base,
          id: row.id,
          name: row.displayName ?? base.name,
          subtitle: base.subtitle ?? base.type ?? base.name,
          type: base.type ?? "operations",
          status: row.status,
          heartbeatAt: row.heartbeatAt,
          statusText: row.statusText,
          currentTask: row.statusText ?? base.currentTask,
          progress: row.status === "down" ? 0 : base.progress,
        };
        const applied = applyMetricSample(built, row.status);
        if (existing && (existing.status !== applied.status || existing.statusText !== applied.statusText)) {
          derivedEvents.push(createDerivedEvent(existing, applied));
        }
        return applied;
      };
      const ordered: Agent[] = [];
      prev.forEach((agent) => {
        const row = normalizedMap.get(agent.id);
        if (!row) return;
        ordered.push(buildAgent(row, agent));
        used.add(agent.id);
      });
      normalized.forEach((row) => {
        if (used.has(row.id)) return;
        ordered.push(buildAgent(row));
        used.add(row.id);
      });
      nextAgents = ordered;
      return ordered;
    });
    if (derivedEvents.length) {
      setEvents((prevEvents) => [
        ...derivedEvents,
        ...prevEvents,
      ].slice(0, 200));
    }
    const activeIds = new Set(nextAgents.map((agent) => agent.id));
    setEdges((prevEdges) => {
      const baseEdges = prevEdges.length ? prevEdges : EDGES;
      return baseEdges.filter((edge) => activeIds.has(edge.from) && activeIds.has(edge.to));
    });
  }, []);

  const applyEventRows = useCallback((rows: AgentEventRow[]) => {
    if (!rows.length) return;
    setLiveEventsActive(true);
    setEvents((prev) => {
      const merged = new Map<string, AgentEvent>();
      prev.forEach((event) => merged.set(event.id, event));
      rows.forEach((row) => {
        const normalized = toAgentEvent(row);
        merged.set(normalized.id, normalized);
      });
      return Array.from(merged.values())
        .sort((a, b) => (a.ts < b.ts ? 1 : -1))
        .slice(0, 200);
    });
  }, []);

  const updateBacklogFromSchedule = useCallback((rows: ProjectScheduleRow[]) => {
    setAgents((prev) => {
      const nameToId = new Map<string, string>();
      prev.forEach((agent) => nameToId.set(agent.name.toLowerCase(), agent.id));
      const backlogMap = new Map<string, number>();
      rows.forEach((row) => {
        const ownerKey = row.owner?.toLowerCase();
        const ownerId = ownerKey ? nameToId.get(ownerKey) : undefined;
        if (!ownerId) return;
        if ((row.status ?? "").toLowerCase() === "done") return;
        backlogMap.set(ownerId, (backlogMap.get(ownerId) ?? 0) + 1);
      });
      return prev.map((agent) => {
        const count = backlogMap.get(agent.id) ?? 0;
        if (agent.backlogCount === count) return agent;
        return { ...agent, backlogCount: count };
      });
    });
  }, []);

  const persistLayout = useCallback(async () => {
    if (!autosaveUserId) return;
    try {
      const payloadAgents = JSON.parse(JSON.stringify({ agents, layout: { dragOffsets, nodeSizes } }));
      const payloadEdges = JSON.parse(JSON.stringify(edges));
      const { data, error } = await supabase
        .from("graph_configs")
        .select("id")
        .eq("user_id", autosaveUserId)
        .eq("name", AUTOSAVE_NAME)
        .maybeSingle();
      if (error && error.code !== "PGRST116") return;
      if (data?.id) {
        await supabase
          .from("graph_configs")
          .update({
            project: AUTOSAVE_PROJECT,
            agents_data: payloadAgents,
            edges_data: payloadEdges,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
      } else {
        await supabase.from("graph_configs").insert({
          user_id: autosaveUserId,
          name: AUTOSAVE_NAME,
          project: AUTOSAVE_PROJECT,
          agents_data: payloadAgents,
          edges_data: payloadEdges,
        });
      }
    } catch {}
  }, [autosaveUserId, agents, edges, dragOffsets, nodeSizes]);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!autosaveUserId) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      persistLayout();
    }, 1500);
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
        autosaveTimer.current = null;
      }
    };
  }, [autosaveUserId, persistLayout]);

  const handleAgentsChange = useCallback((newAgents: Agent[]) => setAgents(newAgents), []);
  const handleNewEvent = useCallback((event: AgentEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 50));
  }, []);

  const seedInitialEvents = useCallback(async () => {
    if (seededEventsRef.current) return;
    try {
      seededEventsRef.current = true;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const now = Date.now();
      const payload = SAMPLE_EVENTS.map((event, idx) => ({
        ...event,
        created_at: new Date(now - idx * 60_000).toISOString(),
      }));
      await supabase.from("agent_events").insert(payload);
    } catch (error) {
      console.error("Failed to seed agent events", error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from("agent_health")
        .select("agent_id, agent_name, status, status_text, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled || error || !data) return;
      applyHealthRecords(data);
    };

    fetchInitial();

    const channel = supabase
      .channel("agent-health-stream")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_health" }, (payload) => {
        const row = payload.new as AgentHealthRow;
        applyHealthRecords([row]);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [applyHealthRecords]);

  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("agent_events")
        .select("id, event_type, agent_name, event_payload, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled || error) return;
      if (!data || data.length === 0) {
        await seedInitialEvents();
        if (cancelled) return;
        const { data: seededData } = await supabase
          .from("agent_events")
          .select("id, event_type, agent_name, event_payload, created_at")
          .order("created_at", { ascending: false })
          .limit(200);
        if (!cancelled && seededData && seededData.length > 0) {
          applyEventRows(seededData);
        }
        return;
      }
      applyEventRows(data);
    };

    fetchEvents();

    const channel = supabase
      .channel("agent-events-stream")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_events" }, (payload) => {
        const row = payload.new as AgentEventRow;
        applyEventRows([row]);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [applyEventRows, seedInitialEvents]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prev) => prev.map((agent) => applyMetricSample(agent, agent.status)));
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchSchedule = async () => {
      const { data, error } = await supabase
        .from("project_schedule")
        .select("id, owner, status");
      if (cancelled || error || !data) return;
      updateBacklogFromSchedule(data);
    };

    fetchSchedule();

    const channel = supabase
      .channel("project-schedule-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "project_schedule" }, () => {
        fetchSchedule();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [updateBacklogFromSchedule]);

  const handleStatusChange = useCallback((id: string, status: AgentStatus) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status, progress: status === "down" ? 0 : a.progress, currentTask: status === "down" ? "Halted" : a.currentTask }
          : a
      )
    );
  }, []);

  const handleAddAgent = useCallback((overrides: Partial<Agent>) => {
    setAgents((prev) => [...prev, createAgent(overrides)]);
  }, []);

  const handleDeleteAgent = useCallback((id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
    setEvents((prev) => prev.filter((e) => e.agentId !== id));
    setSelectedAgentId((prev) => (prev === id ? null : prev));
  }, []);

  const handleAddEdge = useCallback((from: string, to: string, kind: string) => {
    setEdges((prev) => {
      const existingIdx = prev.findIndex((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from));
      if (existingIdx !== -1) {
        // Update the kind of the existing edge instead of silently skipping
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], kind };
        return updated;
      }
      return [...prev, createEdge(from, to, kind)];
    });
  }, []);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  }, []);

  const killAll = useCallback(() => {
    setKillSwitchActive(true);
    setAgents((prev) =>
      prev.map((a) => ({ ...a, status: "down" as AgentStatus, progress: 0, currentTask: "KILLED" }))
    );
    const killEvent: AgentEvent = {
      id: `ev-kill-${Date.now()}`,
      agentId: "system",
      agentName: "SYSTEM",
      type: "kill",
      message: "⚠️ KILL SWITCH ACTIVATED — All agents terminated",
      ts: new Date().toISOString(),
    };
    setEvents((prev) => [killEvent, ...prev].slice(0, 50));
    void publishSystemEvent("kill_switch", {
      message: "Kill switch engaged",
      severity: "critical",
      triggered_at: new Date().toISOString(),
    });
  }, []);

  const reviveAll = useCallback(() => {
    setKillSwitchActive(false);
    setAgents((prev) =>
      prev.map((a) => ({ ...a, status: "healthy" as AgentStatus, progress: 50, currentTask: "Resuming operations" }))
    );
    const reviveEvent: AgentEvent = {
      id: `ev-revive-${Date.now()}`,
      agentId: "system",
      agentName: "SYSTEM",
      type: "revive",
      message: "✅ All agents revived — systems nominal",
      ts: new Date().toISOString(),
    };
    setEvents((prev) => [reviveEvent, ...prev].slice(0, 50));
    void publishSystemEvent("kill_switch_reset", {
      message: "System revived",
      triggered_at: new Date().toISOString(),
    });
  }, []);

  const renameAgent = useCallback((id: string, name: string) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, name } : a)));
  }, []);

  const loadConfig = useCallback((newAgents: Agent[], newEdges: Edge[], layout?: LayoutData) => {
    setAgents(newAgents);
    setEdges(newEdges);
    setEvents([]);
    setKillSwitchActive(false);
    setDragOffsets(layout?.dragOffsets ? { ...DEFAULT_DRAG_OFFSETS, ...layout.dragOffsets } : { ...DEFAULT_DRAG_OFFSETS });
    setNodeSizes(layout?.nodeSizes || {});
  }, []);

  const loadLastConfig = useCallback(async (): Promise<boolean> => {
    const applyConfig = (config: any) => {
      if (!config) return false;
      const agentsData = config.agents_data as any;
      const edgesData = config.edges_data as any;
      if (agentsData && typeof agentsData === "object" && !Array.isArray(agentsData) && agentsData.agents) {
        loadConfig(agentsData.agents as Agent[], edgesData as Edge[], agentsData.layout as LayoutData);
      } else {
        loadConfig(agentsData as Agent[], edgesData as Edge[]);
      }
      return true;
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    if (DEFAULT_CONFIG_NAME) {
      const { data: defaultData, error: defaultError } = await supabase
        .from("graph_configs")
        .select("*")
        .eq("user_id", user.id)
        .eq("name", DEFAULT_CONFIG_NAME)
        .order("updated_at", { ascending: false })
        .maybeSingle();
      if (!defaultError && defaultData) {
        if (applyConfig(defaultData)) return true;
      }
    }

    const { data, error } = await supabase
      .from("graph_configs")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return false;
    return applyConfig(data[0]);
  }, [loadConfig]);

  const { pathname } = useLocation();
  useSimulation(agents, handleAgentsChange, handleNewEvent, killSwitchActive, pathname, liveDataActive || liveEventsActive);

  return (
    <AgentContext.Provider
      value={{
        agents, edges, events, selectedAgentId, killSwitchActive,
        dragOffsets, nodeSizes, setDragOffsets, setNodeSizes,
        setSelectedAgentId, setAgents, setEdges, setEvents,
        handleAgentsChange, handleStatusChange, handleAddAgent, handleDeleteAgent,
        handleAddEdge, handleDeleteEdge, killAll, reviveAll, renameAgent, loadConfig, loadLastConfig,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgents(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error("useAgents must be used within AgentProvider");
  }
  return ctx;
}
