import { useState, useCallback, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { SAMPLE_EVENTS, statusColor, AGENTS } from "@/data/agents";

export default function InteractiveTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, offset: 0 });

  const events = useMemo(() =>
    SAMPLE_EVENTS.map(e => ({
      ...e,
      time: new Date(e.ts).getTime(),
      agent: AGENTS.find(a => a.id === e.agentId),
    })),
    []
  );

  const minTime = Math.min(...events.map(e => e.time));
  const maxTime = Math.max(...events.map(e => e.time));
  const range = maxTime - minTime || 1;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const newZoom = Math.max(0.5, Math.min(4, zoom + (e.deltaY > 0 ? -0.15 : 0.15)));
    setZoom(newZoom);
  }, [zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, offset };
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    setOffset(dragStart.current.offset + dx);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  return (
    <div
      ref={containerRef}
      className="glass-panel neon-border h-full overflow-hidden flex flex-col cursor-grab active:cursor-grabbing select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg viewBox="0 0 1000 60" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="timelineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(45, 100%, 50%)" stopOpacity="0" />
            <stop offset="20%" stopColor="hsl(45, 100%, 50%)" stopOpacity="0.6" />
            <stop offset="80%" stopColor="hsl(45, 100%, 50%)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(45, 100%, 50%)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gold axis line */}
        <line x1="40" y1="35" x2="960" y2="35" stroke="url(#timelineGrad)" strokeWidth="1.5" />

        {/* Tick marks */}
        {Array.from({ length: 13 }, (_, i) => {
          const x = 40 + (i / 12) * 920;
          const t = new Date(minTime + (i / 12) * range);
          return (
            <g key={i}>
              <line x1={x} y1="30" x2={x} y2="40" stroke="hsl(45, 80%, 35%)" strokeWidth="0.8" />
              <text x={x} y="52" textAnchor="middle" fill="hsl(40, 8%, 45%)" fontSize="7" fontFamily="JetBrains Mono">
                {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </text>
            </g>
          );
        })}

        {/* Event markers */}
        {events.map((event) => {
          const normalized = (event.time - minTime) / range;
          const x = 40 + normalized * 920 * zoom + offset * 0.5;
          if (x < 20 || x > 980) return null;
          const color = event.agent ? statusColor(event.agent.status) : statusColor("healthy");
          const isHovered = hoveredEvent === event.id;

          return (
            <g
              key={event.id}
              onMouseEnter={() => setHoveredEvent(event.id)}
              onMouseLeave={() => setHoveredEvent(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Glow on hover */}
              {isHovered && (
                <circle cx={x} cy={35} r="12" fill={color.bg} opacity="0.15">
                  <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Dot */}
              <circle
                cx={x}
                cy={35}
                r={isHovered ? 5 : 3.5}
                fill={color.bg}
                stroke="hsl(0, 0%, 3%)"
                strokeWidth="1.5"
                style={{ transition: "r 0.2s" }}
              />
              {/* Tooltip */}
              {isHovered && (
                <>
                  <rect x={x - 70} y={2} width="140" height="22" rx="4" fill="hsl(0, 0%, 8%)" stroke={color.bg} strokeWidth="0.5" opacity="0.95" />
                  <text x={x} y={16} textAnchor="middle" fill="hsl(40, 10%, 88%)" fontSize="7" fontFamily="JetBrains Mono">
                    {event.agentName}: {event.message.slice(0, 30)}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Label */}
        <text x="10" y="12" fill="hsl(45, 100%, 50%)" fontSize="7" fontFamily="Space Grotesk" fontWeight="600" opacity="0.6">
          TIMELINE
        </text>
      </svg>
    </div>
  );
}
