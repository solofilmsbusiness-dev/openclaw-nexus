import MetricsBar from "@/components/MetricsBar";
import AgentGraph from "@/components/AgentGraph";
import EventTimeline from "@/components/EventTimeline";
import TerminalLog from "@/components/TerminalLog";
import AgentCards from "@/components/AgentCards";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MetricsBar />

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 p-3 min-h-0">
        {/* Agent cards */}
        <div className="min-h-[300px] md:min-h-0 md:col-span-1 lg:col-span-3 order-2 lg:order-1">
          <AgentCards />
        </div>

        {/* Graph */}
        <div className="min-h-[350px] md:min-h-[400px] md:col-span-2 lg:col-span-6 order-1 lg:order-2">
          <AgentGraph />
        </div>

        {/* Right panel */}
        <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-3 min-h-0 order-3">
          <div className="min-h-[250px] lg:flex-1 lg:min-h-0">
            <EventTimeline />
          </div>
          <div className="min-h-[200px] lg:flex-1 lg:min-h-0">
            <TerminalLog />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
