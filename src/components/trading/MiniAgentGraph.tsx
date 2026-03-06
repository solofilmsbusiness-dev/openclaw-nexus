import { useState, useMemo, useEffect, useRef } from "react";
import { useAgents } from "@/contexts/AgentContext";
import { statusColor, type Agent, type AgentStatus } from "@/data/agents";
import { useTradingData } from "@/contexts/TradingDataContext";

const CX = 200, CY = 140, RADIUS = 100;
const CORE_TAGLINES = [
  "tracking symbols",
  "agents synced",
  "trade flow active",
  "scanning markets",
  "neural mesh live",
];

function getAgentColor(agent: Agent): string {
  return agent.color ?? statusColor(agent.status).bg;
}

export default function MiniAgentGraph() {
  const { agents, edges } = useAgents();
  const { executedTrades, considerations, evaluations, selectedAgentId, setSelectedAgentId, tradeAgentMap, setTradeAgentMap } = useTradingData();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; status: string; task: string } | null>(null);
  const [taglineIdx, setTaglineIdx] = useState(0);
  const [flashNodes, setFlashNodes] = useState<Set<string>>(new Set());

  // Rotate core tagline
  useEffect(() => {
    const iv = setInterval(() => setTaglineIdx((i) => (i + 1) % CORE_TAGLINES.length), 4000);
    return () => clearInterval(iv);
  }, []);

  // Flash nodes on new trades
  const prevTradeCount = useRef(executedTrades.length);
  useEffect(() => {
    if (executedTrades.length > prevTradeCount.current && executedTrades.length > 0) {
      const latest = executedTrades[0];
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      if (randomAgent) {
        setFlashNodes((prev) => new Set(prev).add(randomAgent.id));
        // Track which agent "executed" this trade
        setTradeAgentMap((prev) => ({ ...prev, [latest.id]: randomAgent.id }));
        setTimeout(() => {
          setFlashNodes((prev) => {
            const next = new Set(prev);
            next.delete(randomAgent.id);
            return next;
          });
        }, 1500);
      }
    }
    prevTradeCount.current = executedTrades.length;
  }, [executedTrades.length, agents, setTradeAgentMap]);

  const positions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = { core: { x: CX, y: CY } };
    agents.forEach((agent, i) => {
      const angle = (2 * Math.PI * i) / agents.length - Math.PI / 2;
      pos[agent.id] = { x: CX + RADIUS * Math.cos(angle), y: CY + RADIUS * Math.sin(angle) };
    });
    return pos;
  }, [agents]);

  // Recent activity feed (last 4 events)
  const activityFeed = useMemo(() => {
    const items: { id: string; text: string; color: string; time: string }[] = [];
    for (const t of executedTrades.slice(0, 2)) {
      const icon = t.action === "buy" ? "🟢" : "🔴";
      const time = t.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      items.push({ id: t.id, text: `${icon} ${t.action.toUpperCase()} ${t.symbol} @${t.price.toFixed(2)}`, color: t.action === "buy" ? "hsl(var(--chart-2))" : "hsl(var(--destructive))", time });
    }
    for (const c of considerations.slice(0, 1)) {
      const time = c.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      items.push({ id: c.id, text: `🟡 EVAL ${c.symbol} ${c.confidence}%`, color: "hsl(var(--chart-4))", time });
    }
    for (const e of evaluations.slice(0, 1)) {
      const time = e.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const topInd = e.indicators[0];
      items.push({ id: e.id, text: `🔵 SCAN ${e.symbol} ${topInd?.name}:${topInd?.value}`, color: "hsl(var(--chart-1))", time });
    }
    return items.slice(0, 4);
  }, [executedTrades, considerations, evaluations]);

  // Stardust background
  const stars = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      x: ((i * 173 + 29) % 100) / 100 * 400,
      y: ((i * 241 + 53) % 100) / 100 * 320,
      size: 0.4 + ((i * 7) % 8) / 10,
      dur: 2 + ((i * 13) % 50) / 10,
      delay: ((i * 31) % 40) / 10,
    })), []);

  // Orbital particles
  const particles = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      radius: 40 + ((i * 37) % 80),
      size: 0.8 + ((i * 7) % 3) * 0.5,
      dur: 10 + ((i * 13) % 30),
      startAngle: (i * 47) % 360,
      reverse: i % 3 === 0,
      opacity: 0.1 + ((i * 11) % 20) / 100,
    })), []);

  return (
    <div className="flex-1 min-h-[280px] relative flex flex-col">
      <svg viewBox="0 0 400 320" className="w-full flex-1" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="at-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
          <filter id="at-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="at-data-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="blur" in2="SourceGraphic" operator="over" />
          </filter>
          <filter id="at-particle-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Stardust */}
        <g style={{ pointerEvents: "none" }}>
          {stars.map((s, i) => (
            <circle key={`s-${i}`} cx={s.x} cy={s.y} r={s.size} fill="hsl(var(--primary))" opacity={0}>
              <animate attributeName="opacity" values="0.03;0.25;0.03" dur={`${s.dur}s`} begin={`${s.delay}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>

        {/* Energy rings */}
        <g style={{ pointerEvents: "none" }}>
          {[0, 2, 4].map((delay) => (
            <circle key={`ring-${delay}`} cx={CX} cy={CY} r={20} fill="none" stroke="hsl(var(--primary))" strokeWidth={0.8} opacity={0}>
              <animate attributeName="r" from="20" to="120" dur="6s" begin={`${delay}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.12;0.06;0" dur="6s" begin={`${delay}s`} repeatCount="indefinite" />
              <animate attributeName="stroke-width" from="1" to="0.2" dur="6s" begin={`${delay}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>

        {/* Orbital particles */}
        <g style={{ pointerEvents: "none" }}>
          {particles.map((p, i) => (
            <circle key={`op-${i}`} cx={CX + p.radius} cy={CY} r={p.size} fill="hsl(var(--primary))" opacity={p.opacity} filter="url(#at-particle-glow)">
              <animateTransform
                attributeName="transform" type="rotate"
                from={`${p.startAngle} ${CX} ${CY}`}
                to={`${p.startAngle + (p.reverse ? -360 : 360)} ${CX} ${CY}`}
                dur={`${p.dur}s`} repeatCount="indefinite"
              />
              <animate attributeName="opacity" values={`${p.opacity};${p.opacity * 2.5};${p.opacity}`} dur={`${p.dur / 2}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>

        {/* Curved edges with data orbs */}
        {edges.map((edge) => {
          const from = positions[edge.from];
          const to = positions[edge.to] ?? positions.core;
          if (!from || !to) return null;
          const midX = (from.x + to.x) / 2 + Math.sin(from.x + from.y) * 10;
          const midY = (from.y + to.y) / 2 + Math.cos(to.x + to.y) * 10;
          const path = `M${from.x},${from.y} Q${midX},${midY} ${to.x},${to.y}`;
          const pathId = `at-edge-${edge.id}`;
          const fromAgent = agents.find((a) => a.id === edge.from);
          const toAgent = agents.find((a) => a.id === edge.to);
          const eitherDown = fromAgent?.status === "down" || toAgent?.status === "down";
          const dataColor = "hsl(152, 70%, 55%)";

          return (
            <g key={edge.id}>
              <path id={pathId} d={path} fill="none" stroke="hsl(var(--border))" strokeWidth={1} opacity={eitherDown ? 0.05 : 0.15} strokeLinecap="round" />
              {/* Pulsing glow */}
              {!eitherDown && (
                <path d={path} fill="none" stroke={dataColor} strokeWidth={2} opacity={0} strokeLinecap="round" filter="url(#at-particle-glow)">
                  <animate attributeName="opacity" values="0.02;0.06;0.02" dur="4s" repeatCount="indefinite" />
                </path>
              )}
              {/* Green data orb */}
              {!eitherDown && (
                <>
                  <circle r={2} fill={dataColor} opacity="0" filter="url(#at-data-glow)">
                    <animateMotion dur="4s" repeatCount="indefinite"><mpath href={`#${pathId}`} /></animateMotion>
                    <animate attributeName="opacity" values="0;0.7;0.7;0" keyTimes="0;0.1;0.9;1" dur="4s" repeatCount="indefinite" />
                  </circle>
                  {/* Comet trail */}
                  <circle r={5} fill={dataColor} opacity="0" filter="url(#at-particle-glow)">
                    <animateMotion dur="4s" repeatCount="indefinite"><mpath href={`#${pathId}`} /></animateMotion>
                    <animate attributeName="opacity" values="0;0.06;0.06;0" keyTimes="0;0.1;0.9;1" dur="4s" repeatCount="indefinite" />
                  </circle>
                  {/* Arrival pulse */}
                  <circle cx={to.x} cy={to.y} r={2} fill="none" stroke={dataColor} strokeWidth={0.8} opacity={0}>
                    <animate attributeName="r" values="2;8;8" dur="4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;0;0.3;0" keyTimes="0;0.85;0.92;1" dur="4s" repeatCount="indefinite" />
                  </circle>
                </>
              )}
            </g>
          );
        })}

        {/* Edges to core for unlinked agents */}
        {agents.map((agent) => {
          const pos = positions[agent.id];
          if (!pos) return null;
          const hasEdge = edges.some((e) => e.from === agent.id || e.to === agent.id);
          if (hasEdge) return null;
          const midX = (pos.x + CX) / 2 + Math.sin(pos.x) * 8;
          const midY = (pos.y + CY) / 2 + Math.cos(pos.y) * 8;
          const path = `M${pos.x},${pos.y} Q${midX},${midY} ${CX},${CY}`;
          const pathId = `at-core-${agent.id}`;
          const dataColor = "hsl(152, 70%, 55%)";
          return (
            <g key={`core-${agent.id}`}>
              <path id={pathId} d={path} fill="none" stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.1} strokeDasharray="3 3" />
              {agent.status !== "down" && (
                <circle r={1.5} fill={dataColor} opacity="0">
                  <animateMotion dur="6s" repeatCount="indefinite"><mpath href={`#${pathId}`} /></animateMotion>
                  <animate attributeName="opacity" values="0;0.4;0.4;0" keyTimes="0;0.1;0.9;1" dur="6s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* Core node */}
        <g>
          <circle cx={CX} cy={CY} r={20} fill="url(#at-core-glow)" />
          <circle cx={CX} cy={CY} r={8} fill="hsl(var(--primary))" filter="url(#at-glow)">
            <animate attributeName="r" values="8;10;8" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx={CX} cy={CY} r={14} fill="none" stroke="hsl(var(--primary))" strokeWidth={0.5} opacity={0.3}>
            <animate attributeName="r" values="14;18;14" dur="4s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.3;0.1;0.3" dur="4s" repeatCount="indefinite" />
          </circle>
          {/* Core tagline */}
          <text x={CX} y={CY + 30} textAnchor="middle" fontSize="6" fill="hsl(var(--muted-foreground))" fontFamily="monospace" opacity="0.6">
            {CORE_TAGLINES[taglineIdx]}
          </text>
        </g>

        {/* Agent nodes with floating animation */}
        {agents.map((agent, i) => {
          const pos = positions[agent.id];
          if (!pos) return null;
          const color = getAgentColor(agent);
          const nodeR = agent.status === "down" ? 4 : 6;
          const isFlashing = flashNodes.has(agent.id);
          const isSelected = selectedAgentId === agent.id;
          const dur = 8 + (i % 4) * 1.5;
          const dx = 1.5 + (i % 3);
          const dy = 1 + ((i + 1) % 3);
          const dimmed = selectedAgentId && !isSelected ? 0.35 : 1;

          return (
            <g key={agent.id} opacity={dimmed} style={{ transition: "opacity 0.3s" }}>
              {/* Floating animation */}
              <animateTransform
                attributeName="transform" type="translate"
                values={`0,0; ${dx},${-dy}; ${-dx * 0.6},${dy * 0.8}; 0,0`}
                dur={`${dur}s`} begin={`${i * 0.7}s`} repeatCount="indefinite" additive="sum"
              />

              {/* Flash pulse on trade execution */}
              {isFlashing && (
                <circle cx={pos.x} cy={pos.y} r={nodeR + 6} fill="none" stroke="hsl(var(--chart-2))" strokeWidth={2} opacity={0.8}>
                  <animate attributeName="r" values={`${nodeR + 4};${nodeR + 16};${nodeR + 16}`} dur="1.5s" fill="freeze" />
                  <animate attributeName="opacity" values="0.8;0.3;0" dur="1.5s" fill="freeze" />
                </circle>
              )}

              {/* Progress arc */}
              {agent.status !== "down" && (
                <circle
                  cx={pos.x} cy={pos.y} r={nodeR + 3}
                  fill="none" stroke={color} strokeWidth={1.5}
                  strokeDasharray={`${2 * Math.PI * (nodeR + 3) * (agent.progress / 100)} ${2 * Math.PI * (nodeR + 3)}`}
                  strokeDashoffset={2 * Math.PI * (nodeR + 3) * 0.25}
                  strokeLinecap="round" opacity={0.4}
                  style={{ transition: "stroke-dasharray 1s ease" }}
                />
              )}

              {/* Soft glow */}
              <circle cx={pos.x} cy={pos.y} r={nodeR + 8} fill={color} opacity={0.04}>
                <animate attributeName="r" values={`${nodeR + 6};${nodeR + 10};${nodeR + 6}`} dur="4s" repeatCount="indefinite" />
              </circle>

              {/* Selection ring */}
              {isSelected && (
                <circle cx={pos.x} cy={pos.y} r={nodeR + 10} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="4 2" opacity={0.7}>
                  <animate attributeName="stroke-dashoffset" values="0;-12" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Main node */}
              <circle
                cx={pos.x} cy={pos.y} r={nodeR}
                fill={`${color}20`} stroke={color} strokeWidth={isSelected ? 2 : 1.2} opacity={0.9}
                className="cursor-pointer"
                onMouseEnter={() => setTooltip({ x: pos.x, y: pos.y, name: agent.name, status: agent.status, task: agent.currentTask })}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => setSelectedAgentId(selectedAgentId === agent.id ? null : agent.id)}
              />

              {/* Active pulse */}
              {agent.status === "active" && (
                <circle cx={pos.x} cy={pos.y} r={nodeR} fill="none" stroke={color} strokeWidth={0.8} opacity={0}>
                  <animate attributeName="r" values={`${nodeR};${nodeR + 5};${nodeR + 5}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Icon */}
              <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central" fontSize="7" className="select-none pointer-events-none">
                {agent.icon}
              </text>

              {/* Name label */}
              <text x={pos.x} y={pos.y + nodeR + 10} textAnchor="middle" fontSize="5.5" fill="hsl(var(--muted-foreground))" fontFamily="monospace" opacity="0.7">
                {agent.name.length > 10 ? agent.name.slice(0, 9) + "…" : agent.name}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g style={{ pointerEvents: "none" }}>
            <rect
              x={tooltip.x - 50} y={tooltip.y - 38}
              width="100" height="28" rx="4"
              fill="hsl(var(--popover))" stroke="hsl(var(--border))" strokeWidth="0.5"
            />
            <text x={tooltip.x} y={tooltip.y - 28} textAnchor="middle" dominantBaseline="central" fontSize="6" fill="hsl(var(--foreground))" fontFamily="monospace" fontWeight="600">
              {tooltip.name} · {tooltip.status}
            </text>
            <text x={tooltip.x} y={tooltip.y - 18} textAnchor="middle" dominantBaseline="central" fontSize="5" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
              {tooltip.task.length > 22 ? tooltip.task.slice(0, 21) + "…" : tooltip.task}
            </text>
          </g>
        )}
      </svg>

      {/* Activity feed overlay */}
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
