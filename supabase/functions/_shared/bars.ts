export interface Bar {
  t: number; // epoch ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

const AV = "https://www.alphavantage.co/query";

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