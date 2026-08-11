import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { admin, loadConfig, logEvent, type AgentConfig } from "../_shared/db.ts";

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
  return { id: p.id, action: "CLOSED", reason, exit, pnl };
}

/**
 * Per-tick risk guard. Runs BEFORE any new entry, every minute.
 *  - hard 5-hour max hold (force flatten)
 *  - stop / target fills
 *  - profit lock at profit_lock_rr, then one-way trailing stop
 */
async function riskGuard(sb: SB, cfg: AgentConfig, price: number | null) {
  const actions: unknown[] = [];
  const { data: positions } = await sb
    .from("paper_positions").select("*").eq("status", "OPEN");
  for (const raw of (positions ?? []) as Position[]) {
    const p = raw;
    const heldMin = (Date.now() - new Date(p.opened_at).getTime()) / 60_000;

    // 1. Hard max-hold flatten — always wins, regardless of P/L.
    if (heldMin >= cfg.max_hold_minutes) {
      actions.push(await closePosition(
        sb, cfg, p, price ?? p.entry_price,
        `max hold ${cfg.max_hold_minutes}m reached (${Math.round(heldMin)}m)`,
      ));
      continue;
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

    const { data: inserted, error } = await sb.from("paper_positions").insert({
      symbol: cfg.paper_symbol,
      side,
      contracts,
      entry_price: Number(d.entry),
      stop_price: Number(d.stop),
      target_price: Number(d.target),
      initial_stop: Number(d.stop),
      zone_key: d.zone_key ?? null,
      decision_id: body.decision_id ?? null,
    }).select("id").single();
    if (error) throw new Error(`open failed: ${error.message}`);

    await logEvent(sb, inserted.id, "OPENED", `${side} ${contracts} ${cfg.paper_symbol} (${d.source})`, {
      entry: d.entry, stop: d.stop, target: d.target, rr: d.rr, source: d.source, tv_signal_id: d.tv_signal_id,
    });
    if (d.tv_signal_id) {
      await sb.from("tradingview_signals")
        .update({ consumed: true, consumed_at: new Date().toISOString(), consume_reason: "entered" })
        .eq("id", d.tv_signal_id);
    }

    return json({ ok: true, opened: { id: inserted.id, side, contracts }, guardActions });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message ?? e) }, 200);
  }
});