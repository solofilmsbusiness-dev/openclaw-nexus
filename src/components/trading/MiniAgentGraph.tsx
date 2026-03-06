import { useState, useMemo, useEffect, useRef } from "react";
import { useTradingData } from "@/contexts/TradingDataContext";

const PIPELINE_AGENTS = [
  { id: "researcher", name: "Researcher", icon: "🔍", color: "hsl(var(--chart-1))" },
  { id: "analyst", name: "Analyst", icon: "📊", color: "hsl(var(--chart-4))" },
  { id: "strategist", name: "Strategist", icon: "🧠", color: "hsl(var(--chart-3))" },
  { id: "executor", name: "Executor", icon: "⚡", color: "hsl(var(--chart-2))" },
] as const;

type PipelineId = (typeof PIPELINE_AGENTS)[number]["id"];

// Layout constants
const SVG_W = 400, SVG_H = 160;
const NODE_W = 76, NODE_H = 52, GAP = 16;
const STATS_Y_OFFSET = 14;
const TOTAL_W = PIPELINE_AGENTS.length * NODE_W + (PIPELINE_AGENTS.length - 1) * GAP;
const START_X = (SVG_W - TOTAL_W) / 2;
const NODE_Y = (SVG_H - NODE_H) / 2;

function nodeX(i: number) { return START_X + i * (NODE_W + GAP); }

export default function MiniAgentGraph() {
  const { executedTrades, considerations, evaluations, selectedAgentId, setSelectedAgentId, tradeAgentMap, setTradeAgentMap } = useTradingData();
  const [flashNodes, setFlashNodes] = useState<Set<string>>(new Set());
  const [orbProgress, setOrbProgress] = useState<number | null>(null);

  // Per-stage processed counts
  const nodeCounts = useMemo<Record<PipelineId, number>>(() => ({
    researcher: evaluations.length,
    analyst: evaluations.length,
    strategist: considerations.length,
    executor: executedTrades.length,
  }), [evaluations.length, considerations.length, executedTrades.length]);

  // Derive activity text per node
  const nodeStatus = useMemo(() => {
    const status: Record<PipelineId, string> = {
      researcher: "idle",
      analyst: "idle",
      strategist: "idle",
      executor: "idle",
    };
    if (evaluations.length > 0) {
      const e = evaluations[0];
      status.researcher = `scan ${e.symbol}`;
      const ind = e.indicators[0];
      status.analyst = ind ? `${ind.name}:${ind.value}` : `eval ${e.symbol}`;
    }
    if (considerations.length > 0) {
      const c = considerations[0];
      status.strategist = `${c.confidence}% ${c.symbol}`;
    }
    if (executedTrades.length > 0) {
      const t = executedTrades[0];
      status.executor = `${t.action.toUpperCase()} @${t.price.toFixed(0)}`;
    }
    return status;
  }, [evaluations, considerations, executedTrades]);

  // Flash + orb on new trades
  const prevTradeCount = useRef(executedTrades.length);
  useEffect(() => {
    if (executedTrades.length > prevTradeCount.current && executedTrades.length > 0) {
      const latest = executedTrades[0];
      // Map trade to executor
      setTradeAgentMap((prev) => ({ ...prev, [latest.id]: "executor" }));

      // Cascade flash through pipeline
      const ids: PipelineId[] = ["researcher", "analyst", "strategist", "executor"];
      ids.forEach((id, i) => {
        setTimeout(() => {
          setFlashNodes((prev) => new Set(prev).add(id));
          setTimeout(() => setFlashNodes((prev) => { const n = new Set(prev); n.delete(id); return n; }), 600);
        }, i * 300);
      });

      // Animate orb
      setOrbProgress(0);
      const start = performance.now();
      const dur = 1200;
      const tick = () => {
        const elapsed = performance.now() - start;
        const p = Math.min(elapsed / dur, 1);
        setOrbProgress(p);
        if (p < 1) requestAnimationFrame(tick);
        else setTimeout(() => setOrbProgress(null), 200);
      };
      requestAnimationFrame(tick);
    }
    prevTradeCount.current = executedTrades.length;
  }, [executedTrades.length, setTradeAgentMap]);

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

  // Compute orb position along the connector path
  const orbPos = useMemo(() => {
    if (orbProgress === null) return null;
    // Interpolate across 3 segments (between 4 nodes)
    const totalSegments = PIPELINE_AGENTS.length - 1;
    const seg = Math.min(Math.floor(orbProgress * totalSegments), totalSegments - 1);
    const segProgress = (orbProgress * totalSegments) - seg;
    const x1 = nodeX(seg) + NODE_W;
    const x2 = nodeX(seg + 1);
    return { x: x1 + (x2 - x1) * segProgress, y: NODE_Y + NODE_H / 2 };
  }, [orbProgress]);

  return (
    <div className="flex-1 min-h-[200px] relative flex flex-col">
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full flex-1" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="pipe-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" opacity="0.4" />
          </marker>
        </defs>

        {/* Connectors */}
        {PIPELINE_AGENTS.slice(0, -1).map((_, i) => {
          const x1 = nodeX(i) + NODE_W;
          const x2 = nodeX(i + 1);
          const y = NODE_Y + NODE_H / 2;
          return (
            <line key={`conn-${i}`} x1={x1} y1={y} x2={x2} y2={y}
              stroke="hsl(var(--border))" strokeWidth={1.5} markerEnd="url(#arrow)" />
          );
        })}

        {/* Data orb */}
        {orbPos && (
          <circle cx={orbPos.x} cy={orbPos.y} r={4} fill="hsl(152, 70%, 55%)" opacity={0.9} filter="url(#pipe-glow)" />
        )}

        {/* Nodes */}
        {PIPELINE_AGENTS.map((agent, i) => {
          const x = nodeX(i);
          const y = NODE_Y;
          const isSelected = selectedAgentId === agent.id;
          const isDimmed = selectedAgentId && !isSelected;
          const isFlashing = flashNodes.has(agent.id);

          return (
            <g key={agent.id} opacity={isDimmed ? 0.35 : 1} style={{ transition: "opacity 0.3s" }}
              className="cursor-pointer" onClick={() => setSelectedAgentId(selectedAgentId === agent.id ? null : agent.id)}>
              {/* Flash glow */}
              {isFlashing && (
                <rect x={x - 3} y={y - 3} width={NODE_W + 6} height={NODE_H + 6} rx={10}
                  fill="none" stroke={agent.color} strokeWidth={2} opacity={0.7}>
                  <animate attributeName="opacity" values="0.7;0" dur="0.6s" fill="freeze" />
                </rect>
              )}
              {/* Selection ring */}
              {isSelected && (
                <rect x={x - 2} y={y - 2} width={NODE_W + 4} height={NODE_H + 4} rx={9}
                  fill="none" stroke={agent.color} strokeWidth={1.5} strokeDasharray="4 2" opacity={0.7}>
                  <animate attributeName="stroke-dashoffset" values="0;-12" dur="1.5s" repeatCount="indefinite" />
                </rect>
              )}
              {/* Background */}
              <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={8}
                fill="hsl(var(--card))" stroke={isSelected ? agent.color : "hsl(var(--border))"} strokeWidth={isSelected ? 1.5 : 1} />
              {/* Icon */}
              <text x={x + NODE_W / 2} y={y + 15} textAnchor="middle" fontSize="12" className="select-none pointer-events-none">
                {agent.icon}
              </text>
              {/* Name */}
              <text x={x + NODE_W / 2} y={y + 29} textAnchor="middle" fontSize="7" fontFamily="monospace"
                fill="hsl(var(--foreground))" fontWeight="600" className="pointer-events-none">
                {agent.name}
              </text>
              {/* Status */}
              <text x={x + NODE_W / 2} y={y + 42} textAnchor="middle" fontSize="5.5" fontFamily="monospace"
                fill="hsl(var(--muted-foreground))" className="pointer-events-none">
                {nodeStatus[agent.id].length > 14 ? nodeStatus[agent.id].slice(0, 13) + "…" : nodeStatus[agent.id]}
              </text>
              {/* Stats row */}
              <text x={x + NODE_W / 2} y={y + NODE_H + STATS_Y_OFFSET} textAnchor="middle" fontSize="5" fontFamily="monospace"
                fill={agent.color} className="pointer-events-none" opacity={0.8}>
                {nodeCounts[agent.id]} processed
              </text>
            </g>
          );
        })}
      </svg>

      {/* Activity feed */}
      {activityFeed.length > 0 && (
        <div className="px-2 pb-1 space-y-0.5">
          {activityFeed.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-[9px] font-mono leading-tight">
              <span className="text-foreground/80 truncate flex-1">{item.text}</span>
              <span className="text-muted-foreground/60 ml-2 shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
