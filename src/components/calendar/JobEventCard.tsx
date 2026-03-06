import { motion } from "framer-motion";
import { Clock, Zap, CheckCircle, XCircle, Timer } from "lucide-react";
import { format } from "date-fns";
import type { ScheduledJob } from "@/hooks/useScheduledJobs";

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  scheduled: { color: "hsl(var(--neon-blue))", icon: Clock, label: "Scheduled" },
  running: { color: "hsl(var(--neon-orange))", icon: Zap, label: "Running" },
  completed: { color: "hsl(var(--neon-green))", icon: CheckCircle, label: "Completed" },
  failed: { color: "hsl(var(--neon-red))", icon: XCircle, label: "Failed" },
};

const typeColors: Record<string, string> = {
  task: "hsl(var(--neon-blue))",
  workflow: "hsl(var(--neon-purple))",
  recurring: "hsl(var(--neon-cyan))",
  automation: "hsl(var(--neon-orange))",
};

interface JobEventCardProps {
  job: ScheduledJob;
  compact?: boolean;
  onClick?: () => void;
  draggable?: boolean;
}

export default function JobEventCard({ job, compact = false, onClick, draggable = false }: JobEventCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/job-id", job.id);
    e.dataTransfer.setData("application/job-scheduled", job.scheduled_at);
    e.dataTransfer.effectAllowed = "move";
  };
  const config = statusConfig[job.status] || statusConfig.scheduled;
  const StatusIcon = config.icon;
  const typeColor = typeColors[job.job_type] || typeColors.task;
  const isRunning = job.status === "running";

  if (compact) {
    return (
      <motion.button
        onClick={onClick}
        draggable={draggable}
        onDragStart={handleDragStart}
        className={`w-full text-left px-1.5 py-0.5 rounded-md text-[9px] font-mono truncate transition-all hover:brightness-125 cursor-pointer relative overflow-hidden ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{ backgroundColor: `${config.color}18`, color: config.color, borderLeft: `2px solid ${config.color}` }}
        whileHover={{ scale: 1.02 }}
        layout
      >
        {isRunning && (
          <motion.div
            className="absolute inset-0 opacity-20"
            style={{ background: `linear-gradient(90deg, transparent, ${config.color}, transparent)` }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        )}
        <span className="relative z-10">{job.agent_name}: {job.title}</span>
      </motion.button>
    );
  }

  return (
    <motion.div
      onClick={onClick}
      draggable={draggable}
      onDragStart={handleDragStart}
      className={`glass-panel neon-border p-3 cursor-pointer hover:bg-muted/30 transition-all relative overflow-hidden group ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      whileHover={{ scale: 1.01 }}
      layout
    >
      {isRunning && (
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{ background: `linear-gradient(90deg, transparent, ${config.color}, transparent)` }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
      )}
      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }}>
              {isRunning && (
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.color }}
                  animate={{ scale: [1, 1.8, 1], opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
            <span className="font-display text-xs font-semibold text-foreground">{job.title}</span>
          </div>
          <StatusIcon className="w-3.5 h-3.5" style={{ color: config.color }} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded-md font-medium"
            style={{ color: typeColor, backgroundColor: `${typeColor}12` }}
          >
            {job.agent_name}
          </span>
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded-md"
            style={{ color: config.color, backgroundColor: `${config.color}12` }}
          >
            {config.label}
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-secondary/50 text-muted-foreground uppercase">
            {job.job_type}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(job.scheduled_at), "h:mm a")}
          </span>
          {job.duration_minutes && (
            <span className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              {job.duration_minutes}m
            </span>
          )}
          {job.recurrence && (
            <span className="text-neon-cyan">↻ {job.recurrence}</span>
          )}
        </div>
        {job.description && (
          <p className="text-[10px] text-foreground/60 truncate">{job.description}</p>
        )}
      </div>
    </motion.div>
  );
}
