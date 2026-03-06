import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Timer, Trash2, Zap, CheckCircle, XCircle, CalendarDays, RefreshCw, Pencil, Save, X } from "lucide-react";
import { AGENTS } from "@/data/agents";
import { toast } from "sonner";
import type { ScheduledJob } from "@/hooks/useScheduledJobs";

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  scheduled: { color: "hsl(var(--neon-blue))", icon: Clock, label: "Scheduled" },
  running: { color: "hsl(var(--neon-orange))", icon: Zap, label: "Running" },
  completed: { color: "hsl(var(--neon-green))", icon: CheckCircle, label: "Completed" },
  failed: { color: "hsl(var(--neon-red))", icon: XCircle, label: "Failed" },
};

const JOB_TYPES = ["task", "workflow", "recurring", "automation"];
const RECURRENCES = ["none", "daily", "weekly", "monthly"];

interface JobDetailSheetProps {
  job: ScheduledJob | null;
  open: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  onUpdate: (id: string, updates: Partial<ScheduledJob>) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (job: ScheduledJob) => void;
}

export default function JobDetailSheet({ job, open, onClose, onUpdateStatus, onUpdate, onDelete, onDuplicate }: JobDetailSheetProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState("");
  const [jobType, setJobType] = useState("");
  const [duration, setDuration] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [scheduledAt, setScheduledAt] = useState("");

  useEffect(() => {
    if (job) {
      setTitle(job.title);
      setDescription(job.description || "");
      setAgentId(job.agent_id);
      setJobType(job.job_type);
      setDuration(job.duration_minutes?.toString() || "");
      setRecurrence(job.recurrence || "none");
      const d = new Date(job.scheduled_at);
      setScheduledAt(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
      );
      setEditing(false);
    }
  }, [job]);

  if (!job) return null;

  const config = statusConfig[job.status] || statusConfig.scheduled;
  const StatusIcon = config.icon;
  const selectedAgent = AGENTS.find((a) => a.id === agentId);

  const handleSave = () => {
    if (!title.trim()) return;
    onUpdate(job.id, {
      title: title.trim(),
      description: description.trim(),
      agent_id: agentId,
      agent_name: selectedAgent?.name || agentId,
      job_type: jobType,
      duration_minutes: duration ? parseInt(duration) : null,
      recurrence: recurrence === "none" ? null : recurrence,
      scheduled_at: new Date(scheduledAt).toISOString(),
    });
    setEditing(false);
    toast.success("Job updated");
  };

  const handleCancel = () => {
    setTitle(job.title);
    setDescription(job.description || "");
    setAgentId(job.agent_id);
    setJobType(job.job_type);
    setDuration(job.duration_minutes?.toString() || "");
    setRecurrence(job.recurrence || "none");
    const d = new Date(job.scheduled_at);
    setScheduledAt(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    );
    setEditing(false);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="glass-panel border-l border-border/40 w-[380px] sm:w-[420px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.color }} />
              {editing ? (
                <Input className="h-7 text-sm font-display" value={title} onChange={(e) => setTitle(e.target.value)} />
              ) : (
                job.title
              )}
            </SheetTitle>
            {!editing && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusIcon className="w-4 h-4" style={{ color: config.color }} />
              <span className="text-sm font-mono" style={{ color: config.color }}>{config.label}</span>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Agent</Label>
                  <Select value={agentId} onValueChange={setAgentId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AGENTS.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">{a.icon} {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Type</Label>
                    <Select value={jobType} onValueChange={setJobType}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {JOB_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Recurrence</Label>
                    <Select value={recurrence} onValueChange={setRecurrence}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RECURRENCES.map((r) => (
                          <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Scheduled At</Label>
                    <Input className="h-8 text-xs" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Duration (min)</Label>
                    <Input className="h-8 text-xs" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="—" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Description</Label>
                  <Textarea className="text-xs min-h-[60px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional..." />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="text-xs gap-1 h-7 flex-1" onClick={handleSave} disabled={!title.trim()}>
                    <Save className="w-3 h-3" /> Save
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={handleCancel}>
                    <X className="w-3 h-3" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          {!editing && (
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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="text-xs gap-1 h-7">
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-panel neon-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-display text-sm">Delete Job</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs">
                        This will permanently delete "{job.title}". This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
                      <AlertDialogAction className="text-xs h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { onDelete(job.id); onClose(); }}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
