import { useState } from "react";
import { useAgents } from "@/contexts/AgentContext";
import type { AgentStatus } from "@/data/agents";

const STATUS_COLORS: Record<AgentStatus, string> = {
  healthy: "hsl(var(--chart-2))",
  active: "hsl(var(--chart-1))",
  degraded: "hsl(var(--chart-4))",
  down: "hsl(var(--destructive))",
};

export default function MiniAgentGraph() {
  const { agents, edges } = useAgents();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; status: string } | null>(null);

  const cx = 200, cy = 150, radius = 110;

  const positions = agents.reduce<Record<string, { x: number; y: number }>>((acc, agent, i) => {
    const angle = (2 * Math.PI * i) / agents.length - Math.PI / 2;
    acc[agent.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    return acc;
  }, {});

  return (
    <div className="flex-1 min-h-[180px] relative">
      <svg viewBox="0 0 400 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="mini-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
          <filter id="mini-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {edges.map((edge) => {
          const from = positions[edge.from];
          const to = positions[edge.to] ?? { x: cx, y: cy };
          if (!from) return null;
          return (
            <line
              key={edge.id}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeOpacity="0.4"
            />
          );
        })}

        {/* Edges to core for unmatched */}
        {agents.map((agent) => {
          const pos = positions[agent.id];
          if (!pos) return null;
          const hasEdge = edges.some((e) => e.from === agent.id || e.to === agent.id);
          if (hasEdge) return null;
          return (
            <line
              key={`core-${agent.id}`}
              x1={pos.x} y1={pos.y}
              x2={cx} y2={cy}
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              strokeOpacity="0.25"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Core node */}
        <circle cx={cx} cy={cy} r="24" fill="url(#mini-core-glow)" />
        <circle cx={cx} cy={cy} r="10" fill="hsl(var(--primary))" filter="url(#mini-glow)">
          <animate attributeName="r" values="10;12;10" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r="18" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeOpacity="0.3">
          <animate attributeName="r" values="18;22;18" dur="4s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.3;0.1;0.3" dur="4s" repeatCount="indefinite" />
        </circle>

        {/* Orbital particles */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const orbitR = 60 + i * 12;
          return (
            <circle key={`p-${i}`} r="1.5" fill="hsl(var(--chart-2))" opacity="0.6">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`${i * 60} ${cx} ${cy}`}
                to={`${i * 60 + 360} ${cx} ${cy}`}
                dur={`${8 + i * 2}s`}
                repeatCount="indefinite"
              />
              <animate attributeName="cx" values={`${cx + orbitR}`} dur="0.01s" fill="freeze" />
              <animate attributeName="cy" values={`${cy}`} dur="0.01s" fill="freeze" />
            </circle>
          );
        })}

        {/* Agent nodes */}
        {agents.map((agent) => {
          const pos = positions[agent.id];
          if (!pos) return null;
          const color = STATUS_COLORS[agent.status];
          const nodeR = agent.status === "down" ? 5 : 7;
          return (
            <g
              key={agent.id}
              className="cursor-pointer"
              onMouseEnter={() => setTooltip({ x: pos.x, y: pos.y, name: agent.name, status: agent.status })}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle cx={pos.x} cy={pos.y} r={nodeR + 4} fill={color} opacity="0.15" />
              <circle cx={pos.x} cy={pos.y} r={nodeR} fill={color} filter="url(#mini-glow)">
                {agent.status === "active" && (
                  <animate attributeName="r" values={`${nodeR};${nodeR + 1.5};${nodeR}`} dur="2s" repeatCount="indefinite" />
                )}
              </circle>
              <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central" fontSize="8" className="select-none pointer-events-none">
                {agent.icon}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={tooltip.x - 40} y={tooltip.y - 30}
              width="80" height="20" rx="4"
              fill="hsl(var(--popover))" stroke="hsl(var(--border))" strokeWidth="0.5"
            />
            <text x={tooltip.x} y={tooltip.y - 22} textAnchor="middle" dominantBaseline="central" fontSize="7" fill="hsl(var(--foreground))">
              {tooltip.name} · {tooltip.status}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
