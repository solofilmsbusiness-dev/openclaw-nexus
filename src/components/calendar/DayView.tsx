import { useMemo } from "react";
import { motion } from "framer-motion";
import { format, isSameDay } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScheduledJob } from "@/hooks/useScheduledJobs";
import JobEventCard from "./JobEventCard";

interface DayViewProps {
  currentDate: Date;
  jobs: ScheduledJob[];
  onSelectJob: (job: ScheduledJob) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function DayView({ currentDate, jobs, onSelectJob }: DayViewProps) {
  const dayJobs = useMemo(
    () => jobs.filter((j) => isSameDay(new Date(j.scheduled_at), currentDate)),
    [jobs, currentDate]
  );

  const jobsByHour = useMemo(() => {
    const map: Record<number, ScheduledJob[]> = {};
    dayJobs.forEach((job) => {
      const h = new Date(job.scheduled_at).getHours();
      if (!map[h]) map[h] = [];
      map[h].push(job);
    });
    return map;
  }, [dayJobs]);

  const nowHour = new Date().getHours();

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-0">
        {HOURS.map((hour, i) => {
          const hourJobs = jobsByHour[hour] || [];
          const isNow = isSameDay(currentDate, new Date()) && hour === nowHour;

          return (
            <motion.div
              key={hour}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.015 }}
              className={`grid grid-cols-[70px_1fr] gap-3 min-h-[56px] border-t border-border/15 relative ${
                isNow ? "bg-primary/5" : ""
              }`}
            >
              {isNow && (
                <div className="absolute left-[70px] right-0 top-0 h-px bg-primary z-10">
                  <div className="absolute -left-1.5 -top-1 w-3 h-3 rounded-full bg-primary" />
                </div>
              )}
              <div className="py-2 text-right pr-2">
                <span className="text-[10px] font-mono text-muted-foreground">
                  {format(new Date(2000, 0, 1, hour), "h:mm a")}
                </span>
              </div>
              <div className="py-1.5 space-y-1.5">
                {hourJobs.map((job) => (
                  <JobEventCard key={job.id} job={job} onClick={() => onSelectJob(job)} />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
