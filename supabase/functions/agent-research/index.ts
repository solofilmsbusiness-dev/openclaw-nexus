import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { admin, loadConfig } from "../_shared/db.ts";
import { fetchBars, lastPrice, setProvider, type Bar } from "../_shared/bars.ts";
import {
  atr,
  detectBreak,
  detectIFVG,
  detectRetest,
  entryTrigger,
  findZones,
  htfBias,
  nextLiquidity,
  type Zone,
} from "../_shared/brt.ts";

/**
 * agent-research — deterministic market structure pass.
 * Returns the raw BRT observations; it makes no trading decision.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = admin();
    const cfg = await loadConfig(sb);

    const provider = setProvider(cfg.data_provider);
    const proxy = cfg.data_proxy_symbol || "NQ=F";
    const [htf, ltfEntry, ltfStructure] = await Promise.all([
      fetchBars(proxy, cfg.htf_timeframe || "4h"),
      fetchBars(proxy, cfg.ltf_timeframe || "5m"),
      fetchBars(proxy, "15m"),
    ]);

    const bias = htfBias(htf);
    const zones = findZones(htf, cfg.min_zone_touches);
    const price = lastPrice(ltfEntry);

    const setups = zones.map((zone: Zone) => {
      const brk = detectBreak(ltfStructure, zone, cfg.require_volume_expansion);
      if (!brk) {
        return { zone, steps: { zone: true, break: false, retest: false, ifvg: false, trigger: false } };
      }
      const retest = detectRetest(ltfStructure, zone, brk);
      if (!retest.reentered || retest.rippedThrough) {
        return {
          zone,
          brk,
          retest,
          steps: { zone: true, break: true, retest: false, ifvg: false, trigger: false },
        };
      }
      const ifvg = detectIFVG(ltfEntry, Math.max(0, ltfEntry.length - 80), brk.dir);
      if (!ifvg) {
        return {
          zone,
          brk,
          retest,
          steps: { zone: true, break: true, retest: true, ifvg: false, trigger: false },
        };
      }
      const trig = entryTrigger(ltfEntry, ifvg, brk.dir);
      const entry = trig.price ?? ifvg.mid;
      const target = nextLiquidity(ltfStructure, entry, brk.dir);
      return {
        zone,
        brk,
        retest,
        ifvg,
        gann50: ifvg.mid,
        trigger: trig,
        proposedEntry: entry,
        proposedTarget: target,
        steps: {
          zone: true,
          break: true,
          retest: retest.indecision,
          ifvg: true,
          trigger: trig.triggered,
        },
      };
    });

    const summarize = (bars: Bar[]) => ({
      count: bars.length,
      last: bars.length ? bars[bars.length - 1] : null,
    });

    return json({
      ok: true,
      symbol: cfg.symbol,
      provider,
      proxySymbol: proxy,
      proxyPrice: price,
      htfTimeframe: cfg.htf_timeframe,
      ltfTimeframe: cfg.ltf_timeframe,
      htfBias: bias,
      zones,
      setups,
      bars: { htf: summarize(htf), ltf: summarize(ltfEntry), structure: summarize(ltfStructure) },
    });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message ?? e) }, 200);
  }
});