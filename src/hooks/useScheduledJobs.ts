import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      setJobs(data as unknown as ScheduledJob[]);
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
      .insert({ ...job, user_id: user.id } as any)
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
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
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
