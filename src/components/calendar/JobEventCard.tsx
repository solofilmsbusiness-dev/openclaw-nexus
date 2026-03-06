import { motion } from "framer-motion";
import { Clock, Zap, CheckCircle, XCircle, Timer } from "lucide-react";
import { format } from "date-fns";
import type { ScheduledJob } from "@/hooks/useScheduledJobs";

const statusConfig: Record<string, { bg: string; text: string; icon: typeof Clock; label: string }> = {
  scheduled: { bg: "hsl(var(--neon-blue) / 0.85)", text: "hsl(0 0% 100%)", icon: Clock, label: "Scheduled" },
  running: { bg: "hsl(var(--neon-orange) / 0.85)", text: "hsl(0 0% 100%)", icon: Zap, label: "Running" },
  completed: { bg: "hsl(var(--neon-green) / 0.5)", text: "hsl(0 0% 95%)", icon: CheckCircle, label: "Done" },
  failed: { bg: "hsl(var(--neon-red) / 0.85)", text: "hsl(0 0% 100%)", icon: XCircle, label: "Failed" },
};

const typeAccentColors: Record<string, string> = {
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
  const config = statusConfig[job.status] || statusConfig.scheduled;
  const StatusIcon = config.icon;
  const typeColor = typeAccentColors[job.job_type] || typeAccentColors.task;
  const isRunning = job.status === "running";
  const isFailed = job.status === "failed";

  const dragProps = draggable
    ? {
        draggable: true,
        onDragStart: (e: React.DragEvent) => {
          e.dataTransfer.setData("application/job-id", job.id);
          e.dataTransfer.setData("application/job-scheduled", job.scheduled_at);
          e.dataTransfer.effectAllowed = "move";
        },
      }
    : {};

  /* ── Compact mode (Month & Week cells) ── */
  if (compact) {
    return (
      <div {...dragProps} className={draggable ? "cursor-grab active:cursor-grabbing" : ""}>
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className={`w-full text-left px-1.5 py-[3px] rounded-[5px] text-[9px] font-mono font-semibold truncate transition-all hover:brightness-110 cursor-pointer relative overflow-hidden ${isFailed ? "job-stripe-pattern" : ""}`}
          style={{ backgroundColor: config.bg, color: config.text }}
          whileHover={{ scale: 1.04 }}
          layout
        >
          {isRunning && <div className="job-block-shimmer" />}
          <span className="relative z-10 flex items-center gap-1">
            <StatusIcon className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{job.title}</span>
          </span>
        </motion.button>
      </div>
    );
  }

  /* ── Expanded mode (Day view) ── */
  return (
    <div {...dragProps} className={draggable ? "cursor-grab active:cursor-grabbing" : ""}>
      <motion.div
        onClick={onClick}
        className={`rounded-lg cursor-pointer transition-all relative overflow-hidden group ${isFailed ? "job-stripe-pattern" : ""}`}
        style={{
          backgroundColor: config.bg,
          color: config.text,
          borderLeft: `4px solid ${typeColor}`,
          boxShadow: isRunning ? `0 0 16px ${config.bg}` : undefined,
        }}
        whileHover={{ scale: 1.01, brightness: 1.1 }}
        animate={isRunning ? { boxShadow: [`0 0 8px ${config.bg}`, `0 0 20px ${config.bg}`, `0 0 8px ${config.bg}`] } : {}}
        transition={isRunning ? { duration: 2, repeat: Infinity } : {}}
        layout
      >
        {isRunning && <div className="job-block-shimmer" />}

        {/* Duration fill bar */}
        {job.duration_minutes && (
          <div
            className="absolute bottom-0 left-0 h-[3px] rounded-b-lg opacity-40"
            style={{
              width: `${Math.min((job.duration_minutes / 60) * 100, 100)}%`,
              backgroundColor: config.text,
            }}
          />
        )}

        <div className="relative z-10 px-3 py-2 flex items-center gap-3">
          <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-display text-xs font-bold truncate">{job.title}</span>
          <span className="text-[9px] font-mono opacity-75 flex-shrink-0">{job.agent_name}</span>
          <span className="text-[9px] font-mono opacity-60 flex-shrink-0 ml-auto flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {format(new Date(job.scheduled_at), "h:mm a")}
          </span>
          {job.duration_minutes && (
            <span className="text-[9px] font-mono opacity-60 flex-shrink-0 flex items-center gap-0.5">
              <Timer className="w-2.5 h-2.5" />
              {job.duration_minutes}m
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
