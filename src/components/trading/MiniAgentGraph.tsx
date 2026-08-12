import PipelineView from "@/components/agent/PipelineView";

/** Real agent pipeline, compact — kept as a Trading Desk panel. */
export default function MiniAgentGraph() {
  return (
    <div className="h-full w-full overflow-auto p-2">
      <PipelineView compact />
    </div>
  );
}