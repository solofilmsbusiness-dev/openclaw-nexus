import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Timer, Trash2, Zap, CheckCircle, XCircle, CalendarDays, RefreshCw } from "lucide-react";
import type { ScheduledJob } from "@/hooks/useScheduledJobs";

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  scheduled: { color: "hsl(var(--neon-blue))", icon: Clock, label: "Scheduled" },
  running: { color: "hsl(var(--neon-orange))", icon: Zap, label: "Running" },
  completed: { color: "hsl(var(--neon-green))", icon: CheckCircle, label: "Completed" },
  failed: { color: "hsl(var(--neon-red))", icon: XCircle, label: "Failed" },
};

interface JobDetailSheetProps {
  job: ScheduledJob | null;
  open: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

export default function JobDetailSheet({ job, open, onClose, onUpdateStatus, onDelete }: JobDetailSheetProps) {
  if (!job) return null;

  const config = statusConfig[job.status] || statusConfig.scheduled;
  const StatusIcon = config.icon;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="glass-panel border-l border-border/40 w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.color }} />
            {job.title}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusIcon className="w-4 h-4" style={{ color: config.color }} />
              <span className="text-sm font-mono" style={{ color: config.color }}>{config.label}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-panel neon-border p-3 space-y-1">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Agent</span>
                <p className="text-xs font-mono text-foreground">{job.agent_name}</p>
              </div>
              <div className="glass-panel neon-border p-3 space-y-1">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Type</span>
                <p className="text-xs font-mono text-foreground uppercase">{job.job_type}</p>
              </div>
            </div>

            <div className="glass-panel neon-border p-3 space-y-1">
              <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Scheduled At
              </span>
              <p className="text-xs font-mono text-foreground">
                {format(new Date(job.scheduled_at), "EEEE, MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>

            {job.duration_minutes && (
              <div className="glass-panel neon-border p-3 space-y-1">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Timer className="w-3 h-3" /> Duration
                </span>
                <p className="text-xs font-mono text-foreground">{job.duration_minutes} minutes</p>
              </div>
            )}

            {job.recurrence && (
              <div className="glass-panel neon-border p-3 space-y-1">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Recurrence
                </span>
                <p className="text-xs font-mono text-neon-cyan">{job.recurrence}</p>
              </div>
            )}

            {job.description && (
              <div className="glass-panel neon-border p-3 space-y-1">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Description</span>
                <p className="text-xs text-foreground/80">{job.description}</p>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-border/30">
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Actions</span>
            <div className="flex flex-wrap gap-2">
              {job.status !== "completed" && (
                <Button size="sm" variant="outline" className="text-xs gap-1 h-7"
                  onClick={() => onUpdateStatus(job.id, "completed")}>
                  <CheckCircle className="w-3 h-3" /> Complete
                </Button>
              )}
              {job.status !== "running" && job.status !== "completed" && (
                <Button size="sm" variant="outline" className="text-xs gap-1 h-7"
                  onClick={() => onUpdateStatus(job.id, "running")}>
                  <Zap className="w-3 h-3" /> Start
                </Button>
              )}
              {job.status === "failed" && (
                <Button size="sm" variant="outline" className="text-xs gap-1 h-7"
                  onClick={() => onUpdateStatus(job.id, "scheduled")}>
                  <RefreshCw className="w-3 h-3" /> Retry
                </Button>
              )}
              <Button size="sm" variant="destructive" className="text-xs gap-1 h-7"
                onClick={() => { onDelete(job.id); onClose(); }}>
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
