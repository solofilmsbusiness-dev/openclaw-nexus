import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";

export type CalendarView = "month" | "week" | "day";

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onAddJob: () => void;
}

export default function CalendarHeader({ currentDate, view, onDateChange, onViewChange, onAddJob }: CalendarHeaderProps) {
  const navigate = (dir: -1 | 1) => {
    if (view === "month") onDateChange(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (view === "week") onDateChange(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else onDateChange(dir === 1 ? addDays(currentDate, 1) : subDays(currentDate, 1));
  };

  const label = view === "month"
    ? format(currentDate, "MMMM yyyy")
    : view === "week"
      ? `Week of ${format(currentDate, "MMM d, yyyy")}`
      : format(currentDate, "EEEE, MMMM d, yyyy");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h1 className="font-display font-semibold text-base tracking-wide text-foreground">Activity Calendar</h1>
        </div>
        <div className="h-5 w-px bg-border/40" />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <motion.span
            key={label}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-xs text-muted-foreground min-w-[160px] text-center"
          >
            {label}
          </motion.span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onDateChange(new Date())}>
          Today
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5">
          {(["day", "week", "month"] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`px-3 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all ${
                view === v
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <Button size="sm" className="h-7 gap-1 text-xs" onClick={onAddJob}>
          <Plus className="w-3.5 h-3.5" />
          Add Job
        </Button>
      </div>
    </div>
  );
}
