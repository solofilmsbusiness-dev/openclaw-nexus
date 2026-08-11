import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Activity, Bot, Clock, Gauge, Loader2, Power, RefreshCw, Save,
  ShieldAlert, Signal, TrendingDown, TrendingUp,
} from "lucide-react";
import PageNav from "@/components/PageNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tables } from "@/integrations/supabase/types";

type Config = Tables<"agent_config">;
type Decision = Tables<"agent_decisions">;
type Position = Tables<"paper_positions">;
type TvSignal = Tables<"tradingview_signals">;

const NUM_FIELDS: { key: keyof Config; label: string; hint: string; step?: string }[] = [
  { key: "max_hold_minutes", label: "Max hold (min)", hint: "0 = disabled (no time-based exit). Any value > 0 force-flattens at that age." },
  { key: "profit_lock_rr", label: "Profit lock at R", hint: "Move stop into profit once open R reaches this.", step: "0.1" },
  { key: "profit_lock_ticks", label: "Profit lock ticks", hint: "Ticks of guaranteed profit when the lock arms." },
  { key: "min_zone_touches", label: "Min zone touches", hint: "HTF reactions required to qualify a S/R zone." },
  { key: "min_rr", label: "Min R:R", hint: "Reject any setup below this reward-to-risk.", step: "0.1" },
  { key: "max_stop_ticks", label: "Max stop (ticks)", hint: "Reject setups whose stop distance exceeds this." },
  { key: "avoid_news_minutes", label: "News blackout (min)", hint: "Stand aside this many minutes either side of CPI/FOMC/NFP." },
  { key: "tv_signal_ttl_minutes", label: "TV signal TTL (min)", hint: "Older TradingView signals are expired unused." },
  { key: "daily_profit_target", label: "Daily profit target ($)", hint: "Stop trading for the day once hit." },
  { key: "daily_loss_limit", label: "Daily loss limit ($)", hint: "Stop trading for the day once hit." },
  { key: "account_balance", label: "Account balance ($)", hint: "Basis for position sizing." },
  { key: "risk_per_trade_pct", label: "Risk per trade (%)", hint: "Percent of balance risked to the initial stop.", step: "0.1" },
  { key: "tick_size", label: "Tick size", hint: "NQ/MNQ = 0.25", step: "0.25" },
  { key: "point_value", label: "Point value ($)", hint: "MNQ = 2.00, NQ = 20.00", step: "0.5" },
];

const TEXT_FIELDS: { key: keyof Config; label: string; hint: string }[] = [
  { key: "symbol", label: "Contract", hint: "Analysis contract, e.g. NQ" },
  { key: "paper_symbol", label: "Paper contract", hint: "Sizing contract, e.g. MNQ" },
  { key: "htf_timeframe", label: "HTF timeframe", hint: "Bias + zones (4h or 1d)" },
  { key: "ltf_timeframe", label: "LTF timeframe", hint: "Retest + trigger (5m)" },
  { key: "data_provider", label: "Data adapter", hint: "yahoo (keyless) | polygon | alphavantage" },
  { key: "data_proxy_symbol", label: "Data symbol", hint: "Yahoo futures ticker, e.g. NQ=F" },
];

const BOOL_FIELDS: { key: keyof Config; label: string; hint: string }[] = [
  { key: "auto_trade", label: "Auto-trade (paper)", hint: "Let the agent open paper positions from confirmed setups." },
  { key: "kill_switch", label: "Kill switch", hint: "Flatten everything and block all new entries." },
  { key: "require_volume_expansion", label: "Require volume expansion", hint: "The break candle must show expanding volume." },
  { key: "one_setup_per_zone_session", label: "One setup per zone / session", hint: "Only the first clean tab in a zone is tradeable." },
  { key: "tv_confluence_required", label: "TradingView confluence required", hint: "Require BOTH the 5-step setup and a fresh indicator signal." },
];

const STEP_ORDER = ["zone", "break", "retest", "ifvg", "trigger"] as const;
const STEP_LABEL: Record<string, string> = {
  zone: "1 Zone", break: "2 Break", retest: "3 Retest", ifvg: "4 IFVG", trigger: "5 Trigger",
};

function StepPips({ steps }: { steps: unknown }) {
  const s = (steps ?? {}) as Record<string, boolean>;
  if (!Object.keys(s).length) return <span className="text-[10px] text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {STEP_ORDER.map((k) => (
        <span
          key={k}
          className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
            s[k]
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-muted/40 text-muted-foreground border-border"
          }`}
        >
          {STEP_LABEL[k]}
        </span>
      ))}
    </div>
  );
}

export default function Agent() {
  const [config, setConfig] = useState<Config | null>(null);
  const [draft, setDraft] = useState<Partial<Config>>({});
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [signals, setSignals] = useState<TvSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ticking, setTicking] = useState(false);

  const load = useCallback(async () => {
    const [cfg, dec, pos, sig] = await Promise.all([
      supabase.from("agent_config").select("*").eq("id", "default").maybeSingle(),
      supabase.from("agent_decisions").select("*").order("created_at", { ascending: false }).limit(40),
      supabase.from("paper_positions").select("*").order("opened_at", { ascending: false }).limit(25),
      supabase.from("tradingview_signals").select("*").order("received_at", { ascending: false }).limit(15),
    ]);
    if (cfg.data) setConfig(cfg.data);
    setDecisions(dec.data ?? []);
    setPositions(pos.data ?? []);
    setSignals(sig.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const value = <K extends keyof Config>(key: K): Config[K] | undefined =>
    (key in draft ? draft[key] : config?.[key]) as Config[K] | undefined;

  const dirty = useMemo(() => Object.keys(draft).length > 0, [draft]);

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    const { error } = await supabase.from("agent_config").update(draft).eq("id", "default");
    setSaving(false);
    if (error) {
      toast.error("Could not save — admin access required");
      return;
    }
    setDraft({});
    toast.success("Agent configuration saved");
    load();
  };

  const runTick = async () => {
    setTicking(true);
    const { data, error } = await supabase.functions.invoke("agent-tick", { body: {} });
    setTicking(false);
    if (error) toast.error(error.message);
    else toast.success(`Tick complete — ${(data as { decision?: string })?.decision ?? "logged"}`);
    load();
  };

  const openPositions = positions.filter((p) => p.status === "OPEN");
  const lastDecision = decisions[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Bot className="w-4 h-4 text-primary" />
            <div>
              <h1 className="text-sm font-semibold tracking-tight">BRT Agent</h1>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Break &amp; Retest · SMC · {config?.symbol ?? "NQ"}
              </p>
            </div>
            <Badge variant="outline" className="ml-1 text-[9px] font-mono border-primary/40 text-primary">
              PAPER
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <PageNav />
            <Button size="sm" variant="outline" onClick={runTick} disabled={ticking} className="h-7 text-[10px]">
              {ticking ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <span className="ml-1.5">Run tick</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-5">
        {/* Status strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              icon: <Power className="w-3.5 h-3.5" />,
              label: "Auto-trade",
              value: config?.kill_switch ? "KILLED" : config?.auto_trade ? "ARMED" : "OBSERVING",
              tone: config?.kill_switch ? "text-destructive" : config?.auto_trade ? "text-primary" : "text-muted-foreground",
            },
            {
              icon: <Activity className="w-3.5 h-3.5" />,
              label: "Last decision",
              value: lastDecision?.decision ?? "—",
              tone: lastDecision?.decision === "BUY" ? "text-primary" : lastDecision?.decision === "SELL" ? "text-destructive" : "text-muted-foreground",
            },
            {
              icon: <Gauge className="w-3.5 h-3.5" />,
              label: "HTF bias",
              value: (lastDecision?.htf_bias ?? "none").toUpperCase(),
              tone: "text-foreground",
            },
            {
              icon: <Clock className="w-3.5 h-3.5" />,
              label: "Open positions",
              value: String(openPositions.length),
              tone: openPositions.length ? "text-primary" : "text-muted-foreground",
            },
          ].map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl p-3"
            >
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {s.icon}
                <span className="text-[10px] font-mono uppercase tracking-wider">{s.label}</span>
              </div>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${s.tone}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {lastDecision?.reason && (
          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-xl px-3 py-2 flex items-start gap-2">
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">{lastDecision.reason}</p>
          </div>
        )}

        <Tabs defaultValue="config">
          <TabsList className="h-8">
            <TabsTrigger value="config" className="text-[11px]">Configuration</TabsTrigger>
            <TabsTrigger value="decisions" className="text-[11px]">Decisions</TabsTrigger>
            <TabsTrigger value="positions" className="text-[11px]">Positions</TabsTrigger>
            <TabsTrigger value="signals" className="text-[11px]">TradingView</TabsTrigger>
          </TabsList>

          {/* CONFIG */}
          <TabsContent value="config" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl p-4 space-y-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {BOOL_FIELDS.map((f) => (
                  <div key={String(f.key)} className="flex items-start justify-between gap-3 rounded-lg border border-border/50 p-2.5">
                    <div>
                      <Label className="text-xs">{f.label}</Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{f.hint}</p>
                    </div>
                    <Switch
                      checked={Boolean(value(f.key))}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                    />
                  </div>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TEXT_FIELDS.map((f) => (
                  <div key={String(f.key)} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      className="h-8 text-xs font-mono"
                      value={String(value(f.key) ?? "")}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    />
                    <p className="text-[10px] text-muted-foreground">{f.hint}</p>
                  </div>
                ))}
                {NUM_FIELDS.map((f) => (
                  <div key={String(f.key)} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      type="number"
                      step={f.step ?? "1"}
                      className="h-8 text-xs font-mono"
                      value={String(value(f.key) ?? "")}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [f.key]: e.target.value === "" ? null : Number(e.target.value) }))
                      }
                    />
                    <p className="text-[10px] text-muted-foreground">{f.hint}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {dirty && (
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setDraft({})}>
                    Discard
                  </Button>
                )}
                <Button size="sm" className="h-7 text-[11px]" disabled={!dirty || saving} onClick={save}>
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  <span className="ml-1.5">Save configuration</span>
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* DECISIONS */}
          <TabsContent value="decisions" className="mt-4">
            <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl">
              <ScrollArea className="h-[460px]">
                <div className="divide-y divide-border/50">
                  {decisions.length === 0 && (
                    <p className="p-6 text-center text-xs text-muted-foreground">
                      No decisions logged yet. The agent writes one entry every minute.
                    </p>
                  )}
                  {decisions.map((d) => (
                    <div key={d.id} className="p-3 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-mono ${
                            d.decision === "BUY"
                              ? "border-primary/40 text-primary"
                              : d.decision === "SELL"
                                ? "border-destructive/40 text-destructive"
                                : "border-border text-muted-foreground"
                          }`}
                        >
                          {d.decision}
                        </Badge>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(d.created_at).toLocaleTimeString()}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">src:{d.source}</span>
                        {d.rr != null && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {Number(d.rr).toFixed(2)}R
                          </span>
                        )}
                      </div>
                      <StepPips steps={d.steps_passed} />
                      {d.reason && <p className="text-[11px] text-muted-foreground leading-snug">{d.reason}</p>}
                      {d.entry != null && (
                        <p className="text-[10px] font-mono text-muted-foreground">
                          entry {Number(d.entry).toFixed(2)} · stop {Number(d.stop ?? 0).toFixed(2)} · target{" "}
                          {Number(d.target ?? 0).toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* POSITIONS */}
          <TabsContent value="positions" className="mt-4">
            <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl">
              <ScrollArea className="h-[460px]">
                <div className="divide-y divide-border/50">
                  {positions.length === 0 && (
                    <p className="p-6 text-center text-xs text-muted-foreground">No paper trades yet.</p>
                  )}
                  {positions.map((p) => {
                    const long = p.side === "LONG";
                    const heldMin = Math.round(
                      ((p.closed_at ? new Date(p.closed_at).getTime() : Date.now()) -
                        new Date(p.opened_at).getTime()) / 60_000,
                    );
                    return (
                      <div key={p.id} className="p-3 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {long ? (
                            <TrendingUp className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                          )}
                          <span className="text-xs font-semibold">
                            {p.side} {p.contracts} {p.symbol}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {p.status}
                          </Badge>
                          {p.lock_active && (
                            <Badge variant="outline" className="text-[9px] font-mono border-primary/40 text-primary">
                              PROFIT LOCKED
                            </Badge>
                          )}
                          <span className="text-[10px] font-mono text-muted-foreground">{heldMin}m held</span>
                          {p.pnl != null && (
                            <span
                              className={`text-[10px] font-mono ${Number(p.pnl) >= 0 ? "text-primary" : "text-destructive"}`}
                            >
                              {Number(p.pnl) >= 0 ? "+" : ""}
                              {Number(p.pnl).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          entry {Number(p.entry_price).toFixed(2)} · stop {Number(p.stop_price).toFixed(2)} (init{" "}
                          {Number(p.initial_stop).toFixed(2)}) · target {Number(p.target_price).toFixed(2)}
                          {p.exit_reason ? ` · exit: ${p.exit_reason}` : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* TV SIGNALS */}
          <TabsContent value="signals" className="mt-4">
            <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl">
              <ScrollArea className="h-[460px]">
                <div className="divide-y divide-border/50">
                  {signals.length === 0 && (
                    <p className="p-6 text-center text-xs text-muted-foreground">
                      No indicator alerts received yet.
                    </p>
                  )}
                  {signals.map((s) => (
                    <div key={s.id} className="p-3 flex items-start gap-2">
                      <Signal className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold uppercase">
                            {s.direction} {s.symbol}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {s.consumed ? s.consume_reason ?? "consumed" : "fresh"}
                          </Badge>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {new Date(s.received_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          entry {s.entry ?? "—"} · tp {s.tp ?? "—"} · sl {s.sl ?? "—"} · {s.indicator ?? "n/a"} ·{" "}
                          {s.timeframe ?? "n/a"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
