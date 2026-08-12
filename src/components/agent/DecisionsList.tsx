import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Decision } from "@/hooks/useAgentLive";
import { BRT_STEPS, STEP_META, clockTime, humanReason, relTime } from "@/lib/agentLang";

interface Group {
  key: string;
  decision: string;
  reason: string | null;
  count: number;
  first: Decision;
  last: Decision;
}

function StepPips({ steps }: { steps: unknown }) {
  const s = (steps ?? {}) as Record<string, boolean>;
  if (!Object.keys(s).length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {BRT_STEPS.map((k) => (
        <Tooltip key={k}>
          <TooltipTrigger asChild>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                s[k]
                  ? "bg-neon-green/15 text-neon-green border-neon-green/30"
                  : "bg-muted/40 text-muted-foreground border-border"
              }`}
            >
              {STEP_META[k].n} {STEP_META[k].label}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p className="font-semibold">
              Step {STEP_META[k].n} — {STEP_META[k].label}
            </p>
            <p className="text-muted-foreground">{STEP_META[k].tip}</p>
            <p className="mt-1 text-[10px] font-mono">{s[k] ? "confirmed" : "not present"}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

/** Consecutive identical HOLDs collapse into a single counted row. */
export default function DecisionsList({ decisions }: { decisions: Decision[] }) {
  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    for (const d of decisions) {
      const prev = out[out.length - 1];
      const sameHold = prev && d.decision === "HOLD" && prev.decision === "HOLD" && prev.reason === d.reason;
      if (sameHold) {
        prev.count += 1;
        prev.first = d; // decisions arrive newest-first, so this walks backwards in time
      } else {
        out.push({ key: d.id, decision: d.decision, reason: d.reason, count: 1, first: d, last: d });
      }
    }
    return out;
  }, [decisions]);

  if (!decisions.length) {
    return (
      <p className="p-6 text-center text-xs text-muted-foreground">
        No decisions logged yet — the agent writes one every minute once the scheduler fires.
      </p>
    );
  }

  return (
    <ScrollArea className="h-[460px]">
      <div className="divide-y divide-border/50">
        {groups.map((g) => {
          const enter = g.decision === "BUY" || g.decision === "SELL";
          const d = g.last;
          return (
            <div key={g.key} className="p-3 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={`text-[9px] font-mono ${
                    g.decision === "BUY"
                      ? "border-neon-green/40 text-neon-green"
                      : g.decision === "SELL"
                        ? "border-neon-red/40 text-neon-red"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {g.decision === "BUY" ? "ENTER LONG" : g.decision === "SELL" ? "ENTER SHORT" : "WAITING"}
                  {g.count > 1 ? ` ×${g.count}` : ""}
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {g.count > 1
                    ? `${clockTime(g.first.created_at)}–${clockTime(g.last.created_at)}`
                    : clockTime(d.created_at)}
                </span>
                <span className="text-[10px] text-muted-foreground">{relTime(g.last.created_at)}</span>
                {d.rr != null && (
                  <span className="text-[10px] font-mono text-muted-foreground">{Number(d.rr).toFixed(2)}R</span>
                )}
                <span className="text-[10px] font-mono text-muted-foreground">via {d.source}</span>
              </div>
              {enter && <StepPips steps={d.steps_passed} />}
              <p className="text-[11px] text-muted-foreground leading-snug">{humanReason(g.reason, g.decision)}</p>
              {d.entry != null && (
                <p className="text-[10px] font-mono text-muted-foreground">
                  entry {Number(d.entry).toFixed(2)} · stop {Number(d.stop ?? 0).toFixed(2)} · target{" "}
                  {Number(d.target ?? 0).toFixed(2)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}