import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { statusColor, type Agent, type Edge } from "@/data/agents";
import { Link, X, ZoomIn, ZoomOut, Maximize, Lock, Unlock, Power, FolderOpen } from "lucide-react";
import { useAgents } from "@/contexts/AgentContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { ConfigManager } from "@/components/ConfigManager";

const CORE_X = 400;
const CORE_Y = 300;
const RADIUS = 250;

const EDGE_KINDS = ["control", "data", "comms", "handoff"] as const;

const DEFAULT_VIEWBOX = { x: 0, y: 0, w: 800, h: 600 };
const MIN_W = 200;
const MAX_W = 2400;

const CORE_TAGLINES = [
  "12 agents synced",
  "system nominal",
  "v2.26 stable",
  "neural mesh active",
  "47 tasks processed",
  "all channels open",
];

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

// Solar system particle effects
function OrbitalParticles({ viewBox, killSwitchActive }: { viewBox: { x: number; y: number; w: number; h: number }; killSwitchActive?: boolean }) {
  const scale = viewBox.w / DEFAULT_VIEWBOX.w;
  const particles = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => {
      const baseRadius = 80 + ((i * 37) % 270);
      const size = 1 + ((i * 7) % 3);
      const dur = 12 + ((i * 13) % 48);
      const reverse = i % 3 === 0;
      const opacity = 0.12 + ((i * 11) % 28) / 100;
      const useGlow = size >= 2.5;
      return { baseRadius, size, dur, reverse, opacity, useGlow, startAngle: (i * 47) % 360 };
    });
  }, []);

  const killColors = [
    "hsl(0, 70%, 50%)",
    "hsl(0, 60%, 45%)",
    "hsl(10, 70%, 48%)",
    "hsl(0, 80%, 55%)",
    "hsl(350, 65%, 50%)",
  ];
  const normalColors = [
    "hsl(215, 80%, 60%)",
    "hsl(195, 60%, 55%)",
    "hsl(270, 50%, 60%)",
    "hsl(215, 80%, 70%)",
    "hsl(195, 60%, 65%)",
  ];
  const colors = killSwitchActive ? killColors : normalColors;

  return (
    <g style={{ pointerEvents: "none" }}>
      {particles.map((p, i) => {
        const radius = p.baseRadius * scale;
        const color = colors[i % colors.length];
        return (
          <circle
            key={`orbit-${i}`}
            cx={CORE_X + radius}
            cy={CORE_Y}
            r={p.size * Math.max(1, scale * 0.6)}
            fill={color}
            opacity={killSwitchActive ? p.opacity * 2.5 : p.opacity}
            filter={p.useGlow || killSwitchActive ? (killSwitchActive ? "url(#killGlow)" : "url(#particleGlow)") : undefined}
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`${p.startAngle} ${CORE_X} ${CORE_Y}`}
              to={`${p.startAngle + (p.reverse ? -360 : 360)} ${CORE_X} ${CORE_Y}`}
              dur={`${p.dur}s`}
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values={`${killSwitchActive ? p.opacity * 2 : p.opacity};${killSwitchActive ? p.opacity * 3.5 : p.opacity * 2};${killSwitchActive ? p.opacity * 2 : p.opacity}`} dur={`${p.dur / 2}s`} repeatCount="indefinite" />
          </circle>
        );
      })}
    </g>
  );
}

function Stardust({ viewBox, killSwitchActive }: { viewBox: { x: number; y: number; w: number; h: number }; killSwitchActive?: boolean }) {
  const stars = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => {
      const fx = ((i * 173 + 29) % 100) / 100;
      const fy = ((i * 241 + 53) % 100) / 100;
      const size = 0.5 + ((i * 7) % 10) / 10;
      const dur = 2 + ((i * 13) % 60) / 10;
      const delay = ((i * 31) % 40) / 10;
      return { fx, fy, size, dur, delay };
    });
  }, []);

  return (
    <g style={{ pointerEvents: "none" }}>
      {stars.map((s, i) => (
        <circle
          key={`star-${i}`}
          cx={viewBox.x + s.fx * viewBox.w}
          cy={viewBox.y + s.fy * viewBox.h}
          r={s.size}
          fill={killSwitchActive ? "hsl(0, 70%, 50%)" : "hsl(215, 60%, 75%)"}
          opacity={0}
          filter={killSwitchActive ? "url(#killGlow)" : undefined}
        >
          <animate
            attributeName="opacity"
            values={killSwitchActive ? "0.1;0.6;0.1" : "0.05;0.35;0.05"}
            dur={`${s.dur}s`}
            begin={`${s.delay}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </g>
  );
}

function CoreEnergyRings({ viewBox, killSwitchActive }: { viewBox: { x: number; y: number; w: number; h: number }; killSwitchActive?: boolean }) {
  const scale = viewBox.w / DEFAULT_VIEWBOX.w;
  const maxR = Math.round(220 * scale);
  const rings = [
    { delay: "0s", dur: "6s" },
    { delay: "2s", dur: "6s" },
    { delay: "4s", dur: "6s" },
  ];
  const strokeColor = killSwitchActive ? "hsl(0, 70%, 50%)" : "hsl(215, 80%, 60%)";

  return (
    <g style={{ pointerEvents: "none" }}>
      {rings.map((ring, i) => (
        <circle
          key={`ring-${i}`}
          cx={CORE_X}
          cy={CORE_Y}
          r={30}
          fill="none"
          stroke={strokeColor}
          strokeWidth={killSwitchActive ? 1.5 : 1}
          opacity={0}
        >
          <animate attributeName="r" from="30" to={`${maxR}`} dur={ring.dur} begin={ring.delay} repeatCount="indefinite" />
          <animate attributeName="opacity" values={killSwitchActive ? "0.3;0.15;0" : "0.15;0.08;0"} dur={ring.dur} begin={ring.delay} repeatCount="indefinite" />
          <animate attributeName="stroke-width" from={killSwitchActive ? "2" : "1.5"} to="0.3" dur={ring.dur} begin={ring.delay} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
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

function ProgressArc({ cx, cy, r, progress, color }: { cx: number; cy: number; r: number; progress: number; color: string }) {
  const circumference = 2 * Math.PI * r;
  const strokeDash = circumference * (progress / 100);
  const strokeGap = circumference - strokeDash;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeDasharray={`${strokeDash} ${strokeGap}`}
      strokeDashoffset={circumference * 0.25}
      strokeLinecap="round"
      opacity={0.5}
      style={{ transition: "stroke-dasharray 1s ease" }}
    />
  );
}

function AgentNode({
  agent, x, y, onHover, onClick, onDoubleClick, isHovered, isSelected, hoveredId, selectedId, onDragStart, onDrag, onDragEnd, isDragging, connectSource, size, onResizeStart,
}: {
  agent: Agent; x: number; y: number;
  onHover: (a: Agent | null) => void;
  onClick: (a: Agent) => void;
  onDoubleClick: (a: Agent) => void;
  isHovered: boolean;
  isSelected: boolean;
  hoveredId: string | null;
  selectedId: string | null;
  onDragStart: (agentId: string, e: React.MouseEvent | React.TouchEvent) => void;
  onDrag: (e: React.MouseEvent | React.TouchEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  connectSource: string | null;
  size: number;
  onResizeStart: (agentId: string, e: React.MouseEvent) => void;
}) {
  const color = statusColor(agent.status);
  const active = isHovered || isSelected;
  const isConnectSource = connectSource === agent.id;
  const scale = active || isConnectSource ? 1.1 : 1;
  const anyFocused = hoveredId || selectedId;
  const dimmed = anyFocused && !active && !isConnectSource ? 0.35 : 1;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: dimmed, scale }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ cursor: isDragging ? "grabbing" : connectSource ? "crosshair" : "grab", transformOrigin: `${x}px ${y}px` }}
      onMouseEnter={() => { if (!isDragging) onHover(agent); }}
      onMouseLeave={() => { if (!isDragging) onHover(null); }}
      onMouseDown={(e) => { if (!connectSource) { e.stopPropagation(); onDragStart(agent.id, e); } }}
      onClick={(e) => { e.stopPropagation(); if (!isDragging) onClick(agent); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(agent); }}
    >
      {/* Connect source pulsing ring */}
      {isConnectSource && (
        <circle cx={x} cy={y} r={size + 20} fill="none" stroke="hsl(215, 80%, 60%)" strokeWidth={2} opacity={0.7}>
          <animate attributeName="r" values={`${size + 16};${size + 24};${size + 16}`} dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Selection ring */}
      {isSelected && !isConnectSource && (
        <circle cx={x} cy={y} r={size + 16} fill="none" stroke={color.bg} strokeWidth={1.5} strokeDasharray="6 3" opacity={0.6}>
          <animate attributeName="stroke-dashoffset" values="0;-18" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Soft glow */}
      <circle cx={x} cy={y} r={size + 12} fill={`${color.bg}`} opacity={active ? 0.08 : 0.04}>
        <animate attributeName="r" values={`${size + 8};${size + 14};${size + 8}`} dur="4s" repeatCount="indefinite" />
      </circle>
      {/* Progress arc */}
      <ProgressArc cx={x} cy={y} r={size + 4} progress={agent.progress} color={color.bg} />
      {/* Main circle */}
      <circle cx={x} cy={y} r={size} fill={`${color.bg}15`} stroke={isConnectSource ? "hsl(215, 80%, 60%)" : color.bg} strokeWidth={active || isConnectSource ? 2 : 1.5} opacity={0.9} />
      {/* Icon */}
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fontSize="16">
        {agent.icon}
      </text>
      {/* Agent name */}
      <text x={x} y={y + size + 16} textAnchor="middle" fill="hsl(0, 0%, 85%)" fontSize="10" fontFamily="-apple-system, Inter, sans-serif" fontWeight="600">
        {agent.name}
      </text>
      {/* Subtitle */}
      <text x={x} y={y + size + 27} textAnchor="middle" fill="hsl(0, 0%, 55%)" fontSize="7.5" fontFamily="-apple-system, Inter, sans-serif" fontStyle="italic" opacity="0.8">
        {agent.subtitle}
      </text>
      {/* Current task */}
      <text x={x} y={y + size + 38} textAnchor="middle" fill={color.bg} fontSize="7" fontFamily="JetBrains Mono" opacity="0.5">
        {agent.currentTask}
      </text>
      {/* Resize handle - visible on hover/selection */}
      {(active || isSelected) && (
        <g
          style={{ cursor: "nwse-resize" }}
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(agent.id, e); }}
        >
          <circle cx={x + size * 0.7} cy={y + size * 0.7} r={4} fill="hsl(215, 80%, 60%)" opacity={0.7} stroke="hsl(225, 12%, 10%)" strokeWidth={1} />
          <line x1={x + size * 0.7 - 2} y1={y + size * 0.7 + 2} x2={x + size * 0.7 + 2} y2={y + size * 0.7 - 2} stroke="white" strokeWidth={0.8} opacity={0.8} />
        </g>
      )}
    </motion.g>
  );
}

function AnimatedEdge({
  x1, y1, x2, y2, color, weight, highlighted, pathId, kind, onDelete, edgeId, killSwitchActive,
}: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; weight: number; highlighted: boolean; pathId: string; kind: string;
  onDelete?: (edgeId: string) => void; edgeId: string; killSwitchActive?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const midX = useMemo(() => (x1 + x2) / 2 + (Math.sin(x1 + y1) * 15), [x1, x2, y1]);
  const midY = useMemo(() => (y1 + y2) / 2 + (Math.cos(x2 + y2) * 15), [y1, y2, x2]);
  const path = `M${x1},${y1} Q${midX},${midY} ${x2},${y2}`;
  const dur = highlighted ? 3 + weight : 5 + weight;

  const actualMidX = 0.25 * x1 + 0.5 * midX + 0.25 * x2;
  const actualMidY = 0.25 * y1 + 0.5 * midY + 0.25 * y2;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <path d={path} fill="none" stroke="transparent" strokeWidth={12} style={{ cursor: "pointer" }} />
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
      {highlighted && (
        <text fontSize="7" fontFamily="JetBrains Mono" fill={color} opacity="0.7" letterSpacing="1">
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {kind.toUpperCase()}
          </textPath>
        </text>
      )}
      {!killSwitchActive && (
        <>
          <circle r={highlighted ? 2.5 : 1.5} fill={color} opacity="0">
            <animateMotion dur={`${dur}s`} repeatCount="indefinite">
              <mpath href={`#${pathId}`} />
            </animateMotion>
            <animate attributeName="opacity" values={`0;${highlighted ? 0.7 : 0.35};${highlighted ? 0.7 : 0.35};0`} keyTimes="0;0.1;0.9;1" dur={`${dur}s`} repeatCount="indefinite" />
          </circle>
          {/* Reverse particle */}
          <circle r={highlighted ? 2 : 1.2} fill={color} opacity="0">
            <animateMotion dur={`${dur * 1.3}s`} repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear">
              <mpath href={`#${pathId}`} />
            </animateMotion>
            <animate attributeName="opacity" values={`0;${highlighted ? 0.5 : 0.2};${highlighted ? 0.5 : 0.2};0`} keyTimes="0;0.1;0.9;1" dur={`${dur * 1.3}s`} repeatCount="indefinite" />
          </circle>
          {/* Comet trail */}
          <circle r={highlighted ? 5 : 3} fill={color} opacity="0" filter="url(#particleGlow)">
            <animateMotion dur={`${dur}s`} repeatCount="indefinite">
              <mpath href={`#${pathId}`} />
            </animateMotion>
            <animate attributeName="opacity" values={`0;${highlighted ? 0.15 : 0.06};${highlighted ? 0.15 : 0.06};0`} keyTimes="0;0.1;0.9;1" dur={`${dur}s`} repeatCount="indefinite" />
          </circle>
        </>
      )}
      {hovered && onDelete && (
        <g style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onDelete(edgeId); }}>
          <circle cx={actualMidX} cy={actualMidY} r={8} fill="hsl(0, 60%, 45%)" opacity={0.9} />
          <line x1={actualMidX - 3} y1={actualMidY - 3} x2={actualMidX + 3} y2={actualMidY + 3} stroke="white" strokeWidth={1.5} />
          <line x1={actualMidX + 3} y1={actualMidY - 3} x2={actualMidX - 3} y2={actualMidY + 3} stroke="white" strokeWidth={1.5} />
        </g>
      )}
    </g>
  );
}

function RotatingCoreText() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % CORE_TAGLINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <text x={CORE_X} y={CORE_Y + 62} textAnchor="middle" fontSize="8" fontFamily="JetBrains Mono" fill="hsl(215, 80%, 60%)">
      {CORE_TAGLINES.map((line, i) => (
        <tspan key={line} opacity={i === index ? 1 : 0} style={{ transition: "opacity 0.8s ease" }}>
          {i === index ? line : ""}
        </tspan>
      ))}
    </text>
  );
}

function Minimap({
  agents,
  edges,
  positions,
  viewBox,
  setViewBox,
  getNodeSize,
}: {
  agents: Agent[];
  edges: Edge[];
  positions: Record<string, { x: number; y: number }>;
  viewBox: { x: number; y: number; w: number; h: number };
  setViewBox: React.Dispatch<React.SetStateAction<{ x: number; y: number; w: number; h: number }>>;
  getNodeSize: (agent: Agent) => number;
}) {
  const MINIMAP_W = 160;
  const MINIMAP_H = 120;

  // Compute bounding box of all positions
  const bounds = useMemo(() => {
    const allPos = Object.values(positions);
    if (allPos.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    const pad = 60;
    return {
      minX: Math.min(...allPos.map((p) => p.x)) - pad,
      minY: Math.min(...allPos.map((p) => p.y)) - pad,
      maxX: Math.max(...allPos.map((p) => p.x)) + pad,
      maxY: Math.max(...allPos.map((p) => p.y)) + pad,
    };
  }, [positions]);

  const bw = bounds.maxX - bounds.minX;
  const bh = bounds.maxY - bounds.minY;
  const minimapVB = `${bounds.minX} ${bounds.minY} ${bw} ${bh}`;

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / rect.width;
      const fy = (e.clientY - rect.top) / rect.height;
      const graphX = bounds.minX + fx * bw;
      const graphY = bounds.minY + fy * bh;
      setViewBox((prev) => ({
        ...prev,
        x: graphX - prev.w / 2,
        y: graphY - prev.h / 2,
      }));
    },
    [bounds, bw, bh, setViewBox]
  );

  // Viewport rect mapped to minimap coords
  const vpX = viewBox.x;
  const vpY = viewBox.y;
  const vpW = viewBox.w;
  const vpH = viewBox.h;

  return (
    <div className="absolute bottom-3 left-3 z-10 glass-panel neon-border overflow-hidden" style={{ width: MINIMAP_W, height: MINIMAP_H, opacity: 0.85 }}>
      <svg
        viewBox={minimapVB}
        width={MINIMAP_W}
        height={MINIMAP_H}
        style={{ display: "block", cursor: "crosshair" }}
        onClick={handleClick}
      >
        {/* Edges */}
        {edges.map((edge) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return null;
          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="hsl(215, 80%, 60%)"
              strokeWidth={1}
              opacity={0.15}
            />
          );
        })}

        {/* Core */}
        {positions.core && (
          <circle cx={positions.core.x} cy={positions.core.y} r={5} fill="hsl(215, 80%, 60%)" opacity={0.6} />
        )}

        {/* Nodes */}
        {agents.map((agent) => {
          const pos = positions[agent.id];
          if (!pos) return null;
          const color = statusColor(agent.status);
          return (
            <circle
              key={agent.id}
              cx={pos.x}
              cy={pos.y}
              r={3}
              fill={color.bg}
              opacity={0.8}
            />
          );
        })}

        {/* Viewport rectangle */}
        <rect
          x={vpX}
          y={vpY}
          width={vpW}
          height={vpH}
          fill="hsl(215, 80%, 60%)"
          fillOpacity={0.08}
          stroke="hsl(215, 80%, 60%)"
          strokeWidth={2}
          strokeOpacity={0.5}
          rx={2}
        />
      </svg>
    </div>
  );
}

interface AgentGraphProps {
  agents: Agent[];
  edges: Edge[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  onAddEdge: (from: string, to: string, kind: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onDeleteAgent?: (id: string) => void;
  killSwitchActive?: boolean;
}

export default function AgentGraph({ agents, edges, selectedAgentId, onSelectAgent, onAddEdge, onDeleteEdge, onDeleteAgent, killSwitchActive = false }: AgentGraphProps) {
  const { killAll, reviveAll, dragOffsets: contextDragOffsets, nodeSizes: contextNodeSizes, setDragOffsets: contextSetDragOffsets, setNodeSizes: contextSetNodeSizes } = useAgents();
  const basePositions = useMemo(() => getNodePositions(agents), [agents]);
  const dragOffsets = contextDragOffsets;
  const setDragOffsets = contextSetDragOffsets;
  const nodeSizes = contextNodeSizes;
  const setNodeSizes = contextSetNodeSizes;
  const [hovered, setHovered] = useState<Agent | null>(null);
  const [mouse, setMouse] = useState({ x: 400, y: 300 });
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ agentId: string; startMouse: { x: number; y: number }; startPos: { x: number; y: number }; moved: boolean } | null>(null);

  // Zoom & Pan state
  const [viewBox, setViewBox] = useState(DEFAULT_VIEWBOX);
  const panRef = useRef<{ startMouse: { x: number; y: number }; startViewBox: typeof DEFAULT_VIEWBOX } | null>(null);

  // Resize ref
  const resizeRef = useRef<{ agentId: string; startDist: number; startSize: number } | null>(null);

  // Kill switch animation state
  const [killProgress, setKillProgress] = useState(killSwitchActive ? 1 : 0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const from = killProgress;
    const to = killSwitchActive ? 1 : 0;
    const duration = 1500;
    if (from === to) return;
    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setKillProgress(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [killSwitchActive]);

  // Connect mode state
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [pendingEdge, setPendingEdge] = useState<{ from: string; to: string } | null>(null);
  const [selectedKind, setSelectedKind] = useState<string>("data");
  const [locked, setLocked] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const positions = useMemo(() => {
    const merged: Record<string, { x: number; y: number }> = {};
    for (const key in basePositions) {
      const base = basePositions[key];
      const offset = dragOffsets[key];
      merged[key] = offset ? { x: base.x + offset.x, y: base.y + offset.y } : base;
    }
    return merged;
  }, [basePositions, dragOffsets]);

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w,
      y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h,
    };
  }, [viewBox]);

  // Get node size (custom or default)
  const getNodeSize = useCallback((agent: Agent) => {
    return nodeSizes[agent.id] ?? (20 + agent.backlogCount * 1.5);
  }, [nodeSizes]);

  // Delete confirmation state
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDeleteAgent = pendingDeleteId ? agents.find((a) => a.id === pendingDeleteId) : null;

  // ESC to cancel connect mode, Delete/Backspace to delete selected node
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConnectMode(false);
        setConnectSource(null);
        setPendingEdge(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedAgentId && !connectMode && onDeleteAgent) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        setPendingDeleteId(selectedAgentId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedAgentId, connectMode, onDeleteAgent]);

  // Zoom with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (locked) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // Cursor position as fraction of SVG element
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;

    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;

    setViewBox((prev) => {
      const newW = Math.min(MAX_W, Math.max(MIN_W, prev.w * zoomFactor));
      const newH = newW * (600 / 800); // maintain aspect ratio
      // Zoom centered on cursor
      const newX = prev.x + (prev.w - newW) * fx;
      const newY = prev.y + (prev.h - newH) * fy;
      return { x: newX, y: newY, w: newW, h: newH };
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const pt = getSvgPoint(e.clientX, e.clientY);
    setMouse(pt);

    // Resize mode
    if (resizeRef.current) {
      const { agentId, startDist, startSize } = resizeRef.current;
      const pos = positions[agentId];
      if (pos) {
        const dist = Math.sqrt((pt.x - pos.x) ** 2 + (pt.y - pos.y) ** 2);
        const delta = dist - startDist;
        const newSize = Math.min(60, Math.max(15, startSize + delta));
        setNodeSizes((prev) => ({ ...prev, [agentId]: newSize }));
      }
      return;
    }

    // Pan mode
    if (panRef.current) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const { startMouse, startViewBox } = panRef.current;
      // Use client coords for panning to avoid feedback loop
      const dx = ((e.clientX - startMouse.x) / rect.width) * startViewBox.w;
      const dy = ((e.clientY - startMouse.y) / rect.height) * startViewBox.h;
      setViewBox({
        ...startViewBox,
        x: startViewBox.x - dx,
        y: startViewBox.y - dy,
      });
      return;
    }

    // Node drag
    if (dragRef.current) {
      const { agentId, startMouse, startPos } = dragRef.current;
      const dx = pt.x - startMouse.x;
      const dy = pt.y - startMouse.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
      setDragOffsets((prev) => ({
        ...prev,
        [agentId]: { x: startPos.x + dx, y: startPos.y + dy },
      }));
    }
  }, [getSvgPoint, positions]);

  const handleDragStart = useCallback((agentId: string, e: React.MouseEvent | React.TouchEvent) => {
    if (connectMode || locked) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const pt = getSvgPoint(clientX, clientY);
    const currentOffset = dragOffsets[agentId] || { x: 0, y: 0 };
    dragRef.current = { agentId, startMouse: pt, startPos: currentOffset, moved: false };
  }, [getSvgPoint, dragOffsets, connectMode]);

  const handleResizeStart = useCallback((agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const pt = getSvgPoint(e.clientX, e.clientY);
    const pos = positions[agentId];
    if (!pos) return;
    const dist = Math.sqrt((pt.x - pos.x) ** 2 + (pt.y - pos.y) ** 2);
    const agent = agents.find((a) => a.id === agentId);
    const currentSize = agent ? getNodeSize(agent) : 20;
    resizeRef.current = { agentId, startDist: dist, startSize: currentSize };
  }, [getSvgPoint, positions, agents, getNodeSize]);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
  }, []);

  // Background mouse down → start panning
  const handleBgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (locked) return;
    // Only pan if clicking directly on SVG background (not on a node)
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'rect') {
      panRef.current = {
        startMouse: { x: e.clientX, y: e.clientY },
        startViewBox: { ...viewBox },
      };
    }
  }, [viewBox, locked]);

  const isDragging = dragRef.current !== null;

  const handleNodeClick = useCallback((agent: Agent) => {
    if (dragRef.current?.moved) return;

    if (connectMode) {
      if (!connectSource) {
        setConnectSource(agent.id);
      } else if (connectSource !== agent.id) {
        setPendingEdge({ from: connectSource, to: agent.id });
        setConnectSource(null);
      }
      return;
    }

    onSelectAgent(selectedAgentId === agent.id ? null : agent.id);
  }, [selectedAgentId, onSelectAgent, connectMode, connectSource]);

  const handleNodeDoubleClick = useCallback((agent: Agent) => {
    if (dragRef.current?.moved) return;
    setConnectMode(true);
    setConnectSource(agent.id);
  }, []);

  const handleConfirmEdge = useCallback(() => {
    if (pendingEdge) {
      onAddEdge(pendingEdge.from, pendingEdge.to, selectedKind);
      setPendingEdge(null);
      setSelectedKind("data");
    }
  }, [pendingEdge, selectedKind, onAddEdge]);

  const handleCancelEdge = useCallback(() => {
    setPendingEdge(null);
    setSelectedKind("data");
  }, []);

  const handleBgClick = useCallback(() => {
    if (dragRef.current?.moved || panRef.current) return;
    if (connectMode) {
      setConnectSource(null);
      return;
    }
    if (selectedAgentId) onSelectAgent(null);
  }, [selectedAgentId, onSelectAgent, connectMode]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
    panRef.current = null;
  }, [handleDragEnd]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setViewBox((prev) => {
      const newW = Math.max(MIN_W, prev.w * 0.8);
      const newH = newW * (600 / 800);
      return { x: prev.x + (prev.w - newW) * 0.5, y: prev.y + (prev.h - newH) * 0.5, w: newW, h: newH };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setViewBox((prev) => {
      const newW = Math.min(MAX_W, prev.w * 1.25);
      const newH = newW * (600 / 800);
      return { x: prev.x + (prev.w - newW) * 0.5, y: prev.y + (prev.h - newH) * 0.5, w: newW, h: newH };
    });
  }, []);

  const resetView = useCallback(() => {
    setViewBox(DEFAULT_VIEWBOX);
  }, []);

  const parallaxX = (mouse.x - (viewBox.x + viewBox.w / 2)) * 0.01;
  const parallaxY = (mouse.y - (viewBox.y + viewBox.h / 2)) * 0.01;

  const hoveredId = hovered?.id ?? null;
  const focusId = hoveredId || selectedAgentId;
  const connectedIds = useMemo(() => {
    if (!focusId) return new Set<string>();
    const ids = new Set<string>();
    edges.forEach((e) => {
      if (e.from === focusId) ids.add(e.to);
      if (e.to === focusId) ids.add(e.from);
    });
    return ids;
  }, [focusId, edges]);

  const onlineCount = agents.filter((a) => a.status !== "down").length;
  const displayAgent = hovered || (selectedAgentId ? agents.find((a) => a.id === selectedAgentId) : null);
  const draggingId = dragRef.current?.agentId ?? null;

  const zoomPercent = Math.round((DEFAULT_VIEWBOX.w / viewBox.w) * 100);

  return (
    <div className="relative w-full h-full glass-panel overflow-hidden">
      {/* Connect mode toggle */}
      <button
        onClick={() => {
          setConnectMode(!connectMode);
          setConnectSource(null);
          setPendingEdge(null);
        }}
        className={`absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono tracking-wider transition-all ${
          connectMode
            ? "border-primary bg-primary/20 text-primary shadow-[0_0_12px_hsl(215,80%,60%,0.3)]"
            : "border-border/30 bg-secondary/30 text-muted-foreground hover:border-border/50 hover:bg-secondary/50"
        }`}
        title={connectMode ? "Exit connect mode (ESC)" : "Connect nodes"}
      >
        <Link className="w-3 h-3" />
        {connectMode ? "CONNECTING…" : "CONNECT"}
      </button>

      {/* Connect mode instructions */}
      {connectMode && !connectSource && !pendingEdge && (
        <div className="absolute top-3 left-28 z-10 px-2.5 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-[10px] font-mono text-primary">
          Click source node
        </div>
      )}
      {connectMode && connectSource && !pendingEdge && (
        <div className="absolute top-3 left-28 z-10 px-2.5 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-[10px] font-mono text-primary">
          Click target node
        </div>
      )}

      {/* Kind selector popup */}
      {pendingEdge && (
        <div className="absolute top-14 left-3 z-20 glass-panel neon-border p-3 w-48">
          <div className="text-[10px] font-mono text-muted-foreground mb-2">CONNECTION TYPE</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {EDGE_KINDS.map((kind) => (
              <button
                key={kind}
                onClick={() => setSelectedKind(kind)}
                className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all ${
                  selectedKind === kind
                    ? "bg-primary/20 text-primary border border-primary/50"
                    : "bg-secondary/30 text-muted-foreground border border-border/30 hover:border-border/50"
                }`}
              >
                {kind}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleConfirmEdge}
              className="flex-1 px-2 py-1 rounded text-[10px] font-mono bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30 transition-colors"
            >
              CONFIRM
            </button>
            <button
              onClick={handleCancelEdge}
              className="px-2 py-1 rounded text-[10px] font-mono bg-secondary/30 text-muted-foreground border border-border/30 hover:border-border/50 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <button
          onClick={zoomIn}
          disabled={locked}
          className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/30 bg-secondary/30 text-muted-foreground hover:border-border/50 hover:bg-secondary/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center justify-center h-5 text-[9px] font-mono text-muted-foreground">
          {zoomPercent}%
        </div>
        <button
          onClick={zoomOut}
          disabled={locked}
          className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/30 bg-secondary/30 text-muted-foreground hover:border-border/50 hover:bg-secondary/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetView}
          disabled={locked}
          className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/30 bg-secondary/30 text-muted-foreground hover:border-border/50 hover:bg-secondary/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Reset view"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setLocked((l) => !l)}
          className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
            locked
              ? "border-primary/60 bg-primary/20 text-primary hover:bg-primary/30"
              : "border-border/30 bg-secondary/30 text-muted-foreground hover:border-border/50 hover:bg-secondary/50"
          }`}
          title={locked ? "Unlock view" : "Lock view"}
        >
          {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => killSwitchActive ? reviveAll() : killAll()}
          className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
            killSwitchActive
              ? "border-red-500/60 bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "border-border/30 bg-secondary/30 text-muted-foreground hover:border-border/50 hover:bg-secondary/50"
          }`}
          title={killSwitchActive ? "Revive all agents" : "Kill all agents"}
        >
          <Power className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setConfigOpen(true)}
          className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/30 bg-secondary/30 text-muted-foreground hover:border-border/50 hover:bg-secondary/50 transition-colors"
          title="Save/Load configurations"
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseDown={handleBgMouseDown}
        onClick={handleBgClick}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: panRef.current ? 'grabbing' : 'default' }}
      >
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={killSwitchActive ? "hsl(0, 70%, 50%)" : "hsl(215, 80%, 60%)"} stopOpacity={killSwitchActive ? "0.5" : "0.3"} />
            <stop offset="50%" stopColor={killSwitchActive ? "hsl(0, 70%, 50%)" : "hsl(215, 80%, 60%)"} stopOpacity={killSwitchActive ? "0.15" : "0.08"} />
            <stop offset="100%" stopColor={killSwitchActive ? "hsl(0, 70%, 50%)" : "hsl(215, 80%, 60%)"} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cursorGlow" cx={(mouse.x - viewBox.x) / viewBox.w} cy={(mouse.y - viewBox.y) / viewBox.h} r="0.3">
            <stop offset="0%" stopColor={killSwitchActive ? "hsl(0, 70%, 50%)" : "hsl(215, 80%, 60%)"} stopOpacity="0.06" />
            <stop offset="100%" stopColor={killSwitchActive ? "hsl(0, 70%, 50%)" : "hsl(215, 80%, 60%)"} stopOpacity="0" />
          </radialGradient>
          <filter id="blur"><feGaussianBlur stdDeviation="4" /></filter>
          <filter id="particleGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="killGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={killSwitchActive ? "hsl(0, 30%, 14%)" : "hsl(225, 10%, 14%)"} strokeWidth="0.4" />
          </pattern>
        </defs>

        <g style={{ transform: `translate(${parallaxX}px, ${parallaxY}px)` }}>
          <rect x={viewBox.x - viewBox.w} y={viewBox.y - viewBox.h} width={viewBox.w * 3} height={viewBox.h * 3} fill="url(#grid)" />
        </g>
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="url(#cursorGlow)" style={{ pointerEvents: "none" }} />

        {/* Solar system effects */}
        <Stardust viewBox={viewBox} killSwitchActive={killSwitchActive} />
        <OrbitalParticles viewBox={viewBox} killSwitchActive={killSwitchActive} />
        <CoreEnergyRings viewBox={viewBox} killSwitchActive={killSwitchActive} />

        {edges.map((edge) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return null;
          const fromAgent = agents.find((a) => a.id === edge.from);
          const color = killSwitchActive ? "hsl(0, 70%, 50%)" : (fromAgent ? statusColor(fromAgent.status).bg : "hsl(215, 80%, 60%)");
          const highlighted = focusId ? (edge.from === focusId || edge.to === focusId) : false;
          return (
            <AnimatedEdge
              pathId={`edge-${edge.id}`}
              key={edge.id}
              edgeId={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              color={color}
              weight={edge.weight}
              highlighted={highlighted}
              kind={edge.kind}
              onDelete={killSwitchActive ? undefined : onDeleteEdge}
              killSwitchActive={killSwitchActive}
            />
          );
        })}

        <FloatingGroup index={99} isHovered={false}>
          <circle cx={CORE_X} cy={CORE_Y} r="65" fill="url(#coreGlow)" filter="url(#blur)">
            <animate attributeName="r" values="60;70;60" dur="5s" repeatCount="indefinite" />
          </circle>
          <circle cx={CORE_X} cy={CORE_Y} r="32" fill="hsl(225, 12%, 10%)" stroke={killSwitchActive ? "hsl(0, 70%, 50%)" : "hsl(215, 80%, 60%)"} strokeWidth={killSwitchActive ? "2.5" : "1.5"} opacity="0.9">
            <animate attributeName="r" values="30;34;30" dur="5s" repeatCount="indefinite" />
          </circle>
          <circle cx={CORE_X} cy={CORE_Y} r="6" fill={killSwitchActive ? "hsl(0, 70%, 55%)" : "hsl(215, 80%, 65%)"}>
            <animate attributeName="opacity" values={killSwitchActive ? "0.5;1;0.5" : "0.7;1;0.7"} dur={killSwitchActive ? "1.5s" : "3s"} repeatCount="indefinite" />
          </circle>
          <text x={CORE_X} y={CORE_Y + 50} textAnchor="middle" fill={killSwitchActive ? "hsl(0, 70%, 60%)" : "hsl(0, 0%, 75%)"} fontSize="10" fontFamily="-apple-system, Inter, sans-serif" fontWeight="600" letterSpacing="2">
            {killSwitchActive ? "⚠ SYSTEM KILLED" : "SOLO OS CORE"}
          </text>
          {!killSwitchActive && <RotatingCoreText />}
          {killSwitchActive && (
            <text x={CORE_X} y={CORE_Y + 62} textAnchor="middle" fontSize="8" fontFamily="JetBrains Mono" fill="hsl(0, 70%, 50%)" opacity="0.8">
              all agents terminated
            </text>
          )}
          <text x={CORE_X} y={CORE_Y - 48} textAnchor="middle" fill={killSwitchActive ? "hsl(0, 60%, 55%)" : "hsl(152, 60%, 48%)"} fontSize="8" fontFamily="JetBrains Mono" opacity="0.6">
            {onlineCount}/{agents.length} ONLINE
          </text>
        </FloatingGroup>

        {agents.map((agent, i) => {
          const pos = positions[agent.id];
          const isHovered = hoveredId === agent.id;
          const isSelected = selectedAgentId === agent.id;
          const isNodeDragging = draggingId === agent.id;
          const nodeSize = getNodeSize(agent);
          return (
            <FloatingGroup key={agent.id} index={i} isHovered={isHovered || isSelected || isNodeDragging}>
              <AgentNode
                agent={agent}
                x={pos.x}
                y={pos.y}
                onHover={setHovered}
                onClick={handleNodeClick}
                onDoubleClick={handleNodeDoubleClick}
                isHovered={isHovered}
                isSelected={isSelected}
                hoveredId={hoveredId}
                selectedId={selectedAgentId}
                onDragStart={handleDragStart}
                onDrag={() => {}}
                onDragEnd={handleDragEnd}
                isDragging={isNodeDragging}
                connectSource={connectMode ? connectSource : null}
                size={nodeSize}
                onResizeStart={handleResizeStart}
              />
            </FloatingGroup>
          );
        })}
      </svg>

      {displayAgent && !connectMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-14 right-3 glass-panel neon-border p-4 w-64"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{displayAgent.icon}</span>
            <div>
              <h3 className="font-display font-semibold text-sm text-foreground">{displayAgent.name}</h3>
              <span className="text-[10px] font-mono text-muted-foreground italic">{displayAgent.subtitle}</span>
            </div>
          </div>
          <span className={`text-xs font-mono ${
            displayAgent.status === 'healthy' ? 'status-healthy' :
            displayAgent.status === 'degraded' ? 'status-degraded' :
            displayAgent.status === 'down' ? 'status-down' : 'status-active'
          }`}>{displayAgent.status.toUpperCase()}</span>
          <div className="space-y-1 text-xs font-mono text-muted-foreground mt-2">
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

      {/* Minimap */}
      <Minimap
        agents={agents}
        edges={edges}
        positions={positions}
        viewBox={viewBox}
        setViewBox={setViewBox}
        getNodeSize={getNodeSize}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {pendingDeleteAgent?.icon} <strong>{pendingDeleteAgent?.name}</strong>? This will also remove all connections and events for this agent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId && onDeleteAgent) {
                  const name = pendingDeleteAgent?.name;
                  onDeleteAgent(pendingDeleteId);
                  toast({ title: "Agent deleted", description: `${name} has been removed.` });
                  setPendingDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ConfigManager open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
