import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgentLive } from "@/hooks/useAgentLive";
import { humanReason, relTime } from "@/lib/agentLang";

const STATE_STYLE: Record<string, { dot: string; ring: string; text: string }> = {
  ok: { dot: "bg-neon-green", ring: "border-neon-green/50", text: "text-neon-green" },
  active: { dot: "bg-neon-green", ring: "border-neon-green/60", text: "text-neon-green" },
  hold: { dot: "bg-muted-foreground", ring: "border-border", text: "text-muted-foreground" },
  idle: { dot: "bg-muted-foreground/60", ring: "border-border", text: "text-muted-foreground" },
  stale: { dot: "bg-neon-orange", ring: "border-neon-orange/60", text: "text-neon-orange" },
  error: { dot: "bg-neon-red", ring: "border-neon-red/60", text: "text-neon-red" },
};

interface Props {
  compact?: boolean;
  className?: string;
}

/** The REAL pipeline: Cron → Tick → Research → Strategy → Execute → TopstepX. */
export default function PipelineView({ compact = false, className = "" }: Props) {
  const { pipeline, loading, lastPush } = useAgentLive();

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-24 text-[11px] font-mono text-muted-foreground ${className}`}>
        Loading pipeline…
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className={`flex ${compact ? "flex-col gap-1.5" : "flex-col lg:flex-row lg:items-stretch gap-2"}`}>
        {pipeline.stages.map((s, i) => {
          const st = STATE_STYLE[s.state] ?? STATE_STYLE.idle;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    key={`${s.id}-${lastPush}`}
                    initial={{ scale: 0.98, opacity: 0.85 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                    className={`flex-1 min-w-0 rounded-xl border bg-card/60 backdrop-blur-xl px-3 py-2 ${st.ring}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      <span className="text-[11px] font-semibold tracking-tight">{s.label}</span>
                      <span className="ml-auto text-[9px] font-mono text-muted-foreground">
                        {s.ts ? relTime(s.ts) : "never"}
                      </span>
                    </div>
                    <p className={`mt-0.5 text-[10px] leading-snug truncate ${st.text}`}>
                      {s.state === "stale" ? "stale — no run in 2+ min" : humanReason(s.outcome)}
                    </p>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  <p className="font-semibold">{s.label}</p>
                  <p className="text-muted-foreground">{humanReason(s.outcome)}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">
                    last run {s.ts ? new Date(s.ts).toLocaleString() : "never"}
                  </p>
                </TooltipContent>
              </Tooltip>
              {i < pipeline.stages.length - 1 && !compact && (
                <span className="hidden lg:block text-muted-foreground text-xs shrink-0">→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}