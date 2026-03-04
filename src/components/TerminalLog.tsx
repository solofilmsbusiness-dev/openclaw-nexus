import { motion } from "framer-motion";
import { SAMPLE_EVENTS } from "@/data/agents";

export default function TerminalLog() {
  return (
    <div className="glass-panel neon-border p-4 h-full overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-neon-red/70" />
          <div className="w-2 h-2 rounded-full bg-neon-orange/70" />
          <div className="w-2 h-2 rounded-full bg-neon-green/70" />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
          agent_bus.log
        </span>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-0.5">
        {SAMPLE_EVENTS.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.08 }}
            className="terminal-text"
          >
            <span className="text-muted-foreground">[{new Date(event.ts).toLocaleTimeString()}]</span>{" "}
            <span className="text-primary">{event.agentName}</span>{" "}
            <span className="text-muted-foreground">→</span>{" "}
            <span className="text-foreground/70">{event.message}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
