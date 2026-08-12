import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, ChevronDown, ChevronUp, Crosshair, LogIn, LogOut, Pause, Shield, TrendingDown, TrendingUp,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { TimelineItem, TimelineKind } from "@/hooks/useAgentLive";
import { clockTime, fmtMoney, humanReason, relTime } from "@/lib/agentLang";

const LS_KEY = "agent-timeline-collapsed";

const KIND_STYLE: Record<TimelineKind, { cls: string; icon: React.ReactNode; label: string }> = {
  signal: { cls: "border-primary/40 bg-primary/10 text-primary", icon: <Crosshair className="w-3 h-3" />, label: "Indicator signal" },
  "decision-hold": { cls: "border-border bg-muted/40 text-muted-foreground", icon: <Pause className="w-3 h-3" />, label: "Agent decision" },
  "decision-enter": { cls: "border-neon-green/40 bg-neon-green/10 text-neon-green", icon: <LogIn className="w-3 h-3" />, label: "Agent decision" },
  opened: { cls: "border-neon-green/50 bg-neon-green/15 text-neon-green", icon: <TrendingUp className="w-3 h-3" />, label: "Execution" },
  stop: { cls: "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan", icon: <Shield className="w-3 h-3" />, label: "Risk guard" },
  reversal: { cls: "border-neon-orange/50 bg-neon-orange/15 text-neon-orange", icon: <AlertTriangle className="w-3 h-3" />, label: "Reversal warning" },
  closed: { cls: "border-border bg-secondary/60 text-foreground", icon: <LogOut className="w-3 h-3" />, label: "Execution" },
  error: { cls: "border-neon-red/50 bg-neon-red/15 text-neon-red", icon: <AlertTriangle className="w-3 h-3" />, label: "Error" },
};

interface Props {
  items: TimelineItem[];
  onFocus?: (item: TimelineItem) => void;
}

export default function ActivityTimeline({ items, onFocus }: Props) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(LS_KEY) === "1");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const visible = useMemo(() => items.slice(-120), [items]);
  const newestId = visible.length ? visible[visible.length - 1].id : null;

  // Keep the newest event in view as rows land.
  useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>("[data-radix-scroll-area-viewport]");
    if (el) el.scrollLeft = el.scrollWidth;
  }, [newestId, collapsed]);

  return (
    <section className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl">
      <header className="flex items-center justify-between px-3 h-9">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-70 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-green" />
          </span>
          <h2 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Activity — live</h2>
          <span className="text-[10px] text-muted-foreground">{visible.length} events</span>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          {collapsed ? "Show" : "Hide"}
        </button>
      </header>

      {!collapsed && (
        <div className="px-2 pb-2">
          {visible.length === 0 ? (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              Nothing has happened yet — the agent logs a decision every minute once the cron fires.
            </p>
          ) : (
            <ScrollArea className="w-full whitespace-nowrap" ref={scrollRef}>
              <div className="flex items-center gap-1.5 py-1">
                <AnimatePresence initial={false}>
                  {visible.map((item) => {
                    const style = KIND_STYLE[item.kind];
                    const isNewest = item.id === newestId;
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: 16, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ duration: 0.25 }}
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              onClick={() => onFocus?.(item)}
                              className={`flex items-center gap-1.5 rounded-lg border px-2 h-7 text-[10px] font-mono transition-shadow hover:shadow-md ${style.cls} ${
                                isNewest ? "ring-1 ring-primary/50 animate-pulse" : ""
                              }`}
                            >
                              {style.icon}
                              <span className="max-w-[130px] truncate">{item.title}</span>
                              <span className="opacity-60">{clockTime(item.ts)}</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-72 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{item.title}</span>
                              <span className="text-[10px] text-muted-foreground">{relTime(item.ts)}</span>
                            </div>
                            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                              {style.label} · {new Date(item.ts).toLocaleString()}
                            </p>
                            <p className="text-muted-foreground leading-snug">
                              {humanReason(item.detail, item.kind === "decision-hold" ? "HOLD" : null)}
                            </p>
                            {item.price != null && (
                              <p className="font-mono text-[11px]">price {item.price.toFixed(2)}</p>
                            )}
                            {item.pnl != null && (
                              <p className={`font-mono text-[11px] ${item.pnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                                realized {fmtMoney(item.pnl)}
                              </p>
                            )}
                            {onFocus && (
                              <button
                                onClick={() => onFocus(item)}
                                className="text-[10px] font-mono text-primary hover:underline"
                              >
                                Center chart on this moment →
                              </button>
                            )}
                          </PopoverContent>
                        </Popover>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
          <div className="flex flex-wrap items-center gap-2.5 px-1 pt-1 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1"><TrendingUp className="w-2.5 h-2.5 text-neon-green" /> long / profit</span>
            <span className="flex items-center gap-1"><TrendingDown className="w-2.5 h-2.5 text-neon-red" /> short / loss</span>
            <span className="flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5 text-neon-orange" /> warning</span>
            <span className="flex items-center gap-1"><Pause className="w-2.5 h-2.5" /> hold / idle</span>
          </div>
        </div>
      )}
    </section>
  );
}