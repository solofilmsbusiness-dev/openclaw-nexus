import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { admin, loadConfig, logEvent } from "../_shared/db.ts";
import {
  cancelOrder,
  closeContract,
  modifyOrder,
  placeBracket,
  realizedPnl,
  resolveAccount,
  resolveContract,
} from "../_shared/topstepx.ts";

/**
 * topstepx-executor — mirrors internal paper positions onto a TopstepX
 * (ProjectX Gateway) practice account.
 *
 * actions:
 *   smoke      -> auth + account/contract resolution only, places NO orders
 *   open       -> market entry + stop + target bracket for a paper position
 *   sync_stop  -> modify the live stop order to the new price
 *   close      -> flatten the contract and cancel remaining bracket orders
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sb = admin();
  const body = await req.json().catch(() => ({} as any));
  const action = String(body.action ?? "smoke");
  const positionId: string | null = body.position_id ?? null;

  try {
    const cfg: any = await loadConfig(sb);
    if (!cfg.topstep_enabled && action !== "smoke") {
      return json({ ok: true, skipped: "topstep_enabled=false" });
    }

    const account = await resolveAccount(
      cfg.topstep_account_search ?? "PRAC",
      Boolean(cfg.topstep_allow_non_practice),
    );
    const contract = await resolveContract(cfg.topstep_contract_search ?? "MNQ");
    const base = {
      account: { id: account.id, name: account.name },
      contract: { id: contract.id, name: contract.name, description: contract.description },
    };

    if (action === "smoke") {
      return json({ ok: true, action, ...base, note: "no orders placed" });
    }

    if (action === "open") {
      const size = Math.max(1, Number(body.size ?? cfg.contracts_per_trade ?? 1));
      const result = await placeBracket({
        accountId: account.id,
        contractId: contract.id,
        side: body.side === "SHORT" ? "SHORT" : "LONG",
        size,
        stopPrice: Number(body.stop_price),
        targetPrice: Number(body.target_price),
      });
      if (positionId) {
        await sb.from("paper_positions").update({
          topstep_order_id: String(result.entryOrderId),
          topstep_position_ids: {
            accountId: account.id,
            accountName: account.name,
            contractId: contract.id,
            entryOrderId: result.entryOrderId,
            stopOrderId: result.stopOrderId,
            targetOrderId: result.targetOrderId,
          },
        }).eq("id", positionId);
        await logEvent(sb, positionId, "TOPSTEP_OPENED",
          `TopstepX ${body.side} ${size} ${contract.name} on ${account.name}`,
          { ...base, ...result });
      }
      return json({ ok: true, action, ...base, ...result });
    }

    if (action === "sync_stop") {
      const stopOrderId = Number(body.stop_order_id);
      if (!Number.isFinite(stopOrderId)) throw new Error("stop_order_id missing");
      const r = await modifyOrder(account.id, stopOrderId, { stopPrice: Number(body.stop_price) });
      if (!r.ok) throw new Error(`Order/modify failed: ${JSON.stringify(r.body).slice(0, 300)}`);
      if (positionId) {
        await logEvent(sb, positionId, "TOPSTEP_STOP_SYNCED",
          `TopstepX stop -> ${body.stop_price}`, { stopOrderId, ...base });
      }
      return json({ ok: true, action, stopOrderId, stopPrice: Number(body.stop_price) });
    }

    if (action === "close") {
      const ids = body.topstep_position_ids ?? {};
      const closed = await closeContract(account.id, contract.id);
      const cancels: unknown[] = [];
      for (const key of ["stopOrderId", "targetOrderId"]) {
        const oid = Number(ids[key]);
        if (Number.isFinite(oid)) {
          const c = await cancelOrder(account.id, oid);
          cancels.push({ orderId: oid, ok: c.ok, body: c.body });
        }
      }
      // Realized P/L straight from TopstepX fills (authoritative when present).
      const since = String(body.opened_at ?? new Date(Date.now() - 24 * 3600_000).toISOString());
      const fills = await realizedPnl(account.id, contract.id, since).catch(() => ({
        pnl: null, fills: 0, lastPrice: null,
      }));
      if (positionId) {
        await logEvent(sb, positionId, "TOPSTEP_CLOSED",
          `TopstepX flattened ${contract.name} (${body.reason ?? "n/a"})`,
          { closed: closed.body, cancels, fills, ...base });
      }
      return json({ ok: closed.ok, action, closed: closed.body, cancels, fills });
    }

    return json({ ok: false, error: `unknown action "${action}"` });
  } catch (e) {
    const message = String((e as Error).message ?? e);
    console.error("[topstepx-executor]", message);
    await logEvent(sb, positionId, "TOPSTEP_ERROR", `${action}: ${message}`, {
      action, detail: (e as any)?.detail ?? null,
    }).catch(() => {});
    return json({ ok: false, action, error: message }, 200);
  }
});