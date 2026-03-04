import { motion } from "framer-motion";
import { AGENTS } from "@/data/agents";
import { Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const metrics = [
  { label: "Total Agents", value: AGENTS.length, icon: Activity, colorClass: "text-neon-cyan" },
  { label: "Healthy", value: AGENTS.filter(a => a.status === "healthy").length, icon: CheckCircle, colorClass: "text-neon-green" },
  { label: "Active", value: AGENTS.filter(a => a.status === "active").length, icon: Activity, colorClass: "text-neon-blue" },
  { label: "Degraded", value: AGENTS.filter(a => a.status === "degraded").length, icon: AlertTriangle, colorClass: "text-neon-orange" },
  { label: "Down", value: AGENTS.filter(a => a.status === "down").length, icon: XCircle, colorClass: "text-neon-red" },
];

export default function MetricsBar() {
  return (
    <div className="flex items-center gap-6 px-6 py-3 glass-panel">
      <div className="flex items-center gap-2 mr-4">
        <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-glow" />
        <span className="font-display font-bold text-sm tracking-widest uppercase text-foreground">
          OpenClaw Command Center
        </span>
      </div>
      <div className="h-6 w-px bg-border" />
      {metrics.map((m) => (
        <motion.div
          key={m.label}
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <m.icon className={`w-4 h-4 ${m.colorClass}`} />
          <span className="text-muted-foreground text-xs uppercase tracking-wider">{m.label}</span>
          <span className={`metric-counter text-base ${m.colorClass}`}>{m.value}</span>
        </motion.div>
      ))}
      <div className="ml-auto flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse-glow" />
        <span className="text-xs text-muted-foreground font-mono">SYSTEM ONLINE</span>
      </div>
    </div>
  );
}
