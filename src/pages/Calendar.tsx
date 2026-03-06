import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import MetricsBar from "@/components/MetricsBar";
import { useAgents } from "@/contexts/AgentContext";
import { useScheduledJobs, type ScheduledJob } from "@/hooks/useScheduledJobs";
import CalendarHeader, { type CalendarView } from "@/components/calendar/CalendarHeader";
import CalendarSidebar from "@/components/calendar/CalendarSidebar";
import MonthView from "@/components/calendar/MonthView";
import WeekView from "@/components/calendar/WeekView";
import DayView from "@/components/calendar/DayView";
import JobDetailSheet from "@/components/calendar/JobDetailSheet";
import AddJobDialog from "@/components/calendar/AddJobDialog";

export default function Calendar() {
  const navigate = useNavigate();
  const { layout } = useSettings();
  const { agents } = useAgents();
  const { jobs, loading, addJob, updateJob, deleteJob } = useScheduledJobs();

  const [authChecked, setAuthChecked] = useState(false);
  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState<ScheduledJob | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogDate, setAddDialogDate] = useState<Date | undefined>();

  const [agentFilter, setAgentFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login", { replace: true });
      else setAuthChecked(true);
    });
  }, [navigate]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (agentFilter.length > 0 && !agentFilter.includes(j.agent_id)) return false;
      if (typeFilter.length > 0 && !typeFilter.includes(j.job_type)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(j.status)) return false;
      return true;
    });
  }, [jobs, agentFilter, typeFilter, statusFilter]);

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView("day");
  };

  const handleAddJob = async (job: Parameters<typeof addJob>[0]) => {
    await addJob(job);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await updateJob(id, { status });
    setSelectedJob((prev) => prev && prev.id === id ? { ...prev, status } : prev);
  };

  const handleReschedule = useCallback(async (jobId: string, newDate: Date) => {
    await updateJob(jobId, { scheduled_at: newDate.toISOString() });
    toast.success("Job rescheduled", { description: `Moved to ${newDate.toLocaleString()}` });
  }, [updateJob]);

  if (!authChecked) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="font-mono text-xs text-muted-foreground tracking-wider">Initializing…</span>
      </div>
    );
  }

  return (
    <div className={`h-screen bg-background flex flex-col overflow-hidden ${layout.compactMode ? "text-[0.9em]" : ""}`}>
      {layout.showMetricsBar && <MetricsBar agents={agents} />}

      <div className="glass-panel rounded-none border-x-0">
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onDateChange={setCurrentDate}
          onViewChange={setView}
          onAddJob={() => { setAddDialogDate(undefined); setAddDialogOpen(true); }}
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        <CalendarSidebar
          jobs={jobs}
          agentFilter={agentFilter}
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          onAgentFilter={setAgentFilter}
          onTypeFilter={setTypeFilter}
          onStatusFilter={setStatusFilter}
        />

        <motion.div
          key={view}
          className="flex-1 flex flex-col overflow-hidden"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : view === "month" ? (
            <MonthView currentDate={currentDate} jobs={filteredJobs} onSelectJob={setSelectedJob} onDayClick={handleDayClick} onReschedule={handleReschedule} />
          ) : view === "week" ? (
            <WeekView currentDate={currentDate} jobs={filteredJobs} onSelectJob={setSelectedJob} onReschedule={handleReschedule} />
          ) : (
            <DayView currentDate={currentDate} jobs={filteredJobs} onSelectJob={setSelectedJob} onReschedule={handleReschedule} />
          )}
        </motion.div>
      </div>

      <JobDetailSheet
        job={selectedJob}
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        onUpdateStatus={handleUpdateStatus}
        onDelete={deleteJob}
      />

      <AddJobDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddJob}
        defaultDate={addDialogDate}
      />
    </div>
  );
}
