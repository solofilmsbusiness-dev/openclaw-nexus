import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// --- Types ---
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
  shares: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  allocation: number;
}

export interface PortfolioSummary {
  totalValue: number;
  cashBalance: number;
  investedValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  holdings: PortfolioHolding[];
}

// --- Seed data ---
const TICKERS_SEED: { symbol: string; name: string; basePrice: number }[] = [
  { symbol: "AAPL", name: "Apple Inc.", basePrice: 198.5 },
  { symbol: "TSLA", name: "Tesla Inc.", basePrice: 245.2 },
  { symbol: "NVDA", name: "NVIDIA Corp.", basePrice: 875.3 },
  { symbol: "MSFT", name: "Microsoft Corp.", basePrice: 415.8 },
  { symbol: "AMZN", name: "Amazon.com", basePrice: 185.6 },
  { symbol: "GOOGL", name: "Alphabet Inc.", basePrice: 155.4 },
  { symbol: "META", name: "Meta Platforms", basePrice: 505.1 },
  { symbol: "AMD", name: "AMD Inc.", basePrice: 162.7 },
];

const LEARNING_TEMPLATES: { category: LearningNote["category"]; content: string }[] = [
  { category: "Mistake", content: "Entered TSLA position too early — RSI hadn't confirmed oversold. Wait for confirmation next time." },
  { category: "Insight", content: "NVDA consistently shows momentum continuation after breaking previous day high in first 30 min." },
  { category: "Adjustment", content: "Reducing position size on volatile days. Max risk per trade capped at 1.5% of portfolio." },
  { category: "Pattern", content: "AAPL tends to consolidate between 10:30-11:00 AM before a breakout. Consider waiting for this window." },
  { category: "Insight", content: "Strong correlation between SPY volume spikes and tech sector momentum shifts within 15 min." },
  { category: "Mistake", content: "Held AMZN short too long through support bounce. Need tighter stop-loss on counter-trend trades." },
  { category: "Adjustment", content: "Added VWAP as primary entry filter. Entries above VWAP for longs, below for shorts." },
  { category: "Pattern", content: "META shows mean-reversion tendencies on gap-down opens > 2%. Fade strategy effective 68% of the time." },
  { category: "Insight", content: "MACD histogram divergence on 5-min chart is a reliable early signal for trend exhaustion." },
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

const TICKER_NAME_MAP: Record<string, string> = {};
TICKERS_SEED.forEach((t) => { TICKER_NAME_MAP[t.symbol] = t.name; });

export function useTradingSimulation() {
  const [tickers, setTickers] = useState<MarketTicker[]>(() =>
    TICKERS_SEED.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      price: t.basePrice,
      change: 0,
      changePercent: 0,
      volume: randInt(5_000_000, 80_000_000),
      history: Array.from({ length: 20 }, () => t.basePrice + rand(-5, 5)),
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

  // Load persisted data from database on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No session — seed with templates
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

      // Load trade history
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

      // Load learning notes
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
        // Seed with templates if no notes exist
        const seedNotes = LEARNING_TEMPLATES.slice(0, 3).map((n, i) => ({
          id: uid(),
          ...n,
          timestamp: new Date(Date.now() - (3 - i) * 600_000),
        }));
        setLearningNotes(seedNotes);
        noteIndexRef.current = 3;

        // Persist seed notes
        for (const note of seedNotes) {
          await supabase.from("learning_notes").insert({
            id: note.id,
            user_id: session.user.id,
            category: note.category,
            content: note.content,
          });
        }
      }

      setDbLoaded(true);
    };

    loadPersistedData();
  }, []);

  // Fetch real market data from edge function
  const fetchMarketData = useCallback(async () => {
    try {
      const symbols = TICKERS_SEED.map((t) => t.symbol);
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
    }
  }, []);

  // Initial fetch + refresh every 5 minutes (to stay within free tier)
  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Small simulated fluctuations between real data refreshes (based on live price if available)
  useEffect(() => {
    const interval = setInterval(() => {
      setTickers((prev) =>
        prev.map((t) => {
          const basePrice = livePricesRef.current[t.symbol] || TICKERS_SEED.find((s) => s.symbol === t.symbol)!.basePrice;
          const delta = rand(-0.5, 0.5); // Small micro-fluctuation
          const newPrice = Math.max(1, t.price + delta);
          const change = newPrice - basePrice;
          const changePercent = (change / basePrice) * 100;
          return {
            ...t,
            price: Math.round(newPrice * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            volume: t.volume + randInt(-50_000, 100_000),
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
      const ticker = pickRandom(TICKERS_SEED);
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
      setEvaluations((prev) => [{ id: uid(), symbol: ticker.symbol, indicators, timestamp: new Date() }, ...prev].slice(0, 8));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Agent considerations every 7s
  useEffect(() => {
    const interval = setInterval(() => {
      const ticker = pickRandom(TICKERS_SEED);
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
            symbol: ticker.symbol,
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
  }, []);

  // Executed trades every 10s (persist to DB)
  useEffect(() => {
    if (!dbLoaded) return;
    const interval = setInterval(async () => {
      const ticker = pickRandom(TICKERS_SEED);
      const action = pickRandom(["buy", "sell"] as const);
      const currentPrice = livePricesRef.current[ticker.symbol] || ticker.basePrice;
      const price = currentPrice + rand(-3, 3);
      const quantity = randInt(5, 100);

      const executed: ExecutedTrade = {
        id: uid(),
        symbol: ticker.symbol,
        action,
        price: Math.round(price * 100) / 100,
        quantity,
        timestamp: new Date(),
      };
      setExecutedTrades((prev) => [executed, ...prev].slice(0, 10));

      const hasExit = Math.random() > 0.4;
      const exitPrice = hasExit ? Math.round((price + rand(-8, 12)) * 100) / 100 : null;
      const pnl = exitPrice ? Math.round((exitPrice - price) * quantity * (action === "buy" ? 1 : -1) * 100) / 100 : null;
      const tradeEntry: TradeHistory = {
        id: uid(),
        type: action,
        asset: ticker.symbol,
        entryPrice: Math.round(price * 100) / 100,
        exitPrice,
        pnl,
        timestamp: new Date(),
      };
      setTradeHistory((prev) => [tradeEntry, ...prev].slice(0, 50));

      // Persist to DB
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        supabase.from("trade_history").insert({
          user_id: session.user.id,
          type: action,
          asset: ticker.symbol,
          entry_price: tradeEntry.entryPrice,
          exit_price: exitPrice,
          pnl,
        }).then(() => {});
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [dbLoaded]);

  // Learning notes every 15s (persist to DB)
  useEffect(() => {
    if (!dbLoaded) return;
    const interval = setInterval(async () => {
      const idx = noteIndexRef.current % LEARNING_TEMPLATES.length;
      noteIndexRef.current++;
      const note = { id: uid(), ...LEARNING_TEMPLATES[idx], timestamp: new Date() };
      setLearningNotes((prev) => [note, ...prev].slice(0, 20));

      // Persist to DB
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        supabase.from("learning_notes").insert({
          user_id: session.user.id,
          category: note.category,
          content: note.content,
        }).then(() => {});
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [dbLoaded]);

  // Portfolio computation
  const INITIAL_CASH = 100_000;
  const portfolio: PortfolioSummary = (() => {
    // Simulated holdings based on tickers
    const holdingSeed = [
      { symbol: "AAPL", shares: 45 },
      { symbol: "TSLA", shares: 20 },
      { symbol: "NVDA", shares: 12 },
      { symbol: "MSFT", shares: 30 },
      { symbol: "AMZN", shares: 25 },
      { symbol: "META", shares: 8 },
    ];

    const holdings: PortfolioHolding[] = holdingSeed.map((h) => {
      const ticker = tickers.find((t) => t.symbol === h.symbol);
      const seed = TICKERS_SEED.find((s) => s.symbol === h.symbol)!;
      const currentPrice = ticker?.price ?? seed.basePrice;
      const avgCost = seed.basePrice * (1 + rand(-0.05, 0.05)); // slightly off base
      const value = currentPrice * h.shares;
      const costBasis = avgCost * h.shares;
      const pnl = value - costBasis;
      const pnlPercent = (pnl / costBasis) * 100;
      return {
        symbol: h.symbol,
        name: TICKER_NAME_MAP[h.symbol] || h.symbol,
        shares: h.shares,
        avgCost: Math.round(avgCost * 100) / 100,
        currentPrice: Math.round(currentPrice * 100) / 100,
        value: Math.round(value * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        pnlPercent: Math.round(pnlPercent * 100) / 100,
        allocation: 0,
      };
    });

    const investedValue = holdings.reduce((s, h) => s + h.value, 0);
    const cashBalance = INITIAL_CASH - holdings.reduce((s, h) => s + h.avgCost * h.shares, 0);
    const totalValue = investedValue + cashBalance;

    // Compute allocation %
    holdings.forEach((h) => {
      h.allocation = Math.round((h.value / totalValue) * 1000) / 10;
    });

    const totalCost = holdings.reduce((s, h) => s + h.avgCost * h.shares, 0);
    const totalPnl = investedValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return {
      totalValue: Math.round(totalValue * 100) / 100,
      cashBalance: Math.round(cashBalance * 100) / 100,
      investedValue: Math.round(investedValue * 100) / 100,
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

  // Win/Loss streaks
  let currentStreak = 0;
  let currentStreakType: "win" | "loss" | null = null;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  // Iterate oldest-first for streak calculation
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

  // Average trade duration (simulate as time between sequential trades)
  let avgDurationMs = 0;
  if (chronological.length >= 2) {
    const durations: number[] = [];
    for (let i = 1; i < chronological.length; i++) {
      durations.push(chronological[i].timestamp.getTime() - chronological[i - 1].timestamp.getTime());
    }
    avgDurationMs = durations.reduce((a, b) => a + b, 0) / durations.length;
  }
  const avgDurationSec = Math.round(avgDurationMs / 1000);

  // Sharpe ratio (annualized, using per-trade returns)
  let sharpeRatio = 0;
  if (closedTrades.length >= 2) {
    const returns = closedTrades.map((t) => t.pnl!);
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0) {
      sharpeRatio = Math.round((meanReturn / stdDev) * Math.sqrt(252) * 100) / 100; // annualized
    }
  }

  // Profit factor
  const grossProfit = closedTrades.filter((t) => t.pnl! > 0).reduce((s, t) => s + t.pnl!, 0);
  const grossLoss = Math.abs(closedTrades.filter((t) => t.pnl! <= 0).reduce((s, t) => s + t.pnl!, 0));
  const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0;

  // Average win / average loss
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
    await supabase.from("trade_history").delete().eq("id", id);
  }, []);

  const deleteLearningNote = useCallback(async (id: string) => {
    setLearningNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("learning_notes").delete().eq("id", id);
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
  };
}
