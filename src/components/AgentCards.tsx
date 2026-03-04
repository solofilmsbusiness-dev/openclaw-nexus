import { useState, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { AGENTS, SAMPLE_EVENTS, statusColor, Agent, AgentStatus } from "@/data/agents";
import AnimatedCounter from "@/components/AnimatedCounter";
import { Layers, Lightbulb, BarChart3, GripVertical, ChevronDown, Play, Pause, RotateCcw, Activity } from "lucide-react";
import { toast } from "sonner";

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

function AgentDetailView({ agent, onStatusChange }: { agent: Agent; onStatusChange: (id: string, status: AgentStatus, taskUpdate?: Partial<Agent>) => void }) {
  const color = statusColor(agent.status);
  const recentEvents = SAMPLE_EVENTS.filter(e => e.agentId === agent.id).slice(0, 3);
  const avgLatency = (agent.metrics.latency.reduce((a, b) => a + b, 0) / agent.metrics.latency.length * 100).toFixed(0);
  const avgSuccess = (agent.metrics.successRate.reduce((a, b) => a + b, 0) / agent.metrics.successRate.length * 100).toFixed(0);

  const handleAction = (action: string) => {
    switch (action) {
      case "Run":
        onStatusChange(agent.id, "active", { currentTask: agent.currentTask === "Halted" ? "Resuming operations" : agent.currentTask, progress: Math.max(agent.progress, 10) });
        toast.success(`${agent.name} is now running`, { description: "Agent activated successfully" });
        break;
      case "Pause":
        onStatusChange(agent.id, "degraded", { currentTask: `Paused — ${agent.currentTask}`, progress: agent.progress });
        toast.warning(`${agent.name} paused`, { description: "Agent is now in degraded state" });
        break;
      case "Restart":
        onStatusChange(agent.id, "active", { currentTask: "Restarting…", progress: 5 });
        toast.success(`${agent.name} restarting`, { description: "Agent will be back online shortly" });
        setTimeout(() => {
          onStatusChange(agent.id, "healthy", { currentTask: agent.currentTask.replace("Paused — ", ""), progress: 50 });
        }, 2000);
        break;
    }
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="pt-2 mt-2 border-t border-border/20 space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "AVG LATENCY", value: `${avgLatency}ms`, color: "text-primary" },
            { label: "SUCCESS", value: `${avgSuccess}%`, color: "text-neon-green" },
            { label: "BACKLOG", value: `${agent.backlogCount}`, color: agent.backlogCount > 5 ? "text-neon-red" : "text-neon-orange" },
          ].map((m) => (
            <div key={m.label} className="text-center p-1.5 rounded bg-muted/30">
              <span className={`font-mono text-xs font-bold ${m.color}`}>{m.value}</span>
              <p className="text-[8px] text-muted-foreground font-mono mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>

        {recentEvents.length > 0 && (
          <div>
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Recent Events</p>
            <div className="space-y-1">
              {recentEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-1.5 text-[10px]">
                  <Activity className="w-2.5 h-2.5 mt-0.5 shrink-0 text-primary" />
                  <span className="text-foreground/70 truncate">{ev.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-1.5">
          {[
            { icon: Play, label: "Run", disabled: agent.status === "active" },
            { icon: Pause, label: "Pause", disabled: agent.status === "down" || agent.status === "degraded" },
            { icon: RotateCcw, label: "Restart", disabled: false },
          ].map((action) => (
            <button
              key={action.label}
              disabled={action.disabled}
              onClick={(e) => { e.stopPropagation(); handleAction(action.label); }}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[9px] font-mono uppercase tracking-wider border border-border/30 hover:border-primary/40 hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <action.icon className="w-2.5 h-2.5" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function AgentCard({ agent, isExpanded, onToggle, onStatusChange, index }: {
  agent: Agent; isExpanded: boolean; onToggle: () => void;
  onStatusChange: (id: string, status: AgentStatus, update?: Partial<Agent>) => void;
  index: number;
}) {
  const color = statusColor(agent.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ scale: 1.03, boxShadow: `0 0 20px hsl(45 100% 50% / 0.15)` }}
      whileTap={{ scale: 0.98 }}
      className="shrink-0 w-[200px] p-3 rounded-lg border border-border/30 hover:border-primary/30 transition-colors cursor-pointer"
      style={{ borderTopWidth: 2, borderTopColor: color.bg }}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{agent.icon}</span>
          <span className="font-display font-semibold text-[11px] text-foreground">{agent.name}</span>
        </div>
        <span
          className="text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded"
          style={{ color: color.bg, backgroundColor: `${color.bg}15` }}
        >
          {agent.status.toUpperCase()}
        </span>
      </div>
      <p className="text-[9px] text-muted-foreground mb-1 truncate">{agent.currentTask}</p>
      <div className="w-full h-1 bg-muted rounded-full mb-1">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color.bg }}
          initial={{ width: 0 }}
          animate={{ width: `${agent.progress}%` }}
          transition={{ delay: index * 0.04, duration: 0.8 }}
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Sparkline data={agent.metrics.activity} color={color.bg} />
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && <AgentDetailView agent={agent} onStatusChange={onStatusChange} />}
      </AnimatePresence>
    </motion.div>
  );
}

function AgentsTab({ agents, onStatusChange }: { agents: Agent[]; onStatusChange: (id: string, status: AgentStatus, update?: Partial<Agent>) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {agents.map((agent, i) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          isExpanded={expandedId === agent.id}
          onToggle={() => setExpandedId(expandedId === agent.id ? null : agent.id)}
          onStatusChange={onStatusChange}
          index={i}
        />
      ))}
    </div>
  );
}

function BacklogTab() {
  const sorted = [...AGENTS].sort((a, b) => b.backlogCount - a.backlogCount);
  const totalBacklog = AGENTS.reduce((s, a) => s + a.backlogCount, 0);

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      <div className="shrink-0 flex flex-col gap-2 w-[120px]">
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <AnimatedCounter value={totalBacklog} className="metric-counter text-lg text-neon-orange" />
          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">TOTAL</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <AnimatedCounter value={sorted.filter(a => a.backlogCount > 5).length} className="metric-counter text-lg text-neon-red" />
          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">CRITICAL</p>
        </div>
      </div>

      {sorted.map((agent, i) => {
        const color = statusColor(agent.status);
        const pct = totalBacklog > 0 ? (agent.backlogCount / totalBacklog) * 100 : 0;
        return (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ scale: 1.03, boxShadow: `0 0 15px hsl(45 100% 50% / 0.15)` }}
            className="shrink-0 w-[140px] flex flex-col items-center gap-1 p-2 rounded-lg border border-border/20 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <span className="text-lg">{agent.icon}</span>
            <span className="font-display font-semibold text-[10px] text-foreground">{agent.name}</span>
            <span className="font-mono text-sm font-bold" style={{ color: color.bg }}>
              <AnimatedCounter value={agent.backlogCount} duration={800} />
            </span>
            <div className="w-full h-1 bg-muted rounded-full">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color.bg }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: i * 0.05, duration: 0.6 }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function InsightsTab() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {insights.map((insight, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          whileHover={{ scale: 1.03, boxShadow: "0 0 15px hsl(45 100% 50% / 0.15)" }}
          className="shrink-0 w-[220px] p-3 rounded-lg border border-border/20 hover:border-primary/30 transition-colors cursor-pointer"
        >
          <div className="flex items-start gap-2">
            <Lightbulb className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${insight.color}`} />
            <div>
              <h4 className="font-display font-semibold text-xs text-foreground">{insight.title}</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{insight.detail}</p>
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

export default function AgentCards({ agents, onAgentsChange }: { agents: Agent[]; onAgentsChange: (agents: Agent[]) => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("agents");

  const handleStatusChange = useCallback((id: string, status: AgentStatus, update?: Partial<Agent>) => {
    onAgentsChange(agents.map(a => a.id === id ? { ...a, ...update, status } : a));
  }, [agents, onAgentsChange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="glass-panel neon-border p-3 h-full overflow-hidden flex flex-col"
    >
      {/* Tab bar */}
      <div className="flex gap-1 mb-2 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 py-1 px-3 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                : "text-muted-foreground hover:text-foreground/70 border border-transparent"
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === "agents" && <AgentsTab agents={agents} onStatusChange={handleStatusChange} />}
            {activeTab === "backlog" && <BacklogTab />}
            {activeTab === "insights" && <InsightsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
