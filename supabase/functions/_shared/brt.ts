import type { Bar } from "./bars.ts";

export type Dir = "long" | "short";
export type Bias = "up" | "down" | "none";

export interface Zone {
  high: number;
  low: number;
  touches: number;
  kind: "support" | "resistance";
  lastTouchIdx: number;
}

export interface BreakInfo {
  idx: number;
  dir: Dir;
  closedOutside: true;
  volumeExpansion: boolean;
  closePrice: number;
}

export interface RetestInfo {
  reentered: boolean;
  indecision: boolean;
  rippedThrough: boolean;
  idx: number | null;
}

export interface IFVG {
  high: number;
  low: number;
  mid: number;
  idx: number;
  inverted: boolean;
  gapDir: Dir; // direction of the original gap
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/* ------------------------------------------------------------------ *
 * Step 1 — HTF supply/demand zones with >= minTouches reactions
 * ------------------------------------------------------------------ */
export function findSwings(bars: Bar[], lb = 2) {
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = lb; i < bars.length - lb; i++) {
    const w = bars.slice(i - lb, i + lb + 1);
    if (bars[i].h === Math.max(...w.map((b) => b.h))) highs.push(i);
    if (bars[i].l === Math.min(...w.map((b) => b.l))) lows.push(i);
  }
  return { highs, lows };
}

export function findZones(bars: Bar[], minTouches: number): Zone[] {
  if (bars.length < 20) return [];
  const { highs, lows } = findSwings(bars);
  const atr = avg(bars.slice(-20).map((b) => b.h - b.l));
  const tol = Math.max(atr * 0.5, bars[bars.length - 1].c * 0.0015);

  const build = (idxs: number[], kind: Zone["kind"]): Zone[] => {
    const pts = idxs.map((i) => ({ i, p: kind === "resistance" ? bars[i].h : bars[i].l }));
    const used = new Set<number>();
    const zones: Zone[] = [];
    for (let a = 0; a < pts.length; a++) {
      if (used.has(a)) continue;
      const cluster = [pts[a]];
      for (let b = a + 1; b < pts.length; b++) {
        if (used.has(b)) continue;
        if (Math.abs(pts[b].p - pts[a].p) <= tol) {
          cluster.push(pts[b]);
          used.add(b);
        }
      }
      used.add(a);
      if (cluster.length < minTouches) continue;
      zones.push({
        high: Math.max(...cluster.map((c) => c.p)),
        low: Math.min(...cluster.map((c) => c.p)),
        touches: cluster.length,
        kind,
        lastTouchIdx: Math.max(...cluster.map((c) => c.i)),
      });
    }
    return zones;
  };

  return [...build(highs, "resistance"), ...build(lows, "support")]
    .map((z) => (z.high === z.low ? { ...z, high: z.high + tol / 2, low: z.low - tol / 2 } : z))
    .sort((a, b) => b.touches - a.touches || b.lastTouchIdx - a.lastTouchIdx)
    .slice(0, 6);
}

/* ------------------------------------------------------------------ *
 * HTF bias — structure (higher highs/lows) confirmed by EMA slope
 * ------------------------------------------------------------------ */
function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  for (const v of values) {
    prev = v * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function htfBias(bars: Bar[]): Bias {
  if (bars.length < 60) return "none";
  const closes = bars.map((b) => b.c);
  const fast = ema(closes, 20);
  const slow = ema(closes, 50);
  const f = fast[fast.length - 1];
  const s = slow[slow.length - 1];
  const { highs, lows } = findSwings(bars, 3);
  const lastHighs = highs.slice(-2).map((i) => bars[i].h);
  const lastLows = lows.slice(-2).map((i) => bars[i].l);
  const hh = lastHighs.length === 2 && lastHighs[1] > lastHighs[0];
  const hl = lastLows.length === 2 && lastLows[1] > lastLows[0];
  const lh = lastHighs.length === 2 && lastHighs[1] < lastHighs[0];
  const ll = lastLows.length === 2 && lastLows[1] < lastLows[0];
  if (f > s && (hh || hl)) return "up";
  if (f < s && (lh || ll)) return "down";
  return "none";
}

/* ------------------------------------------------------------------ *
 * Step 2 — Break: candle CLOSES fully outside the zone (wicks ignored)
 * ------------------------------------------------------------------ */
export function detectBreak(
  bars: Bar[],
  zone: Zone,
  requireVolumeExpansion: boolean,
  lookback = 60,
): BreakInfo | null {
  const start = Math.max(1, bars.length - lookback);
  for (let i = bars.length - 1; i >= start; i--) {
    const b = bars[i];
    const volWindow = bars.slice(Math.max(0, i - 20), i);
    const volExp = volWindow.length > 0 && b.v > avg(volWindow.map((x) => x.v)) * 1.2;
    const body = Math.abs(b.c - b.o);
    const momentum = body > avg(bars.slice(Math.max(0, i - 20), i).map((x) => Math.abs(x.c - x.o)));
    if (!momentum) continue;
    if (requireVolumeExpansion && !volExp) continue;
    if (b.c > zone.high && b.o <= zone.high) {
      return { idx: i, dir: "long", closedOutside: true, volumeExpansion: volExp, closePrice: b.c };
    }
    if (b.c < zone.low && b.o >= zone.low) {
      return { idx: i, dir: "short", closedOutside: true, volumeExpansion: volExp, closePrice: b.c };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Step 3 — Retest: price re-enters the broken zone with indecision
 * ------------------------------------------------------------------ */
export function detectRetest(bars: Bar[], zone: Zone, brk: BreakInfo): RetestInfo {
  let idx: number | null = null;
  for (let i = brk.idx + 1; i < bars.length; i++) {
    const b = bars[i];
    const inZone = b.h >= zone.low && b.l <= zone.high;
    if (inZone) {
      idx = i;
      break;
    }
  }
  if (idx === null) return { reentered: false, indecision: false, rippedThrough: false, idx: null };

  // Ripped straight through = closed on the far side of the zone after re-entry.
  const after = bars.slice(idx);
  const ripped = brk.dir === "long"
    ? after.some((b) => b.c < zone.low)
    : after.some((b) => b.c > zone.high);

  // Indecision = doji or inside bar within the retest window.
  const window = bars.slice(idx, Math.min(bars.length, idx + 6));
  const indecision = window.some((b, k) => {
    const range = b.h - b.l;
    const doji = range > 0 && Math.abs(b.c - b.o) / range < 0.35;
    const prev = bars[idx! + k - 1];
    const inside = prev ? b.h <= prev.h && b.l >= prev.l : false;
    return doji || inside;
  });

  return { reentered: true, indecision, rippedThrough: ripped, idx };
}

/* ------------------------------------------------------------------ *
 * Step 4 — IFVG: 3-candle gap the middle wick never fills, later inverted
 * ------------------------------------------------------------------ */
export function detectIFVG(bars: Bar[], fromIdx: number, wantDir: Dir): IFVG | null {
  let best: IFVG | null = null;
  for (let i = Math.max(2, fromIdx); i < bars.length; i++) {
    const c1 = bars[i - 2];
    const c2 = bars[i - 1];
    const c3 = bars[i];

    // Bullish gap: c1.high below c3.low, middle wick does not fill it.
    if (c1.h < c3.l && c2.l > c1.h && c2.h < c3.l === false) {
      // middle candle must not close the gap with its wick
    }
    let low: number | null = null;
    let high: number | null = null;
    let gapDir: Dir | null = null;
    if (c1.h < c3.l && !(c2.l <= c1.h)) {
      low = c1.h;
      high = c3.l;
      gapDir = "long";
    } else if (c1.l > c3.h && !(c2.h >= c1.l)) {
      low = c3.h;
      high = c1.l;
      gapDir = "short";
    }
    if (low === null || high === null || gapDir === null || high <= low) continue;

    // Inversion: a later candle CLOSES through the gap, flipping its polarity.
    const after = bars.slice(i + 1);
    const inverted = gapDir === "long"
      ? after.some((b) => b.c < low!)
      : after.some((b) => b.c > high!);

    // For a long setup we want a bearish gap that got inverted into support
    // (and vice-versa). Un-inverted gaps in the trade direction are fallbacks.
    const usable = inverted && gapDir !== wantDir;
    const candidate: IFVG = {
      high,
      low,
      mid: (high + low) / 2,
      idx: i,
      inverted,
      gapDir,
    };
    if (usable) best = candidate;
    else if (!best) best = candidate.inverted ? candidate : best;
  }
  return best && best.inverted ? best : null;
}

/* ------------------------------------------------------------------ *
 * Step 5 — Entry trigger: a wick tabs >= 50% into the IFVG
 * ------------------------------------------------------------------ */
export function entryTrigger(bars: Bar[], ifvg: IFVG, dir: Dir, lookback = 6) {
  const window = bars.slice(-lookback);
  for (let i = window.length - 1; i >= 0; i--) {
    const b = window[i];
    if (dir === "long") {
      // Long: price dips down into the IFVG from above; wick must reach the mid.
      if (b.l <= ifvg.mid && b.l >= ifvg.low - (ifvg.high - ifvg.low)) {
        return { triggered: true, price: Math.max(b.c, ifvg.mid), wick: b.l };
      }
    } else {
      if (b.h >= ifvg.mid && b.h <= ifvg.high + (ifvg.high - ifvg.low)) {
        return { triggered: true, price: Math.min(b.c, ifvg.mid), wick: b.h };
      }
    }
  }
  return { triggered: false, price: null as number | null, wick: null as number | null };
}

/* ------------------------------------------------------------------ *
 * Target: next liquidity pool (swing high/low) beyond entry
 * ------------------------------------------------------------------ */
export function nextLiquidity(bars: Bar[], entry: number, dir: Dir): number | null {
  const { highs, lows } = findSwings(bars, 3);
  if (dir === "long") {
    const cands = highs.map((i) => bars[i].h).filter((p) => p > entry).sort((a, b) => a - b);
    return cands[0] ?? null;
  }
  const cands = lows.map((i) => bars[i].l).filter((p) => p < entry).sort((a, b) => b - a);
  return cands[0] ?? null;
}

export function rr(entry: number, stop: number, target: number, dir: Dir): number {
  const risk = dir === "long" ? entry - stop : stop - entry;
  const reward = dir === "long" ? target - entry : entry - target;
  if (risk <= 0) return 0;
  return reward / risk;
}

/* ------------------------------------------------------------------ *
 * News windows — high-impact US releases (CPI / FOMC / NFP)
 * ------------------------------------------------------------------ */
export function inNewsWindow(now: Date, bufferMinutes: number): boolean {
  // Times in US/Eastern. NFP + CPI land 08:30 ET; FOMC statement 14:00 ET.
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const mins = et.getHours() * 60 + et.getMinutes();
  const events = [8 * 60 + 30, 10 * 60, 14 * 60];
  return events.some((e) => Math.abs(mins - e) <= bufferMinutes);
}