import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, format,
} from "date-fns";
import type { ScheduledJob } from "@/hooks/useScheduledJobs";
import JobEventCard from "./JobEventCard";

interface MonthViewProps {
  currentDate: Date;
  jobs: ScheduledJob[];
  onSelectJob: (job: ScheduledJob) => void;
  onDayClick: (date: Date) => void;
}

export default function MonthView({ currentDate, jobs, onSelectJob, onDayClick }: MonthViewProps) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const jobsByDay = useMemo(() => {
    const map: Record<string, ScheduledJob[]> = {};
    jobs.forEach((job) => {
      const key = format(new Date(job.scheduled_at), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(job);
    });
    return map;
  }, [jobs]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-7 gap-px bg-border/20 rounded-xl overflow-hidden">
        {weekDays.map((d) => (
          <div key={d} className="bg-secondary/30 px-2 py-2 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          const key = format(day, "yyyy-MM-dd");
          const dayJobs = jobsByDay[key] || [];
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const hasRunning = dayJobs.some((j) => j.status === "running");

          return (
            <motion.button
              key={key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.005 }}
              onClick={() => onDayClick(day)}
              className={`min-h-[100px] p-1.5 text-left transition-all hover:bg-muted/30 relative ${
                inMonth ? "bg-card/50" : "bg-card/20"
              } ${today ? "ring-1 ring-primary/40" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-mono ${
                  today ? "bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center font-semibold"
                    : inMonth ? "text-foreground/80" : "text-muted-foreground/40"
                }`}>
                  {format(day, "d")}
                </span>
                {hasRunning && (
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-neon-orange"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
              <div className="space-y-0.5">
                {dayJobs.slice(0, 3).map((job) => (
                  <JobEventCard
                    key={job.id}
                    job={job}
                    compact
                    onClick={() => { onSelectJob(job); }}
                  />
                ))}
                {dayJobs.length > 3 && (
                  <span className="text-[8px] font-mono text-muted-foreground pl-1">
                    +{dayJobs.length - 3} more
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
