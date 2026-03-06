import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AGENTS } from "@/data/agents";

interface AddJobDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (job: {
    agent_id: string;
    agent_name: string;
    title: string;
    description: string;
    job_type: string;
    status: string;
    scheduled_at: string;
    duration_minutes: number | null;
    recurrence: string | null;
  }) => void;
  defaultDate?: Date;
}

const JOB_TYPES = ["task", "workflow", "recurring", "automation"];
const RECURRENCES = ["none", "daily", "weekly", "monthly"];

export default function AddJobDialog({ open, onClose, onAdd, defaultDate }: AddJobDialogProps) {
  const now = defaultDate || new Date();
  const [agentId, setAgentId] = useState(AGENTS[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [jobType, setJobType] = useState("task");
  const [scheduledAt, setScheduledAt] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  );
  const [duration, setDuration] = useState("");
  const [recurrence, setRecurrence] = useState("none");

  const selectedAgent = AGENTS.find((a) => a.id === agentId);

  const handleSubmit = () => {
    if (!title || !agentId) return;
    onAdd({
      agent_id: agentId,
      agent_name: selectedAgent?.name || agentId,
      title,
      description,
      job_type: jobType,
      status: "scheduled",
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration ? parseInt(duration) : null,
      recurrence: recurrence === "none" ? null : recurrence,
    });
    setTitle("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel neon-border sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display text-sm">Schedule New Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGENTS.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    {a.icon} {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input className="h-8 text-xs" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea className="text-xs min-h-[60px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Type</Label>
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
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Recurrence</Label>
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
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Scheduled At</Label>
              <Input className="h-8 text-xs" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Duration (min)</Label>
              <Input className="h-8 text-xs" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <Button size="sm" className="w-full text-xs" onClick={handleSubmit} disabled={!title || !agentId}>
            Schedule Job
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
