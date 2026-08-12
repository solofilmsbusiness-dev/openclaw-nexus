import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Config = Tables<"agent_config">;
export type Decision = Tables<"agent_decisions">;
export type Position = Tables<"paper_positions">;
export type TvSignal = Tables<"tradingview_signals">;
export type TradeEvent = Tables<"trade_events">;

export type TimelineKind =
  | "signal"
  | "decision-hold"
  | "decision-enter"
  | "opened"
  | "stop"
  | "reversal"
  | "closed"
  | "error";

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  ts: string;
  title: string;
  detail: string;
  direction?: "long" | "short" | null;
  price?: number | null;
  pnl?: number | null;
  raw: Record<string, unknown>;
}

const DECISION_LIMIT = 200;

function dirOf(v?: string | null): "long" | "short" | null {
  const s = (v ?? "").toUpperCase();
  if (["BUY", "LONG"].includes(s)) return "long";
  if (["SELL", "SHORT"].includes(s)) return "short";
  return null;
}

/**
 * Single source of truth for every live agent surface.
 * Loads real rows and keeps them fresh through Supabase Realtime.
 */
export function useAgentLive() {
  const [config, setConfig] = useState<Config | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [signals, setSignals] = useState<TvSignal[]>([]);
  const [events, setEvents] = useState<TradeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastPush, setLastPush] = useState<number>(0);
  const [, forceTick] = useState(0);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const [cfg, dec, pos, sig, ev] = await Promise.all([
      supabase.from("agent_config").select("*").eq("id", "default").maybeSingle(),
      supabase.from("agent_decisions").select("*").order("created_at", { ascending: false }).limit(DECISION_LIMIT),
      supabase.from("paper_positions").select("*").order("opened_at", { ascending: false }).limit(50),
      supabase.from("tradingview_signals").select("*").order("received_at", { ascending: false }).limit(40),
      supabase.from("trade_events").select("*").order("created_at", { ascending: false }).limit(80),
    ]);
    if (!mounted.current) return;
    if (cfg.data) setConfig(cfg.data);
    setDecisions(dec.data ?? []);
    setPositions(pos.data ?? []);
    setSignals(sig.data ?? []);
    setEvents(ev.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  // Realtime — rows appear the instant the agent writes them.
  useEffect(() => {
    const upsert = <T extends { id: string }>(setter: (fn: (prev: T[]) => T[]) => void, row: T, cap: number) =>
      setter((prev) => [row, ...prev.filter((r) => r.id !== row.id)].slice(0, cap));

    const channel = supabase
      .channel("agent-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_decisions" }, (p) => {
        upsert<Decision>(setDecisions, p.new as Decision, DECISION_LIMIT);
        setLastPush(Date.now());
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "paper_positions" }, (p) => {
        upsert<Position>(setPositions, p.new as Position, 50);
        setLastPush(Date.now());
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tradingview_signals" }, (p) => {
        upsert<TvSignal>(setSignals, p.new as TvSignal, 40);
        setLastPush(Date.now());
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_events" }, (p) => {
        upsert<TradeEvent>(setEvents, p.new as TradeEvent, 80);
        setLastPush(Date.now());
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_config" }, (p) => {
        setConfig(p.new as Config);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Safety net: reconcile every 60s and keep "x min ago" labels moving.
  useEffect(() => {
    const reconcile = setInterval(load, 60_000);
    const tick = setInterval(() => forceTick((n) => n + 1), 15_000);
    return () => {
      clearInterval(reconcile);
      clearInterval(tick);
    };
  }, [load]);

  const openPositions = useMemo(() => positions.filter((p) => p.status === "OPEN"), [positions]);

  const today = useMemo(() => {
    const day = new Date().toISOString().slice(0, 10);
    const closedToday = positions.filter(
      (p) => p.status !== "OPEN" && (p.closed_at ?? p.opened_at).slice(0, 10) === day,
    );
    const openedToday = positions.filter((p) => p.opened_at.slice(0, 10) === day);
    const pnl = closedToday.reduce((s, p) => s + Number(p.pnl ?? 0), 0);
    return { pnl, trades: openedToday.length, closed: closedToday.length };
  }, [positions]);

  const positionById = useMemo(() => {
    const m = new Map<string, Position>();
    positions.forEach((p) => m.set(p.id, p));
    return m;
  }, [positions]);

  /** One merged, chronological stream of everything the agent actually did. */
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    for (const s of signals) {
      const d = dirOf(s.direction);
      items.push({
        id: `sig-${s.id}`,
        kind: "signal",
        ts: s.received_at,
        title: `${d === "short" ? "▼" : "▲"} Signal ${s.timeframe ?? ""}`.trim(),
        detail: `TradingView ${s.direction} on ${s.symbol}${s.entry ? ` @ ${Number(s.entry).toFixed(2)}` : ""}${
          s.consumed ? ` · used: ${s.consume_reason ?? "consumed"}` : " · pending"
        }`,
        direction: d,
        price: s.entry != null ? Number(s.entry) : null,
        raw: s as unknown as Record<string, unknown>,
      });
    }

    for (const d of decisions) {
      const isEnter = d.decision === "BUY" || d.decision === "SELL";
      items.push({
        id: `dec-${d.id}`,
        kind: isEnter ? "decision-enter" : "decision-hold",
        ts: d.created_at,
        title: isEnter ? `Enter ${d.decision === "BUY" ? "long" : "short"}` : "Hold",
        detail: d.reason ?? "",
        direction: dirOf(d.decision),
        price: d.entry != null ? Number(d.entry) : null,
        raw: d as unknown as Record<string, unknown>,
      });
    }

    for (const e of events) {
      const type = (e.event_type ?? "").toUpperCase();
      const pos = e.position_id ? positionById.get(e.position_id) : undefined;
      let kind: TimelineKind = "stop";
      let title = type;
      if (type.includes("ERROR")) {
        kind = "error";
        title = "Execution error";
      } else if (type.includes("OPEN")) {
        kind = "opened";
        title = "Position opened";
      } else if (type.includes("CLOSE") || type.includes("EXIT") || type.includes("FLAT")) {
        kind = "closed";
        title = "Position closed";
      } else if (type.includes("REVERSAL")) {
        kind = "reversal";
        title = "Reversal warning";
      } else if (type.includes("STOP") || type.includes("TRAIL") || type.includes("LOCK") || type.includes("SYNC")) {
        kind = "stop";
        title = "Stop updated";
      }
      items.push({
        id: `ev-${e.id}`,
        kind,
        ts: e.created_at,
        title,
        detail: e.note ?? type,
        direction: pos ? dirOf(pos.side) : null,
        price: pos ? Number(pos.entry_price) : null,
        pnl: kind === "closed" && pos?.pnl != null ? Number(pos.pnl) : null,
        raw: { ...(e as unknown as Record<string, unknown>), event_type: type },
      });
    }

    return items.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  }, [signals, decisions, events, positionById]);

  /** Real pipeline state: which stage last ran, when, and with what outcome. */
  const pipeline = useMemo(() => {
    const lastDecision = decisions[0] ?? null;
    const lastEvent = events[0] ?? null;
    const lastSignal = signals[0] ?? null;
    const openPos = openPositions[0] ?? null;
    const decAgeMs = lastDecision ? Date.now() - new Date(lastDecision.created_at).getTime() : Infinity;
    const stale = decAgeMs > 2 * 60_000;

    const stages = [
      {
        id: "cron",
        label: "Cron",
        ts: lastDecision?.created_at ?? null,
        outcome: stale ? "stale — no tick in the last 2 minutes" : "firing every minute",
        state: stale ? "stale" : "ok",
      },
      {
        id: "tick",
        label: "Tick",
        ts: lastDecision?.created_at ?? null,
        outcome: lastDecision ? "orchestrated last run" : "no runs yet",
        state: stale ? "stale" : lastDecision ? "ok" : "idle",
      },
      {
        id: "research",
        label: "Research",
        ts: lastDecision?.created_at ?? null,
        outcome: lastDecision
          ? `bias ${(lastDecision.htf_bias ?? "none").toUpperCase()}`
          : "no market read yet",
        state: stale ? "stale" : lastDecision ? "ok" : "idle",
      },
      {
        id: "strategy",
        label: "Strategy",
        ts: lastDecision?.created_at ?? null,
        outcome: lastDecision ? `${lastDecision.decision} — ${lastDecision.reason ?? "no reason logged"}` : "idle",
        state: stale ? "stale" : lastDecision?.decision === "HOLD" ? "hold" : lastDecision ? "active" : "idle",
      },
      {
        id: "execute",
        label: "Execute",
        ts: lastEvent?.created_at ?? null,
        outcome: openPos
          ? `${openPos.side} ${openPos.contracts} ${openPos.symbol} @ ${Number(openPos.entry_price).toFixed(2)}`
          : lastEvent
            ? (lastEvent.note ?? lastEvent.event_type)
            : "idle — no trades yet",
        state: (lastEvent?.event_type ?? "").toUpperCase().includes("ERROR")
          ? "error"
          : openPos
            ? "active"
            : "idle",
      },
      {
        id: "topstep",
        label: "TopstepX",
        ts: lastEvent?.created_at ?? null,
        outcome: openPos?.topstep_order_id
          ? `order ${String(openPos.topstep_order_id).slice(0, 10)} live`
          : (lastEvent?.event_type ?? "").toUpperCase().includes("TOPSTEP_ERROR")
            ? (lastEvent?.note ?? "broker rejected the order")
            : "connected — no open order",
        state: (lastEvent?.event_type ?? "").toUpperCase().includes("TOPSTEP_ERROR")
          ? "error"
          : openPos?.topstep_order_id
            ? "active"
            : "idle",
      },
    ] as const;

    return { stages, stale, lastSignal, lastDecision, lastEvent };
  }, [decisions, events, signals, openPositions]);

  return {
    loading,
    config,
    decisions,
    positions,
    openPositions,
    signals,
    events,
    timeline,
    pipeline,
    today,
    lastPush,
    reload: load,
  };
}