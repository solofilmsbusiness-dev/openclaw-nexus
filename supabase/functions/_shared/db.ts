import { createClient } from "npm:@supabase/supabase-js@2";

export function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export interface AgentConfig {
  id: string;
  symbol: string;
  paper_symbol: string;
  htf_timeframe: string;
  ltf_timeframe: string;
  min_zone_touches: number;
  require_volume_expansion: boolean;
  min_rr: number;
  profit_lock_rr: number;
  profit_lock_ticks: number;
  max_hold_minutes: number;
  one_setup_per_zone_session: boolean;
  avoid_news_minutes: number;
  auto_trade: boolean;
  daily_profit_target: number;
  daily_loss_limit: number;
  account_balance: number;
  risk_per_trade_pct: number;
  tick_size: number;
  point_value: number;
  data_provider: string;
  data_proxy_symbol: string;
  tv_signal_ttl_minutes: number;
  tv_confluence_required: boolean;
  max_stop_ticks: number;
  kill_switch: boolean;
}

export async function loadConfig(
  sb: ReturnType<typeof admin>,
): Promise<AgentConfig> {
  const { data, error } = await sb
    .from("agent_config")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw new Error(`config load failed: ${error.message}`);
  if (!data) throw new Error("agent_config 'default' row missing");
  return data as AgentConfig;
}

/** Invoke a sibling edge function server-to-server with the service role. */
export async function callFn<T>(name: string, body: unknown): Promise<T> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${name} returned non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(`${name} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return parsed as T;
}

export async function logEvent(
  sb: ReturnType<typeof admin>,
  positionId: string | null,
  eventType: string,
  note: string,
  details: Record<string, unknown> = {},
) {
  await sb.from("trade_events").insert({
    position_id: positionId,
    event_type: eventType,
    note,
    details,
  });
}