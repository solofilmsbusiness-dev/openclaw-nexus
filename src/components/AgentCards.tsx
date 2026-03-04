import { motion } from "framer-motion";
import { AGENTS, statusColor } from "@/data/agents";

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 60},${16 - v * 14}`).join(" ");
  return (
    <svg viewBox="0 0 60 16" className="w-full h-4">
      <polyline fill="none" stroke={color} strokeWidth="1.2" points={points} />
    </svg>
  );
}

export default function AgentCards() {
  return (
    <div className="glass-panel neon-border p-4 h-full overflow-hidden flex flex-col">
      <h2 className="font-display font-bold text-xs tracking-widest uppercase text-muted-foreground mb-3 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse-glow" />
        Agent Status
      </h2>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {AGENTS.map((agent, i) => {
          const color = statusColor(agent.status);
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-3 rounded-lg border border-border/30 hover:border-border/60 transition-all group"
              style={{ borderLeftWidth: 3, borderLeftColor: color.bg }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{agent.icon}</span>
                  <span className="font-display font-semibold text-xs text-foreground">{agent.name}</span>
                </div>
                <span
                  className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded"
                  style={{ color: color.bg, backgroundColor: `${color.bg}15` }}
                >
                  {agent.status.toUpperCase()}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-1.5 truncate">{agent.currentTask}</p>
              {/* Progress bar */}
              <div className="w-full h-1 bg-muted rounded-full mb-1.5">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color.bg }}
                  initial={{ width: 0 }}
                  animate={{ width: `${agent.progress}%` }}
                  transition={{ delay: i * 0.05, duration: 0.8 }}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Sparkline data={agent.metrics.latency} color={color.bg} />
                  <span className="text-[8px] text-muted-foreground font-mono">LATENCY</span>
                </div>
                <div className="flex-1">
                  <Sparkline data={agent.metrics.successRate} color={color.bg} />
                  <span className="text-[8px] text-muted-foreground font-mono">SUCCESS</span>
                </div>
                <div className="flex-1">
                  <Sparkline data={agent.metrics.activity} color={color.bg} />
                  <span className="text-[8px] text-muted-foreground font-mono">ACTIVITY</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
