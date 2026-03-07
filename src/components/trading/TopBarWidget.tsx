import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { GripVertical, X } from "lucide-react";
import type { TopBarItemId } from "@/contexts/TradingLayoutContext";
import { useTradingLayout } from "@/contexts/TradingLayoutContext";

interface TopBarWidgetProps {
  id: TopBarItemId;
  index: number;
  children: React.ReactNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function TopBarWidget({ id, index, children, containerRef }: TopBarWidgetProps) {
  const layout = useTradingLayout();
  const [isDragging, setIsDragging] = useState(false);

  const getTargetIndex = useCallback((x: number): number => {
    if (!containerRef.current) return index;
    const children = containerRef.current.querySelectorAll<HTMLElement>("[data-topbar-id]");
    let closest = index;
    let closestDist = Infinity;
    children.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(x - center);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    return closest;
  }, [containerRef, index]);

  const handleDragEnd = useCallback((_: any, info: { point: { x: number } }) => {
    setIsDragging(false);
    const targetIdx = getTargetIndex(info.point.x);
    if (targetIdx !== index) {
      layout.reorderTopBarItem(index, targetIdx);
    }
  }, [getTargetIndex, index, layout]);

  return (
    <motion.div
      data-topbar-id={id}
      className={`flex items-center gap-1.5 group/topwidget relative ${isDragging ? "z-50" : "z-0"}`}
      layout
      layoutId={`topbar-${id}`}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <motion.button
        className="p-0.5 rounded opacity-0 group-hover/topwidget:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground"
        style={{ touchAction: "none" }}
        drag="x"
        dragSnapToOrigin
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.1 }}
      >
        <GripVertical className="w-3 h-3" />
      </motion.button>
      {children}
      <button
        onClick={() => layout.toggleTopBarItem(id)}
        className="p-0.5 rounded opacity-0 group-hover/topwidget:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
