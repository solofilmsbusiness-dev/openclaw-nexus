import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { admin, loadConfig, type AgentConfig } from "../_shared/db.ts";
import { inNewsWindow, rr, type Dir } from "../_shared/brt.ts";

const BRT_SYSTEM_PROMPT = `You are the risk officer for a single-strategy NQ futures agent that trades ONLY the
LunsfordTrades Break & Retest (BRT) Smart-Money-Concepts framework.

The 5-step entry pattern (ALL required, any missing = HOLD):
1. HTF (Daily/4H) S/R zone with >= min_zone_touches reactions.
2. Break: a momentum candle CLOSING fully outside the zone (wicks do not count), ideally with volume expansion.
3. Retest: price re-enters the broken zone (level flip) showing indecision. A rip straight through invalidates the zone.
4. IFVG inside the zone: 3-candle gap the middle wick never filled, later inverted. Gann-box 50% of that range is the trigger.
5. Trigger: a retest candle's wick tabs >= 50% into the IFVG.

Only trade WITH the HTF trend. Stop goes just beyond the far IFVG edge. Target is the next liquidity pool at >= 2:1 R:R.

All deterministic detection has ALREADY been done in code and is given to you. Your job is ONLY the two judgment calls:
(a) zone_quality: is this a genuine institutional zone (order block / breaker / premium-discount array / prior session
    high-low) or just noise?
(b) bias_confirm: does the computed HTF bias look trustworthy given the structure described?

Respond with STRICT JSON only, no prose:
{"zone_quality":"high"|"medium"|"low","bias_confirm":true|false,"note":"one short sentence"}
Be conservative. When in doubt answer low / false.`;

interface Judgment {
  zone_quality: "high" | "medium" | "low";
  bias_confirm: boolean;
  note: string;
}

async function judge(payload: unknown): Promise<Judgment> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  const fallback: Judgment = { zone_quality: "medium", bias_confirm: true, note: "LLM unavailable; deterministic gate only" };
  if (!key) return fallback;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: BRT_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(payload).slice(0, 12000) },
        ],
      }),
    });
    if (res.status === 429) return { ...fallback, note: "AI rate limited; deterministic gate only" };
    if (res.status === 402) return { ...fallback, note: "AI credits exhausted; deterministic gate only" };
    if (!res.ok) return fallback;
    const body = await res.json();
    const text: string = body?.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]);
    return {
      zone_quality: ["high", "medium", "low"].includes(parsed.zone_quality) ? parsed.zone_quality : "low",
      bias_confirm: parsed.bias_confirm === true,
      note: String(parsed.note ?? "").slice(0, 240),
    };
  } catch {
    return fallback;
  }
}

type Decision = {
  decision: "BUY" | "SELL" | "HOLD";
  reason: string;
  steps_passed: Record<string, boolean>;
  htf_bias: string;
  entry: number | null;
  stop: number | null;
  target: number | null;
  rr: number | null;
  source: "brt" | "tradingview" | "confluence" | "none";
  tv_signal_id: string | null;
  zone_key: string | null;
};

function hold(reason: string, steps: Record<string, boolean>, bias: string, extra: Partial<Decision> = {}): Decision {
  return {
    decision: "HOLD",
    reason,
    steps_passed: steps,
    htf_bias: bias,
    entry: null,
    stop: null,
    target: null,
    rr: null,
    source: "none",
    tv_signal_id: null,
    zone_key: null,
    ...extra,
  };
}

function validateBracket(
  cfg: AgentConfig,
  dir: Dir,
  entry: number,
  stop: number,
  target: number,
): string | null {
  if (![entry, stop, target].every((n) => Number.isFinite(n) && n > 0)) return "non-finite bracket price";
  if (dir === "long" && !(stop < entry && target > entry)) return "long bracket ordering invalid";
  if (dir === "short" && !(stop > entry && target < entry)) return "short bracket ordering invalid";
  const stopTicks = Math.abs(entry - stop) / (cfg.tick_size || 0.25);
  if (stopTicks > cfg.max_stop_ticks) return `stop distance ${Math.round(stopTicks)} ticks > max_stop_ticks ${cfg.max_stop_ticks}`;
  if (stopTicks < 1) return "stop too tight";
  const ratio = rr(entry, stop, target, dir);
  if (ratio < Number(cfg.min_rr)) return `R:R ${ratio.toFixed(2)} < min_rr ${cfg.min_rr}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = admin();
    const cfg = await loadConfig(sb);
    const body = await req.json().catch(() => ({}));
    const research = body.research;
    if (!research?.ok) {
      return json({ ok: true, ...hold(`research unavailable: ${research?.error ?? "missing"}`, {}, "none") });
    }

    const bias: string = research.htfBias ?? "none";

    /* ---------- global blocks ---------- */
    if (cfg.kill_switch) {
      return json({ ok: true, ...hold("kill switch active", {}, bias) });
    }
    if (inNewsWindow(new Date(), cfg.avoid_news_minutes)) {
      return json({ ok: true, ...hold(`news window (+/- ${cfg.avoid_news_minutes}m) — standing aside`, {}, bias) });
    }

    /* ---------- daily limits ---------- */
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }))
      .toISOString().slice(0, 10);
    const { data: todays } = await sb
      .from("paper_positions")
      .select("pnl,status")
      .eq("session_date", today);
    const realized = (todays ?? []).reduce((s, p) => s + Number(p.pnl ?? 0), 0);
    if (realized >= Number(cfg.daily_profit_target)) {
      return json({ ok: true, ...hold(`daily profit target hit (${realized.toFixed(2)})`, {}, bias) });
    }
    if (realized <= -Math.abs(Number(cfg.daily_loss_limit))) {
      return json({ ok: true, ...hold(`daily loss limit hit (${realized.toFixed(2)})`, {}, bias) });
    }

    /* ---------- one position at a time ---------- */
    const { data: open } = await sb
      .from("paper_positions")
      .select("id")
      .eq("status", "OPEN")
      .limit(1);
    if (open && open.length) {
      return json({ ok: true, ...hold("position already open — never add to a trade", {}, bias) });
    }

    /* ---------- TradingView signals ---------- */
    const ttlCutoff = new Date(Date.now() - cfg.tv_signal_ttl_minutes * 60_000).toISOString();
    const { data: sigs } = await sb
      .from("tradingview_signals")
      .select("*")
      .eq("consumed", false)
      .order("received_at", { ascending: false })
      .limit(20);
    const symbols = [cfg.symbol, cfg.paper_symbol].map((s) => s.toUpperCase());
    const relevant = (sigs ?? []).filter((s) =>
      symbols.some((sym) => String(s.symbol).toUpperCase().startsWith(sym))
    );
    const stale = relevant.filter((s) => s.received_at < ttlCutoff);
    if (stale.length) {
      await sb.from("tradingview_signals")
        .update({ consumed: true, consumed_at: new Date().toISOString(), consume_reason: "expired" })
        .in("id", stale.map((s) => s.id));
    }
    const tv = relevant.find((s) => s.received_at >= ttlCutoff) ?? null;

    /* ---------- BRT deterministic gate ---------- */
    const setups: any[] = research.setups ?? [];
    const ordered = setups.slice().sort((a, b) => {
      const score = (x: any) => Object.values(x.steps ?? {}).filter(Boolean).length;
      return score(b) - score(a);
    });
    const best = ordered[0] ?? null;
    const steps: Record<string, boolean> = best?.steps ?? {
      zone: false, break: false, retest: false, ifvg: false, trigger: false,
    };
    const firstFail = ["zone", "break", "retest", "ifvg", "trigger"].find((k) => !steps[k]) ?? null;

    let brtDir: Dir | null = null;
    let brtEntry: number | null = null;
    let brtStop: number | null = null;
    let brtTarget: number | null = null;
    let brtReason = firstFail ? `BRT blocked at step: ${firstFail}` : "BRT 5-step complete";
    let zoneKey: string | null = null;

    if (!firstFail && best?.ifvg && best?.brk) {
      brtDir = best.brk.dir as Dir;
      const biasOk = (brtDir === "long" && bias === "up") || (brtDir === "short" && bias === "down");
      if (!biasOk) {
        brtReason = `BRT setup rejected: direction ${brtDir} not aligned with HTF bias ${bias}`;
      } else {
        brtEntry = Number(best.proposedEntry ?? best.ifvg.mid);
        // Stop just beyond the far edge of the IFVG.
        const pad = (best.ifvg.high - best.ifvg.low) * 0.1 + (cfg.tick_size || 0.25);
        brtStop = brtDir === "long" ? best.ifvg.low - pad : best.ifvg.high + pad;
        const liq = best.proposedTarget;
        const risk = Math.abs(brtEntry - brtStop);
        const minTarget = brtDir === "long"
          ? brtEntry + risk * Number(cfg.min_rr)
          : brtEntry - risk * Number(cfg.min_rr);
        brtTarget = liq != null && (brtDir === "long" ? liq >= minTarget : liq <= minTarget)
          ? Number(liq)
          : minTarget;
        zoneKey = `${best.zone.high.toFixed(2)}:${best.zone.low.toFixed(2)}:${today}`;
      }
    }
    const brtReady = brtDir !== null && brtEntry !== null && brtStop !== null && brtTarget !== null;

    /* ---------- one setup per zone per session ---------- */
    if (brtReady && cfg.one_setup_per_zone_session && zoneKey) {
      const { data: used } = await sb
        .from("paper_positions")
        .select("id")
        .eq("zone_key", zoneKey)
        .eq("session_date", today)
        .limit(1);
      if (used && used.length) {
        return json({ ok: true, ...hold("zone already traded this session", steps, bias) });
      }
    }

    /* ---------- LLM judgment (only when a setup is actually on the table) ---------- */
    let verdict: Judgment | null = null;
    if (brtReady) {
      verdict = await judge({
        htfBias: bias,
        zone: best.zone,
        break: best.brk,
        retest: best.retest,
        ifvg: best.ifvg,
        proposed: { entry: brtEntry, stop: brtStop, target: brtTarget },
      });
      if (verdict.zone_quality === "low" || !verdict.bias_confirm) {
        return json({
          ok: true,
          ...hold(`AI judgment rejected setup (quality=${verdict.zone_quality}, bias_confirm=${verdict.bias_confirm}): ${verdict.note}`, steps, bias),
        });
      }
    }

    /* ---------- combine BRT + TradingView ---------- */
    const tvDir: Dir | null = tv ? (tv.direction === "buy" ? "long" : "short") : null;
    const tvBiasOk = tvDir ? (tvDir === "long" && bias === "up") || (tvDir === "short" && bias === "down") : false;

    const consume = async (id: string, reason: string) => {
      await sb.from("tradingview_signals")
        .update({ consumed: true, consumed_at: new Date().toISOString(), consume_reason: reason })
        .eq("id", id);
    };

    if (cfg.tv_confluence_required) {
      if (!brtReady) return json({ ok: true, ...hold(`confluence mode: ${brtReason}`, steps, bias) });
      if (!tv) return json({ ok: true, ...hold("confluence mode: no fresh TradingView signal", steps, bias) });
      if (tvDir !== brtDir) {
        await consume(tv.id, "direction conflict with BRT");
        return json({ ok: true, ...hold("confluence mode: TradingView signal disagrees with BRT direction", steps, bias) });
      }
    }

    // Prefer a fresh, HTF-aligned TradingView bracket when present.
    if (tv && tvDir && tvBiasOk) {
      const entry = Number(tv.entry ?? research.proxyPrice);
      const stop = Number(tv.sl);
      const target = Number(tv.tp);
      const err = validateBracket(cfg, tvDir, entry, stop, target);
      if (err) {
        await consume(tv.id, `invalid: ${err}`);
        return json({ ok: true, ...hold(`TradingView signal rejected: ${err}`, steps, bias, { tv_signal_id: tv.id }) });
      }
      return json({
        ok: true,
        decision: tvDir === "long" ? "BUY" : "SELL",
        reason: cfg.tv_confluence_required
          ? "Confluence: BRT 5-step complete and TradingView signal agrees"
          : `TradingView signal aligned with HTF bias ${bias}`,
        steps_passed: steps,
        htf_bias: bias,
        entry, stop, target,
        rr: rr(entry, stop, target, tvDir),
        source: cfg.tv_confluence_required ? "confluence" : "tradingview",
        tv_signal_id: tv.id,
        zone_key: zoneKey,
        ai_note: verdict?.note ?? null,
      });
    }
    if (tv && tvDir && !tvBiasOk) {
      await consume(tv.id, `counter-trend vs HTF bias ${bias}`);
    }

    if (!brtReady) {
      return json({ ok: true, ...hold(brtReason, steps, bias) });
    }

    const err = validateBracket(cfg, brtDir!, brtEntry!, brtStop!, brtTarget!);
    if (err) return json({ ok: true, ...hold(`BRT bracket rejected: ${err}`, steps, bias) });

    return json({
      ok: true,
      decision: brtDir === "long" ? "BUY" : "SELL",
      reason: `BRT 5-step confirmed and aligned with HTF bias ${bias}. ${verdict?.note ?? ""}`.trim(),
      steps_passed: steps,
      htf_bias: bias,
      entry: brtEntry,
      stop: brtStop,
      target: brtTarget,
      rr: rr(brtEntry!, brtStop!, brtTarget!, brtDir!),
      source: "brt",
      tv_signal_id: null,
      zone_key: zoneKey,
      ai_note: verdict?.note ?? null,
    });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message ?? e) }, 200);
  }
});