import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { GripVertical, X } from "lucide-react";
import type { PanelItem } from "@/contexts/TradingLayoutContext";
import { useTradingLayout } from "@/contexts/TradingLayoutContext";

interface PanelWrapperProps {
  item: PanelItem;
  onRemove: (id: string) => void;
  children: React.ReactNode;
  className?: string;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

export default function PanelWrapper({ item, onRemove, children, className = "", gridRef }: PanelWrapperProps) {
  const layout = useTradingLayout();
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const getCellFromPoint = useCallback((x: number, y: number): { row: number; col: number; panelId: string | null } | null => {
    if (!gridRef.current) return null;
    const grid = gridRef.current;
    const gridRect = grid.getBoundingClientRect();
    const cols = layout.columnCount;
    const gap = 12; // gap-3 = 12px
    const cellWidth = (gridRect.width - gap * (cols - 1)) / cols;
    
    // Find all panel elements to determine row heights
    const panelElements = grid.querySelectorAll<HTMLElement>('[data-panel-id]');
    const rows: { top: number; bottom: number }[] = [];
    
    panelElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const relTop = rect.top - gridRect.top + grid.scrollTop;
      const relBottom = relTop + rect.height;
      // Find or create row
      let found = false;
      for (const row of rows) {
        if (Math.abs(row.top - relTop) < 20) {
          row.bottom = Math.max(row.bottom, relBottom);
          found = true;
          break;
        }
      }
      if (!found) rows.push({ top: relTop, bottom: relBottom });
    });
    rows.sort((a, b) => a.top - b.top);

    const relX = x - gridRect.left;
    const relY = y - gridRect.top + grid.scrollTop;

    const col = Math.max(0, Math.min(cols - 1, Math.floor(relX / (cellWidth + gap))));
    let row = 0;
    for (let i = 0; i < rows.length; i++) {
      if (relY >= rows[i].top - gap / 2) row = i;
    }

    // Find which panel is at this position
    const targetPanel = layout.panels.find((p) => p.row === row && p.col === col && p.id !== item.id);
    return { row, col, panelId: targetPanel?.id ?? null };
  }, [gridRef, layout.columnCount, layout.panels, item.id]);

  const handleDragEnd = useCallback((_: any, info: { point: { x: number; y: number } }) => {
    setIsDragging(false);
    setHoverTarget(null);
    const target = getCellFromPoint(info.point.x, info.point.y);
    if (target) {
      if (target.panelId) {
        layout.swapPanels(item.id, target.panelId);
      } else {
        layout.movePanelTo(item.id, target.row, target.col);
      }
    }
  }, [getCellFromPoint, layout, item.id]);

  const handleDrag = useCallback((_: any, info: { point: { x: number; y: number } }) => {
    const target = getCellFromPoint(info.point.x, info.point.y);
    setHoverTarget(target?.panelId ?? null);
  }, [getCellFromPoint]);

  const isDropTarget = hoverTarget === item.id;

  return (
    <motion.div
      ref={panelRef}
      data-panel-id={item.id}
      layout
      layoutId={item.id}
      className={`glass-panel neon-border ${layout.compactMode ? "p-2" : "p-4"} flex flex-col min-h-0 relative group/panel ${className} ${
        isDragging ? "z-50 shadow-2xl shadow-primary/20" : "z-0"
      } ${isDropTarget ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-background" : ""}`}
      style={{
        gridRow: item.row + 1,
        gridColumn: item.col + 1,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: isDragging ? 1.03 : 1,
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {/* Drag handle + remove button — in flow, not absolute */}
      <div className={`flex items-center justify-end gap-0.5 opacity-0 group-hover/panel:opacity-100 transition-opacity z-10 -mr-1 ${layout.compactMode ? "-mt-0.5 -mb-0.5" : "-mt-1 -mb-1"}`}>
        <motion.button
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1 rounded cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/50 transition-colors touch-none"
          style={{ touchAction: "none" }}
          drag
          dragSnapToOrigin
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          whileDrag={{ scale: 1.1 }}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </motion.button>
        <button
          onClick={() => onRemove(item.id)}
          className="p-1 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className={`flex-1 flex flex-col min-h-0 ${layout.compactMode ? "compact-panel" : ""}`}>
        {children}
      </div>
    </motion.div>
  );
}
