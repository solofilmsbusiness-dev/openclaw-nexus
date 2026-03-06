import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Activity, CheckCircle, XCircle, Clock, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { AGENTS } from "@/data/agents";
import type { ScheduledJob } from "@/hooks/useScheduledJobs";

interface CalendarSidebarProps {
  jobs: ScheduledJob[];
  agentFilter: string[];
  typeFilter: string[];
  statusFilter: string[];
  onAgentFilter: (agents: string[]) => void;
  onTypeFilter: (types: string[]) => void;
  onStatusFilter: (statuses: string[]) => void;
}

const JOB_TYPES = ["task", "workflow", "recurring", "automation"];
const STATUSES = [
  { value: "scheduled", label: "Scheduled", icon: Clock, color: "hsl(var(--neon-blue))" },
  { value: "running", label: "Running", icon: Zap, color: "hsl(var(--neon-orange))" },
  { value: "completed", label: "Completed", icon: CheckCircle, color: "hsl(var(--neon-green))" },
  { value: "failed", label: "Failed", icon: XCircle, color: "hsl(var(--neon-red))" },
];

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-1.5">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
        {title}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <AnimatePresence>{open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">{children}</motion.div>}</AnimatePresence>
    </div>
  );
}

export default function CalendarSidebar({ jobs, agentFilter, typeFilter, statusFilter, onAgentFilter, onTypeFilter, onStatusFilter }: CalendarSidebarProps) {
  const toggleFilter = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const stats = useMemo(() => ({
    total: jobs.length,
    scheduled: jobs.filter((j) => j.status === "scheduled").length,
    running: jobs.filter((j) => j.status === "running").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  }), [jobs]);

  return (
    <div className="w-56 glass-panel neon-border p-3 space-y-4 overflow-auto">
      <div className="flex items-center gap-1.5">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Filters</span>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-1.5">
        {STATUSES.map((s) => (
          <div key={s.value} className="glass-panel p-2 rounded-lg text-center">
            <div className="text-base font-mono font-semibold" style={{ color: s.color }}>
              {stats[s.value as keyof typeof stats]}
            </div>
            <div className="text-[8px] font-mono text-muted-foreground uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      <FilterSection title="Agents">
        <div className="space-y-0.5">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => toggleFilter(agentFilter, a.id, onAgentFilter)}
              className={`w-full text-left px-2 py-1 rounded-md text-[10px] font-mono flex items-center gap-1.5 transition-all ${
                agentFilter.includes(a.id) ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <span>{a.icon}</span>
              <span className="truncate">{a.name}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Job Type">
        <div className="space-y-0.5">
          {JOB_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleFilter(typeFilter, t, onTypeFilter)}
              className={`w-full text-left px-2 py-1 rounded-md text-[10px] font-mono uppercase transition-all ${
                typeFilter.includes(t) ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Status">
        <div className="space-y-0.5">
          {STATUSES.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.value}
                onClick={() => toggleFilter(statusFilter, s.value, onStatusFilter)}
                className={`w-full text-left px-2 py-1 rounded-md text-[10px] font-mono flex items-center gap-1.5 transition-all ${
                  statusFilter.includes(s.value) ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <Icon className="w-3 h-3" style={{ color: s.color }} />
                {s.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {(agentFilter.length > 0 || typeFilter.length > 0 || statusFilter.length > 0) && (
        <button
          onClick={() => { onAgentFilter([]); onTypeFilter([]); onStatusFilter([]); }}
          className="w-full text-center text-[9px] font-mono text-muted-foreground hover:text-foreground py-1 transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
