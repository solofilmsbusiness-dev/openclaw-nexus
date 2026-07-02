import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addDays, addHours, setHours, setMinutes } from "date-fns";

export interface ScheduledJob {
  id: string;
  user_id: string;
  agent_id: string;
  agent_name: string;
  title: string;
  description: string;
  job_type: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number | null;
  recurrence: string | null;
  created_at: string;
  updated_at: string;
}

function generateSeedJobs(userId: string): Omit<ScheduledJob, "id" | "created_at" | "updated_at">[] {
  const today = new Date();
  const d = (offset: number, hour: number, min = 0) =>
    setMinutes(setHours(addDays(today, offset), hour), min).toISOString();

  return [
    { user_id: userId, agent_id: "brain", agent_name: "Brain", title: "Campaign orchestration cycle", description: "Run full orchestration pass across all active campaigns", job_type: "workflow", status: "completed", scheduled_at: d(-2, 9), duration_minutes: 45, recurrence: "daily" },
    { user_id: userId, agent_id: "research", agent_name: "Research", title: "Market trend analysis", description: "Scan trending topics and competitor activity", job_type: "task", status: "completed", scheduled_at: d(-1, 10, 30), duration_minutes: 30, recurrence: null },
    { user_id: userId, agent_id: "scheduler", agent_name: "Scheduler", title: "Queue optimization", description: "Rebalance task queues for optimal throughput", job_type: "automation", status: "completed", scheduled_at: d(-1, 14), duration_minutes: 15, recurrence: "daily" },
    { user_id: userId, agent_id: "contentcmd", agent_name: "Content Command", title: "Content pipeline batch", description: "Process queued content generation tasks", job_type: "workflow", status: "running", scheduled_at: d(0, 8), duration_minutes: 60, recurrence: null },
    { user_id: userId, agent_id: "scout", agent_name: "Scout", title: "Opportunity scan", description: "Detect new market opportunities and signals", job_type: "task", status: "running", scheduled_at: d(0, 9, 15), duration_minutes: 25, recurrence: null },
    { user_id: userId, agent_id: "thewire", agent_name: "The Wire", title: "Signal relay check", description: "Verify all communication channels are active", job_type: "automation", status: "scheduled", scheduled_at: d(0, 13), duration_minutes: 10, recurrence: "hourly" },
    { user_id: userId, agent_id: "architect", agent_name: "Architect", title: "System design review", description: "Review and validate current system architecture", job_type: "task", status: "scheduled", scheduled_at: d(0, 15, 30), duration_minutes: 40, recurrence: null },
    { user_id: userId, agent_id: "videographer", agent_name: "Videographer", title: "Video render queue", description: "Process pending video generation tasks", job_type: "workflow", status: "scheduled", scheduled_at: d(1, 10), duration_minutes: 90, recurrence: null },
    { user_id: userId, agent_id: "webagency", agent_name: "WebAgency", title: "Client site deployment", description: "Deploy latest updates to client web properties", job_type: "automation", status: "scheduled", scheduled_at: d(1, 14, 30), duration_minutes: 20, recurrence: null },
    { user_id: userId, agent_id: "flipengine", agent_name: "FlipEngine", title: "Inventory restock check", description: "Scan for restocking opportunities", job_type: "recurring", status: "failed", scheduled_at: d(-1, 16), duration_minutes: 15, recurrence: "daily" },
    { user_id: userId, agent_id: "brain", agent_name: "Brain", title: "Daily briefing compile", description: "Aggregate agent reports into daily summary", job_type: "recurring", status: "scheduled", scheduled_at: d(2, 8), duration_minutes: 20, recurrence: "daily" },
    { user_id: userId, agent_id: "research", agent_name: "Research", title: "Competitor deep-dive", description: "In-depth analysis of competitor strategies", job_type: "task", status: "scheduled", scheduled_at: d(2, 11), duration_minutes: 60, recurrence: null },
    { user_id: userId, agent_id: "scout", agent_name: "Scout", title: "Social signal sweep", description: "Monitor social platforms for emerging trends", job_type: "automation", status: "scheduled", scheduled_at: d(3, 9), duration_minutes: 30, recurrence: "weekly" },
    { user_id: userId, agent_id: "contentcmd", agent_name: "Content Command", title: "Newsletter generation", description: "Auto-generate weekly newsletter draft", job_type: "workflow", status: "scheduled", scheduled_at: d(4, 10, 30), duration_minutes: 45, recurrence: "weekly" },
    { user_id: userId, agent_id: "scheduler", agent_name: "Scheduler", title: "Weekly capacity plan", description: "Plan agent workloads for the coming week", job_type: "task", status: "scheduled", scheduled_at: d(5, 9), duration_minutes: 35, recurrence: "weekly" },
  ];
}

export function useScheduledJobs() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("scheduled_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true });
    if (!error && data) {
      if (data.length === 0) {
        // Seed sample jobs
        const seeds = generateSeedJobs(user.id);
        const { error: insertErr } = await supabase
          .from("scheduled_jobs")
          .insert(seeds);
        if (!insertErr) {
          const { data: seeded } = await supabase
            .from("scheduled_jobs")
            .select("*")
            .eq("user_id", user.id)
            .order("scheduled_at", { ascending: true });
          if (seeded) setJobs(seeded as unknown as ScheduledJob[]);
        }
      } else {
        setJobs(data as unknown as ScheduledJob[]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();

    const channel = supabase
      .channel("scheduled_jobs_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_jobs" }, () => {
        fetchJobs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchJobs]);

  const addJob = useCallback(async (job: Omit<ScheduledJob, "id" | "user_id" | "created_at" | "updated_at">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("scheduled_jobs")
      .insert({ ...job, user_id: user.id })
      .select()
      .single();
    if (!error && data) {
      setJobs((prev) => [...prev, data as unknown as ScheduledJob]);
      return data;
    }
    return null;
  }, []);

  const updateJob = useCallback(async (id: string, updates: Partial<ScheduledJob>) => {
    const { error } = await supabase
      .from("scheduled_jobs")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)));
    }
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("scheduled_jobs")
      .delete()
      .eq("id", id);
    if (!error) {
      setJobs((prev) => prev.filter((j) => j.id !== id));
    }
  }, []);

  return { jobs, loading, fetchJobs, addJob, updateJob, deleteJob };
}
