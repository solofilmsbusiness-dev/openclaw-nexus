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
const SVG_W = 400, SVG_H = 180;
const NODE_W = 76, NODE_H = 52, GAP = 16;
const STATS_Y_OFFSET = 14;
const TOTAL_W = PIPELINE_AGENTS.length * NODE_W + (PIPELINE_AGENTS.length - 1) * GAP;
const START_X = (SVG_W - TOTAL_W) / 2;
const NODE_Y = (SVG_H - NODE_H) / 2 + 4;

function nodeX(i: number) { return START_X + i * (NODE_W + GAP); }
function nodeCX(i: number) { return nodeX(i) + NODE_W / 2; }
function nodeCY() { return NODE_Y + NODE_H / 2; }

// Generate stardust positions deterministically
const STARDUST = Array.from({ length: 20 }, (_, i) => ({
  cx: ((i * 137.5) % SVG_W),
  cy: ((i * 97.3 + 13) % SVG_H),
  r: 0.6 + (i % 3) * 0.3,
  dur: `${2 + (i % 4) * 0.7}s`,
  delay: `${(i * 0.3) % 2}s`,
}));

// Curved connector path between two node centers
function connectorPath(i: number): string {
  const x1 = nodeX(i) + NODE_W;
  const x2 = nodeX(i + 1);
  const y = nodeCY();
  const midX = (x1 + x2) / 2;
  const curveY = y - 18;
  return `M ${x1} ${y} Q ${midX} ${curveY} ${x2} ${y}`;
}

// Progress arc (partial circle around a node)
function progressArc(cx: number, cy: number, r: number, fraction: number): string {
  const clampedFrac = Math.min(Math.max(fraction, 0), 1);
  if (clampedFrac <= 0) return "";
  if (clampedFrac >= 1) {
    return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  }
  const angle = clampedFrac * 2 * Math.PI;
  const startX = cx + r * Math.cos(-Math.PI / 2);
  const startY = cy + r * Math.sin(-Math.PI / 2);
  const endX = cx + r * Math.cos(-Math.PI / 2 + angle);
  const endY = cy + r * Math.sin(-Math.PI / 2 + angle);
  const largeArc = angle > Math.PI ? 1 : 0;
  return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;
}

export default function MiniAgentGraph() {
  const { executedTrades, considerations, evaluations, selectedAgentId, setSelectedAgentId, setTradeAgentMap } = useTradingData();
  const [flashNodes, setFlashNodes] = useState<Set<string>>(new Set());

  const nodeCounts = useMemo<Record<PipelineId, number>>(() => ({
    researcher: evaluations.length,
    analyst: evaluations.length,
    strategist: considerations.length,
    executor: executedTrades.length,
  }), [evaluations.length, considerations.length, executedTrades.length]);

  const nodeStatus = useMemo(() => {
    const status: Record<PipelineId, string> = {
      researcher: "idle", analyst: "idle", strategist: "idle", executor: "idle",
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

  // Flash cascade on new trades
  const prevTradeCount = useRef(executedTrades.length);
  useEffect(() => {
    if (executedTrades.length > prevTradeCount.current && executedTrades.length > 0) {
      const latest = executedTrades[0];
      setTradeAgentMap((prev) => ({ ...prev, [latest.id]: "executor" }));

      const ids: PipelineId[] = ["researcher", "analyst", "strategist", "executor"];
      ids.forEach((id, i) => {
        setTimeout(() => {
          setFlashNodes((prev) => new Set(prev).add(id));
          setTimeout(() => setFlashNodes((prev) => { const n = new Set(prev); n.delete(id); return n; }), 600);
        }, i * 300);
      });
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

  // Max count for progress arc normalization
  const maxCount = Math.max(1, ...Object.values(nodeCounts));

  return (
    <div className="flex-1 min-h-[200px] relative flex flex-col">
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full flex-1" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Glow filters */}
          <filter id="mini-particleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="mini-dataGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="blur" in2="SourceGraphic" operator="over" />
          </filter>
          <filter id="mini-nodeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Connector paths for mpath references */}
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

        {/* Energy rings from Researcher node */}
        {[0, 1, 2].map((ring) => (
          <circle key={`ering-${ring}`} cx={nodeCX(0)} cy={nodeCY()} r={NODE_W / 2 + 4} fill="none"
            stroke={PIPELINE_AGENTS[0].color} strokeWidth={0.5} opacity="0">
            <animate attributeName="r" values={`${NODE_W / 2 + 4};${NODE_W / 2 + 28}`} dur="3s" begin={`${ring * 1}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0" dur="3s" begin={`${ring * 1}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* Curved connectors with data orbs */}
        {PIPELINE_AGENTS.slice(0, -1).map((_, i) => {
          const pathD = connectorPath(i);
          return (
            <g key={`conn-group-${i}`}>
              {/* Connector stroke */}
              <path d={pathD} fill="none" stroke="hsl(var(--border))" strokeWidth={1.2} opacity={0.5} />
              {/* Animated dashes */}
              <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth={0.6} opacity={0.15}
                strokeDasharray="4 6">
                <animate attributeName="stroke-dashoffset" values="0;-20" dur="2s" repeatCount="indefinite" />
              </path>
              {/* Data orb with comet trail */}
              <circle r="2.5" fill="hsl(var(--neon-green))" filter="url(#mini-particleGlow)" opacity="0.9">
                <animateMotion dur={`${2.2 + i * 0.3}s`} repeatCount="indefinite">
                  <mpath xlinkHref={`#mini-conn-${i}`} />
                </animateMotion>
              </circle>
              {/* Trailing orb (comet tail) */}
              <circle r="1.2" fill="hsl(var(--neon-green))" opacity="0.4">
                <animateMotion dur={`${2.2 + i * 0.3}s`} repeatCount="indefinite" keyPoints="0;0.92" keyTimes="0;1" calcMode="linear">
                  <mpath xlinkHref={`#mini-conn-${i}`} />
                </animateMotion>
              </circle>
              {/* Arrival pulse at destination */}
              <circle cx={nodeX(i + 1)} cy={nodeCY()} r={3} fill="none" stroke="hsl(var(--neon-green))" strokeWidth={1} opacity="0">
                <animate attributeName="r" values="3;12" dur={`${2.2 + i * 0.3}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;0.4;0" dur={`${2.2 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}

        {/* Nodes */}
        {PIPELINE_AGENTS.map((agent, i) => {
          const x = nodeX(i);
          const y = NODE_Y;
          const cx = nodeCX(i);
          const cy = nodeCY();
          const isSelected = selectedAgentId === agent.id;
          const isDimmed = selectedAgentId && !isSelected;
          const isFlashing = flashNodes.has(agent.id);
          const arcFraction = nodeCounts[agent.id] / maxCount;

          // Floating durations per node
          const floatDur = `${4 + i * 0.7}s`;
          const floatValues = i % 2 === 0 ? "0 0;0 -2;0 0;0 1.5;0 0" : "0 0;0 1.5;0 0;0 -2;0 0";

          return (
            <g key={agent.id} opacity={isDimmed ? 0.35 : 1} style={{ transition: "opacity 0.3s" }}
              className="cursor-pointer" onClick={() => setSelectedAgentId(selectedAgentId === agent.id ? null : agent.id)}>

              {/* Floating motion */}
              <animateTransform attributeName="transform" type="translate" values={floatValues} dur={floatDur} repeatCount="indefinite" />

              {/* Soft breathing glow behind node */}
              <ellipse cx={cx} cy={cy} rx={NODE_W / 2 + 6} ry={NODE_H / 2 + 6}
                fill={agent.color} opacity="0" filter="url(#mini-nodeGlow)">
                <animate attributeName="opacity" values="0.04;0.12;0.04" dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
              </ellipse>

              {/* Progress arc */}
              {arcFraction > 0 && (
                <path d={progressArc(cx, cy, NODE_W / 2 + 2, arcFraction)}
                  fill="none" stroke={agent.color} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
              )}

              {/* Flash glow */}
              {isFlashing && (
                <rect x={x - 3} y={y - 3} width={NODE_W + 6} height={NODE_H + 6} rx={10}
                  fill="none" stroke={agent.color} strokeWidth={2} opacity={0.7} filter="url(#mini-particleGlow)">
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
              <text x={cx} y={y + 15} textAnchor="middle" fontSize="12" className="select-none pointer-events-none">
                {agent.icon}
              </text>
              {/* Name */}
              <text x={cx} y={y + 29} textAnchor="middle" fontSize="7" fontFamily="monospace"
                fill="hsl(var(--foreground))" fontWeight="600" className="pointer-events-none">
                {agent.name}
              </text>
              {/* Status */}
              <text x={cx} y={y + 42} textAnchor="middle" fontSize="5.5" fontFamily="monospace"
                fill="hsl(var(--muted-foreground))" className="pointer-events-none">
                {nodeStatus[agent.id].length > 14 ? nodeStatus[agent.id].slice(0, 13) + "…" : nodeStatus[agent.id]}
              </text>
              {/* Stats row */}
              <text x={cx} y={y + NODE_H + STATS_Y_OFFSET} textAnchor="middle" fontSize="5" fontFamily="monospace"
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
