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
  const dur = 6 + (index % 4) * 1.3;
  const dx = 3 + (index % 3);
  const dy = 2 + ((index + 1) % 3);
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
  agent, x, y, onHover, isHovered, hoveredId,
}: {
  agent: Agent; x: number; y: number;
  onHover: (a: Agent | null) => void;
  isHovered: boolean;
  hoveredId: string | null;
}) {
  const color = statusColor(agent.status);
  const size = 20 + agent.backlogCount * 1.5;
  const scale = isHovered ? 1.15 : 1;
  const glowOpacity = isHovered ? 0.7 : 0.3;
  const dimmed = hoveredId && !isHovered ? 0.5 : 1;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: dimmed, scale }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ cursor: "pointer", transformOrigin: `${x}px ${y}px` }}
      onMouseEnter={() => onHover(agent)}
      onMouseLeave={() => onHover(null)}
    >
      <circle cx={x} cy={y} r={size + (isHovered ? 14 : 8)} fill="none" stroke={color.bg} strokeWidth={isHovered ? 2 : 1} opacity={glowOpacity}>
        <animate attributeName="r" values={`${size + 6};${size + (isHovered ? 16 : 12)};${size + 6}`} dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values={`${glowOpacity * 0.8};${glowOpacity};${glowOpacity * 0.8}`} dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx={x} cy={y} r={size} fill={`${color.bg}22`} stroke={color.bg} strokeWidth={isHovered ? 3 : 2}>
        <animate attributeName="r" values={`${size - 1};${size + 1};${size - 1}`} dur="4s" repeatCount="indefinite" />
      </circle>
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fontSize="16">
        {agent.icon}
      </text>
      <text x={x} y={y + size + 16} textAnchor="middle" fill={color.bg} fontSize="10" fontFamily="Space Grotesk" fontWeight="600">
        {agent.name}
      </text>
      <text x={x} y={y + size + 28} textAnchor="middle" fill={color.bg} fontSize="8" fontFamily="JetBrains Mono" opacity="0.7" style={{ textTransform: "uppercase" }}>
        {agent.status.toUpperCase()}
      </text>
    </motion.g>
  );
}

function AnimatedEdge({
  x1, y1, x2, y2, color, weight, highlighted,
}: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; weight: number; highlighted: boolean;
}) {
  const midX = useMemo(() => (x1 + x2) / 2 + (Math.sin(x1 + y1) * 20), [x1, x2, y1]);
  const midY = useMemo(() => (y1 + y2) / 2 + (Math.cos(x2 + y2) * 20), [y1, y2, x2]);
  const path = `M${x1},${y1} Q${midX},${midY} ${x2},${y2}`;

  return (
    <path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth={highlighted ? weight * 2.5 : weight * 1.5}
      strokeDasharray={highlighted ? "8 3" : "6 4"}
      opacity={highlighted ? 0.8 : 0.25}
      style={{ transition: "opacity 0.3s, stroke-width 0.3s" }}
    >
      <animate
        attributeName="stroke-dashoffset"
        values="0;-20"
        dur={highlighted ? "1s" : "2s"}
        repeatCount="indefinite"
      />
    </path>
  );
}

const PARTICLE_PATHS = [
  "M0,120 L800,120",
  "M0,280 L800,280",
  "M0,440 L800,440",
  "M200,0 L200,600",
  "M440,0 L440,600",
  "M640,0 L640,600",
];

export default function AgentGraph({ agents }: { agents: Agent[] }) {
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

  const parallaxX = (mouse.x - 400) * 0.015;
  const parallaxY = (mouse.y - 300) * 0.015;

  const hoveredId = hovered?.id ?? null;
  const connectedIds = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const ids = new Set<string>();
    EDGES.forEach((e) => {
      if (e.from === hoveredId) ids.add(e.to);
      if (e.to === hoveredId) ids.add(e.from);
    });
    return ids;
  }, [hoveredId]);

  return (
    <div className="relative w-full h-full glass-panel overflow-hidden scanline">
      <svg
        ref={svgRef}
        viewBox="0 0 800 600"
        className="w-full h-full"
        onMouseMove={handleMouseMove}
      >
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(45, 100%, 50%)" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(45, 100%, 50%)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(45, 100%, 50%)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cursorGlow" cx={mouse.x / 800} cy={mouse.y / 600} r="0.25">
            <stop offset="0%" stopColor="hsl(45, 100%, 50%)" stopOpacity="0.12" />
            <stop offset="60%" stopColor="hsl(45, 100%, 50%)" stopOpacity="0.03" />
            <stop offset="100%" stopColor="hsl(45, 100%, 50%)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cursorGridMask" cx={mouse.x / 800} cy={mouse.y / 600} r="0.3">
            <stop offset="0%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="gridBrightMask">
            <rect width="800" height="600" fill="url(#cursorGridMask)" />
          </mask>
          <filter id="blur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(30, 6%, 10%)" strokeWidth="0.5" />
          </pattern>
          <pattern id="gridBright" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(45, 100%, 50%)" strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* Base grid with parallax */}
        <g style={{ transform: `translate(${parallaxX}px, ${parallaxY}px)` }}>
          <rect width="800" height="600" fill="url(#grid)" />
        </g>

        {/* Bright grid masked by cursor proximity */}
        <g style={{ transform: `translate(${parallaxX}px, ${parallaxY}px)` }}>
          <rect width="800" height="600" fill="url(#gridBright)" mask="url(#gridBrightMask)" />
        </g>

        {/* Cursor glow overlay */}
        <rect width="800" height="600" fill="url(#cursorGlow)" style={{ pointerEvents: "none" }} />

        {/* Data particles along grid lines */}
        {PARTICLE_PATHS.map((pathD, i) => (
          <g key={`particle-${i}`}>
            <path id={`ppath-${i}`} d={pathD} fill="none" stroke="none" />
            <circle r="1.5" fill="hsl(45, 100%, 50%)" opacity="0.5">
              <animateMotion
                dur={`${6 + i * 2}s`}
                begin={`${i * 1.5}s`}
                repeatCount="indefinite"
              >
                <mpath href={`#ppath-${i}`} />
              </animateMotion>
              <animate attributeName="opacity" values="0;0.5;0.5;0" dur={`${6 + i * 2}s`} begin={`${i * 1.5}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}

        {/* Edges */}
        {EDGES.map((edge) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return null;
          const fromAgent = agents.find(a => a.id === edge.from);
          const color = fromAgent ? statusColor(fromAgent.status).bg : "hsl(45, 100%, 50%)";
          const highlighted = hoveredId ? (edge.from === hoveredId || edge.to === hoveredId) : false;
          return (
            <AnimatedEdge
              key={edge.id}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              color={color}
              weight={edge.weight}
              highlighted={highlighted}
            />
          );
        })}

        {/* Core node - floating */}
        <FloatingGroup index={99} isHovered={false}>
          <circle cx={CORE_X} cy={CORE_Y} r="70" fill="url(#coreGlow)" filter="url(#blur)">
            <animate attributeName="r" values="65;75;65" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx={CORE_X} cy={CORE_Y} r="35" fill="hsl(0, 0%, 6%)" stroke="hsl(45, 100%, 50%)" strokeWidth="2">
            <animate attributeName="r" values="33;37;33" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx={CORE_X} cy={CORE_Y} r="8" fill="hsl(45, 100%, 65%)">
            <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x={CORE_X} y={CORE_Y + 55} textAnchor="middle" fill="hsl(45, 100%, 50%)" fontSize="11" fontFamily="Space Grotesk" fontWeight="700" letterSpacing="3">
            OPENCLAW CORE
          </text>
          <text x={CORE_X} y={CORE_Y + 67} textAnchor="middle" fill="hsl(45, 80%, 35%)" fontSize="8" fontFamily="JetBrains Mono" opacity="0.6">
            NEURAL COMMAND
          </text>
        </FloatingGroup>

        {/* Agent nodes - floating */}
        {agents.map((agent, i) => {
          const pos = positions[agent.id];
          const isHovered = hoveredId === agent.id;
          return (
            <FloatingGroup key={agent.id} index={i} isHovered={isHovered}>
              <AgentNode
                agent={agent}
                x={pos.x}
                y={pos.y}
                onHover={setHovered}
                isHovered={isHovered}
                hoveredId={hoveredId}
              />
            </FloatingGroup>
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
