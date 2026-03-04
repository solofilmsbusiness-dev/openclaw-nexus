import { motion } from "framer-motion";
import { Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import AnimatedCounter from "@/components/AnimatedCounter";
import type { Agent } from "@/data/agents";

export default function MetricsBar({ agents }: { agents: Agent[] }) {
  const downCount = agents.filter((a) => a.status === "down").length;

  const metrics = [
    { label: "Total", value: agents.length, icon: Activity, colorClass: "text-neon-cyan" },
    { label: "Healthy", value: agents.filter((a) => a.status === "healthy").length, icon: CheckCircle, colorClass: "text-neon-green" },
    { label: "Active", value: agents.filter((a) => a.status === "active").length, icon: Activity, colorClass: "text-neon-blue" },
    { label: "Degraded", value: agents.filter((a) => a.status === "degraded").length, icon: AlertTriangle, colorClass: "text-neon-orange" },
    { label: "Down", value: downCount, icon: XCircle, colorClass: "text-neon-red" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-6 px-3 sm:px-6 py-3 glass-panel">
      <div className="flex items-center gap-2 mr-2 sm:mr-4">
        <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-glow" />
        <span className="font-display font-bold text-xs sm:text-sm tracking-widest uppercase text-foreground">
          OpenClaw
        </span>
      </div>
      <div className="hidden sm:block h-6 w-px bg-border" />
      {metrics.map((m) => (
        <motion.div
          key={m.label}
          className="flex items-center gap-1.5 relative"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <m.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${m.colorClass}`} />
          <span className="hidden sm:inline text-muted-foreground text-xs uppercase tracking-wider">{m.label}</span>
          <AnimatedCounter value={m.value} className={`metric-counter text-sm sm:text-base ${m.colorClass}`} />
          {/* Red notification dot for down agents */}
          {m.label === "Down" && downCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-neon-red animate-pulse-glow" />
          )}
        </motion.div>
      ))}
      <div className="ml-auto flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse-glow" />
        <span className="text-[10px] sm:text-xs text-muted-foreground font-mono">ONLINE</span>
      </div>
    </div>
  );
}
