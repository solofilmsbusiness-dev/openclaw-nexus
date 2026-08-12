/**
 * Plain-language helpers shared by every agent surface.
 * Pure formatting — no data fetching, no trading logic.
 */

export const BRT_STEPS = ["zone", "break", "retest", "ifvg", "trigger"] as const;
export type BrtStep = (typeof BRT_STEPS)[number];

export const STEP_META: Record<BrtStep, { n: number; label: string; tip: string }> = {
  zone: {
    n: 1,
    label: "Zone",
    tip: "A higher-timeframe support/resistance area price has already reacted from at least twice.",
  },
  break: {
    n: 2,
    label: "Break",
    tip: "A momentum candle that closes fully outside the zone — wicks alone don't count.",
  },
  retest: {
    n: 3,
    label: "Retest",
    tip: "Price pulls back into the broken zone (level flip) and shows indecision instead of ripping through.",
  },
  ifvg: {
    n: 4,
    label: "IFVG",
    tip: "An Inverse Fair Value Gap inside the zone — the 3-candle imbalance that defines entry and stop.",
  },
  trigger: {
    n: 5,
    label: "Trigger",
    tip: "A retest wick tabs at least 50% into the IFVG (the Gann midpoint) — the entry signal.",
  },
};

/** Human wording for the raw reason strings the strategy function writes. */
export function humanReason(reason?: string | null, decision?: string | null): string {
  const r = (reason ?? "").trim();
  if (!r) return decision === "HOLD" ? "Waiting — no valid setup yet" : "";
  const lower = r.toLowerCase();

  const missing = lower.match(/(?:blocked at step|missing|no)\s*[: ]\s*(zone|break|retest|ifvg|trigger)/);
  if (missing) {
    const step = missing[1] as BrtStep;
    return `Waiting — no valid setup (missing ${STEP_META[step].label.toUpperCase()}: ${STEP_META[step].tip.toLowerCase()})`;
  }

  const map: [RegExp, string][] = [
    [/news/, "Standing aside — news blackout window"],
    [/kill.?switch/, "Kill switch is on — no new entries"],
    [/auto.?trade/, "Observing only — auto-trade is off"],
    [/daily (profit|loss)/, "Done for the day — daily limit reached"],
    [/conflicting signals/, "Two opposite signals arrived at once — standing aside"],
    [/reversal.?warning/, "Opposite signal while in a trade — protecting the position instead of flipping"],
    [/htf|bias/, "Setup did not agree with the higher-timeframe trend"],
    [/min.?rr|reward/, "Reward-to-risk was below the minimum"],
    [/max.?stop/, "Stop distance was too wide"],
    [/expired|ttl/, "Indicator signal was too old to use"],
    [/no (fresh )?signal/, "No fresh indicator signal"],
    [/one setup per zone/, "This zone already produced its one setup this session"],
  ];
  for (const [re, text] of map) if (re.test(lower)) return text;
  return r.charAt(0).toUpperCase() + r.slice(1);
}

/** "2 min ago" style timestamps. */
export function relTime(input: string | number | Date): string {
  const t = new Date(input).getTime();
  const diff = Date.now() - t;
  if (!Number.isFinite(t)) return "—";
  const s = Math.round(diff / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function clockTime(input: string | number | Date): string {
  return new Date(input).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtMoney(n: number, withSign = true): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${withSign ? sign : ""}$${Math.abs(n).toFixed(2)}`;
}

/** App-wide colour language: green = long/profit, red = short/loss, amber = warning, gray = idle. */
export type Tone = "long" | "short" | "warn" | "idle" | "info";
export const TONE_TEXT: Record<Tone, string> = {
  long: "text-neon-green",
  short: "text-neon-red",
  warn: "text-neon-orange",
  idle: "text-muted-foreground",
  info: "text-primary",
};
export const TONE_BORDER: Record<Tone, string> = {
  long: "border-neon-green/40 bg-neon-green/10",
  short: "border-neon-red/40 bg-neon-red/10",
  warn: "border-neon-orange/40 bg-neon-orange/10",
  idle: "border-border bg-muted/30",
  info: "border-primary/40 bg-primary/10",
};