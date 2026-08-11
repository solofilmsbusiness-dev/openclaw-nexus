/**
 * TopstepX / ProjectX Gateway API client.
 * Base: https://api.topstepx.com
 * Auth: POST /api/Auth/loginKey {userName, apiKey} -> session JWT (~24h).
 *
 * SAFETY: resolveAccount() refuses any account whose name does not contain
 * 'PRAC' unless allowNonPractice is explicitly true.
 */

export const TOPSTEP_BASE = "https://api.topstepx.com";

let cachedToken: string | null = null;
let cachedAt = 0;

export interface TsResult<T = unknown> {
  ok: boolean;
  status: number;
  body: T;
}

export class TopstepError extends Error {
  constructor(message: string, public detail?: unknown) {
    super(message);
    this.name = "TopstepError";
  }
}

async function login(): Promise<string> {
  const userName = Deno.env.get("PROJECTX_USERNAME");
  const apiKey = Deno.env.get("PROJECTX_API_KEY");
  if (!userName || !apiKey) {
    throw new TopstepError("PROJECTX_USERNAME / PROJECTX_API_KEY not configured");
  }
  const res = await fetch(`${TOPSTEP_BASE}/api/Auth/loginKey`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/plain" },
    body: JSON.stringify({ userName, apiKey }),
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  console.log(`[topstepx] loginKey ${res.status}`, JSON.stringify(body).slice(0, 500));
  if (!res.ok || !body?.token) {
    throw new TopstepError(`loginKey failed (${res.status})`, body);
  }
  cachedToken = body.token as string;
  cachedAt = Date.now();
  return cachedToken;
}

async function token(force = false): Promise<string> {
  // Re-auth proactively after 12h; JWT lives ~24h.
  if (force || !cachedToken || Date.now() - cachedAt > 12 * 60 * 60 * 1000) {
    return await login();
  }
  return cachedToken;
}

/** POST a ProjectX endpoint with bearer auth, one 401 re-login retry and one rate-limit retry. */
export async function tsPost<T = any>(path: string, body: unknown): Promise<TsResult<T>> {
  let attempt = 0;
  let forceLogin = false;
  for (;;) {
    attempt++;
    const jwt = await token(forceLogin);
    const res = await fetch(`${TOPSTEP_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/plain",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(body ?? {}),
    });
    const text = await res.text();
    let parsed: any;
    try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
    console.log(`[topstepx] POST ${path} -> ${res.status} ${JSON.stringify(parsed).slice(0, 800)}`);

    if (res.status === 401 && attempt === 1) { forceLogin = true; cachedToken = null; continue; }
    if (res.status === 429 && attempt <= 2) { await new Promise((r) => setTimeout(r, 1200)); continue; }

    return { ok: res.ok && parsed?.success !== false, status: res.status, body: parsed as T };
  }
}

export interface TsAccount { id: number; name: string; balance?: number; canTrade?: boolean; simulated?: boolean }
export interface TsContract { id: string; name: string; description?: string; tickSize?: number }

/** Resolve the trading account. Hard PRAC-only guard. */
export async function resolveAccount(
  search: string,
  allowNonPractice: boolean,
): Promise<TsAccount> {
  const r = await tsPost<{ accounts?: TsAccount[] }>("/api/Account/search", { onlyActiveAccounts: true });
  const accounts = r.body?.accounts ?? [];
  if (!r.ok || !accounts.length) throw new TopstepError("Account/search returned no accounts", r.body);

  const needle = (search || "PRAC").toUpperCase();
  const match = accounts.find((a) => (a.name ?? "").toUpperCase().includes(needle));
  if (!match) {
    throw new TopstepError(
      `no account name contains "${search}"`,
      accounts.map((a) => a.name),
    );
  }
  // HARD SAFETY CHECK — practice accounts only.
  if (!match.name.toUpperCase().includes("PRAC") && !allowNonPractice) {
    throw new TopstepError(
      `refusing to trade non-practice account "${match.name}" (topstep_allow_non_practice=false)`,
    );
  }
  return match;
}

export async function resolveContract(search: string): Promise<TsContract> {
  const r = await tsPost<{ contracts?: TsContract[] }>("/api/Contract/search", {
    live: false,
    searchText: search || "MNQ",
  });
  const contracts = r.body?.contracts ?? [];
  if (!r.ok || !contracts.length) throw new TopstepError(`Contract/search found nothing for "${search}"`, r.body);
  // Prefer the exact front-month symbol (shortest name containing the search text).
  const needle = (search || "MNQ").toUpperCase();
  const filtered = contracts.filter((c) => (c.name ?? "").toUpperCase().includes(needle));
  const list = filtered.length ? filtered : contracts;
  list.sort((a, b) => (a.name ?? "").length - (b.name ?? "").length);
  return list[0];
}

export const SIDE = { BUY: 0, SELL: 1 } as const;
export const ORDER_TYPE = { LIMIT: 1, MARKET: 2, STOP: 4 } as const;

export async function placeOrder(payload: Record<string, unknown>) {
  return await tsPost<{ orderId?: number; success?: boolean; errorMessage?: string }>(
    "/api/Order/place",
    payload,
  );
}

export async function modifyOrder(accountId: number, orderId: number, patch: Record<string, unknown>) {
  return await tsPost("/api/Order/modify", { accountId, orderId, ...patch });
}

export async function cancelOrder(accountId: number, orderId: number) {
  return await tsPost("/api/Order/cancel", { accountId, orderId });
}

export async function closeContract(accountId: number, contractId: string) {
  return await tsPost("/api/Position/closeContract", { accountId, contractId });
}

/** Market entry + protective stop + limit target. Returns whatever succeeded. */
export async function placeBracket(opts: {
  accountId: number;
  contractId: string;
  side: "LONG" | "SHORT";
  size: number;
  stopPrice: number;
  targetPrice: number;
}) {
  const { accountId, contractId, side, size, stopPrice, targetPrice } = opts;
  const entrySide = side === "LONG" ? SIDE.BUY : SIDE.SELL;
  const exitSide = side === "LONG" ? SIDE.SELL : SIDE.BUY;

  const entry = await placeOrder({
    accountId, contractId, type: ORDER_TYPE.MARKET, side: entrySide, size,
    customTag: `solo-entry-${Date.now()}`,
  });
  if (!entry.ok || !entry.body?.orderId) {
    throw new TopstepError("entry order rejected", entry.body);
  }
  const entryOrderId = entry.body.orderId;

  const stop = await placeOrder({
    accountId, contractId, type: ORDER_TYPE.STOP, side: exitSide, size,
    stopPrice, linkedOrderId: entryOrderId, customTag: `solo-stop-${entryOrderId}`,
  });
  const target = await placeOrder({
    accountId, contractId, type: ORDER_TYPE.LIMIT, side: exitSide, size,
    limitPrice: targetPrice, linkedOrderId: entryOrderId, customTag: `solo-tgt-${entryOrderId}`,
  });

  return {
    entryOrderId,
    stopOrderId: stop.body?.orderId ?? null,
    targetOrderId: target.body?.orderId ?? null,
    stopError: stop.ok ? null : stop.body,
    targetError: target.ok ? null : target.body,
  };
}