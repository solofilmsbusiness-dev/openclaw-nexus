import { motion } from "framer-motion";
import { SAMPLE_EVENTS, statusColor, AGENTS } from "@/data/agents";

export default function EventTimeline() {
  return (
    <div className="glass-panel neon-border p-4 h-full overflow-hidden flex flex-col">
      <h2 className="font-display font-bold text-xs tracking-widest uppercase text-muted-foreground mb-3 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse-glow" />
        Event Timeline
      </h2>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
        {SAMPLE_EVENTS.map((event, i) => {
          const agent = AGENTS.find(a => a.id === event.agentId);
          const color = agent ? statusColor(agent.status) : statusColor("healthy");
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-3 py-2 border-b border-border/30 group hover:bg-muted/30 rounded px-2 transition-colors"
            >
              <div className="flex flex-col items-center">
                <div
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: color.bg, boxShadow: color.glow }}
                />
                <div className="w-px flex-1 bg-border/30 mt-1" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {new Date(event.ts).toLocaleTimeString()}
                  </span>
                  <span
                    className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                    style={{ color: color.bg, backgroundColor: `${color.bg}15` }}
                  >
                    {event.agentName}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">
                    {event.type}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 mt-0.5 truncate">{event.message}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
