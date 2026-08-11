import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { admin, callFn } from "../_shared/db.ts";

/**
 * agent-tick — one full BRT cycle: research -> strategy -> execute.
 * Every decision, including HOLDs, is written to agent_decisions.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sb = admin();
  try {
    const research = await callFn<any>("agent-research", {});
    const decision = await callFn<any>("agent-strategy", { research });

    if (!decision?.ok) throw new Error(decision?.error ?? "strategy failed");

    const { data: logged } = await sb.from("agent_decisions").insert({
      decision: decision.decision ?? "HOLD",
      symbol: research?.symbol ?? "NQ",
      reason: decision.reason ?? null,
      steps_passed: decision.steps_passed ?? {},
      htf_bias: decision.htf_bias ?? research?.htfBias ?? null,
      entry: decision.entry ?? null,
      stop: decision.stop ?? null,
      target: decision.target ?? null,
      rr: decision.rr ?? null,
      source: decision.source ?? "brt",
      tv_signal_id: decision.tv_signal_id ?? null,
      snapshot: {
        proxySymbol: research?.proxySymbol,
        proxyPrice: research?.proxyPrice,
        zones: research?.zones,
        aiNote: decision.ai_note ?? null,
      },
    }).select("id").single();

    const exec = await callFn<any>("agent-execute", {
      decision,
      decision_id: logged?.id ?? null,
      price: research?.proxyPrice ?? null,
    });

    return json({ ok: true, decision: decision.decision, reason: decision.reason, exec });
  } catch (e) {
    const message = String((e as Error).message ?? e);
    await sb.from("agent_decisions").insert({
      decision: "HOLD",
      symbol: "NQ",
      reason: `tick error: ${message}`,
      steps_passed: {},
      source: "brt",
    });
    return json({ ok: false, error: message }, 200);
  }
});