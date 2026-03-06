import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trash2, Palette, StickyNote, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { IdeaNode } from "@/hooks/useIdeas";

const NODE_COLORS = [
  "hsl(195, 60%, 55%)", "hsl(152, 60%, 48%)", "hsl(270, 50%, 60%)",
  "hsl(38, 70%, 55%)", "hsl(215, 80%, 60%)", "hsl(0, 60%, 55%)",
  "hsl(330, 50%, 55%)", "hsl(60, 50%, 48%)",
];

interface Props {
  node: IdeaNode | null;
  isGenerating: boolean;
  onExpand: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<IdeaNode, "notes" | "color" | "details">>) => void;
  onDelete: (id: string) => void;
}

export default function IdeaDetailPanel({ node, isGenerating, onExpand, onUpdate, onDelete }: Props) {
  const [notes, setNotes] = useState("");
  const [showColors, setShowColors] = useState(false);

  useEffect(() => {
    setNotes(node?.notes || "");
    setShowColors(false);
  }, [node?.id]);

  if (!node) {
    return (
      <div className="w-64 flex-shrink-0 glass-panel rounded-none border-l border-t-0 border-b-0 border-r-0 flex items-center justify-center">
        <div className="text-center space-y-2 px-4">
          <ChevronRight className="w-5 h-5 text-muted-foreground/30 mx-auto" />
          <p className="text-[10px] text-muted-foreground/50 font-mono">Select a node to view details</p>
        </div>
      </div>
    );
  }

  const isCenter = node.parent_node_id === null;

  return (
    <div className="w-64 flex-shrink-0 glass-panel rounded-none border-l border-t-0 border-b-0 border-r-0 flex flex-col h-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={node.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="flex flex-col h-full"
        >
          {/* Header */}
          <div className="p-4 border-b border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: node.color || "hsl(215, 80%, 60%)" }} />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                {isCenter ? "Central Concept" : "Idea Node"}
              </span>
            </div>
            <h3 className="font-display font-semibold text-sm text-foreground leading-snug">{node.content}</h3>
          </div>

          {/* Description */}
          <div className="p-4 border-b border-border/30">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1.5 block">Description</label>
            <p className="text-xs text-foreground/80 leading-relaxed">{node.details || "No description"}</p>
          </div>

          {/* Actions */}
          <div className="p-4 border-b border-border/30 space-y-2">
            <Button
              onClick={() => onExpand(node.id)}
              disabled={isGenerating}
              size="sm"
              className="w-full h-8 text-xs gap-1.5 bg-primary/15 text-primary hover:bg-primary/25 border-0"
            >
              <Sparkles className="w-3 h-3" />
              {isGenerating ? "Expanding..." : "Expand Further"}
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowColors(!showColors)}
                size="sm"
                variant="ghost"
                className="flex-1 h-8 text-xs gap-1.5 text-muted-foreground"
              >
                <Palette className="w-3 h-3" /> Color
              </Button>
              <Button
                onClick={() => onDelete(node.id)}
                size="sm"
                variant="ghost"
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>

            {showColors && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="flex flex-wrap gap-1.5 pt-1">
                {NODE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => onUpdate(node.id, { color: c })}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: node.color === c ? "hsl(var(--foreground))" : "transparent" }}
                  />
                ))}
              </motion.div>
            )}
          </div>

          {/* Notes */}
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-center gap-1.5 mb-2">
              <StickyNote className="w-3 h-3 text-muted-foreground" />
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Notes</label>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== node.notes) onUpdate(node.id, { notes });
              }}
              placeholder="Add your notes here..."
              className="flex-1 min-h-[80px] text-xs bg-secondary/30 border-border/30 resize-none"
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
