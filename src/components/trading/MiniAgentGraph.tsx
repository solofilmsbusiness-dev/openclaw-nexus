import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTradingData } from "@/contexts/TradingDataContext";

const PIPELINE_AGENTS = [
  { id: "researcher", name: "Researcher", icon: "🔍", color: "hsl(var(--chart-1))" },
  { id: "analyst", name: "Analyst", icon: "📊", color: "hsl(var(--chart-4))" },
  { id: "strategist", name: "Strategist", icon: "🧠", color: "hsl(var(--chart-3))" },
  { id: "executor", name: "Executor", icon: "⚡", color: "hsl(var(--chart-2))" },
] as const;

type PipelineId = (typeof PIPELINE_AGENTS)[number]["id"];

const SPARKLINE_POINTS = 12;
const SPARKLINE_INTERVAL = 2000;

// Base layout constants
const SVG_W = 440, SVG_H = 210;
const BASE_NODE_W = 80, BASE_NODE_H = 68, GAP = 14;
const STATS_Y_OFFSET = 14;
const LS_SCALES_KEY = "mini-graph-node-scales";

// Phase definitions per agent
const PHASE_SEQUENCES: Record<PipelineId, string[]> = {
  researcher: ["Monitoring...", "Scanning markets...", "Researching {symbol}...", "Collecting {indicator}...", "Data ready ✓"],
  analyst: ["Waiting for data...", "Analyzing {symbol}...", "Evaluating {indicator}: {value}...", "Analysis complete ✓"],
  strategist: ["Waiting for analysis...", "Planning {symbol} entry...", "Confidence: {confidence}%...", "Strategy ready ✓"],
  executor: ["Awaiting strategy...", "Preparing order...", "Executing {action} {symbol}...", "{action} @{price} ✓"],
};

interface NodePhase {
  phaseIndex: number;
  detail: string;
  active: boolean;
  symbol: string;
  extras: Record<string, string>;
}

function defaultPhase(): NodePhase {
  return { phaseIndex: 0, detail: "", active: false, symbol: "", extras: {} };
}

function resolvePhaseText(agentId: PipelineId, phase: NodePhase): string {
  const seq = PHASE_SEQUENCES[agentId];
  const template = seq[Math.min(phase.phaseIndex, seq.length - 1)];
  return template
    .replace("{symbol}", phase.symbol || "...")
    .replace("{indicator}", phase.extras.indicator || "RSI")
    .replace("{value}", phase.extras.value || "—")
    .replace("{confidence}", phase.extras.confidence || "—")
    .replace("{action}", phase.extras.action || "BUY")
    .replace("{price}", phase.extras.price || "—");
}

// Stardust
const STARDUST = Array.from({ length: 20 }, (_, i) => ({
  cx: ((i * 137.5) % SVG_W),
  cy: ((i * 97.3 + 13) % SVG_H),
  r: 0.6 + (i % 3) * 0.3,
  dur: `${2 + (i % 4) * 0.7}s`,
  delay: `${(i * 0.3) % 2}s`,
}));

// Build sparkline polyline
function sparklinePath(history: number[], x: number, y: number, w: number, h: number): string {
  if (history.length < 2) return "";
  const max = Math.max(1, ...history);
  const stepX = w / (history.length - 1);
  return history.map((v, i) => {
    const px = x + i * stepX;
    const py = y + h - (v / max) * h;
    return `${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
  }).join(" ");
}

// Progress arc
function progressArc(cx: number, cy: number, r: number, fraction: number): string {
  const f = Math.min(Math.max(fraction, 0), 1);
  if (f <= 0) return "";
  if (f >= 1) return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  const angle = f * 2 * Math.PI;
  const sx = cx + r * Math.cos(-Math.PI / 2);
  const sy = cy + r * Math.sin(-Math.PI / 2);
  const ex = cx + r * Math.cos(-Math.PI / 2 + angle);
  const ey = cy + r * Math.sin(-Math.PI / 2 + angle);
  return `M ${sx} ${sy} A ${r} ${r} 0 ${angle > Math.PI ? 1 : 0} 1 ${ex} ${ey}`;
}

export default function MiniAgentGraph() {
  const { executedTrades, considerations, evaluations, selectedAgentId, setSelectedAgentId, setTradeAgentMap } = useTradingData();
  const [flashNodes, setFlashNodes] = useState<Set<string>>(new Set());

  // Adjustable node scales
  const [nodeScales, setNodeScales] = useState<Record<PipelineId, number>>(() => {
    try {
      const saved = localStorage.getItem(LS_SCALES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.error(`Corrupted localStorage for "${LS_SCALES_KEY}" — resetting to defaults:`, err);
      try { localStorage.removeItem(LS_SCALES_KEY); } catch { /* storage unavailable */ }
    }
    return { researcher: 1, analyst: 1, strategist: 1, executor: 1 };
  });

  useEffect(() => {
    localStorage.setItem(LS_SCALES_KEY, JSON.stringify(nodeScales));
  }, [nodeScales]);

  // Drag resize state
  const dragRef = useRef<{ id: PipelineId; startY: number; startScale: number } | null>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent, id: PipelineId) => {
    e.stopPropagation();
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragRef.current = { id, startY: clientY, startScale: nodeScales[id] };
    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      const cy = "touches" in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
      const delta = (dragRef.current.startY - cy) / 100;
      const newScale = Math.min(1.4, Math.max(0.8, dragRef.current.startScale + delta));
      setNodeScales((prev) => ({ ...prev, [dragRef.current!.id]: Math.round(newScale * 100) / 100 }));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
  }, [nodeScales]);

  // Dynamic layout helpers
  const getNodeW = useCallback((id: PipelineId) => BASE_NODE_W * nodeScales[id], [nodeScales]);
  const getNodeH = useCallback((id: PipelineId) => BASE_NODE_H * nodeScales[id], [nodeScales]);

  const nodePositions = useMemo(() => {
    const positions: Record<PipelineId, { x: number; y: number; w: number; h: number; cx: number; cy: number }> = {} as any;
    // Calculate total width
    let totalW = 0;
    PIPELINE_AGENTS.forEach((a, i) => {
      totalW += getNodeW(a.id);
      if (i < PIPELINE_AGENTS.length - 1) totalW += GAP;
    });
    let curX = (SVG_W - totalW) / 2;
    PIPELINE_AGENTS.forEach((a) => {
      const w = getNodeW(a.id);
      const h = getNodeH(a.id);
      const y = (SVG_H - h) / 2 + 4;
      positions[a.id] = { x: curX, y, w, h, cx: curX + w / 2, cy: y + h / 2 };
      curX += w + GAP;
    });
    return positions;
  }, [getNodeW, getNodeH]);

  // Connector path between nodes i and i+1
  const connectorPath = useCallback((i: number): string => {
    const a = PIPELINE_AGENTS[i];
    const b = PIPELINE_AGENTS[i + 1];
    const posA = nodePositions[a.id];
    const posB = nodePositions[b.id];
    const x1 = posA.x + posA.w;
    const x2 = posB.x;
    const y1 = posA.cy;
    const y2 = posB.cy;
    const midX = (x1 + x2) / 2;
    const curveY = Math.min(y1, y2) - 18;
    return `M ${x1} ${y1} Q ${midX} ${curveY} ${x2} ${y2}`;
  }, [nodePositions]);

  // Node counts
  const nodeCounts = useMemo<Record<PipelineId, number>>(() => ({
    researcher: evaluations.length,
    analyst: evaluations.length,
    strategist: considerations.length,
    executor: executedTrades.length,
  }), [evaluations.length, considerations.length, executedTrades.length]);

  // Sparkline history
  const prevCountsRef = useRef<Record<PipelineId, number>>({ researcher: 0, analyst: 0, strategist: 0, executor: 0 });
  const [sparkHistory, setSparkHistory] = useState<Record<PipelineId, number[]>>({
    researcher: Array(SPARKLINE_POINTS).fill(0),
    analyst: Array(SPARKLINE_POINTS).fill(0),
    strategist: Array(SPARKLINE_POINTS).fill(0),
    executor: Array(SPARKLINE_POINTS).fill(0),
  });

  const sampleSparkline = useCallback(() => {
    setSparkHistory((prev) => {
      const next = { ...prev };
      for (const agent of PIPELINE_AGENTS) {
        const id = agent.id;
        const currentCount = id === "researcher" || id === "analyst"
          ? evaluations.length
          : id === "strategist" ? considerations.length : executedTrades.length;
        const delta = Math.max(0, currentCount - prevCountsRef.current[id]);
        prevCountsRef.current[id] = currentCount;
        next[id] = [...prev[id].slice(1), delta];
      }
      return next;
    });
  }, [evaluations.length, considerations.length, executedTrades.length]);

  useEffect(() => {
    const interval = setInterval(sampleSparkline, SPARKLINE_INTERVAL);
    return () => clearInterval(interval);
  }, [sampleSparkline]);

  // === Sequential Status State Machine ===
  const [nodePhases, setNodePhases] = useState<Record<PipelineId, NodePhase>>({
    researcher: defaultPhase(),
    analyst: defaultPhase(),
    strategist: defaultPhase(),
    executor: defaultPhase(),
  });
  const phaseTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Any other one-off timers (cascades, bursts, delayed phase kickoffs)
  const auxTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const track = useCallback((t: ReturnType<typeof setTimeout>) => {
    auxTimers.current.add(t);
    return t;
  }, []);

  // Clean up every pending timer on unmount
  useEffect(() => {
    const phases = phaseTimers.current;
    const aux = auxTimers.current;
    return () => {
      Object.values(phases).forEach(clearTimeout);
      aux.forEach(clearTimeout);
      aux.clear();
    };
  }, []);

  const advancePhase = useCallback((agentId: PipelineId, maxPhase: number, extras: Record<string, string>, symbol: string) => {
    // Clear existing timer
    if (phaseTimers.current[agentId]) clearTimeout(phaseTimers.current[agentId]);

    setNodePhases((prev) => ({
      ...prev,
      [agentId]: { phaseIndex: 1, active: true, symbol, extras },
    }));

    // Schedule phase advances
    const seq = PHASE_SEQUENCES[agentId];
    const totalPhases = Math.min(maxPhase, seq.length - 1);
    for (let p = 2; p <= totalPhases; p++) {
      const delay = p * 1500;
      phaseTimers.current[`${agentId}-${p}`] = setTimeout(() => {
        setNodePhases((prev) => ({
          ...prev,
          [agentId]: { ...prev[agentId], phaseIndex: p },
        }));
      }, delay);
    }

    // Return to idle after all phases
    const idleDelay = (totalPhases + 1) * 1500;
    phaseTimers.current[agentId] = setTimeout(() => {
      setNodePhases((prev) => ({
        ...prev,
        [agentId]: { ...prev[agentId], phaseIndex: 0, active: false },
      }));
    }, idleDelay);
  }, []);

  // Trigger Researcher + Analyst on new evaluations
  const prevEvalCount = useRef(evaluations.length);
  useEffect(() => {
    if (evaluations.length > prevEvalCount.current && evaluations.length > 0) {
      const e = evaluations[0];
      const ind = e.indicators[0];
      advancePhase("researcher", 4, {
        indicator: ind?.name || "RSI",
        value: ind?.value || "—",
      }, e.symbol);
      // Analyst starts 2s after researcher
      track(setTimeout(() => {
        advancePhase("analyst", 3, {
          indicator: ind?.name || "MACD",
          value: ind?.value || "—",
        }, e.symbol);
      }, 2000));
    }
    prevEvalCount.current = evaluations.length;
  }, [evaluations.length, evaluations, advancePhase, track]);

  // Trigger Strategist on new considerations
  const prevConsCount = useRef(considerations.length);
  useEffect(() => {
    if (considerations.length > prevConsCount.current && considerations.length > 0) {
      const c = considerations[0];
      advancePhase("strategist", 3, {
        confidence: String(c.confidence),
      }, c.symbol);
    }
    prevConsCount.current = considerations.length;
  }, [considerations.length, considerations, advancePhase]);

  // Trigger Executor on new trades + flash cascade
  const prevTradeCount = useRef(executedTrades.length);
  useEffect(() => {
    if (executedTrades.length > prevTradeCount.current && executedTrades.length > 0) {
      const t = executedTrades[0];
      setTradeAgentMap((prev) => ({ ...prev, [t.id]: "executor" }));

      advancePhase("executor", 3, {
        action: t.action.toUpperCase(),
        price: t.price.toFixed(2),
      }, t.symbol);

      // Flash cascade
      const ids: PipelineId[] = ["researcher", "analyst", "strategist", "executor"];
      ids.forEach((id, i) => {
        track(setTimeout(() => {
          setFlashNodes((prev) => new Set(prev).add(id));
          track(setTimeout(() => setFlashNodes((prev) => { const n = new Set(prev); n.delete(id); return n; }), 600));
        }, i * 300));
      });
    }
    prevTradeCount.current = executedTrades.length;
  }, [executedTrades.length, executedTrades, setTradeAgentMap, advancePhase, track]);

  // Activity feed
  const activityFeed = useMemo(() => {
    const items: { id: string; text: string; time: string }[] = [];
    for (const t of executedTrades.slice(0, 2)) {
      const icon = t.action === "buy" ? "🟢" : "🔴";
      const time = t.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      items.push({ id: t.id, text: `${icon} ${t.action.toUpperCase()} ${t.symbol} @${t.price.toFixed(2)}`, time });
    }
    for (const c of considerations.slice(0, 1)) {
      const time = c.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      items.push({ id: c.id, text: `🟡 EVAL ${c.symbol} ${c.confidence}%`, time });
    }
    for (const e of evaluations.slice(0, 1)) {
      const time = e.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      items.push({ id: e.id, text: `🔵 SCAN ${e.symbol}`, time });
    }
    return items.slice(0, 4);
  }, [executedTrades, considerations, evaluations]);

  // Feed pulse tracking
  const prevFeedIds = useRef<Set<string>>(new Set());
  const [newFeedIds, setNewFeedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const currentIds = new Set(activityFeed.map((i) => i.id));
    const fresh = new Set<string>();
    for (const id of currentIds) {
      if (!prevFeedIds.current.has(id)) fresh.add(id);
    }
    if (fresh.size > 0) {
      setNewFeedIds(fresh);
      const timer = setTimeout(() => setNewFeedIds(new Set()), 1200);
      return () => clearTimeout(timer);
    }
    prevFeedIds.current = currentIds;
  }, [activityFeed]);

  const maxCount = Math.max(1, ...Object.values(nodeCounts));

  // Data flow burst orbs: track which connectors should show a burst
  const [burstConnectors, setBurstConnectors] = useState<Set<number>>(new Set());
  useEffect(() => {
    // Burst on connector 0-1 when new eval
    if (evaluations.length > 0) {
      setBurstConnectors(new Set([0]));
      const t1 = setTimeout(() => setBurstConnectors((prev) => { const n = new Set(prev); n.add(1); return n; }), 2000);
      const t2 = setTimeout(() => setBurstConnectors(new Set()), 4000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [evaluations.length]);
  useEffect(() => {
    if (considerations.length > 0) {
      setBurstConnectors((prev) => new Set(prev).add(2));
      const t = setTimeout(() => setBurstConnectors((prev) => { const n = new Set(prev); n.delete(2); return n; }), 2500);
      return () => clearTimeout(t);
    }
  }, [considerations.length]);

  return (
    <div className="flex-1 min-h-[200px] relative flex flex-col">
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full flex-1" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="mini-particleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="mini-nodeGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="mini-activeGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Connector path defs */}
          {PIPELINE_AGENTS.slice(0, -1).map((_, i) => (
            <path key={`path-def-${i}`} id={`mini-conn-${i}`} d={connectorPath(i)} fill="none" />
          ))}
        </defs>

        {/* Stardust background */}
        {STARDUST.map((s, i) => (
          <circle key={`star-${i}`} cx={s.cx} cy={s.cy} r={s.r} fill="hsl(var(--foreground))" opacity="0">
            <animate attributeName="opacity" values="0;0.3;0" dur={s.dur} begin={s.delay} repeatCount="indefinite" />
          </circle>
        ))}

        {/* Energy rings from Researcher */}
        {[0, 1, 2].map((ring) => {
          const pos = nodePositions.researcher;
          return (
            <circle key={`ering-${ring}`} cx={pos.cx} cy={pos.cy} r={pos.w / 2 + 4} fill="none"
              stroke={PIPELINE_AGENTS[0].color} strokeWidth={0.5} opacity="0">
              <animate attributeName="r" values={`${pos.w / 2 + 4};${pos.w / 2 + 28}`} dur="3s" begin={`${ring}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.35;0" dur="3s" begin={`${ring}s`} repeatCount="indefinite" />
            </circle>
          );
        })}

        {/* Connectors */}
        {PIPELINE_AGENTS.slice(0, -1).map((_, i) => {
          const pathD = connectorPath(i);
          const isBurst = burstConnectors.has(i);
          return (
            <g key={`conn-group-${i}`}>
              <path d={pathD} fill="none" stroke="hsl(var(--border))" strokeWidth={1.2} opacity={0.5} />
              <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth={0.6} opacity={0.15}
                strokeDasharray="4 6">
                <animate attributeName="stroke-dashoffset" values="0;-20" dur="2s" repeatCount="indefinite" />
              </path>
              {/* Ambient data orb */}
              <circle r="2.5" fill="hsl(var(--neon-green))" filter="url(#mini-particleGlow)" opacity="0.9">
                <animateMotion dur={`${2.2 + i * 0.3}s`} repeatCount="indefinite">
                  <mpath xlinkHref={`#mini-conn-${i}`} />
                </animateMotion>
              </circle>
              <circle r="1.2" fill="hsl(var(--neon-green))" opacity="0.4">
                <animateMotion dur={`${2.2 + i * 0.3}s`} repeatCount="indefinite" keyPoints="0;0.92" keyTimes="0;1" calcMode="linear">
                  <mpath xlinkHref={`#mini-conn-${i}`} />
                </animateMotion>
              </circle>
              {/* Burst orb (brighter, larger) when data flows */}
              {isBurst && (
                <>
                  <circle r="4" fill="hsl(var(--neon-green))" filter="url(#mini-activeGlow)" opacity="0.95">
                    <animateMotion dur="1.2s" repeatCount="1" fill="freeze">
                      <mpath xlinkHref={`#mini-conn-${i}`} />
                    </animateMotion>
                    <animate attributeName="opacity" values="0.95;0" dur="1.2s" fill="freeze" />
                  </circle>
                  <circle r="2" fill="white" opacity="0.7">
                    <animateMotion dur="1.2s" repeatCount="1" fill="freeze">
                      <mpath xlinkHref={`#mini-conn-${i}`} />
                    </animateMotion>
                    <animate attributeName="opacity" values="0.7;0" dur="1.2s" fill="freeze" />
                  </circle>
                </>
              )}
              {/* Arrival pulse */}
              {(() => {
                const nextPos = nodePositions[PIPELINE_AGENTS[i + 1].id];
                return (
                  <circle cx={nextPos.x} cy={nextPos.cy} r={3} fill="none" stroke="hsl(var(--neon-green))" strokeWidth={1} opacity="0">
                    <animate attributeName="r" values="3;12" dur={`${2.2 + i * 0.3}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;0.4;0" dur={`${2.2 + i * 0.3}s`} repeatCount="indefinite" />
                  </circle>
                );
              })()}
            </g>
          );
        })}

        {/* Nodes */}
        {PIPELINE_AGENTS.map((agent, i) => {
          const pos = nodePositions[agent.id];
          const { x, y, w, h, cx, cy } = pos;
          const isSelected = selectedAgentId === agent.id;
          const isDimmed = selectedAgentId && !isSelected;
          const isFlashing = flashNodes.has(agent.id);
          const arcFraction = nodeCounts[agent.id] / maxCount;
          const phase = nodePhases[agent.id];
          const isActive = phase.active;
          const statusText = isActive ? resolvePhaseText(agent.id, phase) : "Monitoring...";

          const floatDur = `${4 + i * 0.7}s`;
          const floatValues = i % 2 === 0 ? "0 0;0 -2;0 0;0 1.5;0 0" : "0 0;0 1.5;0 0;0 -2;0 0";

          return (
            <g key={agent.id} opacity={isDimmed ? 0.35 : 1} style={{ transition: "opacity 0.3s" }}
              className="cursor-pointer" onClick={() => setSelectedAgentId(selectedAgentId === agent.id ? null : agent.id)}>

              <animateTransform attributeName="transform" type="translate" values={floatValues} dur={floatDur} repeatCount="indefinite" />

              {/* Outer breathing glow — stronger */}
              <ellipse cx={cx} cy={cy} rx={w / 2 + 10} ry={h / 2 + 10}
                fill={agent.color} opacity="0" filter="url(#mini-nodeGlow)">
                <animate attributeName="opacity" values={isActive ? "0.12;0.3;0.12" : "0.06;0.15;0.06"} dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
              </ellipse>

              {/* Inner glow layer */}
              <ellipse cx={cx} cy={cy} rx={w / 2 + 3} ry={h / 2 + 3}
                fill={agent.color} opacity="0" filter="url(#mini-particleGlow)">
                <animate attributeName="opacity" values={isActive ? "0.1;0.2;0.1" : "0.03;0.08;0.03"} dur={`${2.5 + i * 0.4}s`} repeatCount="indefinite" />
              </ellipse>

              {/* Active processing pulsing ring */}
              {isActive && (
                <ellipse cx={cx} cy={cy} rx={w / 2 + 6} ry={h / 2 + 6}
                  fill="none" stroke={agent.color} strokeWidth={1.5} opacity="0">
                  <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="rx" values={`${w / 2 + 4};${w / 2 + 10};${w / 2 + 4}`} dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="ry" values={`${h / 2 + 4};${h / 2 + 10};${h / 2 + 4}`} dur="1.2s" repeatCount="indefinite" />
                </ellipse>
              )}

              {/* Progress arc */}
              {arcFraction > 0 && (
                <path d={progressArc(cx, cy, w / 2 + 2, arcFraction)}
                  fill="none" stroke={agent.color} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
              )}

              {/* Flash glow */}
              {isFlashing && (
                <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx={10}
                  fill="none" stroke={agent.color} strokeWidth={2} opacity={0.7} filter="url(#mini-particleGlow)">
                  <animate attributeName="opacity" values="0.7;0" dur="0.6s" fill="freeze" />
                </rect>
              )}

              {/* Selection ring */}
              {isSelected && (
                <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={9}
                  fill="none" stroke={agent.color} strokeWidth={1.5} strokeDasharray="4 2" opacity={0.7}>
                  <animate attributeName="stroke-dashoffset" values="0;-12" dur="1.5s" repeatCount="indefinite" />
                </rect>
              )}

              {/* Background */}
              <rect x={x} y={y} width={w} height={h} rx={8}
                fill="hsl(var(--card))" stroke={isSelected ? agent.color : "hsl(var(--border))"} strokeWidth={isSelected ? 1.5 : 1} />

              {/* Icon */}
              <text x={cx} y={y + 14 * nodeScales[agent.id]} textAnchor="middle" fontSize={11 * nodeScales[agent.id]} className="select-none pointer-events-none">
                {agent.icon}
              </text>
              {/* Name */}
              <text x={cx} y={y + 25 * nodeScales[agent.id]} textAnchor="middle" fontSize={7 * nodeScales[agent.id]} fontFamily="monospace"
                fill="hsl(var(--foreground))" fontWeight="600" className="pointer-events-none">
                {agent.name}
              </text>

              {/* Sparkline */}
              {(() => {
                const spkX = x + 6 * nodeScales[agent.id];
                const spkY = y + 29 * nodeScales[agent.id];
                const spkW = w - 12 * nodeScales[agent.id];
                const spkH = 10 * nodeScales[agent.id];
                const pathD = sparklinePath(sparkHistory[agent.id], spkX, spkY, spkW, spkH);
                return pathD ? (
                  <g className="pointer-events-none">
                    <path d={`${pathD} L ${spkX + spkW} ${spkY + spkH} L ${spkX} ${spkY + spkH} Z`}
                      fill={agent.color} opacity={0.08} />
                    <path d={pathD} fill="none" stroke={agent.color} strokeWidth={0.8} opacity={0.5} />
                  </g>
                ) : null;
              })()}

              {/* Status — live phase text */}
              <text x={cx} y={y + h - 8 * nodeScales[agent.id]} textAnchor="middle"
                fontSize={5 * nodeScales[agent.id]} fontFamily="monospace"
                fill={isActive ? agent.color : "hsl(var(--muted-foreground))"} className="pointer-events-none"
                fontWeight={isActive ? "700" : "400"}>
                {statusText.length > 18 ? statusText.slice(0, 17) + "…" : statusText}
              </text>

              {/* Stats row */}
              <text x={cx} y={y + h + STATS_Y_OFFSET} textAnchor="middle" fontSize="5" fontFamily="monospace"
                fill={agent.color} className="pointer-events-none" opacity={0.8}>
                {nodeCounts[agent.id]} processed
              </text>

              {/* Resize handle (bottom-right corner) */}
              <g className="cursor-ns-resize" onMouseDown={(e) => handleResizeStart(e, agent.id)} onTouchStart={(e) => handleResizeStart(e, agent.id)}>
                <rect x={x + w - 10} y={y + h - 6} width={8} height={5} rx={1.5} fill="transparent" />
                <line x1={x + w - 8} y1={y + h - 4} x2={x + w - 4} y2={y + h - 4}
                  stroke="hsl(var(--muted-foreground))" strokeWidth={0.6} opacity={0.5} />
                <line x1={x + w - 7} y1={y + h - 2.5} x2={x + w - 4} y2={y + h - 2.5}
                  stroke="hsl(var(--muted-foreground))" strokeWidth={0.6} opacity={0.5} />
              </g>
            </g>
          );
        })}
      </svg>

      {/* Activity feed */}
      {activityFeed.length > 0 && (
        <div className="px-2 pb-1 space-y-0.5">
          {activityFeed.map((item) => {
            const isNew = newFeedIds.has(item.id);
            return (
              <div key={item.id}
                className={`flex items-center justify-between text-[9px] font-mono leading-tight transition-all duration-500 ${isNew ? "animate-feed-pulse" : ""}`}>
                <span className="text-foreground/80 truncate flex-1">{item.text}</span>
                <span className="text-muted-foreground/60 ml-2 shrink-0">{item.time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
