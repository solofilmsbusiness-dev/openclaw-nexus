import { useState, useCallback } from "react";
import MetricsBar from "@/components/MetricsBar";
import AgentGraph from "@/components/AgentGraph";
import EventTimeline from "@/components/EventTimeline";
import TerminalLog from "@/components/TerminalLog";
import AgentCards from "@/components/AgentCards";
import InteractiveTimeline from "@/components/InteractiveTimeline";
import { AGENTS, type Agent } from "@/data/agents";

const Index = () => {
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const handleAgentsChange = useCallback((newAgents: Agent[]) => setAgents(newAgents), []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MetricsBar />

      <div className="flex-1 flex flex-col gap-2 p-2 min-h-0">
        {/* Top: Horizontal agent cards strip */}
        <div className="shrink-0 h-[180px]">
          <AgentCards agents={agents} onAgentsChange={handleAgentsChange} />
        </div>

        {/* Center: Agent Graph - main focus */}
        <div className="flex-1 min-h-[300px]">
          <AgentGraph agents={agents} />
        </div>

        {/* Interactive Timeline */}
        <div className="shrink-0 h-[80px]">
          <InteractiveTimeline />
        </div>

        {/* Bottom: Event Timeline + Terminal Log side by side */}
        <div className="shrink-0 flex flex-col lg:flex-row gap-2 h-[250px]">
          <div className="flex-1 min-h-0">
            <EventTimeline />
          </div>
          <div className="flex-1 min-h-0">
            <TerminalLog />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
