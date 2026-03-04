import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AGENTS, statusColor } from "@/data/agents";
import AnimatedCounter from "@/components/AnimatedCounter";
import { Layers, Lightbulb, BarChart3 } from "lucide-react";

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 60},${16 - v * 14}`).join(" ");
  return (
    <svg viewBox="0 0 60 16" className="w-full h-4">
      <polyline fill="none" stroke={color} strokeWidth="1.2" points={points} />
    </svg>
  );
}

type Tab = "agents" | "backlog" | "insights";

const tabs: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: "agents", label: "Agents", icon: BarChart3 },
  { id: "backlog", label: "Backlog", icon: Layers },
  { id: "insights", label: "Insights", icon: Lightbulb },
];

const insights = [
  { title: "Revenue trending up", detail: "OF bundle converting at 23% WoW increase", agent: "Analyst", color: "text-neon-green" },
  { title: "Content bottleneck detected", detail: "Content Command backlog at 12 — pipeline stalled", agent: "Brain", color: "text-neon-orange" },
  { title: "FlipEngine offline", detail: "Payment gateway timeout — needs manual restart", agent: "Architect", color: "text-neon-red" },
  { title: "Trending topic detected", detail: "AI automation trending — Scout recommends pivot", agent: "Scout", color: "text-neon-blue" },
  { title: "Video pipeline optimal", detail: "45s reel rendered, engagement predicted high", agent: "Videographer", color: "text-neon-green" },
  { title: "Course enrollment dip", detail: "Skool Master reports 15% drop in signups this week", agent: "Skool Master", color: "text-neon-orange" },
];

function AgentsTab() {
  return (
    <div className="space-y-2">
      {AGENTS.map((agent, i) => {
        const color = statusColor(agent.status);
        return (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="p-3 rounded-lg border border-border/30 hover:border-border/60 transition-all"
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
            <div className="w-full h-1 bg-muted rounded-full mb-1.5">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color.bg }}
                initial={{ width: 0 }}
                animate={{ width: `${agent.progress}%` }}
                transition={{ delay: i * 0.04, duration: 0.8 }}
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
  );
}

function BacklogTab() {
  const sorted = [...AGENTS].sort((a, b) => b.backlogCount - a.backlogCount);
  const totalBacklog = AGENTS.reduce((s, a) => s + a.backlogCount, 0);

  return (
    <div className="space-y-3">
      {/* Summary counters */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <AnimatedCounter value={totalBacklog} className="metric-counter text-lg text-neon-orange" />
          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">TOTAL ITEMS</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <AnimatedCounter value={sorted.filter(a => a.backlogCount > 5).length} className="metric-counter text-lg text-neon-red" />
          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">CRITICAL</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <AnimatedCounter value={sorted.filter(a => a.backlogCount === 0).length} className="metric-counter text-lg text-neon-green" />
          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">CLEAR</p>
        </div>
      </div>

      {/* Backlog list */}
      {sorted.map((agent, i) => {
        const color = statusColor(agent.status);
        const pct = totalBacklog > 0 ? (agent.backlogCount / totalBacklog) * 100 : 0;
        return (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 p-2 rounded-lg border border-border/20 hover:border-border/50 transition-colors"
          >
            <span className="text-sm">{agent.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-semibold text-[11px] text-foreground">{agent.name}</span>
                <span className="font-mono text-xs font-bold" style={{ color: color.bg }}>
                  <AnimatedCounter value={agent.backlogCount} duration={800} />
                </span>
              </div>
              <div className="w-full h-1 bg-muted rounded-full">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color.bg }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: i * 0.05, duration: 0.6 }}
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function InsightsTab() {
  return (
    <div className="space-y-2">
      {insights.map((insight, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="p-3 rounded-lg border border-border/20 hover:border-border/50 transition-colors"
        >
          <div className="flex items-start gap-2">
            <Lightbulb className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${insight.color}`} />
            <div>
              <h4 className="font-display font-semibold text-xs text-foreground">{insight.title}</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">{insight.detail}</p>
              <span className="text-[9px] font-mono text-muted-foreground mt-1 inline-block">
                via {insight.agent}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function AgentCards() {
  const [activeTab, setActiveTab] = useState<Tab>("agents");

  return (
    <div className="glass-panel neon-border p-4 h-full overflow-hidden flex flex-col">
      {/* Tab bar */}
      <div className="flex gap-1 mb-3 p-0.5 bg-muted/30 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? "bg-secondary text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground/70"
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "agents" && <AgentsTab />}
            {activeTab === "backlog" && <BacklogTab />}
            {activeTab === "insights" && <InsightsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
