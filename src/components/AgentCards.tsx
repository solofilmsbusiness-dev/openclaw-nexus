import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { AGENTS, SAMPLE_EVENTS, statusColor, Agent, AgentStatus } from "@/data/agents";
import AnimatedCounter from "@/components/AnimatedCounter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Layers, Lightbulb, BarChart3, GripVertical, ChevronDown, Play, Pause, RotateCcw, Activity, Search, X, Plus, Trash2, Power, Zap } from "lucide-react";
import { toast } from "sonner";

const COLOR_SWATCHES = [
  "hsl(215, 80%, 60%)",
  "hsl(152, 60%, 48%)",
  "hsl(38, 70%, 55%)",
  "hsl(0, 60%, 55%)",
  "hsl(270, 60%, 60%)",
  "hsl(195, 70%, 50%)",
  "hsl(330, 65%, 55%)",
  "hsl(165, 60%, 45%)",
  "hsl(45, 80%, 55%)",
  "hsl(180, 50%, 50%)",
];

function Sparkline({ data, color, isDead }: { data: number[]; color: string; isDead?: boolean }) {
  if (isDead) {
    // Flatline: horizontal line at bottom
    const flatPoints = data.map((_, i) => `${(i / (data.length - 1)) * 60},15`).join(" ");
    return (
      <svg viewBox="0 0 60 16" className="w-full h-4">
        <polyline fill="none" stroke="hsl(0, 40%, 40%)" strokeWidth="1.2" points={flatPoints} opacity="0.6" />
      </svg>
    );
  }
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

function ColorPicker({ agent, onColorChange }: { agent: Agent; onColorChange: (color: string | undefined) => void }) {
  const currentColor = agent.color ?? statusColor(agent.status).bg;
  
  return (
    <div>
      <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Node Color</p>
      <div className="flex flex-wrap gap-1.5">
        {/* Reset to default */}
        <button
          onClick={(e) => { e.stopPropagation(); onColorChange(undefined); }}
          className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
            !agent.color ? "border-foreground/60 scale-110" : "border-border/40 hover:border-border/70"
          }`}
          style={{ background: statusColor(agent.status).bg }}
          title="Default (status color)"
        >
          {!agent.color && <span className="text-[6px] text-white font-bold">✓</span>}
        </button>
        {COLOR_SWATCHES.map((swatch) => (
          <button
            key={swatch}
            onClick={(e) => { e.stopPropagation(); onColorChange(swatch); }}
            className={`w-5 h-5 rounded-full border-2 transition-all ${
              agent.color === swatch ? "border-foreground/60 scale-110" : "border-border/40 hover:border-border/70"
            }`}
            style={{ background: swatch }}
            title={swatch}
          />
        ))}
      </div>
    </div>
  );
}

function AgentDetailView({ agent, onStatusChange, onColorChange }: { agent: Agent; onStatusChange: (id: string, status: AgentStatus, taskUpdate?: Partial<Agent>) => void; onColorChange: (id: string, color: string | undefined) => void }) {
  const color = statusColor(agent.status);
  const recentEvents = SAMPLE_EVENTS.filter(e => e.agentId === agent.id).slice(0, 3);
  const avgLatency = (agent.metrics.latency.reduce((a, b) => a + b, 0) / agent.metrics.latency.length * 100).toFixed(0);
  const avgSuccess = (agent.metrics.successRate.reduce((a, b) => a + b, 0) / agent.metrics.successRate.length * 100).toFixed(0);
  const isDead = agent.status === "down";

  const handleAction = (action: string) => {
    switch (action) {
      case "Run":
        onStatusChange(agent.id, "active", { currentTask: agent.currentTask === "Halted" || agent.currentTask === "KILLED" ? "Resuming operations" : agent.currentTask, progress: Math.max(agent.progress, 10) });
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
      case "Kill":
        onStatusChange(agent.id, "down", { currentTask: "KILLED", progress: 0 });
        toast.error(`${agent.name} killed`, { description: "Agent has been terminated" });
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
      <div className="pt-2 mt-2 border-t border-border/20 space-y-3">
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "AVG LATENCY", value: isDead ? "—" : `${avgLatency}ms`, color: isDead ? "text-muted-foreground" : "text-neon-cyan" },
            { label: "SUCCESS", value: isDead ? "0%" : `${avgSuccess}%`, color: isDead ? "text-muted-foreground" : "text-neon-green" },
            { label: "BACKLOG", value: `${agent.backlogCount}`, color: isDead ? "text-muted-foreground" : (agent.backlogCount > 5 ? "text-neon-red" : "text-neon-orange") },
          ].map((m) => (
            <div key={m.label} className="text-center p-1.5 rounded bg-muted/30">
              <span className={`font-mono text-xs font-bold ${m.color}`}>{m.value}</span>
              <p className="text-[8px] text-muted-foreground font-mono mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
        
        {/* Color picker */}
        <ColorPicker agent={agent} onColorChange={(c) => onColorChange(agent.id, c)} />
        
        {recentEvents.length > 0 && (
          <div>
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Recent Events</p>
            <div className="space-y-1">
              {recentEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-1.5 text-[10px]">
                  <Activity className="w-2.5 h-2.5 mt-0.5 shrink-0 text-neon-cyan" />
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
            { icon: Power, label: "Kill", disabled: agent.status === "down" },
          ].map((action) => (
            <button
              key={action.label}
              disabled={action.disabled}
              onClick={(e) => { e.stopPropagation(); handleAction(action.label); }}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[9px] font-mono uppercase tracking-wider border transition-colors disabled:opacity-30 disabled:pointer-events-none ${
                action.label === "Kill"
                  ? "border-destructive/40 hover:border-destructive/70 hover:bg-destructive/20 text-destructive hover:text-destructive"
                  : "border-border/30 hover:border-border/60 hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
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

function AgentsTab({
  agents, onReorder, onStatusChange, selectedAgentId, onSelectAgent, onDeleteAgent, onColorChange,
}: {
  agents: Agent[];
  onReorder: (newOrder: Agent[]) => void;
  onStatusChange: (id: string, status: AgentStatus, update?: Partial<Agent>) => void;
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  onDeleteAgent: (id: string) => void;
  onColorChange: (id: string, color: string | undefined) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingAgent = pendingDeleteId ? agents.find(a => a.id === pendingDeleteId) : null;
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (selectedAgentId) {
      setExpandedId(selectedAgentId);
      const el = cardRefs.current[selectedAgentId];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedAgentId]);

  const handleClick = (agent: Agent) => {
    const newExpanded = expandedId === agent.id ? null : agent.id;
    setExpandedId(newExpanded);
    onSelectAgent(newExpanded ? agent.id : null);
  };

  return (
    <>
    <Reorder.Group axis="y" values={agents} onReorder={onReorder} className="space-y-2">
      {agents.map((agent, i) => {
        const color = agent.color ?? statusColor(agent.status).bg;
        const isDead = agent.status === "down";
        const isExpanded = expandedId === agent.id;
        const isSelected = selectedAgentId === agent.id;
        return (
          <Reorder.Item
            key={agent.id}
            value={agent}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: isDead ? 0.6 : 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            whileHover={{ scale: 1.01, x: 3, boxShadow: `0 2px 12px ${color}15` }}
            whileTap={{ scale: 0.98 }}
            className={`p-3 rounded-xl border transition-colors cursor-grab active:cursor-grabbing group ${
              isSelected ? "border-primary/50 bg-primary/5" : "border-border/30 hover:border-border/60"
            }`}
            style={{ borderLeftWidth: 3, borderLeftColor: color }}
          >
            <div
              ref={(el) => { cardRefs.current[agent.id] = el; }}
              className="cursor-pointer"
              onClick={() => handleClick(agent)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  <span className="text-sm">{agent.icon}</span>
                  <span className={`font-display font-semibold text-xs ${isDead ? "text-muted-foreground" : "text-foreground"}`}>{agent.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Kill/Revive toggle button on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDead) {
                        onStatusChange(agent.id, "active", { currentTask: "Resuming operations", progress: 50 });
                        toast.success(`${agent.name} revived`);
                      } else {
                        onStatusChange(agent.id, "down", { currentTask: "KILLED", progress: 0 });
                        toast.error(`${agent.name} killed`);
                      }
                    }}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded ${isDead ? "hover:bg-emerald-500/20" : "hover:bg-destructive/20"}`}
                    title={isDead ? "Revive agent" : "Kill agent"}
                  >
                    {isDead ? <Zap className="w-3 h-3 text-emerald-400" /> : <Power className="w-3 h-3 text-destructive" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDeleteId(agent.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20"
                    title="Delete agent"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                  <span
                    className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded"
                    style={{ color: isDead ? "hsl(0, 40%, 45%)" : color, backgroundColor: isDead ? "hsl(0, 40%, 45%, 0.15)" : `${color}15` }}
                  >
                    {agent.status.toUpperCase()}
                  </span>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </motion.div>
                </div>
              </div>
              <p className={`text-[10px] mb-1.5 truncate ${isDead ? "text-destructive/60" : "text-muted-foreground"}`}>{agent.currentTask}</p>
              <div className="w-full h-1 bg-muted rounded-full mb-1.5">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: isDead ? "hsl(0, 40%, 35%)" : color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${agent.progress}%` }}
                  transition={{ delay: i * 0.04, duration: 0.8 }}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Sparkline data={agent.metrics.latency} color={color} isDead={isDead} />
                  <span className="text-[8px] text-muted-foreground font-mono">LATENCY</span>
                </div>
                <div className="flex-1">
                  <Sparkline data={agent.metrics.successRate} color={color} isDead={isDead} />
                  <span className="text-[8px] text-muted-foreground font-mono">SUCCESS</span>
                </div>
                <div className="flex-1">
                  <Sparkline data={agent.metrics.activity} color={color} isDead={isDead} />
                  <span className="text-[8px] text-muted-foreground font-mono">ACTIVITY</span>
                </div>
              </div>
            </div>
            <AnimatePresence>
              {isExpanded && <AgentDetailView agent={agent} onStatusChange={onStatusChange} onColorChange={onColorChange} />}
            </AnimatePresence>
          </Reorder.Item>
        );
      })}
    </Reorder.Group>

    <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {pendingAgent?.name ?? "agent"}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove {pendingAgent?.name ?? "this agent"} and all its connections. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (pendingDeleteId) {
                onDeleteAgent(pendingDeleteId);
                toast.success(`${pendingAgent?.name ?? "Agent"} removed`);
              }
              setPendingDeleteId(null);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function BacklogTab({ agents }: { agents: Agent[] }) {
  const sorted = [...agents].sort((a, b) => b.backlogCount - a.backlogCount);
  const totalBacklog = agents.reduce((s, a) => s + a.backlogCount, 0);

  return (
    <div className="space-y-3">
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
      {sorted.map((agent, i) => {
        const color = statusColor(agent.status);
        const pct = totalBacklog > 0 ? (agent.backlogCount / totalBacklog) * 100 : 0;
        return (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ scale: 1.01, x: 3, boxShadow: `0 2px 12px ${color.bg}15` }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 p-2 rounded-lg border border-border/20 hover:border-border/50 transition-colors cursor-pointer"
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
          whileHover={{ scale: 1.01, x: 3, boxShadow: "0 2px 12px hsl(215 80% 60% / 0.1)" }}
          whileTap={{ scale: 0.98 }}
          className="p-3 rounded-lg border border-border/20 hover:border-border/50 transition-colors cursor-pointer"
        >
          <div className="flex items-start gap-2">
            <Lightbulb className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${insight.color}`} />
            <div>
              <h4 className="font-display font-semibold text-xs text-foreground">{insight.title}</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">{insight.detail}</p>
              <span className="text-[9px] font-mono text-muted-foreground mt-1 inline-block">via {insight.agent}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

interface AgentCardsProps {
  agents: Agent[];
  onAgentsChange: (agents: Agent[]) => void;
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  onAddAgent: (overrides: Partial<Agent>) => void;
  onDeleteAgent: (id: string) => void;
}

const AGENT_TYPES = ["orchestrator", "intelligence", "operations", "design", "content", "web", "comms", "commerce", "media", "analytics", "education"];

export default function AgentCards({ agents, onAgentsChange, selectedAgentId, onSelectAgent, onAddAgent, onDeleteAgent }: AgentCardsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("agents");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", subtitle: "", icon: "🤖", type: "operations" });

  const handleStatusChange = useCallback((id: string, status: AgentStatus, update?: Partial<Agent>) => {
    onAgentsChange(agents.map(a => a.id === id ? { ...a, ...update, status } : a));
  }, [agents, onAgentsChange]);

  const handleColorChange = useCallback((id: string, color: string | undefined) => {
    onAgentsChange(agents.map(a => a.id === id ? { ...a, color } : a));
  }, [agents, onAgentsChange]);

  const filteredAgents = search
    ? agents.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.type.toLowerCase().includes(search.toLowerCase()))
    : agents;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="glass-panel neon-border p-4 h-full overflow-hidden flex flex-col"
    >
      {/* Search + Add */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-2 rounded-xl bg-muted/30 border border-border/30 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="shrink-0 w-8 h-8 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 hover:border-primary/50 flex items-center justify-center transition-colors"
          title="Add agent"
        >
          <Plus className="w-3.5 h-3.5 text-primary" />
        </button>
      </div>

      {/* Add Agent Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-panel border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-sm">Add New Agent</DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground">Configure a new agent to join the mesh.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newAgent.name.trim()) return;
              onAddAgent(newAgent);
              toast.success(`${newAgent.name} added to the mesh`);
              setNewAgent({ name: "", subtitle: "", icon: "🤖", type: "operations" });
              setAddOpen(false);
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-[48px_1fr] gap-2">
              <input
                value={newAgent.icon}
                onChange={(e) => setNewAgent((p) => ({ ...p, icon: e.target.value }))}
                className="w-12 h-10 text-center text-lg rounded-lg bg-muted/30 border border-border/30 focus:outline-none focus:border-primary/40"
                maxLength={4}
                title="Icon (emoji)"
              />
              <input
                value={newAgent.name}
                onChange={(e) => setNewAgent((p) => ({ ...p, name: e.target.value }))}
                placeholder="Agent name"
                className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/30 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
                required
              />
            </div>
            <input
              value={newAgent.subtitle}
              onChange={(e) => setNewAgent((p) => ({ ...p, subtitle: e.target.value }))}
              placeholder="Subtitle (e.g. Data Wrangler)"
              className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/30 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
            />
            <select
              value={newAgent.type}
              onChange={(e) => setNewAgent((p) => ({ ...p, type: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/30 text-[11px] text-foreground focus:outline-none focus:border-primary/40"
            >
              {AGENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-[11px] font-mono uppercase tracking-wider hover:bg-primary/90 transition-colors"
            >
              Deploy Agent
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tab bar */}
      <div className="flex gap-1 mb-3 p-0.5 bg-muted/30 rounded-xl">
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
      <ScrollArea className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "agents" && (
              <AgentsTab
                agents={filteredAgents}
                onReorder={onAgentsChange}
                onStatusChange={handleStatusChange}
                selectedAgentId={selectedAgentId}
                onSelectAgent={onSelectAgent}
                onDeleteAgent={onDeleteAgent}
                onColorChange={handleColorChange}
              />
            )}
            {activeTab === "backlog" && <BacklogTab agents={agents} />}
            {activeTab === "insights" && <InsightsTab />}
          </motion.div>
        </AnimatePresence>
      </ScrollArea>
    </motion.div>
  );
}
