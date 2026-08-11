import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// --- Types ---
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

// --- All instruments (futures only) ---
export const ALL_INSTRUMENTS: InstrumentInfo[] = [
  // Index Futures
  { symbol: "ES", name: "S&P 500 E-mini", basePrice: 5420.0, tickSize: 0.25, pointValue: 50, initialMargin: 12650, maintenanceMargin: 11500, contractMonth: "Mar 26", category: "index" },
  { symbol: "NQ", name: "Nasdaq E-mini", basePrice: 18950.0, tickSize: 0.25, pointValue: 20, initialMargin: 18700, maintenanceMargin: 17000, contractMonth: "Mar 26", category: "index" },
  { symbol: "YM", name: "Dow E-mini", basePrice: 39800.0, tickSize: 1.0, pointValue: 5, initialMargin: 9900, maintenanceMargin: 9000, contractMonth: "Mar 26", category: "index" },
  { symbol: "RTY", name: "Russell 2000 E-mini", basePrice: 2080.0, tickSize: 0.1, pointValue: 50, initialMargin: 6820, maintenanceMargin: 6200, contractMonth: "Mar 26", category: "index" },
  // Micro Index Futures
  { symbol: "MES", name: "Micro S&P 500", basePrice: 5420.0, tickSize: 0.25, pointValue: 5, initialMargin: 1265, maintenanceMargin: 1150, contractMonth: "Mar 26", category: "micro" },
  { symbol: "MNQ", name: "Micro Nasdaq", basePrice: 18950.0, tickSize: 0.25, pointValue: 2, initialMargin: 1870, maintenanceMargin: 1700, contractMonth: "Mar 26", category: "micro" },
  // Commodity Futures
  { symbol: "CL", name: "Crude Oil", basePrice: 78.5, tickSize: 0.01, pointValue: 1000, initialMargin: 6820, maintenanceMargin: 6200, contractMonth: "Apr 26", category: "commodity" },
  { symbol: "GC", name: "Gold", basePrice: 2340.0, tickSize: 0.1, pointValue: 100, initialMargin: 10450, maintenanceMargin: 9500, contractMonth: "Jun 26", category: "commodity" },
  { symbol: "SI", name: "Silver", basePrice: 27.8, tickSize: 0.005, pointValue: 5000, initialMargin: 11000, maintenanceMargin: 10000, contractMonth: "May 26", category: "commodity" },
  { symbol: "NG", name: "Natural Gas", basePrice: 2.15, tickSize: 0.001, pointValue: 10000, initialMargin: 3300, maintenanceMargin: 3000, contractMonth: "Apr 26", category: "commodity" },
  { symbol: "ZC", name: "Corn", basePrice: 445.0, tickSize: 0.25, pointValue: 50, initialMargin: 1650, maintenanceMargin: 1500, contractMonth: "May 26", category: "commodity" },
  { symbol: "ZS", name: "Soybeans", basePrice: 1185.0, tickSize: 0.25, pointValue: 50, initialMargin: 3025, maintenanceMargin: 2750, contractMonth: "May 26", category: "commodity" },
  { symbol: "ZW", name: "Wheat", basePrice: 580.0, tickSize: 0.25, pointValue: 50, initialMargin: 1925, maintenanceMargin: 1750, contractMonth: "May 26", category: "commodity" },
  { symbol: "HG", name: "Copper", basePrice: 3.85, tickSize: 0.0005, pointValue: 25000, initialMargin: 5500, maintenanceMargin: 5000, contractMonth: "May 26", category: "commodity" },
  // Rates & FX
  { symbol: "ZB", name: "Treasury Bonds", basePrice: 118.5, tickSize: 0.03125, pointValue: 1000, initialMargin: 4400, maintenanceMargin: 4000, contractMonth: "Jun 26", category: "rates" },
  { symbol: "6E", name: "Euro FX", basePrice: 1.085, tickSize: 0.00005, pointValue: 125000, initialMargin: 2750, maintenanceMargin: 2500, contractMonth: "Jun 26", category: "rates" },
];

const DEFAULT_ACTIVE = ["ES", "NQ", "YM", "CL", "GC"];
const LS_KEY = "trading-active-instruments";

// --- Seed data ---
const LEARNING_TEMPLATES: { category: LearningNote["category"]; content: string }[] = [
  { category: "Mistake", content: "Entered ES long too early — RSI hadn't confirmed oversold. Wait for confirmation next time." },
  { category: "Insight", content: "NQ consistently shows momentum continuation after breaking previous day high in first 30 min of RTH." },
  { category: "Adjustment", content: "Reducing position size on volatile days. Max risk per trade capped at 1.5% of account." },
  { category: "Pattern", content: "ES tends to consolidate between 10:30-11:00 AM ET before a breakout. Consider waiting for this window." },
  { category: "Insight", content: "Strong correlation between ES volume spikes and NQ momentum shifts within 15 min." },
  { category: "Mistake", content: "Held CL short too long through support bounce. Need tighter stop-loss on counter-trend trades." },
  { category: "Adjustment", content: "Added VWAP as primary entry filter. Entries above VWAP for longs, below for shorts." },
  { category: "Pattern", content: "GC shows mean-reversion tendencies on gap-down opens > 1%. Fade strategy effective 68% of the time." },
  { category: "Insight", content: "MACD histogram divergence on 5-min chart is a reliable early signal for trend exhaustion on ES." },
  { category: "Adjustment", content: "Implementing trailing stop at 1.2x ATR after 2:1 R:R achieved. Locks in profits more consistently." },
];

const INDICATOR_NAMES = ["RSI", "MACD", "VWAP", "EMA-20", "Bollinger", "Volume"];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max));
}
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function useTradingSimulation() {
  // Active symbols state
  const [activeSymbols, setActiveSymbols] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out any old stock/crypto symbols
          const valid = parsed.filter((s: string) => ALL_INSTRUMENTS.some((i) => i.symbol === s));
          if (valid.length > 0) return valid;
        }
      }
    } catch (err) {
      console.error(`Corrupted localStorage for "${LS_KEY}" — resetting to defaults:`, err);
      try { localStorage.removeItem(LS_KEY); } catch { /* storage unavailable */ }
    }
    return DEFAULT_ACTIVE;
  });

  // Persist active symbols
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(activeSymbols));
  }, [activeSymbols]);

  const activeInstruments = ALL_INSTRUMENTS.filter((i) => activeSymbols.includes(i.symbol));

  const [tickers, setTickers] = useState<MarketTicker[]>(() =>
    activeInstruments.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      price: t.basePrice,
      change: 0,
      changePercent: 0,
      volume: randInt(50_000, 800_000),
      history: Array.from({ length: 20 }, () => t.basePrice + rand(-t.basePrice * 0.002, t.basePrice * 0.002)),
      isLive: false,
    }))
  );

  const [evaluations, setEvaluations] = useState<AgentEvaluation[]>([]);
  const [considerations, setConsiderations] = useState<AgentConsideration[]>([]);
  const [executedTrades, setExecutedTrades] = useState<ExecutedTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [learningNotes, setLearningNotes] = useState<LearningNote[]>([]);
  const [dataSource, setDataSource] = useState<"loading" | "live" | "simulated">("loading");
  const [dbLoaded, setDbLoaded] = useState(false);

  const noteIndexRef = useRef(0);
  const livePricesRef = useRef<Record<string, number>>({});

  // Sync tickers when activeSymbols change
  useEffect(() => {
    setTickers((prev) => {
      const existing = new Map(prev.map((t) => [t.symbol, t]));
      return activeInstruments.map((inst) => {
        if (existing.has(inst.symbol)) return existing.get(inst.symbol)!;
        return {
          symbol: inst.symbol,
          name: inst.name,
          price: inst.basePrice,
          change: 0,
          changePercent: 0,
          volume: randInt(50_000, 800_000),
          history: Array.from({ length: 20 }, () => inst.basePrice + rand(-inst.basePrice * 0.002, inst.basePrice * 0.002)),
          isLive: false,
        };
      });
    });
  }, [activeSymbols]);

  // Load persisted data from database on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLearningNotes(
          LEARNING_TEMPLATES.slice(0, 3).map((n, i) => ({
            id: uid(),
            ...n,
            timestamp: new Date(Date.now() - (3 - i) * 600_000),
          }))
        );
        noteIndexRef.current = 3;
        setDbLoaded(true);
        return;
      }

      const { data: trades } = await supabase
        .from("trade_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (trades && trades.length > 0) {
        setTradeHistory(
          trades.map((t) => ({
            id: t.id,
            type: t.type as "buy" | "sell",
            asset: t.asset,
            entryPrice: Number(t.entry_price),
            exitPrice: t.exit_price != null ? Number(t.exit_price) : null,
            pnl: t.pnl != null ? Number(t.pnl) : null,
            timestamp: new Date(t.created_at),
          }))
        );
      }

      const { data: notes } = await supabase
        .from("learning_notes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (notes && notes.length > 0) {
        setLearningNotes(
          notes.map((n) => ({
            id: n.id,
            category: n.category as LearningNote["category"],
            content: n.content,
            timestamp: new Date(n.created_at),
          }))
        );
        noteIndexRef.current = 3;
      } else {
        const seedNotes = LEARNING_TEMPLATES.slice(0, 3).map((n, i) => ({
          id: uid(),
          ...n,
          timestamp: new Date(Date.now() - (3 - i) * 600_000),
        }));
        setLearningNotes(seedNotes);
        noteIndexRef.current = 3;
        // Seed notes are demo content — kept in memory only, never persisted.
      }

      setDbLoaded(true);
    };

    loadPersistedData();
  }, []);

  // Fetch real market data
  const activeInstrumentsRef = useRef(activeInstruments);
  activeInstrumentsRef.current = activeInstruments;
  const isFetchingRef = useRef(false);

  const fetchMarketData = useCallback(async () => {
    if (isFetchingRef.current) return false;
    isFetchingRef.current = true;
    try {
      const instruments = activeInstrumentsRef.current;
      const symbols = instruments.map((t) => t.symbol);
      if (symbols.length === 0) {
        setDataSource("simulated");
        return false;
      }

      const { data, error } = await supabase.functions.invoke("market-data", {
        body: { symbols },
      });

      if (error) {
        console.warn("Market data fetch error, using simulation:", error);
        setDataSource("simulated");
        return false;
      }

      const marketData = data?.data;
      if (!marketData) {
        setDataSource("simulated");
        return false;
      }

      let anyLive = false;
      setTickers((prev) =>
        prev.map((t) => {
          const live = marketData[t.symbol];
          if (!live || live.error || live.rateLimited) return t;

          anyLive = true;
          livePricesRef.current[t.symbol] = live.price;

          return {
            ...t,
            price: live.price,
            change: live.change,
            changePercent: live.changePercent,
            volume: live.volume,
            history: [...t.history.slice(-19), live.price],
            isLive: true,
          };
        })
      );

      setDataSource(anyLive ? "live" : "simulated");
      return anyLive;
    } catch (err) {
      console.warn("Market data fetch failed, using simulation:", err);
      setDataSource("simulated");
      return false;
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Small simulated fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setTickers((prev) =>
        prev.map((t) => {
          const inst = ALL_INSTRUMENTS.find((s) => s.symbol === t.symbol);
          if (!inst) return t;
          const basePrice = livePricesRef.current[t.symbol] || inst.basePrice;
          const scale = basePrice * 0.001;
          const delta = rand(-scale, scale);
          const newPrice = Math.max(0.01, t.price + delta);
          const change = newPrice - basePrice;
          const changePercent = (change / basePrice) * 100;
          return {
            ...t,
            price: Math.round(newPrice * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            volume: Math.max(0, t.volume + randInt(-5_000, 10_000)),
            history: [...t.history.slice(-19), newPrice],
          };
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Agent evaluations every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeInstruments.length === 0) return;
      const inst = pickRandom(activeInstruments);
      const numIndicators = randInt(2, 5);
      const indicators = Array.from({ length: numIndicators }, () => {
        const name = pickRandom(INDICATOR_NAMES);
        const signal = pickRandom(["bullish", "bearish", "neutral"] as const);
        const value =
          name === "RSI"
            ? `${randInt(20, 80)}`
            : name === "MACD"
            ? `${rand(-2, 2).toFixed(2)}`
            : name === "Volume"
            ? `${rand(0.8, 2.5).toFixed(1)}x avg`
            : `$${rand(100, 900).toFixed(2)}`;
        return { name, value, signal };
      });
      setEvaluations((prev) => [{ id: uid(), symbol: inst.symbol, indicators, timestamp: new Date() }, ...prev].slice(0, 8));
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSymbols]);

  // Agent considerations every 7s
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeInstruments.length === 0) return;
      const inst = pickRandom(activeInstruments);
      const reasons = [
        "RSI oversold + VWAP support",
        "Momentum breakout above resistance",
        "Bearish divergence on MACD",
        "Volume surge with bullish engulfing",
        "Mean reversion setup at lower Bollinger",
        "EMA crossover confirmed on 15-min",
      ];
      setConsiderations((prev) =>
        [
          {
            id: uid(),
            symbol: inst.symbol,
            action: pickRandom(["buy", "sell"] as const),
            confidence: randInt(55, 95),
            reason: pickRandom(reasons),
            timestamp: new Date(),
          },
          ...prev,
        ].slice(0, 6)
      );
    }, 7000);
    return () => clearInterval(interval);
  }, [activeSymbols]);

  // Executed trades every 10s — tick-based P&L
  useEffect(() => {
    if (!dbLoaded) return;
    const interval = setInterval(() => {
      if (activeInstruments.length === 0) return;
      const inst = pickRandom(activeInstruments);
      const action = pickRandom(["buy", "sell"] as const);
      const currentPrice = livePricesRef.current[inst.symbol] || inst.basePrice;
      const scale = currentPrice * 0.01;
      const price = currentPrice + rand(-scale, scale);
      const quantity = randInt(1, 5); // contracts

      const executed: ExecutedTrade = {
        id: uid(),
        symbol: inst.symbol,
        action,
        price: Math.round(price * 100) / 100,
        quantity,
        timestamp: new Date(),
      };
      setExecutedTrades((prev) => [executed, ...prev].slice(0, 10));

      const hasExit = Math.random() > 0.4;
      const exitPrice = hasExit ? Math.round((price + rand(-scale * 2, scale * 3)) * 100) / 100 : null;
      // Tick-based P&L: ((exit - entry) / tickSize) * pointValue * contracts
      const pnl = exitPrice
        ? Math.round(((exitPrice - price) / inst.tickSize) * inst.pointValue * quantity * (action === "buy" ? 1 : -1) * 100) / 100
        : null;
      const tradeEntry: TradeHistory = {
        id: uid(),
        type: action,
        asset: inst.symbol,
        entryPrice: Math.round(price * 100) / 100,
        exitPrice,
        pnl,
        timestamp: new Date(),
      };
      setTradeHistory((prev) => [tradeEntry, ...prev].slice(0, 50));
      // Simulated trade — in-memory only, never persisted to the database.
    }, 10000);
    return () => clearInterval(interval);
  }, [dbLoaded, activeSymbols]);

  // Learning notes every 15s
  useEffect(() => {
    if (!dbLoaded) return;
    const interval = setInterval(() => {
      const idx = noteIndexRef.current % LEARNING_TEMPLATES.length;
      noteIndexRef.current++;
      const note = { id: uid(), ...LEARNING_TEMPLATES[idx], timestamp: new Date() };
      setLearningNotes((prev) => [note, ...prev].slice(0, 20));
      // Simulated learning note — in-memory only, never persisted to the database.
    }, 15000);
    return () => clearInterval(interval);
  }, [dbLoaded]);

  // Portfolio → Margin-based computation
  const INITIAL_ACCOUNT = 100_000;
  const TICKER_NAME_MAP: Record<string, string> = {};
  ALL_INSTRUMENTS.forEach((t) => { TICKER_NAME_MAP[t.symbol] = t.name; });

  const portfolio: PortfolioSummary = (() => {
    const holdingSeed = activeInstruments.slice(0, 5).map((inst) => ({
      symbol: inst.symbol,
      contracts: randInt(1, 4),
    }));

    const holdings: PortfolioHolding[] = holdingSeed.map((h) => {
      const ticker = tickers.find((t) => t.symbol === h.symbol);
      const inst = ALL_INSTRUMENTS.find((s) => s.symbol === h.symbol)!;
      const currentPrice = ticker?.price ?? inst.basePrice;
      const entryPrice = inst.basePrice * (1 + rand(-0.005, 0.005));
      // Tick-based P&L per holding
      const ticks = (currentPrice - entryPrice) / inst.tickSize;
      const pnl = Math.round(ticks * inst.pointValue * h.contracts * 100) / 100;
      const marginUsed = inst.initialMargin * h.contracts;
      const pnlPercent = marginUsed > 0 ? (pnl / marginUsed) * 100 : 0;
      return {
        symbol: h.symbol,
        name: TICKER_NAME_MAP[h.symbol] || h.symbol,
        contracts: h.contracts,
        initialMargin: inst.initialMargin,
        currentPrice: Math.round(currentPrice * 100) / 100,
        pnl,
        pnlPercent: Math.round(pnlPercent * 100) / 100,
      };
    });

    const usedMargin = holdings.reduce((s, h) => s + h.initialMargin * h.contracts, 0);
    const totalPnl = holdings.reduce((s, h) => s + h.pnl, 0);
    const accountBalance = INITIAL_ACCOUNT + totalPnl;
    const availableMargin = accountBalance - usedMargin;
    const marginUtilization = accountBalance > 0 ? Math.round((usedMargin / accountBalance) * 1000) / 10 : 0;
    const totalPnlPercent = INITIAL_ACCOUNT > 0 ? (totalPnl / INITIAL_ACCOUNT) * 100 : 0;

    return {
      accountBalance: Math.round(accountBalance * 100) / 100,
      usedMargin: Math.round(usedMargin * 100) / 100,
      availableMargin: Math.round(availableMargin * 100) / 100,
      marginUtilization,
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalPnlPercent: Math.round(totalPnlPercent * 100) / 100,
      holdings,
    };
  })();

  // Aggregate stats
  const closedTrades = tradeHistory.filter((t) => t.pnl !== null);
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const totalTrades = tradeHistory.length;
  const wins = closedTrades.filter((t) => t.pnl! > 0).length;
  const losses = closedTrades.filter((t) => t.pnl! <= 0).length;
  const winRate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0;

  let currentStreak = 0;
  let currentStreakType: "win" | "loss" | null = null;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  const chronological = [...closedTrades].reverse();
  for (const t of chronological) {
    const isWin = t.pnl! > 0;
    if (currentStreakType === (isWin ? "win" : "loss")) {
      currentStreak++;
    } else {
      currentStreak = 1;
      currentStreakType = isWin ? "win" : "loss";
    }
    if (isWin) maxWinStreak = Math.max(maxWinStreak, currentStreak);
    else maxLossStreak = Math.max(maxLossStreak, currentStreak);
  }

  let avgDurationMs = 0;
  if (chronological.length >= 2) {
    const durations: number[] = [];
    for (let i = 1; i < chronological.length; i++) {
      durations.push(chronological[i].timestamp.getTime() - chronological[i - 1].timestamp.getTime());
    }
    avgDurationMs = durations.reduce((a, b) => a + b, 0) / durations.length;
  }
  const avgDurationSec = Math.round(avgDurationMs / 1000);

  let sharpeRatio = 0;
  if (closedTrades.length >= 2) {
    const returns = closedTrades.map((t) => t.pnl!);
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0) {
      sharpeRatio = Math.round((meanReturn / stdDev) * Math.sqrt(252) * 100) / 100;
    }
  }

  const grossProfit = closedTrades.filter((t) => t.pnl! > 0).reduce((s, t) => s + t.pnl!, 0);
  const grossLoss = Math.abs(closedTrades.filter((t) => t.pnl! <= 0).reduce((s, t) => s + t.pnl!, 0));
  const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0;

  const avgWin = wins > 0 ? Math.round((grossProfit / wins) * 100) / 100 : 0;
  const avgLoss = losses > 0 ? Math.round((grossLoss / losses) * 100) / 100 : 0;

  const advancedStats = {
    totalPnl: Math.round(totalPnl * 100) / 100,
    totalTrades,
    winRate,
    wins,
    losses,
    maxWinStreak,
    maxLossStreak,
    currentStreak,
    currentStreakType,
    avgDurationSec,
    sharpeRatio,
    profitFactor,
    avgWin,
    avgLoss,
  };

  const deleteTrade = useCallback(async (id: string) => {
    setTradeHistory((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from("trade_history").delete().eq("id", id);
    if (error) console.error("Failed to delete trade:", error);
  }, []);

  const deleteLearningNote = useCallback(async (id: string) => {
    setLearningNotes((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("learning_notes").delete().eq("id", id);
    if (error) console.error("Failed to delete learning note:", error);
  }, []);

  const addLearningNote = useCallback(async (category: LearningNote["category"], content: string) => {
    const note: LearningNote = { id: uid(), category, content, timestamp: new Date() };
    setLearningNotes((prev) => [note, ...prev].slice(0, 20));
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { error } = await supabase.from("learning_notes").insert({
        id: note.id,
        user_id: session.user.id,
        category: note.category,
        content: note.content,
      });
      if (error) console.error("Failed to save learning note:", error);
    }
  }, []);

  return {
    tickers,
    evaluations,
    considerations,
    executedTrades,
    tradeHistory,
    learningNotes,
    dataSource,
    portfolio,
    stats: advancedStats,
    deleteTrade,
    deleteLearningNote,
    addLearningNote,
    activeSymbols,
    setActiveSymbols,
    allInstruments: ALL_INSTRUMENTS,
  };
}
