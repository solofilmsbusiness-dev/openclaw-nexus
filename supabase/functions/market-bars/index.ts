import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { fetchBars, setProvider, type Bar } from "../_shared/bars.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_TF = new Set(["5m", "15m", "1h", "4h", "1d"]);
const SYMBOL_RE = /^[A-Za-z0-9=^.\-!]{1,12}$/;
const MAX_BARS = 500;

// Short-lived cache so a room full of dashboards doesn't hammer the provider.
const cache: Record<string, { bars: Bar[]; ts: number }> = {};
const CACHE_TTL_MS = 30_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const symbol = String(body?.symbol ?? "NQ=F");
    const timeframe = String(body?.timeframe ?? "5m").toLowerCase();

    if (!SYMBOL_RE.test(symbol)) {
      return new Response(JSON.stringify({ error: "Invalid symbol" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ALLOWED_TF.has(timeframe)) {
      return new Response(JSON.stringify({ error: "Invalid timeframe" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = `${symbol}|${timeframe}`;
    const now = Date.now();
    let bars = cache[key] && now - cache[key].ts < CACHE_TTL_MS ? cache[key].bars : null;

    if (!bars) {
      setProvider("yahoo");
      bars = (await fetchBars(symbol, timeframe)).slice(-MAX_BARS);
      cache[key] = { bars, ts: now };
    }

    return new Response(JSON.stringify({ symbol, timeframe, bars }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("market-bars failed:", err);
    return new Response(JSON.stringify({ error: "Failed to load market bars" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
