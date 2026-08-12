import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import PageNav from "@/components/PageNav";
import PipelineView from "@/components/agent/PipelineView";
import StatusHeader from "@/components/agent/StatusHeader";
import ActivityTimeline from "@/components/agent/ActivityTimeline";
import { useAgentLive } from "@/hooks/useAgentLive";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { humanReason, relTime, fmtMoney } from "@/lib/agentLang";
import { Workflow } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const { config, timeline, openPositions, today, loading } = useAgentLive();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login", { replace: true });
        return;
      }
      const { data: isAdmin, error } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (error) console.error("Failed to verify admin role:", error);
      if (!isAdmin) {
        navigate("/agent", { replace: true });
        return;
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, [navigate]);

  if (!authChecked) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="font-mono text-xs text-muted-foreground tracking-wider">Initializing…</span>
      </div>
    );
  }

  const recent = [...timeline].reverse().slice(0, 60);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Workflow className="w-4 h-4 text-primary" />
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Pipeline</h1>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Cron → Tick → Research → Strategy → Execute → TopstepX
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PageNav />
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => navigate("/agent")}>
              Open Agent
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-5">
        <StatusHeader config={config} todayPnl={today.pnl} todayTrades={today.trades} openCount={openPositions.length} />
        <ActivityTimeline items={timeline} />
        <PipelineView />

        <section className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl">
            <h2 className="px-3 h-9 flex items-center text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Open positions
            </h2>
            <div className="divide-y divide-border/50">
              {openPositions.length === 0 && (
                <p className="p-5 text-xs text-muted-foreground">
                  No open trade — the agent is waiting for a valid BRT setup.
                </p>
              )}
              {openPositions.map((p) => (
                <div key={p.id} className="p-3 text-xs">
                  <span className={p.side === "LONG" ? "text-neon-green" : "text-neon-red"}>
                    {p.side} {p.contracts} {p.symbol}
                  </span>{" "}
                  <span className="font-mono text-muted-foreground">
                    entry {Number(p.entry_price).toFixed(2)} · stop {Number(p.stop_price).toFixed(2)} · target{" "}
                    {Number(p.target_price).toFixed(2)} · opened {relTime(p.opened_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl">
            <h2 className="px-3 h-9 flex items-center text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Live agent log
            </h2>
            <ScrollArea className="h-[320px]">
              <div className="divide-y divide-border/50">
                {loading && <p className="p-5 text-xs text-muted-foreground">Loading…</p>}
                {!loading && recent.length === 0 && (
                  <p className="p-5 text-xs text-muted-foreground">Nothing logged yet.</p>
                )}
                <AnimatePresence initial={false}>
                  {recent.map((e) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-3 py-2 flex items-start gap-2 text-[11px]"
                    >
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">{relTime(e.ts)}</span>
                      <span
                        className={
                          e.kind === "error"
                            ? "text-neon-red"
                            : e.kind === "reversal"
                              ? "text-neon-orange"
                              : e.direction === "long"
                                ? "text-neon-green"
                                : e.direction === "short"
                                  ? "text-neon-red"
                                  : "text-foreground"
                        }
                      >
                        {e.title}
                      </span>
                      <span className="text-muted-foreground truncate">
                        {humanReason(e.detail, e.kind === "decision-hold" ? "HOLD" : null)}
                        {e.pnl != null ? ` · ${fmtMoney(e.pnl)}` : ""}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;