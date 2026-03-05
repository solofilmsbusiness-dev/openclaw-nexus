import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import MetricsBar from "@/components/MetricsBar";
import AgentGraph from "@/components/AgentGraph";
import EventTimeline from "@/components/EventTimeline";
import TerminalLog from "@/components/TerminalLog";
import AgentCards from "@/components/AgentCards";
import CommandPalette from "@/components/CommandPalette";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAgents } from "@/contexts/AgentContext";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(isMobile);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login", { replace: true });
      } else {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, [navigate]);

  if (!authChecked) return null;

  const {
    agents, edges, events, selectedAgentId, killSwitchActive, setSelectedAgentId,
    handleAgentsChange, handleStatusChange, handleAddAgent, handleDeleteAgent,
    handleAddEdge, handleDeleteEdge,
  } = useAgents();

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <MetricsBar agents={agents} />

      <CommandPalette
        agents={agents}
        onSelectAgent={setSelectedAgentId}
        onStatusChange={handleStatusChange}
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <div
          className={`relative transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
            collapsed ? "w-0 lg:w-0" : "w-full lg:w-[320px]"
          }`}
        >
          <div className="w-full lg:w-[320px] h-full overflow-hidden">
            <AgentCards
              agents={agents}
              onAgentsChange={handleAgentsChange}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
              onAddAgent={handleAddAgent}
              onDeleteAgent={handleDeleteAgent}
            />
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-5 shrink-0 rounded-lg border border-border/30 hover:border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-colors self-center h-16"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>

        {/* Mobile toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="lg:hidden flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-border/30 bg-secondary/30 text-[10px] font-mono tracking-wider text-muted-foreground self-start"
        >
          {collapsed ? <><ChevronRight className="w-3 h-3" /> Show Agents</> : <><ChevronLeft className="w-3 h-3" /> Hide Agents</>}
        </button>

        {/* Graph */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AgentGraph
            agents={agents}
            edges={edges}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            onAddEdge={handleAddEdge}
            onDeleteEdge={handleDeleteEdge}
            onDeleteAgent={handleDeleteAgent}
            killSwitchActive={killSwitchActive}
          />
        </div>

        {/* Right toggle */}
        <button
          onClick={() => setRightCollapsed(!rightCollapsed)}
          className="hidden lg:flex items-center justify-center w-5 shrink-0 rounded-lg border border-border/30 hover:border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-colors self-center h-16"
          title={rightCollapsed ? "Expand panels" : "Collapse panels"}
        >
          {rightCollapsed ? <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>

        {/* Mobile right toggle */}
        <button
          onClick={() => setRightCollapsed(!rightCollapsed)}
          className="lg:hidden flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-border/30 bg-secondary/30 text-[10px] font-mono tracking-wider text-muted-foreground self-start"
        >
          {rightCollapsed ? <><ChevronLeft className="w-3 h-3" /> Show Panels</> : <><ChevronRight className="w-3 h-3" /> Hide Panels</>}
        </button>

        {/* Right panel */}
        <div
          className={`relative transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
            rightCollapsed ? "w-0 lg:w-0" : "w-full lg:w-[280px]"
          }`}
        >
          <div className="w-full lg:w-[280px] h-full flex flex-col gap-3 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <EventTimeline
                events={events}
                selectedAgentId={selectedAgentId}
                onSelectAgent={setSelectedAgentId}
              />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <TerminalLog events={events} />
            </div>
          </div>
        </div>
      </div>

      {/* Settings button */}
      <button
        onClick={() => navigate("/admin")}
        className="fixed top-4 right-4 z-50 flex items-center justify-center p-2.5 rounded-xl glass-panel neon-border text-primary hover:text-primary-foreground hover:bg-primary/90 transition-all duration-300 group hover:shadow-[var(--glow-blue)]"
        title="Admin Settings"
      >
        <Settings className="w-5 h-5 transition-transform duration-500 group-hover:rotate-90" />
      </button>

      {/* Cmd+K hint */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel neon-border text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>⌘K</span>
        </button>
      </div>
    </div>
  );
};

export default Index;
