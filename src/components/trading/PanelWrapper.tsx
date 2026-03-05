import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, X } from "lucide-react";
import type { PanelItem } from "@/contexts/TradingLayoutContext";

interface PanelWrapperProps {
  item: PanelItem;
  onRemove: (id: string) => void;
  children: React.ReactNode;
  className?: string;
}

export default function PanelWrapper({ item, onRemove, children, className = "" }: PanelWrapperProps) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={item}
      dragControls={controls}
      dragListener={false}
      className={`glass-panel neon-border p-4 flex flex-col min-h-0 relative group/panel ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      {/* Drag handle + remove button */}
      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover/panel:opacity-100 transition-opacity z-10">
        <button
          onPointerDown={(e) => controls.start(e)}
          className="p-1 rounded cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/50 transition-colors touch-none"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onRemove(item.id)}
          className="p-1 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </Reorder.Item>
  );
}
