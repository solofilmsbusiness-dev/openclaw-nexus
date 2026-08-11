import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { admin, loadConfig, logEvent, type AgentConfig } from "../_shared/db.ts";
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
  source: "brt" | "tradingview" | "tradingview-trigger-only" | "confluence" | "reversal-warning" | "none";
  tv_signal_id: string | null;
  tv_timeframe: string | null;
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
    tv_timeframe: null,
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

/** A TV signal is "trigger only" when it carries no usable tp/sl. */
function isTriggerOnly(tv: { tp: unknown; sl: unknown }): boolean {
  const ok = (v: unknown) => v != null && Number.isFinite(Number(v)) && Number(v) > 0;
  return !(ok(tv.tp) && ok(tv.sl));
}

/**
 * Derive a bracket from the indicator's plotted levels carried in raw_payload.plots.
 * BUY: stop = nearest valid plot BELOW entry, target = nearest valid plot ABOVE entry
 * that still meets min_rr. SELL mirrors. Plots > 3% away from entry are ignored.
 */
function bracketFromPlots(
  cfg: AgentConfig,
  raw: any,
  dir: Dir,
  entry: number,
): { stop: number; target: number; basis: string } | null {
  const plots = raw?.plots;
  if (!plots || typeof plots !== "object") return null;
  const tick = Number(cfg.tick_size) || 0.25;
  const maxAway = entry * 0.03;
  const levels = Object.values(plots as Record<string, unknown>)
    .map((v) => (typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN))
    .filter((n) => Number.isFinite(n) && n > 0 && Math.abs(n - entry) <= maxAway && Math.abs(n - entry) >= tick) as number[];
  if (!levels.length) return null;

  const below = levels.filter((n) => n < entry).sort((a, b) => b - a);
  const above = levels.filter((n) => n > entry).sort((a, b) => a - b);

  const stop = dir === "long" ? below[0] : above[0];
  if (stop == null) return null;

  const risk = Math.abs(entry - stop);
  if (!(risk > 0)) return null;
  const minRr = Number(cfg.min_rr) || 2;
  const minTarget = dir === "long" ? entry + risk * minRr : entry - risk * minRr;
  const pool = dir === "long" ? above : below;
  const target = pool.find((n) => (dir === "long" ? n >= minTarget : n <= minTarget));
  if (target == null) return null;

  return { stop, target, basis: "indicator plots" };
}

/**
 * Build a stop/target for a trigger-only TV signal using the BRT engine:
 * stop beyond the nearest active IFVG edge, else an ATR-based stop.
 * Both are capped at max_stop_ticks. Target aims at structure liquidity
 * when it beats min_rr, otherwise the exact min_rr level.
 */
function bracketFromBrt(
  cfg: AgentConfig,
  research: any,
  dir: Dir,
  entry: number,
): { stop: number; target: number; basis: string } | null {
  const tick = Number(cfg.tick_size) || 0.25;
  const maxDist = Math.max(tick, cfg.max_stop_ticks * tick);

  let stopDist: number | null = null;
  let basis = "";

  const candidates = (research.setups ?? [])
    .filter((s: any) => s?.ifvg && s?.brk?.dir === dir)
    .map((s: any) => s.ifvg)
    .sort((a: any, b: any) => Math.abs(a.mid - entry) - Math.abs(b.mid - entry));
  const ifvg = candidates[0] ?? null;
  if (ifvg) {
    const pad = (ifvg.high - ifvg.low) * 0.1 + tick;
    const raw = dir === "long" ? entry - (ifvg.low - pad) : (ifvg.high + pad) - entry;
    if (Number.isFinite(raw) && raw > 0) {
      stopDist = raw;
      basis = "nearest IFVG edge";
    }
  }
  if (stopDist == null) {
    const a = Number(research?.atr?.ltf ?? research?.atr?.structure ?? NaN);
    if (!Number.isFinite(a) || a <= 0) return null;
    stopDist = a * 1.5;
    basis = "ATR(14) x1.5";
  }

  stopDist = Math.min(stopDist, maxDist);
  stopDist = Math.max(stopDist, tick * 4);
  const stop = dir === "long" ? entry - stopDist : entry + stopDist;

  const minRr = Number(cfg.min_rr) || 2;
  const minTarget = dir === "long" ? entry + stopDist * minRr : entry - stopDist * minRr;
  const liq = Number(research?.liquidity?.[dir === "long" ? "long" : "short"] ?? NaN);
  const target = Number.isFinite(liq) && (dir === "long" ? liq > minTarget : liq < minTarget)
    ? liq
    : minTarget;

  return { stop, target, basis };
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

    /* ---------- TradingView signals (any timeframe: 5m, 30m, ...) ---------- */
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

    const consume = async (ids: string | string[], reason: string) => {
      const list = Array.isArray(ids) ? ids : [ids];
      if (!list.length) return;
      await sb.from("tradingview_signals")
        .update({ consumed: true, consumed_at: new Date().toISOString(), consume_reason: reason })
        .in("id", list);
    };

    // Fresh (in-TTL) signals, newest first. Both 5m and 30m alerts are valid triggers.
    const fresh = relevant.filter((s) => s.received_at >= ttlCutoff);
    const tfOf = (s: any) => String(s?.timeframe ?? "unknown");

    /* ---------- one position at a time + reversal warnings ---------- */
    const { data: openPositions } = await sb
      .from("paper_positions")
      .select("*")
      .eq("status", "OPEN");

    if (openPositions && openPositions.length) {
      const pos: any = openPositions[0];
      const posDir: Dir = pos.side === "LONG" ? "long" : "short";
      const opposite = fresh.filter((s) => (s.direction === "buy" ? "long" : "short") !== posDir);

      if (opposite.length) {
        const price = Number(research.proxyPrice ?? NaN);
        const newest = opposite[0];
        const tfs = opposite.map(tfOf).join(",");
        await consume(opposite.map((s) => s.id), "reversal-warning (not traded)");

        const inProfit = Number.isFinite(price) &&
          (posDir === "long" ? price > Number(pos.entry_price) : price < Number(pos.entry_price));

        if (inProfit) {
          const pts = posDir === "long"
            ? price - Number(pos.entry_price)
            : Number(pos.entry_price) - price;
          const pnl = pts * Number(cfg.point_value) * Number(pos.contracts);
          await sb.from("paper_positions").update({
            status: "CLOSED",
            exit_price: price,
            exit_reason: "reversal-warning: banked profit on opposite signal",
            pnl,
            closed_at: new Date().toISOString(),
          }).eq("id", pos.id).eq("status", "OPEN");
          await logEvent(sb, pos.id, "REVERSAL_CLOSE",
            `reversal-warning: opposite ${newest.direction} signal (${tfs}) while in profit — closed at market`,
            { price, pnl, tv_signal_ids: opposite.map((s) => s.id), timeframes: opposite.map(tfOf) });
          return json({
            ok: true,
            ...hold(
              `reversal-warning: opposite ${newest.direction} signal (${tfs}) while in profit — position closed at ${price} for ${pnl.toFixed(2)}`,
              {}, bias,
              { source: "reversal-warning", tv_signal_id: newest.id, tv_timeframe: tfOf(newest) } as any,
            ),
          });
        }

        // Not in profit: tighten the stop toward entry, never widen.
        const entry = Number(pos.entry_price);
        const cur = Number(pos.stop_price);
        const tightened = posDir === "long" ? Math.max(cur, entry) : Math.min(cur, entry);
        if (tightened !== cur) {
          await sb.from("paper_positions").update({ stop_price: tightened })
            .eq("id", pos.id).eq("status", "OPEN");
        }
        await logEvent(sb, pos.id, "REVERSAL_WARNING",
          `reversal-warning: stop tightened ${cur} -> ${tightened}`,
          { from: cur, to: tightened, price, tv_signal_ids: opposite.map((s) => s.id), timeframes: opposite.map(tfOf) });
        return json({
          ok: true,
          ...hold(
            `reversal-warning: stop tightened (${cur} -> ${tightened}) after opposite ${newest.direction} signal (${tfs})`,
            {}, bias,
            { source: "reversal-warning", tv_signal_id: newest.id, tv_timeframe: tfOf(newest) } as any,
          ),
        });
      }

      return json({ ok: true, ...hold("position already open — never add to a trade", {}, bias) });
    }

    /* ---------- conflicting fresh signals ---------- */
    const hasBuy = fresh.some((s) => s.direction === "buy");
    const hasSell = fresh.some((s) => s.direction === "sell");
    if (hasBuy && hasSell) {
      await consume(fresh.map((s) => s.id), "conflicting signals");
      return json({
        ok: true,
        ...hold(
          `conflicting fresh TradingView signals (${fresh.map((s) => `${s.direction}@${tfOf(s)}`).join(", ")}) — standing aside`,
          {}, bias, { tv_timeframe: fresh.map(tfOf).join(",") } as any,
        ),
      });
    }
    // Signals agree (or there is only one): use the most recent one.
    const tv = fresh[0] ?? null;
    const tvTimeframe = tv ? tfOf(tv) : null;

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
      const triggerOnly = isTriggerOnly(tv);

      if (triggerOnly) {
        if (!Number.isFinite(entry) || entry <= 0) {
          await consume(tv.id, "trigger-only signal without usable entry price");
          return json({ ok: true, ...hold("TradingView trigger-only signal has no usable entry price", steps, bias, { tv_signal_id: tv.id, tv_timeframe: tvTimeframe }) });
        }
        const fromPlots = bracketFromPlots(cfg, tv.raw_payload, tvDir, entry);
        const built = fromPlots ?? bracketFromBrt(cfg, research, tvDir, entry);
        const bracketSource = fromPlots ? "indicator-plots" : "brt-engine";
        if (!built) {
          return json({ ok: true, ...hold("TradingView trigger-only signal: no IFVG or ATR available to size a stop", steps, bias, { tv_signal_id: tv.id }) });
        }
        const berr = validateBracket(cfg, tvDir, entry, built.stop, built.target);
        if (berr) {
          await consume(tv.id, `trigger-only bracket invalid: ${berr}`);
          return json({ ok: true, ...hold(`TradingView trigger-only bracket rejected: ${berr}`, steps, bias, { tv_signal_id: tv.id }) });
        }
        return json({
          ok: true,
          decision: tvDir === "long" ? "BUY" : "SELL",
          reason: `TradingView trigger-only signal aligned with HTF bias ${bias}; bracket source ${bracketSource} (stop from ${built.basis}), target at >= ${cfg.min_rr}R`,
          steps_passed: steps,
          htf_bias: bias,
          entry,
          stop: built.stop,
          target: built.target,
          rr: rr(entry, built.stop, built.target, tvDir),
          source: "tradingview-trigger-only",
          bracket_source: bracketSource,
          tv_signal_id: tv.id,
          tv_timeframe: tvTimeframe,
          zone_key: zoneKey,
          ai_note: verdict?.note ?? null,
        });
      }

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
        tv_timeframe: tvTimeframe,
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
      tv_timeframe: null,
      zone_key: zoneKey,
      ai_note: verdict?.note ?? null,
    });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message ?? e) }, 200);
  }
});