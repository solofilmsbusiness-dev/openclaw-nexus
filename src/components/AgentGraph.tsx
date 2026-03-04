import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { AGENTS, EDGES, statusColor, type Agent } from "@/data/agents";

const CORE_X = 400;
const CORE_Y = 300;
const RADIUS = 220;

function getNodePositions() {
  const positions: Record<string, { x: number; y: number }> = {
    core: { x: CORE_X, y: CORE_Y },
  };
  AGENTS.forEach((agent, i) => {
    const angle = (2 * Math.PI * i) / AGENTS.length - Math.PI / 2;
    positions[agent.id] = {
      x: CORE_X + RADIUS * Math.cos(angle),
      y: CORE_Y + RADIUS * Math.sin(angle),
    };
  });
  return positions;
}

function AgentNode({ agent, x, y, onHover }: { agent: Agent; x: number; y: number; onHover: (a: Agent | null) => void }) {
  const color = statusColor(agent.status);
  const size = 20 + agent.backlogCount * 1.5;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, type: "spring" }}
      style={{ cursor: "pointer" }}
      onMouseEnter={() => onHover(agent)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Glow */}
      <circle cx={x} cy={y} r={size + 8} fill="none" stroke={color.bg} strokeWidth={1} opacity={0.3}>
        <animate attributeName="r" values={`${size + 6};${size + 12};${size + 6}`} dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* Main circle */}
      <circle cx={x} cy={y} r={size} fill={`${color.bg}22`} stroke={color.bg} strokeWidth={2}>
        <animate attributeName="r" values={`${size - 1};${size + 1};${size - 1}`} dur="4s" repeatCount="indefinite" />
      </circle>
      {/* Icon */}
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fontSize="16">
        {agent.icon}
      </text>
      {/* Label */}
      <text x={x} y={y + size + 16} textAnchor="middle" fill={color.bg} fontSize="10" fontFamily="Space Grotesk" fontWeight="600">
        {agent.name}
      </text>
      {/* Status badge */}
      <text x={x} y={y + size + 28} textAnchor="middle" fill={color.bg} fontSize="8" fontFamily="JetBrains Mono" opacity="0.7" style={{ textTransform: "uppercase" }}>
        {agent.status.toUpperCase()}
      </text>
    </motion.g>
  );
}

function AnimatedEdge({ x1, y1, x2, y2, color, weight }: { x1: number; y1: number; x2: number; y2: number; color: string; weight: number }) {
  const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * 40;
  const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * 40;
  const path = `M${x1},${y1} Q${midX},${midY} ${x2},${y2}`;

  return (
    <path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth={weight * 1.5}
      strokeDasharray="6 4"
      opacity={0.4}
    >
      <animate attributeName="stroke-dashoffset" values="0;-20" dur="2s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.2;0.5;0.2" dur="4s" repeatCount="indefinite" />
    </path>
  );
}

export default function AgentGraph() {
  const positions = useMemo(getNodePositions, []);
  const [hovered, setHovered] = useState<Agent | null>(null);

  return (
    <div className="relative w-full h-full glass-panel overflow-hidden scanline">
      <svg viewBox="0 0 800 600" className="w-full h-full">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(185, 100%, 50%)" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(185, 100%, 50%)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(185, 100%, 50%)" stopOpacity="0" />
          </radialGradient>
          <filter id="blur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Grid background */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(220, 15%, 12%)" strokeWidth="0.5" />
        </pattern>
        <rect width="800" height="600" fill="url(#grid)" />

        {/* Edges */}
        {EDGES.map((edge) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return null;
          const fromAgent = AGENTS.find(a => a.id === edge.from);
          const toAgent = AGENTS.find(a => a.id === edge.to);
          const color = fromAgent ? statusColor(fromAgent.status).bg : "hsl(185, 100%, 50%)";
          return (
            <AnimatedEdge
              key={edge.id}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              color={color}
              weight={edge.weight}
            />
          );
        })}

        {/* Core node */}
        <circle cx={CORE_X} cy={CORE_Y} r="70" fill="url(#coreGlow)" filter="url(#blur)">
          <animate attributeName="r" values="65;75;65" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx={CORE_X} cy={CORE_Y} r="35" fill="hsl(220, 18%, 8%)" stroke="hsl(185, 100%, 50%)" strokeWidth="2">
          <animate attributeName="r" values="33;37;33" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx={CORE_X} cy={CORE_Y} r="8" fill="hsl(185, 100%, 60%)">
          <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x={CORE_X} y={CORE_Y + 55} textAnchor="middle" fill="hsl(185, 100%, 50%)" fontSize="11" fontFamily="Space Grotesk" fontWeight="700" letterSpacing="3">
          OPENCLAW CORE
        </text>
        <text x={CORE_X} y={CORE_Y + 67} textAnchor="middle" fill="hsl(185, 100%, 50%)" fontSize="8" fontFamily="JetBrains Mono" opacity="0.5">
          NEURAL COMMAND
        </text>

        {/* Agent nodes */}
        {AGENTS.map((agent) => {
          const pos = positions[agent.id];
          return (
            <AgentNode
              key={agent.id}
              agent={agent}
              x={pos.x}
              y={pos.y}
              onHover={setHovered}
            />
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-4 right-4 glass-panel neon-border p-4 w-64"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{hovered.icon}</span>
            <div>
              <h3 className="font-display font-bold text-sm text-foreground">{hovered.name}</h3>
              <span className={`text-xs font-mono ${
                hovered.status === 'healthy' ? 'status-healthy' :
                hovered.status === 'degraded' ? 'status-degraded' :
                hovered.status === 'down' ? 'status-down' : 'status-active'
              }`}>{hovered.status.toUpperCase()}</span>
            </div>
          </div>
          <div className="space-y-1 text-xs font-mono text-muted-foreground">
            <div className="flex justify-between"><span>Task:</span><span className="text-foreground">{hovered.currentTask}</span></div>
            <div className="flex justify-between"><span>Progress:</span><span className="text-foreground">{hovered.progress}%</span></div>
            <div className="flex justify-between"><span>Backlog:</span><span className="text-foreground">{hovered.backlogCount}</span></div>
          </div>
          {/* Mini sparkline */}
          <div className="mt-3">
            <svg viewBox="0 0 100 20" className="w-full h-5">
              <polyline
                fill="none"
                stroke={statusColor(hovered.status).bg}
                strokeWidth="1.5"
                points={hovered.metrics.activity.map((v, i) => `${(i / 19) * 100},${20 - v * 18}`).join(" ")}
              />
            </svg>
            <span className="text-[9px] text-muted-foreground font-mono">ACTIVITY</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

import { useState } from "react";
