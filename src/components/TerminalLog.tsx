import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgentEvent } from "@/data/agents";

export default function TerminalLog({ events }: { events: AgentEvent[] }) {
  return (
    <div className="glass-panel neon-border p-4 h-full overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-neon-red/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-neon-orange/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-neon-green/60" />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground tracking-wider ml-1">
          system.log
        </span>
        <span className="ml-auto text-[9px] font-mono text-neon-green/70">● Live</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="font-mono text-[11px] leading-relaxed space-y-0.5">
          <AnimatePresence initial={false}>
            {events.slice(0, 30).map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="terminal-text py-0.5"
              >
                <span className="text-muted-foreground">[{new Date(event.ts).toLocaleTimeString()}]</span>{" "}
                <span className="text-primary">{event.agentName}</span>{" "}
                <span className="text-muted-foreground">→</span>{" "}
                <span className="text-foreground/60">{event.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
