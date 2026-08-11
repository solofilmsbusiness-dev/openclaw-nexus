export interface Bar {
  t: number; // epoch ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

const AV = "https://www.alphavantage.co/query";
const POLY = "https://api.polygon.io";
const YF = "https://query1.finance.yahoo.com/v8/finance/chart";

/**
 * Pluggable market-data adapters.
 * Each adapter takes (symbol, timeframe) and returns ascending OHLCV bars.
 * Selection order: agent_config.data_provider -> yahoo (keyless default).
 */
export type BarProvider = (symbol: string, tf: string) => Promise<Bar[]>;

function tfToYahoo(tf: string): { interval: string; range: string; agg: number } {
  switch (tf) {
    case "1d":
    case "daily":
      return { interval: "1d", range: "2y", agg: 1 };
    case "4h":
      return { interval: "1h", range: "60d", agg: 4 };
    case "1h":
      return { interval: "1h", range: "60d", agg: 1 };
    case "15m":
      return { interval: "15m", range: "30d", agg: 1 };
    case "1m":
      return { interval: "1m", range: "5d", agg: 1 };
    default:
      return { interval: "5m", range: "20d", agg: 1 };
  }
}

/** Yahoo Finance chart API — no API key required. Supports NQ=F directly. */
async function yahoo(symbol: string, tf: string): Promise<Bar[]> {
  const { interval, range, agg } = tfToYahoo(tf);
  const url = `${YF}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=true`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`yahoo error ${res.status}`);
  const body = await res.json();
  const err = body?.chart?.error;
  if (err) throw new Error(`yahoo error: ${err?.description ?? JSON.stringify(err)}`);
  const result = body?.chart?.result?.[0];
  const ts: number[] = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  if (!ts.length || !q) throw new Error("yahoo returned no bars");
  const bars: Bar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
    if (![o, h, l, c].every((n) => typeof n === "number" && Number.isFinite(n))) continue;
    bars.push({ t: ts[i] * 1000, o, h, l, c, v: Number(q.volume?.[i] ?? 0) });
  }
  if (!bars.length) throw new Error("yahoo returned no usable bars");
  bars.sort((a, b) => a.t - b.t);
  return aggregate(bars, agg);
}

function tfToPoly(tf: string): { mult: number; span: string; agg: number; days: number } {
  switch (tf) {
    case "1d":
    case "daily":
      return { mult: 1, span: "day", agg: 1, days: 400 };
    case "4h":
      return { mult: 1, span: "hour", agg: 4, days: 120 };
    case "1h":
      return { mult: 1, span: "hour", agg: 1, days: 60 };
    case "15m":
      return { mult: 15, span: "minute", agg: 1, days: 20 };
    default:
      return { mult: 5, span: "minute", agg: 1, days: 10 };
  }
}

/** Polygon.io aggregates — preferred provider when POLYGON_API_KEY is configured. */
async function polygon(symbol: string, tf: string): Promise<Bar[]> {
  const key = Deno.env.get("POLYGON_API_KEY");
  if (!key) throw new Error("POLYGON_API_KEY not configured");
  const { mult, span, agg, days } = tfToPoly(tf);
  const to = new Date();
  const from = new Date(to.getTime() - days * 864e5);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const url =
    `${POLY}/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/${mult}/${span}/${iso(from)}/${iso(to)}` +
    `?adjusted=true&sort=asc&limit=50000&apiKey=${key}`;
  const res = await fetch(url);
  const body = await res.json();
  if (res.status === 429) throw new Error("market data throttled: polygon rate limit");
  if (!res.ok) throw new Error(`polygon error ${res.status}: ${body?.error ?? body?.message ?? ""}`);
  const rows: Array<Record<string, number>> = body?.results ?? [];
  if (!rows.length) throw new Error("polygon returned no bars");
  const bars = rows
    .map((r) => ({ t: r.t, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v ?? 0 }))
    .filter((b) => Number.isFinite(b.t) && Number.isFinite(b.c));
  return aggregate(bars, agg);
}

function parseSeries(obj: Record<string, Record<string, string>>): Bar[] {
  return Object.entries(obj)
    .map(([ts, row]) => ({
      t: new Date(ts.includes(" ") ? `${ts.replace(" ", "T")}Z` : `${ts}T00:00:00Z`).getTime(),
      o: Number(row["1. open"]),
      h: Number(row["2. high"]),
      l: Number(row["3. low"]),
      c: Number(row["4. close"]),
      v: Number(row["5. volume"] ?? row["6. volume"] ?? 0),
    }))
    .filter((b) => Number.isFinite(b.t) && Number.isFinite(b.c))
    .sort((a, b) => a.t - b.t);
}

async function av(params: Record<string, string>): Promise<Bar[]> {
  const key = Deno.env.get("ALPHA_VANTAGE_API_KEY");
  if (!key) throw new Error("ALPHA_VANTAGE_API_KEY not configured");
  const url = new URL(AV);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", key);
  const res = await fetch(url.toString());
  const body = await res.json();
  if (body["Note"] || body["Information"]) {
    throw new Error(`market data throttled: ${body["Note"] ?? body["Information"]}`);
  }
  if (body["Error Message"]) throw new Error(String(body["Error Message"]));
  const seriesKey = Object.keys(body).find((k) => k.toLowerCase().includes("time series"));
  if (!seriesKey) throw new Error("no time series in market data response");
  return parseSeries(body[seriesKey]);
}

/** Aggregate bars into N-bar buckets (e.g. 60m -> 4h uses factor 4). */
export function aggregate(bars: Bar[], factor: number): Bar[] {
  if (factor <= 1) return bars;
  const out: Bar[] = [];
  for (let i = 0; i < bars.length; i += factor) {
    const chunk = bars.slice(i, i + factor);
    if (!chunk.length) continue;
    out.push({
      t: chunk[0].t,
      o: chunk[0].o,
      h: Math.max(...chunk.map((b) => b.h)),
      l: Math.min(...chunk.map((b) => b.l)),
      c: chunk[chunk.length - 1].c,
      v: chunk.reduce((s, b) => s + b.v, 0),
    });
  }
  return out;
}

/**
 * NQ intraday futures candles are not available from the configured provider,
 * so the agent reads the highly-correlated proxy symbol (default QQQ) for
 * structure and rescales it onto the futures price when a quote is available.
 */
export async function fetchBars(proxySymbol: string, timeframe: string): Promise<Bar[]> {
  const tf = timeframe.toLowerCase();
  return await providerFor(tf)(proxySymbol, tf);
}

async function alphavantage(symbol: string, tf: string): Promise<Bar[]> {
  if (tf === "1d" || tf === "daily") {
    return await av({ function: "TIME_SERIES_DAILY", symbol: proxySymbol, outputsize: "compact" });
  }
  if (tf === "4h") {
    const hourly = await av({
      function: "TIME_SERIES_INTRADAY",
      symbol: proxySymbol,
      interval: "60min",
      outputsize: "full",
    });
    return aggregate(hourly, 4);
  }
  const interval = tf === "5m" ? "5min" : tf === "15m" ? "15min" : tf === "1h" ? "60min" : "5min";
  return await av({
    function: "TIME_SERIES_INTRADAY",
    symbol: proxySymbol,
    interval,
    outputsize: "full",
  });
}

export function lastPrice(bars: Bar[]): number | null {
  return bars.length ? bars[bars.length - 1].c : null;
}

/** Scale proxy-derived price levels onto the traded contract's price scale. */
export function makeScaler(proxyRef: number, contractRef: number) {
  const k = proxyRef > 0 ? contractRef / proxyRef : 1;
  return (p: number) => p * k;
}