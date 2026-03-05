import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { AGENTS, EDGES, SAMPLE_EVENTS, createAgent, createEdge, type Agent, type AgentEvent, type AgentStatus, type Edge } from "@/data/agents";
import { useSimulation } from "@/hooks/useSimulation";

interface AgentContextValue {
  agents: Agent[];
  edges: Edge[];
  events: AgentEvent[];
  selectedAgentId: string | null;
  killSwitchActive: boolean;
  setSelectedAgentId: (id: string | null) => void;
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setEvents: React.Dispatch<React.SetStateAction<AgentEvent[]>>;
  handleAgentsChange: (newAgents: Agent[]) => void;
  handleStatusChange: (id: string, status: AgentStatus) => void;
  handleAddAgent: (overrides: Partial<Agent>) => void;
  handleDeleteAgent: (id: string) => void;
  handleAddEdge: (from: string, to: string, kind: string) => void;
  handleDeleteEdge: (edgeId: string) => void;
  killAll: () => void;
  reviveAll: () => void;
  renameAgent: (id: string, name: string) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [edges, setEdges] = useState<Edge[]>(EDGES);
  const [events, setEvents] = useState<AgentEvent[]>(SAMPLE_EVENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [killSwitchActive, setKillSwitchActive] = useState(false);

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
      const exists = prev.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from));
      if (exists) return prev;
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

  useSimulation(agents, handleAgentsChange, handleNewEvent);

  return (
    <AgentContext.Provider
      value={{
        agents, edges, events, selectedAgentId, killSwitchActive, setSelectedAgentId,
        setAgents, setEdges, setEvents,
        handleAgentsChange, handleStatusChange, handleAddAgent, handleDeleteAgent,
        handleAddEdge, handleDeleteEdge, killAll, reviveAll, renameAgent,
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
