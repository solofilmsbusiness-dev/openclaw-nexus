import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { admin, callFn, loadConfig } from "../_shared/db.ts";

/** agent-cron — every-minute scheduler entry point. Fires one agent-tick. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const cfg = await loadConfig(admin());
    if (cfg.kill_switch) return json({ ok: true, skipped: "kill switch active" });
    const result = await callFn<unknown>("agent-tick", { via: "cron" });
    return json({ ok: true, result });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message ?? e) }, 200);
  }
});