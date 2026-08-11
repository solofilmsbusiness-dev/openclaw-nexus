import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  LineStyle,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { AlertTriangle, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Position = Tables<"paper_positions">;
type TvSignal = Tables<"tradingview_signals">;
type Decision = Tables<"agent_decisions">;

interface Bar { t: number; o: number; h: number; l: number; c: number; v: number }

export const CHART_TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"] as const;
export type ChartTimeframe = typeof CHART_TIMEFRAMES[number];

const DEFAULT_SYMBOL = "NQ=F";
const REFRESH_MS = 60_000;
const SIGNAL_LOOKBACK_HOURS = 12;
const PLOT_MAX_DISTANCE_PCT = 0.03;

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
}

function fmtMoney(n: number) {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function fmtClock(d: Date) {
  return d.toLocaleTimeString(undefined, { hour12: false });
}

/** Pull usable numeric plot levels out of a signal's raw payload. */
function plotLevels(signal: TvSignal): { key: string; price: number }[] {
  const raw = signal.raw_payload as Record<string, unknown> | null;
  const plots = (raw?.plots ?? null) as Record<string, unknown> | null;
  if (!plots || typeof plots !== "object") return [];
  const out: { key: string; price: number }[] = [];
  for (const [key, value] of Object.entries(plots)) {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) continue;
    out.push({ key, price: n });
  }
  return out;
}

interface MarketChartProps {
  /** Compact mode: no volume histogram, markers only, shorter height. */
  compact?: boolean;
  className?: string;
  height?: number;
}

export default function MarketChart({ compact = false, className = "", height }: MarketChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const fittedRef = useRef(false);

  const [timeframe, setTimeframe] = useState<ChartTimeframe>("5m");
  const [bars, setBars] = useState<Bar[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [signals, setSignals] = useState<TvSignal[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [hover, setHover] = useState<Bar | null>(null);

  const openPosition = useMemo(() => positions.find((p) => p.status === "OPEN") ?? null, [positions]);
  const lastPrice = bars.length ? bars[bars.length - 1].c : null;

  const unrealized = useMemo(() => {
    if (!openPosition || lastPrice == null) return null;
    const dir = openPosition.side?.toUpperCase() === "SELL" || openPosition.side?.toUpperCase() === "SHORT" ? -1 : 1;
    const points = (lastPrice - Number(openPosition.entry_price)) * dir;
    return points * 2 * (openPosition.contracts ?? 1); // MNQ point value
  }, [openPosition, lastPrice]);

  const load = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    const sinceIso = new Date(Date.now() - SIGNAL_LOOKBACK_HOURS * 3600_000).toISOString();
    try {
      const [barsRes, posRes, sigRes, decRes] = await Promise.all([
        supabase.functions.invoke("market-bars", { body: { symbol: DEFAULT_SYMBOL, timeframe } }),
        supabase.from("paper_positions").select("*").order("opened_at", { ascending: false }).limit(40),
        supabase.from("tradingview_signals").select("*").gte("received_at", sinceIso).order("received_at", { ascending: false }).limit(20),
        supabase.from("agent_decisions").select("*").order("created_at", { ascending: false }).limit(1),
      ]);

      if (barsRes.error) throw new Error(barsRes.error.message);
      const payload = barsRes.data as { bars?: Bar[]; error?: string } | null;
      if (payload?.error) throw new Error(payload.error);
      const nextBars = Array.isArray(payload?.bars) ? payload!.bars! : [];
      if (!nextBars.length) throw new Error("No bars returned for this timeframe");

      setBars(nextBars);
      setPositions((posRes.data as Position[]) ?? []);
      setSignals((sigRes.data as TvSignal[]) ?? []);
      setDecision(((decRes.data as Decision[]) ?? [])[0] ?? null);
      setError(null);
      setUpdatedAt(new Date());
    } catch (err) {
      console.error("MarketChart load failed:", err);
      setError(err instanceof Error ? err.message : "Failed to load market data");
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  // Timeframe change → refit on next data apply
  useEffect(() => { fittedRef.current = false; load(true); }, [load]);

  // Auto refresh, aligned with the agent's minute cron
  useEffect(() => {
    const id = setInterval(() => load(false), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  // Create the chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const text = cssVar("--muted-foreground", "#94a3b8");
    const grid = "rgba(148, 163, 184, 0.09)";

    const chart = createChart(el, {
      layout: {
        background: { color: "transparent" },
        textColor: text,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 10,
        attributionLogo: false,
      },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: grid, scaleMargins: { top: 0.08, bottom: compact ? 0.08 : 0.26 } },
      timeScale: { borderColor: grid, timeVisible: true, secondsVisible: false, rightOffset: 4 },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(148,163,184,0.5)", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#1e293b" },
        horzLine: { color: "rgba(148,163,184,0.5)", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#1e293b" },
      },
      localization: {
        timeFormatter: (t: number) => new Date((t as number) * 1000).toLocaleString(undefined, { hour12: false }),
      },
      autoSize: true,
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    candleRef.current = candle;
    markersRef.current = createSeriesMarkers(candle, []);

    if (!compact) {
      const vol = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
        color: "rgba(148,163,184,0.4)",
      });
      chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      volumeRef.current = vol;
    }

    const onMove = chart.subscribeCrosshairMove;
    chart.subscribeCrosshairMove((param) => {
      const d = param.seriesData.get(candle) as CandlestickData<Time> | undefined;
      if (!d || param.time == null) { setHover(null); return; }
      setHover({
        t: (param.time as number) * 1000,
        o: d.open, h: d.high, l: d.low, c: d.close, v: 0,
      });
    });
    void onMove;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      markersRef.current = null;
      priceLinesRef.current = [];
    };
  }, [compact]);

  // Apply bar data in place (no re-create)
  useEffect(() => {
    const candle = candleRef.current;
    if (!candle || !bars.length) return;
    const candles: CandlestickData<Time>[] = bars.map((b) => ({
      time: Math.floor(b.t / 1000) as UTCTimestamp,
      open: b.o, high: b.h, low: b.l, close: b.c,
    }));
    candle.setData(candles);

    if (volumeRef.current) {
      const vols: HistogramData<Time>[] = bars.map((b) => ({
        time: Math.floor(b.t / 1000) as UTCTimestamp,
        value: b.v,
        color: b.c >= b.o ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)",
      }));
      volumeRef.current.setData(vols);
    }

    if (!fittedRef.current) {
      chartRef.current?.timeScale().fitContent();
      fittedRef.current = true;
    }
  }, [bars]);

  // Markers: position entries/exits + signal arrows
  useEffect(() => {
    const plugin = markersRef.current;
    if (!plugin || !bars.length) return;
    const firstTs = Math.floor(bars[0].t / 1000);
    const clamp = (ms: number) => Math.max(firstTs, Math.floor(ms / 1000)) as UTCTimestamp;

    const markers: SeriesMarker<Time>[] = [];

    for (const p of positions) {
      const isLong = !(p.side?.toUpperCase() === "SELL" || p.side?.toUpperCase() === "SHORT");
      markers.push({
        time: clamp(new Date(p.opened_at).getTime()),
        position: isLong ? "belowBar" : "aboveBar",
        shape: isLong ? "arrowUp" : "arrowDown",
        color: isLong ? "#10b981" : "#ef4444",
        text: `${isLong ? "LONG" : "SHORT"} ${p.contracts ?? 1} @ ${Number(p.entry_price).toFixed(2)}`,
      });
      if (p.status !== "OPEN" && p.closed_at) {
        const pnl = p.pnl == null ? null : Number(p.pnl);
        markers.push({
          time: clamp(new Date(p.closed_at).getTime()),
          position: isLong ? "aboveBar" : "belowBar",
          shape: "square",
          color: pnl == null ? "#94a3b8" : pnl >= 0 ? "#10b981" : "#ef4444",
          text: `EXIT ${pnl == null ? p.exit_reason ?? "" : fmtMoney(pnl)}`,
        });
      }
    }

    for (const s of signals) {
      const isBuy = s.direction?.toLowerCase() === "buy" || s.direction?.toLowerCase() === "long";
      markers.push({
        time: clamp(new Date(s.received_at).getTime()),
        position: isBuy ? "belowBar" : "aboveBar",
        shape: "circle",
        color: isBuy ? "rgba(56,189,248,0.9)" : "rgba(244,114,182,0.9)",
        text: `${isBuy ? "▲" : "▼"} ${s.timeframe ?? "tv"}`,
      });
    }

    markers.sort((a, b) => (a.time as number) - (b.time as number));
    plugin.setMarkers(markers);
  }, [positions, signals, bars]);

  // Price lines: open position bracket + recent signal plot levels
  useEffect(() => {
    const candle = candleRef.current;
    if (!candle) return;
    for (const line of priceLinesRef.current) candle.removePriceLine(line);
    priceLinesRef.current = [];

    if (openPosition) {
      const add = (price: number, color: string, title: string) =>
        priceLinesRef.current.push(candle.createPriceLine({
          price, color, lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: true, title,
        }));
      add(Number(openPosition.entry_price), "#e2e8f0", "ENTRY");
      add(Number(openPosition.stop_price), "#ef4444", "SL");
      add(Number(openPosition.target_price), "#10b981", "TP");
    }

    const ref = lastPrice;
    const newest = signals[0];
    if (!compact && newest && ref) {
      for (const { key, price } of plotLevels(newest)) {
        if (Math.abs(price - ref) / ref > PLOT_MAX_DISTANCE_PCT) continue;
        priceLinesRef.current.push(candle.createPriceLine({
          price,
          color: "rgba(148,163,184,0.55)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: key,
        }));
      }
    }
  }, [openPosition, signals, lastPrice, compact]);

  const chartHeight = height ?? (compact ? 260 : Math.round(window.innerHeight * 0.65));

  return (
    <div className={`rounded-xl border border-border bg-card/60 backdrop-blur ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border/60">
        <span className="font-mono text-[11px] uppercase tracking-wider text-foreground">NQ Futures</span>
        <div className="flex items-center gap-0.5 rounded-md bg-secondary/50 p-0.5">
          {CHART_TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                timeframe === tf ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {hover && (
          <span className="font-mono text-[10px] text-muted-foreground hidden md:inline">
            O {hover.o.toFixed(2)} H {hover.h.toFixed(2)} L {hover.l.toFixed(2)} C {hover.c.toFixed(2)}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {updatedAt && (
            <span className="font-mono text-[10px] text-muted-foreground">
              last updated {fmtClock(updatedAt)}
            </span>
          )}
          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => load(true)} disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Chart body */}
      <div className="relative" style={{ height: chartHeight }}>
        <div ref={containerRef} className="absolute inset-0" />

        {loading && !bars.length && (
          <div className="absolute inset-0 p-3 space-y-2">
            <div className="h-full w-full rounded-lg bg-secondary/40 animate-pulse" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 text-center px-4">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <p className="font-mono text-[11px] text-destructive">{error}</p>
            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => load(true)}>Retry</Button>
          </div>
        )}

        {openPosition && !error && (
          <div className="absolute top-2 left-2 z-10 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 backdrop-blur">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] font-mono">
                {openPosition.side?.toUpperCase()} × {openPosition.contracts ?? 1}
              </Badge>
              <span className="font-mono text-[10px] text-muted-foreground">
                @ {Number(openPosition.entry_price).toFixed(2)}
              </span>
              {unrealized != null && (
                <span className={`font-mono text-[10px] ${unrealized >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtMoney(unrealized)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Decision strip */}
      {!compact && (
        <div className="flex items-center gap-2 border-t border-border/60 px-3 py-1.5">
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Last decision</span>
          {decision ? (
            <>
              <span className="font-mono text-[10px] text-muted-foreground">
                {new Date(decision.created_at).toLocaleTimeString(undefined, { hour12: false })}
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] font-mono ${
                  decision.decision === "BUY" ? "text-emerald-400" : decision.decision === "SELL" ? "text-red-400" : ""
                }`}
              >
                {decision.decision}
              </Badge>
              <span className="truncate font-mono text-[10px] text-muted-foreground">{decision.reason ?? "—"}</span>
            </>
          ) : (
            <span className="font-mono text-[10px] text-muted-foreground">no decisions yet</span>
          )}
        </div>
      )}

      {/* Legend */}
      {!compact && (
        <div className="border-t border-border/60 px-3 py-1.5">
          <button
            onClick={() => setLegendOpen((v) => !v)}
            className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            {legendOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Legend
          </button>
          {legendOpen && (
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground md:grid-cols-3">
              <span><span className="text-emerald-400">▲</span> long entry (paper position)</span>
              <span><span className="text-red-400">▼</span> short entry (paper position)</span>
              <span><span className="text-muted-foreground">■</span> exit, labelled with realized P/L</span>
              <span><span className="text-sky-400">●</span> TradingView buy signal (tf tag)</span>
              <span><span className="text-pink-400">●</span> TradingView sell signal (tf tag)</span>
              <span><span className="text-foreground">—</span> entry price of the open position</span>
              <span><span className="text-red-400">—</span> SL — protective stop</span>
              <span><span className="text-emerald-400">—</span> TP — target</span>
              <span>- - - indicator plot levels from the latest signal</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
