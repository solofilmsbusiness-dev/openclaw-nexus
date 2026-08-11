import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AGENTS, EDGES, SAMPLE_EVENTS, createAgent, createEdge, type Agent, type AgentEvent, type AgentStatus, type Edge } from "@/data/agents";
import { useSimulation } from "@/hooks/useSimulation";
import { supabase } from "@/integrations/supabase/client";

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
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [edges, setEdges] = useState<Edge[]>(EDGES);
  const [events, setEvents] = useState<AgentEvent[]>(SAMPLE_EVENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [dragOffsets, setDragOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [nodeSizes, setNodeSizes] = useState<Record<string, number>>({});

  const handleAgentsChange = useCallback((newAgents: Agent[]) => setAgents(newAgents), []);
  const handleNewEvent = useCallback((event: AgentEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 50));
  }, []);

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
  }, []);

  const renameAgent = useCallback((id: string, name: string) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, name } : a)));
  }, []);

  const loadConfig = useCallback((newAgents: Agent[], newEdges: Edge[], layout?: LayoutData) => {
    setAgents(newAgents);
    setEdges(newEdges);
    setEvents([]);
    setKillSwitchActive(false);
    setDragOffsets(layout?.dragOffsets || {});
    setNodeSizes(layout?.nodeSizes || {});
  }, []);

  const loadLastConfig = useCallback(async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase
      .from("graph_configs")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return false;
    const config = data[0];
    const agentsData = config.agents_data as unknown as { agents?: Agent[]; layout?: LayoutData } | Agent[];
    const edgesData = config.edges_data as unknown as Edge[];
    // Support new wrapped format: { agents: [...], layout: {...} }
    if (agentsData && typeof agentsData === "object" && !Array.isArray(agentsData) && agentsData.agents) {
      loadConfig(agentsData.agents as Agent[], edgesData as Edge[], agentsData.layout as LayoutData);
    } else {
      loadConfig(agentsData as Agent[], edgesData as Edge[]);
    }
    return true;
  }, [loadConfig]);

  const { pathname } = useLocation();
  useSimulation(agents, handleAgentsChange, handleNewEvent, killSwitchActive, pathname);

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
