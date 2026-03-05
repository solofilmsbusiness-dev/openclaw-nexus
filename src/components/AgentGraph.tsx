import { useState, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { EDGES, statusColor, type Agent } from "@/data/agents";

const CORE_X = 400;
const CORE_Y = 300;
const RADIUS = 220;

function getNodePositions(agents: Agent[]) {
  const positions: Record<string, { x: number; y: number }> = {
    core: { x: CORE_X, y: CORE_Y },
  };
  agents.forEach((agent, i) => {
    const angle = (2 * Math.PI * i) / agents.length - Math.PI / 2;
    positions[agent.id] = {
      x: CORE_X + RADIUS * Math.cos(angle),
      y: CORE_Y + RADIUS * Math.sin(angle),
    };
  });
  return positions;
}

function FloatingGroup({ children, index, isHovered }: { children: React.ReactNode; index: number; isHovered?: boolean }) {
  const dur = 8 + (index % 4) * 1.5;
  const dx = 2 + (index % 3);
  const dy = 1.5 + ((index + 1) % 3);
  const phase = index * 0.7;

  return (
    <g style={{ animationPlayState: isHovered ? "paused" : "running" }}>
      <animateTransform
        attributeName="transform"
        type="translate"
        values={`0,0; ${dx},${-dy}; ${-dx * 0.6},${dy * 0.8}; ${dx * 0.4},${-dy * 0.3}; 0,0`}
        dur={`${dur}s`}
        begin={`${phase}s`}
        repeatCount="indefinite"
        additive="sum"
      />
      {children}
    </g>
  );
}

function AgentNode({
  agent, x, y, onHover, onClick, isHovered, isSelected, hoveredId, selectedId,
}: {
  agent: Agent; x: number; y: number;
  onHover: (a: Agent | null) => void;
  onClick: (a: Agent) => void;
  isHovered: boolean;
  isSelected: boolean;
  hoveredId: string | null;
  selectedId: string | null;
}) {
  const color = statusColor(agent.status);
  const size = 20 + agent.backlogCount * 1.5;
  const active = isHovered || isSelected;
  const scale = active ? 1.1 : 1;
  const anyFocused = hoveredId || selectedId;
  const dimmed = anyFocused && !active ? 0.35 : 1;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: dimmed, scale }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ cursor: "pointer", transformOrigin: `${x}px ${y}px` }}
      onMouseEnter={() => onHover(agent)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(agent)}
    >
      {/* Selection ring */}
      {isSelected && (
        <circle cx={x} cy={y} r={size + 16} fill="none" stroke={color.bg} strokeWidth={1.5} strokeDasharray="6 3" opacity={0.6}>
          <animate attributeName="stroke-dashoffset" values="0;-18" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Soft glow */}
      <circle cx={x} cy={y} r={size + 12} fill={`${color.bg}`} opacity={active ? 0.08 : 0.04}>
        <animate attributeName="r" values={`${size + 8};${size + 14};${size + 8}`} dur="4s" repeatCount="indefinite" />
      </circle>
      {/* Main circle */}
      <circle cx={x} cy={y} r={size} fill={`${color.bg}15`} stroke={color.bg} strokeWidth={active ? 2 : 1.5} opacity={0.9} />
      {/* Icon */}
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fontSize="16">
        {agent.icon}
      </text>
      {/* Label */}
      <text x={x} y={y + size + 16} textAnchor="middle" fill="hsl(0, 0%, 85%)" fontSize="10" fontFamily="-apple-system, Inter, sans-serif" fontWeight="500">
        {agent.name}
      </text>
      {/* Status badge */}
      <text x={x} y={y + size + 28} textAnchor="middle" fill={color.bg} fontSize="8" fontFamily="JetBrains Mono" opacity="0.6" style={{ textTransform: "uppercase" }}>
        {agent.status.toUpperCase()}
      </text>
    </motion.g>
  );
}

function AnimatedEdge({
  x1, y1, x2, y2, color, weight, highlighted, pathId,
}: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; weight: number; highlighted: boolean; pathId: string;
}) {
  const midX = useMemo(() => (x1 + x2) / 2 + (Math.sin(x1 + y1) * 15), [x1, x2, y1]);
  const midY = useMemo(() => (y1 + y2) / 2 + (Math.cos(x2 + y2) * 15), [y1, y2, x2]);
  const path = `M${x1},${y1} Q${midX},${midY} ${x2},${y2}`;
  const dur = highlighted ? 3 + weight : 5 + weight;

  return (
    <g>
      <path
        id={pathId}
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={highlighted ? weight * 2 : weight * 1.2}
        opacity={highlighted ? 0.5 : 0.12}
        strokeLinecap="round"
        style={{ transition: "opacity 0.4s, stroke-width 0.4s" }}
      />
      <circle r={highlighted ? 2.5 : 1.5} fill={color} opacity="0">
        <animateMotion dur={`${dur}s`} repeatCount="indefinite">
          <mpath href={`#${pathId}`} />
        </animateMotion>
        <animate attributeName="opacity" values={`0;${highlighted ? 0.7 : 0.35};${highlighted ? 0.7 : 0.35};0`} keyTimes="0;0.1;0.9;1" dur={`${dur}s`} repeatCount="indefinite" />
      </circle>
    </g>
  );
}

interface AgentGraphProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
}

export default function AgentGraph({ agents, selectedAgentId, onSelectAgent }: AgentGraphProps) {
  const positions = useMemo(() => getNodePositions(agents), [agents]);
  const [hovered, setHovered] = useState<Agent | null>(null);
  const [mouse, setMouse] = useState({ x: 400, y: 300 });
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 600;
    setMouse({ x, y });
  }, []);

  const handleNodeClick = useCallback((agent: Agent) => {
    onSelectAgent(selectedAgentId === agent.id ? null : agent.id);
  }, [selectedAgentId, onSelectAgent]);

  const handleBgClick = useCallback(() => {
    if (selectedAgentId) onSelectAgent(null);
  }, [selectedAgentId, onSelectAgent]);

  const parallaxX = (mouse.x - 400) * 0.01;
  const parallaxY = (mouse.y - 300) * 0.01;

  const hoveredId = hovered?.id ?? null;
  const focusId = hoveredId || selectedAgentId;
  const connectedIds = useMemo(() => {
    if (!focusId) return new Set<string>();
    const ids = new Set<string>();
    EDGES.forEach((e) => {
      if (e.from === focusId) ids.add(e.to);
      if (e.to === focusId) ids.add(e.from);
    });
    return ids;
  }, [focusId]);

  const displayAgent = hovered || (selectedAgentId ? agents.find((a) => a.id === selectedAgentId) : null);

  return (
    <div className="relative w-full h-full glass-panel overflow-hidden">
      <svg ref={svgRef} viewBox="0 0 800 600" className="w-full h-full" onMouseMove={handleMouseMove} onClick={handleBgClick}>
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(215, 80%, 60%)" stopOpacity="0.3" />
            <stop offset="50%" stopColor="hsl(215, 80%, 60%)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="hsl(215, 80%, 60%)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cursorGlow" cx={mouse.x / 800} cy={mouse.y / 600} r="0.3">
            <stop offset="0%" stopColor="hsl(215, 80%, 60%)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="hsl(215, 80%, 60%)" stopOpacity="0" />
          </radialGradient>
          <filter id="blur"><feGaussianBlur stdDeviation="4" /></filter>
          <filter id="particleGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(225, 10%, 14%)" strokeWidth="0.4" />
          </pattern>
        </defs>

        <g style={{ transform: `translate(${parallaxX}px, ${parallaxY}px)` }}>
          <rect width="800" height="600" fill="url(#grid)" />
        </g>
        <rect width="800" height="600" fill="url(#cursorGlow)" style={{ pointerEvents: "none" }} />

        {EDGES.map((edge) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return null;
          const fromAgent = agents.find((a) => a.id === edge.from);
          const color = fromAgent ? statusColor(fromAgent.status).bg : "hsl(215, 80%, 60%)";
          const highlighted = focusId ? (edge.from === focusId || edge.to === focusId) : false;
          return (
            <AnimatedEdge pathId={`edge-${edge.id}`} key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} color={color} weight={edge.weight} highlighted={highlighted} />
          );
        })}

        <FloatingGroup index={99} isHovered={false}>
          <circle cx={CORE_X} cy={CORE_Y} r="65" fill="url(#coreGlow)" filter="url(#blur)">
            <animate attributeName="r" values="60;70;60" dur="5s" repeatCount="indefinite" />
          </circle>
          <circle cx={CORE_X} cy={CORE_Y} r="32" fill="hsl(225, 12%, 10%)" stroke="hsl(215, 80%, 60%)" strokeWidth="1.5" opacity="0.9">
            <animate attributeName="r" values="30;34;30" dur="5s" repeatCount="indefinite" />
          </circle>
          <circle cx={CORE_X} cy={CORE_Y} r="6" fill="hsl(215, 80%, 65%)">
            <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
          </circle>
          <text x={CORE_X} y={CORE_Y + 50} textAnchor="middle" fill="hsl(0, 0%, 75%)" fontSize="10" fontFamily="-apple-system, Inter, sans-serif" fontWeight="600" letterSpacing="2">
            SOLO OS CORE
          </text>
          <text x={CORE_X} y={CORE_Y + 62} textAnchor="middle" fill="hsl(215, 80%, 60%)" fontSize="8" fontFamily="JetBrains Mono" opacity="0.5">
            v2.26
          </text>
        </FloatingGroup>

        {agents.map((agent, i) => {
          const pos = positions[agent.id];
          const isHovered = hoveredId === agent.id;
          const isSelected = selectedAgentId === agent.id;
          return (
            <FloatingGroup key={agent.id} index={i} isHovered={isHovered || isSelected}>
              <AgentNode
                agent={agent}
                x={pos.x}
                y={pos.y}
                onHover={setHovered}
                onClick={handleNodeClick}
                isHovered={isHovered}
                isSelected={isSelected}
                hoveredId={hoveredId}
                selectedId={selectedAgentId}
              />
            </FloatingGroup>
          );
        })}
      </svg>

      {displayAgent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-4 right-4 glass-panel neon-border p-4 w-64"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{displayAgent.icon}</span>
            <div>
              <h3 className="font-display font-semibold text-sm text-foreground">{displayAgent.name}</h3>
              <span className={`text-xs font-mono ${
                displayAgent.status === 'healthy' ? 'status-healthy' :
                displayAgent.status === 'degraded' ? 'status-degraded' :
                displayAgent.status === 'down' ? 'status-down' : 'status-active'
              }`}>{displayAgent.status.toUpperCase()}</span>
            </div>
          </div>
          <div className="space-y-1 text-xs font-mono text-muted-foreground">
            <div className="flex justify-between"><span>Task:</span><span className="text-foreground">{displayAgent.currentTask}</span></div>
            <div className="flex justify-between"><span>Progress:</span><span className="text-foreground">{displayAgent.progress}%</span></div>
            <div className="flex justify-between"><span>Backlog:</span><span className="text-foreground">{displayAgent.backlogCount}</span></div>
          </div>
          <div className="mt-3">
            <svg viewBox="0 0 100 20" className="w-full h-5">
              <polyline
                fill="none"
                stroke={statusColor(displayAgent.status).bg}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={displayAgent.metrics.activity.map((v, i) => `${(i / 19) * 100},${20 - v * 18}`).join(" ")}
              />
            </svg>
            <span className="text-[9px] text-muted-foreground font-mono">Activity</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
