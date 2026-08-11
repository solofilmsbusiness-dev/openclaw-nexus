import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { admin } from "../_shared/db.ts";

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v.trim()) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return null;
  return n;
};

const str = (v: unknown, max = 64): string | null =>
  typeof v === "string" && v.trim().length ? v.trim().slice(0, max) : null;

/** Public TradingView alert receiver. Shared-secret authenticated. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const expected = Deno.env.get("TRADINGVIEW_WEBHOOK_SECRET");
  if (!expected) return json({ error: "webhook not configured" }, 500);

  let payload: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 8000) return json({ error: "payload too large" }, 413);
    payload = JSON.parse(text);
    if (typeof payload !== "object" || payload === null) throw new Error("not an object");
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const sb = admin();

  const provided = typeof payload.secret === "string" ? payload.secret : "";
  if (provided !== expected) {
    await sb.from("trade_events").insert({
      event_type: "WEBHOOK_REJECTED",
      note: "bad or missing shared secret",
      details: { ip: req.headers.get("x-forwarded-for") ?? null, keys: Object.keys(payload) },
    });
    return json({ error: "unauthorized" }, 401);
  }

  const rawDir = String(payload.direction ?? "").toLowerCase();
  const direction = ["buy", "long"].includes(rawDir)
    ? "buy"
    : ["sell", "short"].includes(rawDir)
    ? "sell"
    : null;
  const symbol = str(payload.symbol, 24);
  if (!direction || !symbol) {
    return json({ error: "symbol and direction (buy|sell) are required" }, 400);
  }

  const { secret: _omit, ...safePayload } = payload;

  const { error } = await sb.from("tradingview_signals").insert({
    symbol: symbol.toUpperCase(),
    direction,
    entry: num(payload.entry),
    tp: num(payload.tp),
    sl: num(payload.sl),
    indicator: str(payload.indicator, 64),
    timeframe: str(payload.timeframe, 16),
    raw_payload: safePayload,
  });
  if (error) return json({ error: "store failed" }, 500);

  return json({ ok: true });
});