import { useMemo } from "react";
import { motion } from "framer-motion";
import { startOfWeek, addDays, isSameDay, isToday, format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScheduledJob } from "@/hooks/useScheduledJobs";
import JobEventCard from "./JobEventCard";

interface WeekViewProps {
  currentDate: Date;
  jobs: ScheduledJob[];
  onSelectJob: (job: ScheduledJob) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function WeekView({ currentDate, jobs, onSelectJob }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const jobsByDayHour = useMemo(() => {
    const map: Record<string, ScheduledJob[]> = {};
    jobs.forEach((job) => {
      const d = new Date(job.scheduled_at);
      const key = `${format(d, "yyyy-MM-dd")}-${d.getHours()}`;
      if (!map[key]) map[key] = [];
      map[key].push(job);
    });
    return map;
  }, [jobs]);

  return (
    <ScrollArea className="flex-1">
      <div className="p-4">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-border/20 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="bg-secondary/30 p-2" />
          {weekDays.map((day) => {
            const today = isToday(day);
            return (
              <div key={day.toISOString()} className={`bg-secondary/30 p-2 text-center ${today ? "bg-primary/10" : ""}`}>
                <div className="text-[10px] font-mono text-muted-foreground uppercase">{format(day, "EEE")}</div>
                <div className={`text-sm font-mono mt-0.5 ${
                  today ? "bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center mx-auto font-bold" : "text-foreground/80"
                }`}>
                  {format(day, "d")}
                </div>
              </div>
            );
          })}

          {/* Time grid */}
          {HOURS.map((hour) => (
            <>
              <div key={`h-${hour}`} className="bg-card/30 p-1 text-right pr-2">
                <span className="text-[9px] font-mono text-muted-foreground">
                  {format(new Date(2000, 0, 1, hour), "ha")}
                </span>
              </div>
              {weekDays.map((day) => {
                const key = `${format(day, "yyyy-MM-dd")}-${hour}`;
                const cellJobs = jobsByDayHour[key] || [];
                return (
                  <div
                    key={key}
                    className={`bg-card/30 min-h-[48px] p-0.5 border-t border-border/10 ${isToday(day) ? "bg-primary/5" : ""}`}
                  >
                    {cellJobs.map((job) => (
                      <JobEventCard key={job.id} job={job} compact onClick={() => onSelectJob(job)} />
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
