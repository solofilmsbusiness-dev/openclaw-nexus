import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, format,
} from "date-fns";
import type { ScheduledJob } from "@/hooks/useScheduledJobs";
import JobEventCard from "./JobEventCard";

const statusDotColors: Record<string, string> = {
  scheduled: "hsl(var(--neon-blue))",
  running: "hsl(var(--neon-orange))",
  completed: "hsl(var(--neon-green))",
  failed: "hsl(var(--neon-red))",
};

interface MonthViewProps {
  currentDate: Date;
  jobs: ScheduledJob[];
  onSelectJob: (job: ScheduledJob) => void;
  onDayClick: (date: Date) => void;
  onReschedule?: (jobId: string, newDate: Date) => void;
}

export default function MonthView({ currentDate, jobs, onSelectJob, onDayClick, onReschedule }: MonthViewProps) {
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

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

  const handleDrop = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    setDragOverDay(null);
    const jobId = e.dataTransfer.getData("application/job-id");
    if (!jobId || !onReschedule) return;
    const oldScheduled = e.dataTransfer.getData("application/job-scheduled");
    const oldDate = oldScheduled ? new Date(oldScheduled) : new Date();
    const newDate = new Date(day);
    newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);
    onReschedule(jobId, newDate);
  };

  /** Build a set of up to 4 status dots for a day */
  const getDots = (dayJobs: ScheduledJob[]) => {
    const seen = new Set<string>();
    const dots: string[] = [];
    for (const j of dayJobs) {
      if (!seen.has(j.status)) {
        seen.add(j.status);
        dots.push(statusDotColors[j.status] || statusDotColors.scheduled);
        if (dots.length >= 4) break;
      }
    }
    return dots;
  };

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
          const isDragOver = dragOverDay === key;
          const dots = getDots(dayJobs);

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.005 }}
              onClick={() => onDayClick(day)}
              className={`min-h-[100px] p-1.5 text-left transition-all hover:bg-muted/30 relative cursor-pointer ${
                inMonth ? "bg-card/50" : "bg-card/20"
              } ${today ? "ring-1 ring-primary/40" : ""} ${isDragOver ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverDay(key); }}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={(e) => { e.stopPropagation(); handleDrop(e, day); }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <span className={`text-[11px] font-mono ${
                    today ? "bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center font-semibold"
                      : inMonth ? "text-foreground/80" : "text-muted-foreground/40"
                  }`}>
                    {format(day, "d")}
                  </span>
                  {/* Heat-map dots */}
                  {dots.length > 0 && (
                    <div className="flex items-center gap-[2px] ml-0.5">
                      {dots.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-[5px] h-[5px] rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {dayJobs.length > 0 && (
                  <span className="text-[8px] font-mono text-muted-foreground">{dayJobs.length}</span>
                )}
              </div>
              <div className="space-y-0.5">
                {dayJobs.slice(0, 3).map((job) => (
                  <JobEventCard
                    key={job.id}
                    job={job}
                    compact
                    draggable
                    onClick={() => { onSelectJob(job); }}
                  />
                ))}
                {dayJobs.length > 3 && (
                  <span className="text-[8px] font-mono text-muted-foreground pl-1">
                    +{dayJobs.length - 3} more
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
