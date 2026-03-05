import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { statusColor, type Agent, type Edge } from "@/data/agents";
import { Link, X } from "lucide-react";

const CORE_X = 400;
const CORE_Y = 300;
const RADIUS = 250;

const EDGE_KINDS = ["control", "data", "comms", "handoff"] as const;

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
  agent, x, y, onHover, onClick, onDoubleClick, isHovered, isSelected, hoveredId, selectedId, onDragStart, onDrag, onDragEnd, isDragging, connectSource,
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
}) {
  const color = statusColor(agent.status);
  const size = 20 + agent.backlogCount * 1.5;
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
      {/* Progress readout */}
      <text x={x} y={y - size - 8} textAnchor="middle" fill={color.bg} fontSize="8" fontFamily="JetBrains Mono" fontWeight="600" opacity={active ? 0.9 : 0.4}>
        {agent.progress}%
      </text>
    </motion.g>
  );
}

function AnimatedEdge({
  x1, y1, x2, y2, color, weight, highlighted, pathId, kind, onDelete, edgeId,
}: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; weight: number; highlighted: boolean; pathId: string; kind: string;
  onDelete?: (edgeId: string) => void; edgeId: string;
}) {
  const [hovered, setHovered] = useState(false);
  const midX = useMemo(() => (x1 + x2) / 2 + (Math.sin(x1 + y1) * 15), [x1, x2, y1]);
  const midY = useMemo(() => (y1 + y2) / 2 + (Math.cos(x2 + y2) * 15), [y1, y2, x2]);
  const path = `M${x1},${y1} Q${midX},${midY} ${x2},${y2}`;
  const dur = highlighted ? 3 + weight : 5 + weight;

  // Calculate actual midpoint on the quadratic bezier
  const actualMidX = 0.25 * x1 + 0.5 * midX + 0.25 * x2;
  const actualMidY = 0.25 * y1 + 0.5 * midY + 0.25 * y2;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Invisible wider hit area */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        style={{ cursor: "pointer" }}
      />
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
      {/* Edge kind label on highlight */}
      {highlighted && (
        <text fontSize="7" fontFamily="JetBrains Mono" fill={color} opacity="0.7" letterSpacing="1">
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {kind.toUpperCase()}
          </textPath>
        </text>
      )}
      <circle r={highlighted ? 2.5 : 1.5} fill={color} opacity="0">
        <animateMotion dur={`${dur}s`} repeatCount="indefinite">
          <mpath href={`#${pathId}`} />
        </animateMotion>
        <animate attributeName="opacity" values={`0;${highlighted ? 0.7 : 0.35};${highlighted ? 0.7 : 0.35};0`} keyTimes="0;0.1;0.9;1" dur={`${dur}s`} repeatCount="indefinite" />
      </circle>
      {/* Delete button at midpoint */}
      {hovered && onDelete && (
        <g
          style={{ cursor: "pointer" }}
          onClick={(e) => { e.stopPropagation(); onDelete(edgeId); }}
        >
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

interface AgentGraphProps {
  agents: Agent[];
  edges: Edge[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  onAddEdge: (from: string, to: string, kind: string) => void;
  onDeleteEdge: (edgeId: string) => void;
}

export default function AgentGraph({ agents, edges, selectedAgentId, onSelectAgent, onAddEdge, onDeleteEdge }: AgentGraphProps) {
  const basePositions = useMemo(() => getNodePositions(agents), [agents]);
  const [dragOffsets, setDragOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [hovered, setHovered] = useState<Agent | null>(null);
  const [mouse, setMouse] = useState({ x: 400, y: 300 });
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ agentId: string; startMouse: { x: number; y: number }; startPos: { x: number; y: number }; moved: boolean } | null>(null);

  // Connect mode state
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [pendingEdge, setPendingEdge] = useState<{ from: string; to: string } | null>(null);
  const [selectedKind, setSelectedKind] = useState<string>("data");

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
      x: ((clientX - rect.left) / rect.width) * 800,
      y: ((clientY - rect.top) / rect.height) * 600,
    };
  }, []);

  // ESC to cancel connect mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConnectMode(false);
        setConnectSource(null);
        setPendingEdge(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const pt = getSvgPoint(e.clientX, e.clientY);
    setMouse(pt);

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
  }, [getSvgPoint]);

  const handleDragStart = useCallback((agentId: string, e: React.MouseEvent | React.TouchEvent) => {
    if (connectMode) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const pt = getSvgPoint(clientX, clientY);
    const currentOffset = dragOffsets[agentId] || { x: 0, y: 0 };
    dragRef.current = { agentId, startMouse: pt, startPos: currentOffset, moved: false };
  }, [getSvgPoint, dragOffsets, connectMode]);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

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
    if (dragRef.current?.moved) return;
    if (connectMode) {
      setConnectSource(null);
      return;
    }
    if (selectedAgentId) onSelectAgent(null);
  }, [selectedAgentId, onSelectAgent, connectMode]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const parallaxX = (mouse.x - 400) * 0.01;
  const parallaxY = (mouse.y - 300) * 0.01;

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

      <svg ref={svgRef} viewBox="0 0 800 600" className="w-full h-full" onMouseMove={handleMouseMove} onClick={handleBgClick} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
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

        {edges.map((edge) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return null;
          const fromAgent = agents.find((a) => a.id === edge.from);
          const color = fromAgent ? statusColor(fromAgent.status).bg : "hsl(215, 80%, 60%)";
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
              onDelete={onDeleteEdge}
            />
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
          {/* Core title */}
          <text x={CORE_X} y={CORE_Y + 50} textAnchor="middle" fill="hsl(0, 0%, 75%)" fontSize="10" fontFamily="-apple-system, Inter, sans-serif" fontWeight="600" letterSpacing="2">
            SOLO OS CORE
          </text>
          {/* Rotating tagline */}
          <RotatingCoreText />
          {/* Online count */}
          <text x={CORE_X} y={CORE_Y - 48} textAnchor="middle" fill="hsl(152, 60%, 48%)" fontSize="8" fontFamily="JetBrains Mono" opacity="0.6">
            {onlineCount}/{agents.length} ONLINE
          </text>
        </FloatingGroup>

        {agents.map((agent, i) => {
          const pos = positions[agent.id];
          const isHovered = hoveredId === agent.id;
          const isSelected = selectedAgentId === agent.id;
          const isNodeDragging = draggingId === agent.id;
          return (
            <FloatingGroup key={agent.id} index={i} isHovered={isHovered || isSelected || isNodeDragging}>
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
                onDragStart={handleDragStart}
                onDrag={() => {}}
                onDragEnd={handleDragEnd}
                isDragging={isNodeDragging}
                connectSource={connectMode ? connectSource : null}
              />
            </FloatingGroup>
          );
        })}
      </svg>

      {displayAgent && !connectMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-4 right-4 glass-panel neon-border p-4 w-64"
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
    </div>
  );
}
