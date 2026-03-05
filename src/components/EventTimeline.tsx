import { motion, AnimatePresence } from "framer-motion";
import { statusColor, AGENTS, type AgentEvent } from "@/data/agents";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, X } from "lucide-react";

interface EventTimelineProps {
  events: AgentEvent[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
}

export default function EventTimeline({ events, selectedAgentId, onSelectAgent }: EventTimelineProps) {
  const filtered = selectedAgentId ? events.filter((e) => e.agentId === selectedAgentId) : events;
  const selectedAgent = selectedAgentId ? AGENTS.find((a) => a.id === selectedAgentId) : null;

  return (
    <div className="glass-panel neon-border p-4 h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-xs tracking-wide text-muted-foreground flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
          Events
        </h2>
        {selectedAgentId && (
          <button
            onClick={() => onSelectAgent(null)}
            className="flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded-md bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Filter className="w-2.5 h-2.5" />
            {selectedAgent?.name}
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 pr-1">
          <AnimatePresence initial={false}>
            {filtered.map((event) => {
              const agent = AGENTS.find((a) => a.id === event.agentId);
              const color = agent ? statusColor(agent.status) : statusColor("healthy");
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -15, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex gap-3 py-2 border-b border-border/20 group hover:bg-muted/20 rounded-lg px-2 transition-colors cursor-pointer"
                  onClick={() => onSelectAgent(event.agentId === selectedAgentId ? null : event.agentId)}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: color.bg }}
                    />
                    <div className="w-px flex-1 bg-border/20 mt-1" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {new Date(event.ts).toLocaleTimeString()}
                      </span>
                      <span
                        className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md"
                        style={{ color: color.bg, backgroundColor: `${color.bg}12` }}
                      >
                        {event.agentName}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground uppercase">
                        {event.type}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/70 mt-0.5 truncate">{event.message}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
