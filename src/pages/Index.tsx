import { useState, useCallback } from "react";
import MetricsBar from "@/components/MetricsBar";
import AgentGraph from "@/components/AgentGraph";
import EventTimeline from "@/components/EventTimeline";
import TerminalLog from "@/components/TerminalLog";
import AgentCards from "@/components/AgentCards";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AGENTS, type Agent } from "@/data/agents";

const Index = () => {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(isMobile);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const handleAgentsChange = useCallback((newAgents: Agent[]) => setAgents(newAgents), []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MetricsBar />

      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 min-h-0">
        {/* Left sidebar */}
        <div
          className={`relative transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
            collapsed ? "w-0 lg:w-0" : "w-full lg:w-[320px]"
          }`}
        >
          <div className="w-full lg:w-[320px] h-full min-h-[300px] lg:min-h-0">
            <AgentCards agents={agents} onAgentsChange={handleAgentsChange} />
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-5 shrink-0 rounded-md border border-border/30 hover:border-border/60 bg-secondary/50 hover:bg-secondary transition-colors self-center h-16"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>

        {/* Mobile toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="lg:hidden flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md border border-border/30 bg-secondary/50 text-[10px] font-mono uppercase tracking-wider text-muted-foreground self-start"
        >
          {collapsed ? <><ChevronRight className="w-3 h-3" /> Show Agents</> : <><ChevronLeft className="w-3 h-3" /> Hide Agents</>}
        </button>

        {/* Graph - main focus */}
        <div className="flex-1 min-h-[400px] lg:min-h-0">
          <AgentGraph agents={agents} />
        </div>

        {/* Right toggle button (desktop) */}
        <button
          onClick={() => setRightCollapsed(!rightCollapsed)}
          className="hidden lg:flex items-center justify-center w-5 shrink-0 rounded-md border border-border/30 hover:border-border/60 bg-secondary/50 hover:bg-secondary transition-colors self-center h-16"
          title={rightCollapsed ? "Expand panels" : "Collapse panels"}
        >
          {rightCollapsed ? <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>

        {/* Right mobile toggle */}
        <button
          onClick={() => setRightCollapsed(!rightCollapsed)}
          className="lg:hidden flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md border border-border/30 bg-secondary/50 text-[10px] font-mono uppercase tracking-wider text-muted-foreground self-start"
        >
          {rightCollapsed ? <><ChevronLeft className="w-3 h-3" /> Show Panels</> : <><ChevronRight className="w-3 h-3" /> Hide Panels</>}
        </button>

        {/* Right panel */}
        <div
          className={`relative transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
            rightCollapsed ? "w-0 lg:w-0" : "w-full lg:w-[280px]"
          }`}
        >
          <div className="w-full lg:w-[280px] h-full flex flex-col gap-3 min-h-0">
            <div className="min-h-[250px] lg:flex-1 lg:min-h-0">
              <EventTimeline />
            </div>
            <div className="min-h-[200px] lg:flex-1 lg:min-h-0">
              <TerminalLog />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
