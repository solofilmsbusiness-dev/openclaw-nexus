import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { admin, callFn, loadConfig, logEvent, type AgentConfig } from "../_shared/db.ts";

type SB = ReturnType<typeof admin>;

interface Position {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  contracts: number;
  entry_price: number;
  stop_price: number;
  target_price: number;
  initial_stop: number;
  lock_active: boolean;
  opened_at: string;
  zone_key: string | null;
  topstep_order_id?: string | null;
  topstep_position_ids?: Record<string, any> | null;
}

/** Fire a topstepx-executor action. Never throws — TopstepX must not break paper trading. */
async function topstep(sb: SB, cfg: any, positionId: string | null, payload: Record<string, unknown>) {
  if (!cfg.topstep_enabled) return null;
  try {
    const res: any = await callFn("topstepx-executor", { position_id: positionId, ...payload });
    if (!res?.ok) {
      await logEvent(sb, positionId, "TOPSTEP_ERROR",
        `${payload.action}: ${res?.error ?? "unknown error"}`, { payload, res });
    }
    return res;
  } catch (e) {
    await logEvent(sb, positionId, "TOPSTEP_ERROR",
      `${payload.action}: ${String((e as Error).message ?? e)}`, { payload });
    return null;
  }
}

/** Flatten the mirrored TopstepX position and cancel its bracket orders. */
async function topstepClose(sb: SB, cfg: any, p: Position, reason: string) {
  const ids = (p.topstep_position_ids ?? {}) as Record<string, any>;
  if (!ids.entryOrderId || ids.flattened) return;
  const res = await topstep(sb, cfg, p.id, {
    action: "close",
    reason,
    topstep_position_ids: ids,
  });
  if (res?.ok) {
    await sb.from("paper_positions")
      .update({ topstep_position_ids: { ...ids, flattened: true, flattened_at: new Date().toISOString() } })
      .eq("id", p.id);
  }
}

function pnlFor(cfg: AgentConfig, p: Position, exit: number) {
  const pts = p.side === "LONG" ? exit - p.entry_price : p.entry_price - exit;
  return pts * Number(cfg.point_value) * p.contracts;
}

async function closePosition(
  sb: SB, cfg: AgentConfig, p: Position, exit: number, reason: string,
) {
  const pnl = pnlFor(cfg, p, exit);
  await sb.from("paper_positions").update({
    status: "CLOSED",
    exit_price: exit,
    exit_reason: reason,
    pnl,
    closed_at: new Date().toISOString(),
  }).eq("id", p.id).eq("status", "OPEN");
  await logEvent(sb, p.id, "CLOSED", reason, { exit, pnl });
  await topstepClose(sb, cfg as any, p, reason);
  return { id: p.id, action: "CLOSED", reason, exit, pnl };
}

/**
 * Keep TopstepX in lockstep with internal state, retrying on every tick:
 *  - any internal position closed elsewhere (reversal, manual) gets flattened
 *  - any stop price drift gets pushed to the TopstepX stop order
 */
async function reconcileTopstep(sb: SB, cfg: any) {
  if (!cfg.topstep_enabled) return;
  // 1. Closed internally but still mirrored -> flatten.
  const { data: stale } = await sb
    .from("paper_positions").select("*")
    .eq("status", "CLOSED")
    .not("topstep_order_id", "is", null)
    .order("closed_at", { ascending: false }).limit(10);
  for (const raw of (stale ?? []) as Position[]) {
    const ids = (raw.topstep_position_ids ?? {}) as Record<string, any>;
    if (ids.entryOrderId && !ids.flattened) {
      await topstepClose(sb, cfg, raw, "reconcile: internal position closed");
    }
  }
}

/** Push a new stop price to the mirrored TopstepX stop order (idempotent). */
async function syncTopstepStop(sb: SB, cfg: any, p: Position, newStop: number) {
  const ids = (p.topstep_position_ids ?? {}) as Record<string, any>;
  if (!ids.stopOrderId || ids.flattened) return;
  if (Number(ids.syncedStop) === newStop) return;
  const res = await topstep(sb, cfg, p.id, {
    action: "sync_stop",
    stop_order_id: ids.stopOrderId,
    stop_price: newStop,
  });
  if (res?.ok) {
    await sb.from("paper_positions")
      .update({ topstep_position_ids: { ...ids, syncedStop: newStop } })
      .eq("id", p.id);
  }
}

/**
 * Per-tick risk guard. Runs BEFORE any new entry, every minute.
 *  - hard 5-hour max hold (force flatten)
 *  - stop / target fills
 *  - profit lock at profit_lock_rr, then one-way trailing stop
 */
async function riskGuard(sb: SB, cfg: AgentConfig, price: number | null) {
  const actions: unknown[] = [];
  await reconcileTopstep(sb, cfg as any);
  const { data: positions } = await sb
    .from("paper_positions").select("*").eq("status", "OPEN");
  for (const raw of (positions ?? []) as Position[]) {
    const p = raw;
    // Retry any pending stop sync (e.g. a reversal tighten applied by agent-strategy).
    await syncTopstepStop(sb, cfg as any, p, Number(p.stop_price));
    // 1. Optional max-hold flatten. 0 / null / negative = DISABLED (no time exit).
    const maxHold = Number(cfg.max_hold_minutes);
    if (Number.isFinite(maxHold) && maxHold > 0) {
      const heldMin = (Date.now() - new Date(p.opened_at).getTime()) / 60_000;
      if (heldMin >= maxHold) {
        actions.push(await closePosition(
          sb, cfg, p, price ?? p.entry_price,
          `max hold ${maxHold}m reached (${Math.round(heldMin)}m)`,
        ));
        continue;
      }
    }
    if (price == null) continue;

    // 2. Kill switch flattens immediately.
    if (cfg.kill_switch) {
      actions.push(await closePosition(sb, cfg, p, price, "kill switch"));
      continue;
    }

    const long = p.side === "LONG";
    // 3. Bracket fills.
    if (long ? price <= p.stop_price : price >= p.stop_price) {
      actions.push(await closePosition(sb, cfg, p, p.stop_price, p.lock_active ? "trailing stop" : "stop loss"));
      continue;
    }
    if (long ? price >= p.target_price : price <= p.target_price) {
      actions.push(await closePosition(sb, cfg, p, p.target_price, "target"));
      continue;
    }

    // 4. Profit lock + trail.
    const risk = Math.abs(p.entry_price - p.initial_stop);
    if (risk <= 0) continue;
    const openR = (long ? price - p.entry_price : p.entry_price - price) / risk;
    if (openR < Number(cfg.profit_lock_rr)) continue;

    const lockOffset = cfg.profit_lock_ticks * Number(cfg.tick_size);
    const lockFloor = long ? p.entry_price + lockOffset : p.entry_price - lockOffset;
    const trail = long ? price - risk : price + risk;
    const candidate = long ? Math.max(lockFloor, trail) : Math.min(lockFloor, trail);
    // Ratchet only: never move the stop backward or into a loss.
    const newStop = long
      ? Math.max(p.stop_price, candidate)
      : Math.min(p.stop_price, candidate);
    const inProfit = long ? newStop > p.entry_price : newStop < p.entry_price;
    if (!inProfit) continue;
    if (newStop === p.stop_price) continue;

    await sb.from("paper_positions")
      .update({ stop_price: newStop, lock_active: true })
      .eq("id", p.id).eq("status", "OPEN");
    await syncTopstepStop(sb, cfg as any, p, newStop);
    await logEvent(
      sb, p.id, p.lock_active ? "STOP_TRAILED" : "PROFIT_LOCKED",
      `stop ${p.stop_price} -> ${newStop} at ${openR.toFixed(2)}R`,
      { from: p.stop_price, to: newStop, openR, price },
    );
    actions.push({ id: p.id, action: p.lock_active ? "STOP_TRAILED" : "PROFIT_LOCKED", newStop });
  }
  return actions;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = admin();
    const cfg = await loadConfig(sb);
    const body = await req.json().catch(() => ({}));
    const price: number | null = Number.isFinite(body.price) ? Number(body.price) : null;

    const guardActions = await riskGuard(sb, cfg, price);

    const d = body.decision;
    if (!d || d.decision === "HOLD") {
      return json({ ok: true, opened: null, guardActions });
    }
    if (cfg.kill_switch) return json({ ok: true, opened: null, blocked: "kill switch", guardActions });
    if (!cfg.auto_trade) return json({ ok: true, opened: null, blocked: "auto_trade disabled", guardActions });

    // Never add to an existing position / never two at once.
    const { data: open } = await sb.from("paper_positions").select("id").eq("status", "OPEN").limit(1);
    if (open && open.length) return json({ ok: true, opened: null, blocked: "position already open", guardActions });

    const side = d.decision === "BUY" ? "LONG" : "SHORT";
    const risk = Math.abs(Number(d.entry) - Number(d.stop));
    const riskDollars = Number(cfg.account_balance) * (Number(cfg.risk_per_trade_pct) / 100);
    const perContract = risk * Number(cfg.point_value);
    const contracts = Math.max(1, Math.min(10, Math.floor(riskDollars / Math.max(perContract, 1))));

    // TopstepX is the ONLY execution venue: place the live SIM order FIRST.
    // No fill on TopstepX => no ledger row, signal stays unconsumed for retry.
    if (!(cfg as any).topstep_enabled) {
      return json({ ok: true, opened: null, blocked: "topstep_enabled=false", guardActions });
    }
    const size = Math.max(1, Number((cfg as any).contracts_per_trade ?? 1));
    const topstepRes = await topstep(sb, cfg as any, null, {
      action: "open",
      side,
      size,
      stop_price: Number(d.stop),
      target_price: Number(d.target),
    });
    if (!topstepRes?.ok || !topstepRes?.entryOrderId) {
      await logEvent(sb, null, "TOPSTEP_ERROR",
        `entry aborted — TopstepX order not placed: ${topstepRes?.error ?? "no response"}`,
        { side, size, entry: d.entry, stop: d.stop, target: d.target, tv_signal_id: d.tv_signal_id ?? null });
      return json({
        ok: true, opened: null,
        blocked: `topstep order failed: ${topstepRes?.error ?? "no response"}`,
        guardActions,
      });
    }

    const { data: inserted, error } = await sb.from("paper_positions").insert({
      symbol: cfg.paper_symbol,
      side,
      contracts: size,
      entry_price: Number(d.entry),
      stop_price: Number(d.stop),
      target_price: Number(d.target),
      initial_stop: Number(d.stop),
      zone_key: d.zone_key ?? null,
      decision_id: body.decision_id ?? null,
      topstep_order_id: String(topstepRes.entryOrderId),
      topstep_position_ids: {
        accountId: topstepRes.account?.id,
        accountName: topstepRes.account?.name,
        contractId: topstepRes.contract?.id,
        entryOrderId: topstepRes.entryOrderId,
        stopOrderId: topstepRes.stopOrderId ?? null,
        targetOrderId: topstepRes.targetOrderId ?? null,
        syncedStop: Number(d.stop),
      },
    }).select("id").single();
    if (error) throw new Error(`open failed: ${error.message}`);

    await logEvent(sb, inserted.id, "OPENED",
      `${side} ${size} ${topstepRes.contract?.name ?? cfg.paper_symbol} on ${topstepRes.account?.name} (${d.source})`, {
        entry: d.entry, stop: d.stop, target: d.target, rr: d.rr, source: d.source,
        tv_signal_id: d.tv_signal_id, topstep: topstepRes,
        risk_sized_contracts: contracts,
      });

    if (d.tv_signal_id) {
      await sb.from("tradingview_signals")
        .update({ consumed: true, consumed_at: new Date().toISOString(), consume_reason: "entered" })
        .eq("id", d.tv_signal_id);
    }

    return json({
      ok: true,
      opened: { id: inserted.id, side, contracts: size },
      topstep: {
        account: topstepRes.account, contract: topstepRes.contract,
        entryOrderId: topstepRes.entryOrderId,
        stopOrderId: topstepRes.stopOrderId ?? null,
        targetOrderId: topstepRes.targetOrderId ?? null,
      },
      guardActions,
    });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message ?? e) }, 200);
  }
});