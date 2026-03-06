import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { IdeaNode, IdeaEdge } from "@/hooks/useIdeas";

const DEFAULT_VB = { x: 0, y: 0, w: 800, h: 600 };
const MIN_W = 200;
const MAX_W = 2400;

interface Props {
  nodes: IdeaNode[];
  edges: IdeaEdge[];
  selectedNodeId: string | null;
  isGenerating: boolean;
  onSelectNode: (id: string | null) => void;
  onDoubleClickNode: (id: string) => void;
  onUpdateNodePosition: (id: string, x: number, y: number) => void;
}

export default function IdeaGraph({ nodes, edges, selectedNodeId, isGenerating, onSelectNode, onDoubleClickNode, onUpdateNodePosition }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState(DEFAULT_VB);
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; vbX: number; vbY: number } | null>(null);

  const svgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM()?.inverse();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm);
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(vb => {
      const newW = Math.min(MAX_W, Math.max(MIN_W, vb.w * factor));
      const ratio = newW / vb.w;
      const newH = vb.h * ratio;
      const mx = (e.clientX - svgRef.current!.getBoundingClientRect().left) / svgRef.current!.getBoundingClientRect().width;
      const my = (e.clientY - svgRef.current!.getBoundingClientRect().top) / svgRef.current!.getBoundingClientRect().height;
      return { x: vb.x + (vb.w - newW) * mx, y: vb.y + (vb.h - newH) * my, w: newW, h: newH };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = (e.target as SVGElement).closest("[data-node-id]");
    if (target) {
      const nodeId = target.getAttribute("data-node-id")!;
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      const pt = svgPoint(e.clientX, e.clientY);
      setDragging({ nodeId, offsetX: pt.x - node.position_x, offsetY: pt.y - node.position_y });
      onSelectNode(nodeId);
    } else {
      setPanning({ startX: e.clientX, startY: e.clientY, vbX: viewBox.x, vbY: viewBox.y });
      onSelectNode(null);
    }
  }, [nodes, svgPoint, viewBox, onSelectNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const pt = svgPoint(e.clientX, e.clientY);
      onUpdateNodePosition(dragging.nodeId, pt.x - dragging.offsetX, pt.y - dragging.offsetY);
    } else if (panning) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = viewBox.w / rect.width;
      const scaleY = viewBox.h / rect.height;
      setViewBox(vb => ({
        ...vb,
        x: panning.vbX - (e.clientX - panning.startX) * scaleX,
        y: panning.vbY - (e.clientY - panning.startY) * scaleY,
      }));
    }
  }, [dragging, panning, svgPoint, viewBox, onUpdateNodePosition]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setPanning(null);
  }, []);

  // Auto-fit when nodes change significantly
  useEffect(() => {
    if (nodes.length === 0) {
      setViewBox(DEFAULT_VB);
      return;
    }
    const xs = nodes.map(n => n.position_x);
    const ys = nodes.map(n => n.position_y);
    const minX = Math.min(...xs) - 100;
    const maxX = Math.max(...xs) + 100;
    const minY = Math.min(...ys) - 100;
    const maxY = Math.max(...ys) + 100;
    const w = Math.max(400, maxX - minX);
    const h = Math.max(300, maxY - minY);
    setViewBox({ x: minX, y: minY, w, h });
  }, [nodes.length]);

  const centerNode = nodes.length > 0 ? nodes[0] : null;

  return (
    <div className="flex-1 relative overflow-hidden bg-background/30">
      {nodes.length === 0 && !isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-secondary/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-xs text-muted-foreground/50 font-mono">Enter a topic and generate ideas</p>
          </div>
        </div>
      )}

      {isGenerating && nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-full bg-neon-orange/10 flex items-center justify-center animate-pulse">
              <svg className="w-10 h-10 text-neon-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-xs text-muted-foreground font-mono animate-pulse">Generating concepts...</p>
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="w-full h-full"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: panning ? "grabbing" : dragging ? "move" : "default" }}
      >
        <defs>
          <filter id="idea-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="idea-glow-strong">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Edges */}
        {edges.map(edge => {
          const from = nodes.find(n => n.id === edge.from_node_id);
          const to = nodes.find(n => n.id === edge.to_node_id);
          if (!from || !to) return null;
          const mx = (from.position_x + to.position_x) / 2;
          const my = (from.position_y + to.position_y) / 2;
          const cx = mx + (Math.random() - 0.5) * 20;
          const cy = my + (Math.random() - 0.5) * 20;
          const pathD = `M ${from.position_x} ${from.position_y} Q ${cx} ${cy} ${to.position_x} ${to.position_y}`;
          const toColor = to.color || "hsl(215, 80%, 60%)";

          return (
            <g key={edge.id}>
              <path d={pathD} fill="none" stroke={toColor} strokeWidth={1.5} strokeOpacity={0.25} />
              <path d={pathD} fill="none" stroke={toColor} strokeWidth={1} strokeOpacity={0.5} strokeDasharray="4 6">
                <animate attributeName="stroke-dashoffset" values="0;-20" dur="2s" repeatCount="indefinite" />
              </path>
              {/* Flowing particle */}
              <circle r="3" fill={toColor} opacity="0.7" filter="url(#idea-glow)">
                <animateMotion dur="3s" repeatCount="indefinite" path={pathD} />
              </circle>
            </g>
          );
        })}

        {/* Nodes */}
        <AnimatePresence>
          {nodes.map((node, i) => {
            const isCenter = i === 0 && node.parent_node_id === null;
            const isSelected = selectedNodeId === node.id;
            const color = node.color || (isCenter ? "hsl(215, 80%, 60%)" : "hsl(195, 60%, 55%)");
            const r = isCenter ? 40 : 28;

            return (
              <motion.g
                key={node.id}
                data-node-id={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25, delay: i * 0.06 }}
                style={{ cursor: "pointer" }}
                onDoubleClick={() => onDoubleClickNode(node.id)}
              >
                {/* Glow ring */}
                {isSelected && (
                  <circle cx={node.position_x} cy={node.position_y} r={r + 8} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.4} strokeDasharray="4 4">
                    <animate attributeName="stroke-dashoffset" values="0;-16" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Outer glow */}
                <circle cx={node.position_x} cy={node.position_y} r={r + 4} fill={color} fillOpacity={0.08} filter="url(#idea-glow)" />

                {/* Main circle */}
                <circle
                  cx={node.position_x} cy={node.position_y} r={r}
                  fill={color} fillOpacity={isCenter ? 0.2 : 0.15}
                  stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} strokeOpacity={isSelected ? 0.9 : 0.5}
                />

                {/* Inner pulse for center */}
                {isCenter && isGenerating && (
                  <circle cx={node.position_x} cy={node.position_y} r={r - 5} fill={color} fillOpacity={0.3}>
                    <animate attributeName="r" values={`${r - 10};${r - 2};${r - 10}`} dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="fill-opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Text */}
                <foreignObject
                  x={node.position_x - r + 4}
                  y={node.position_y - r / 2}
                  width={(r - 4) * 2}
                  height={r}
                  style={{ pointerEvents: "none" }}
                >
                  <div className="flex items-center justify-center h-full px-1">
                    <span
                      className="text-center font-display leading-tight"
                      style={{
                        fontSize: isCenter ? "9px" : "7.5px",
                        color: "hsl(var(--foreground))",
                        display: "-webkit-box",
                        WebkitLineClamp: isCenter ? 3 : 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        wordBreak: "break-word",
                      }}
                    >
                      {node.content}
                    </span>
                  </div>
                </foreignObject>
              </motion.g>
            );
          })}
        </AnimatePresence>

        {/* Ambient particles */}
        {nodes.length > 0 && Array.from({ length: 8 }).map((_, i) => {
          const cx = centerNode ? centerNode.position_x : 400;
          const cy = centerNode ? centerNode.position_y : 300;
          const baseR = 80 + (i * 40);
          const dur = 15 + i * 5;
          return (
            <circle key={`ambient-${i}`} r="1.5" fill="hsl(var(--primary))" opacity={0.15}>
              <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`${i % 2 === 0 ? 360 : -360} ${cx} ${cy}`} dur={`${dur}s`} repeatCount="indefinite" />
              <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={`M ${cx + baseR} ${cy} A ${baseR} ${baseR} 0 1 1 ${cx + baseR - 0.01} ${cy}`} />
            </circle>
          );
        })}
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex gap-1">
        <button
          onClick={() => setViewBox(vb => {
            const newW = Math.max(MIN_W, vb.w * 0.8);
            const ratio = newW / vb.w;
            return { x: vb.x + (vb.w - newW) / 2, y: vb.y + (vb.h - vb.h * ratio) / 2, w: newW, h: vb.h * ratio };
          })}
          className="w-7 h-7 rounded-lg glass-panel flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-xs"
        >+</button>
        <button
          onClick={() => setViewBox(vb => {
            const newW = Math.min(MAX_W, vb.w * 1.2);
            const ratio = newW / vb.w;
            return { x: vb.x + (vb.w - newW) / 2, y: vb.y + (vb.h - vb.h * ratio) / 2, w: newW, h: vb.h * ratio };
          })}
          className="w-7 h-7 rounded-lg glass-panel flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-xs"
        >−</button>
      </div>
    </div>
  );
}
