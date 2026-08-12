import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAgentLive } from "@/hooks/useAgentLive";

// --- Types (shared by the Trading Desk panels) ---
export interface InstrumentInfo {
  symbol: string;
  name: string;
  basePrice: number;
  tickSize: number;
  pointValue: number;
  initialMargin: number;
  maintenanceMargin: number;
  contractMonth: string;
  category: "index" | "commodity" | "rates" | "micro";
}

export interface MarketTicker {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  history: number[];
  isLive: boolean;
}

export interface AgentEvaluation {
  id: string;
  symbol: string;
  indicators: { name: string; value: string; signal: "bullish" | "bearish" | "neutral" }[];
  timestamp: Date;
}

export interface AgentConsideration {
  id: string;
  symbol: string;
  action: "buy" | "sell";
  confidence: number;
  reason: string;
  timestamp: Date;
}

export interface ExecutedTrade {
  id: string;
  symbol: string;
  action: "buy" | "sell";
  price: number;
  quantity: number;
  timestamp: Date;
}

export interface TradeHistory {
  id: string;
  type: "buy" | "sell";
  asset: string;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number | null;
  timestamp: Date;
}

export interface LearningNote {
  id: string;
  category: "Mistake" | "Insight" | "Adjustment" | "Pattern";
  content: string;
  timestamp: Date;
}

export interface PortfolioHolding {
  symbol: string;
  name: string;
  contracts: number;
  initialMargin: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface PortfolioSummary {
  accountBalance: number;
  usedMargin: number;
  availableMargin: number;
  marginUtilization: number;
  totalPnl: number;
  totalPnlPercent: number;
  holdings: PortfolioHolding[];
}

/** Contract reference data (static specs, not simulated prices). */
export const ALL_INSTRUMENTS: InstrumentInfo[] = [
  { symbol: "ES", name: "S&P 500 E-mini", basePrice: 0, tickSize: 0.25, pointValue: 50, initialMargin: 12650, maintenanceMargin: 11500, contractMonth: "Mar 26", category: "index" },
  { symbol: "NQ", name: "Nasdaq E-mini", basePrice: 0, tickSize: 0.25, pointValue: 20, initialMargin: 18700, maintenanceMargin: 17000, contractMonth: "Mar 26", category: "index" },
  { symbol: "YM", name: "Dow E-mini", basePrice: 0, tickSize: 1.0, pointValue: 5, initialMargin: 9900, maintenanceMargin: 9000, contractMonth: "Mar 26", category: "index" },
  { symbol: "RTY", name: "Russell 2000 E-mini", basePrice: 0, tickSize: 0.1, pointValue: 50, initialMargin: 6820, maintenanceMargin: 6200, contractMonth: "Mar 26", category: "index" },
  { symbol: "MES", name: "Micro S&P 500", basePrice: 0, tickSize: 0.25, pointValue: 5, initialMargin: 1265, maintenanceMargin: 1150, contractMonth: "Mar 26", category: "micro" },
  { symbol: "MNQ", name: "Micro Nasdaq", basePrice: 0, tickSize: 0.25, pointValue: 2, initialMargin: 1870, maintenanceMargin: 1700, contractMonth: "Mar 26", category: "micro" },
  { symbol: "CL", name: "Crude Oil", basePrice: 0, tickSize: 0.01, pointValue: 1000, initialMargin: 6820, maintenanceMargin: 6200, contractMonth: "Apr 26", category: "commodity" },
  { symbol: "GC", name: "Gold", basePrice: 0, tickSize: 0.1, pointValue: 100, initialMargin: 10450, maintenanceMargin: 9500, contractMonth: "Jun 26", category: "commodity" },
  { symbol: "SI", name: "Silver", basePrice: 0, tickSize: 0.005, pointValue: 5000, initialMargin: 11000, maintenanceMargin: 10000, contractMonth: "May 26", category: "commodity" },
  { symbol: "NG", name: "Natural Gas", basePrice: 0, tickSize: 0.001, pointValue: 10000, initialMargin: 3300, maintenanceMargin: 3000, contractMonth: "Apr 26", category: "commodity" },
  { symbol: "ZC", name: "Corn", basePrice: 0, tickSize: 0.25, pointValue: 50, initialMargin: 1650, maintenanceMargin: 1500, contractMonth: "May 26", category: "commodity" },
  { symbol: "ZS", name: "Soybeans", basePrice: 0, tickSize: 0.25, pointValue: 50, initialMargin: 3025, maintenanceMargin: 2750, contractMonth: "May 26", category: "commodity" },
  { symbol: "ZW", name: "Wheat", basePrice: 0, tickSize: 0.25, pointValue: 50, initialMargin: 1925, maintenanceMargin: 1750, contractMonth: "May 26", category: "commodity" },
  { symbol: "HG", name: "Copper", basePrice: 0, tickSize: 0.0005, pointValue: 25000, initialMargin: 5500, maintenanceMargin: 5000, contractMonth: "May 26", category: "commodity" },
  { symbol: "ZB", name: "Treasury Bonds", basePrice: 0, tickSize: 0.03125, pointValue: 1000, initialMargin: 4400, maintenanceMargin: 4000, contractMonth: "Jun 26", category: "rates" },
  { symbol: "6E", name: "Euro FX", basePrice: 0, tickSize: 0.00005, pointValue: 125000, initialMargin: 2750, maintenanceMargin: 2500, contractMonth: "Jun 26", category: "rates" },
];

const DEFAULT_ACTIVE = ["NQ", "MNQ", "ES", "CL", "GC"];
const LS_KEY = "trading-active-instruments";
const YAHOO: Record<string, string> = {
  ES: "ES=F", NQ: "NQ=F", YM: "YM=F", RTY: "RTY=F", MES: "MES=F", MNQ: "MNQ=F",
  CL: "CL=F", GC: "GC=F", SI: "SI=F", NG: "NG=F", ZC: "ZC=F", ZS: "ZS=F",
  ZW: "ZW=F", HG: "HG=F", ZB: "ZB=F", "6E": "6E=F",
};

interface Bar { t: number; o: number; h: number; l: number; c: number; v: number }

/**
 * Real-data replacement for the old trading simulator.
 * Prices come from the market-bars function; everything else comes from the agent's own rows.
 */
export function useLiveTrading() {
  const { config, decisions, positions, openPositions, events } = useAgentLive();

  const [activeSymbols, setActiveSymbolsState] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const parsed = raw ? (JSON.parse(raw) as string[]) : null;
      return parsed?.length ? parsed : DEFAULT_ACTIVE;
    } catch {
      return DEFAULT_ACTIVE;
    }
  });
  const setActiveSymbols = useCallback((next: string[]) => {
    setActiveSymbolsState(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  }, []);

  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [learningNotes, setLearningNotes] = useState<LearningNote[]>([]);

  // --- Real prices ---
  const loadPrices = useCallback(async () => {
    const results = await Promise.all(
      activeSymbols.map(async (sym) => {
        const yf = YAHOO[sym];
        const info = ALL_INSTRUMENTS.find((i) => i.symbol === sym);
        if (!yf || !info) return null;
        const { data, error } = await supabase.functions.invoke("market-bars", {
          body: { symbol: yf, timeframe: "1h" },
        });
        const bars = (data as { bars?: Bar[] } | null)?.bars ?? [];
        if (error || bars.length === 0) {
          return { symbol: sym, name: info.name, price: 0, change: 0, changePercent: 0, volume: 0, history: [], isLive: false } as MarketTicker;
        }
        const last = bars[bars.length - 1];
        const ref = bars[Math.max(0, bars.length - 25)];
        const change = last.c - ref.c;
        return {
          symbol: sym,
          name: info.name,
          price: last.c,
          change,
          changePercent: ref.c ? (change / ref.c) * 100 : 0,
          volume: Math.round(bars.slice(-24).reduce((s, b) => s + (b.v || 0), 0)),
          history: bars.slice(-40).map((b) => b.c),
          isLive: true,
        } as MarketTicker;
      }),
    );
    setTickers(results.filter(Boolean) as MarketTicker[]);
  }, [activeSymbols]);

  useEffect(() => {
    loadPrices();
    const t = setInterval(loadPrices, 60_000);
    return () => clearInterval(t);
  }, [loadPrices]);

  // --- Real journal notes (user-authored, stored in the database) ---
  const loadNotes = useCallback(async () => {
    const { data } = await supabase
      .from("learning_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setLearningNotes(
      (data ?? []).map((n) => ({
        id: n.id,
        category: n.category as LearningNote["category"],
        content: n.content,
        timestamp: new Date(n.created_at),
      })),
    );
  }, []);
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const priceOf = useCallback(
    (symbol: string) => tickers.find((t) => t.symbol === symbol.replace(/[UZHMU]\d+$/, ""))?.price ?? 0,
    [tickers],
  );

  // --- Agent read-outs derived from real decisions ---
  const evaluations = useMemo<AgentEvaluation[]>(
    () =>
      decisions.slice(0, 20).map((d) => {
        const steps = (d.steps_passed ?? {}) as Record<string, boolean>;
        const bullish = (d.htf_bias ?? "").toLowerCase().includes("bull");
        return {
          id: d.id,
          symbol: d.symbol,
          indicators: ["zone", "break", "retest", "ifvg", "trigger"].map((k) => ({
            name: k.toUpperCase(),
            value: steps[k] ? "confirmed" : "missing",
            signal: steps[k] ? (bullish ? "bullish" : "bearish") : "neutral",
          })),
          timestamp: new Date(d.created_at),
        };
      }),
    [decisions],
  );

  const considerations = useMemo<AgentConsideration[]>(
    () =>
      decisions
        .filter((d) => d.decision === "BUY" || d.decision === "SELL")
        .slice(0, 20)
        .map((d) => ({
          id: d.id,
          symbol: d.symbol,
          action: d.decision === "BUY" ? "buy" : "sell",
          confidence: Math.min(100, Math.round(((Number(d.rr) || 0) / 3) * 100)),
          reason: d.reason ?? "5-step BRT setup confirmed",
          timestamp: new Date(d.created_at),
        })),
    [decisions],
  );

  const executedTrades = useMemo<ExecutedTrade[]>(
    () =>
      positions.slice(0, 30).map((p) => ({
        id: p.id,
        symbol: p.symbol,
        action: p.side === "LONG" ? "buy" : "sell",
        price: Number(p.entry_price),
        quantity: p.contracts,
        timestamp: new Date(p.opened_at),
      })),
    [positions],
  );

  const tradeHistory = useMemo<TradeHistory[]>(
    () =>
      positions
        .filter((p) => p.status !== "OPEN")
        .map((p) => ({
          id: p.id,
          type: p.side === "LONG" ? "buy" : "sell",
          asset: p.symbol,
          entryPrice: Number(p.entry_price),
          exitPrice: p.exit_price != null ? Number(p.exit_price) : null,
          pnl: p.pnl != null ? Number(p.pnl) : null,
          timestamp: new Date(p.closed_at ?? p.opened_at),
        })),
    [positions],
  );

  const portfolio = useMemo<PortfolioSummary>(() => {
    const accountBalance = Number(config?.account_balance ?? 0);
    const holdings: PortfolioHolding[] = openPositions.map((p) => {
      const info = ALL_INSTRUMENTS.find((i) => p.symbol.startsWith(i.symbol)) ?? null;
      const current = priceOf(p.symbol) || Number(p.entry_price);
      const dir = p.side === "LONG" ? 1 : -1;
      const pointValue = info?.pointValue ?? Number(config?.point_value ?? 2);
      const pnl = (current - Number(p.entry_price)) * dir * pointValue * p.contracts;
      const margin = (info?.initialMargin ?? 0) * p.contracts;
      return {
        symbol: p.symbol,
        name: info?.name ?? p.symbol,
        contracts: p.contracts,
        initialMargin: margin,
        currentPrice: current,
        pnl,
        pnlPercent: margin ? (pnl / margin) * 100 : 0,
      };
    });
    const usedMargin = holdings.reduce((s, h) => s + h.initialMargin, 0);
    const realized = tradeHistory.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const totalPnl = realized + holdings.reduce((s, h) => s + h.pnl, 0);
    return {
      accountBalance,
      usedMargin,
      availableMargin: accountBalance - usedMargin,
      marginUtilization: accountBalance ? (usedMargin / accountBalance) * 100 : 0,
      totalPnl,
      totalPnlPercent: accountBalance ? (totalPnl / accountBalance) * 100 : 0,
      holdings,
    };
  }, [config, openPositions, priceOf, tradeHistory]);

  const stats = useMemo(() => {
    const closed = tradeHistory.filter((t) => t.pnl != null);
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
    const losses = closed.length - wins;
    const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const grossProfit = closed.filter((t) => (t.pnl ?? 0) > 0).reduce((s, t) => s + (t.pnl ?? 0), 0);
    const grossLoss = Math.abs(closed.filter((t) => (t.pnl ?? 0) <= 0).reduce((s, t) => s + (t.pnl ?? 0), 0));

    const chrono = [...closed].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let maxWinStreak = 0, maxLossStreak = 0, currentStreak = 0;
    let currentStreakType: "win" | "loss" | null = null;
    for (const t of chrono) {
      const isWin = (t.pnl ?? 0) > 0;
      if (currentStreakType === (isWin ? "win" : "loss")) currentStreak++;
      else { currentStreak = 1; currentStreakType = isWin ? "win" : "loss"; }
      if (isWin) maxWinStreak = Math.max(maxWinStreak, currentStreak);
      else maxLossStreak = Math.max(maxLossStreak, currentStreak);
    }

    let sharpeRatio = 0;
    if (closed.length >= 2) {
      const r = closed.map((t) => t.pnl ?? 0);
      const mean = r.reduce((a, b) => a + b, 0) / r.length;
      const sd = Math.sqrt(r.reduce((s, x) => s + (x - mean) ** 2, 0) / (r.length - 1));
      if (sd > 0) sharpeRatio = Math.round((mean / sd) * Math.sqrt(252) * 100) / 100;
    }

    const durations = positions
      .filter((p) => p.closed_at)
      .map((p) => (new Date(p.closed_at as string).getTime() - new Date(p.opened_at).getTime()) / 1000);

    return {
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalTrades: closed.length,
      winRate: closed.length ? Math.round((wins / closed.length) * 100) : 0,
      wins,
      losses,
      maxWinStreak,
      maxLossStreak,
      currentStreak,
      currentStreakType,
      avgDurationSec: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      sharpeRatio,
      profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0,
      avgWin: wins ? Math.round((grossProfit / wins) * 100) / 100 : 0,
      avgLoss: losses ? Math.round((grossLoss / losses) * 100) / 100 : 0,
    };
  }, [tradeHistory, positions]);

  const addLearningNote = useCallback(
    async (category: LearningNote["category"], content: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error } = await supabase
        .from("learning_notes")
        .insert({ user_id: session.user.id, category, content });
      if (error) console.error("Failed to save learning note:", error);
      loadNotes();
    },
    [loadNotes],
  );

  const deleteLearningNote = useCallback(async (id: string) => {
    setLearningNotes((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("learning_notes").delete().eq("id", id);
    if (error) console.error("Failed to delete learning note:", error);
  }, []);

  /** Agent trades are the system of record — they cannot be deleted from the UI. */
  const deleteTrade = useCallback(async () => {
    console.warn("Agent trades are read-only in the dashboard.");
  }, []);

  return {
    tickers,
    evaluations,
    considerations,
    executedTrades,
    tradeHistory,
    learningNotes,
    dataSource: "live" as const,
    portfolio,
    stats,
    deleteTrade,
    deleteLearningNote,
    addLearningNote,
    activeSymbols,
    setActiveSymbols,
    allInstruments: ALL_INSTRUMENTS,
    tradeEvents: events,
  };
}