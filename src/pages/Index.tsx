import MetricsBar from "@/components/MetricsBar";
import AgentGraph from "@/components/AgentGraph";
import EventTimeline from "@/components/EventTimeline";
import TerminalLog from "@/components/TerminalLog";
import AgentCards from "@/components/AgentCards";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top metrics bar */}
      <MetricsBar />

      {/* Main content */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 min-h-0">
        {/* Left panel - Agent cards */}
        <div className="col-span-3 min-h-0">
          <AgentCards />
        </div>

        {/* Center - Graph */}
        <div className="col-span-6 min-h-0">
          <AgentGraph />
        </div>

        {/* Right panel */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
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
