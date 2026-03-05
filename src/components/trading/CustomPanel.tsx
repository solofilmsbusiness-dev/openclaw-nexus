import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Globe, CheckSquare } from "lucide-react";
import type { CustomPanelDef } from "@/contexts/TradingLayoutContext";
import { useTradingLayout } from "@/contexts/TradingLayoutContext";

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export default function CustomPanel({ panel }: { panel: CustomPanelDef }) {
  const { updateCustomPanel } = useTradingLayout();

  const icon = panel.type === "notes" ? <FileText className="w-3.5 h-3.5" /> : panel.type === "embed" ? <Globe className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />;

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="font-display font-semibold text-xs tracking-wide text-muted-foreground uppercase">{panel.title}</span>
        <span className="ml-auto text-muted-foreground">{icon}</span>
      </div>
      {panel.type === "notes" && <NotesContent panel={panel} onUpdate={updateCustomPanel} />}
      {panel.type === "embed" && <EmbedContent panel={panel} />}
      {panel.type === "checklist" && <ChecklistContent panel={panel} onUpdate={updateCustomPanel} />}
    </>
  );
}

function NotesContent({ panel, onUpdate }: { panel: CustomPanelDef; onUpdate: (id: string, c: string) => void }) {
  return (
    <Textarea
      className="flex-1 bg-secondary/30 border-border/20 text-xs font-mono resize-none min-h-[120px]"
      value={panel.content}
      onChange={(e) => onUpdate(panel.id, e.target.value)}
      placeholder="Type your notes here..."
    />
  );
}

function EmbedContent({ panel }: { panel: CustomPanelDef }) {
  if (!panel.content) return <p className="text-xs text-muted-foreground font-mono text-center py-8">No URL set</p>;
  return <iframe src={panel.content} className="flex-1 rounded-lg border border-border/20 min-h-[200px]" sandbox="allow-scripts allow-same-origin" title={panel.title} />;
}

function ChecklistContent({ panel, onUpdate }: { panel: CustomPanelDef; onUpdate: (id: string, c: string) => void }) {
  const items: ChecklistItem[] = (() => {
    try { return JSON.parse(panel.content || "[]"); } catch { return []; }
  })();
  const [newItem, setNewItem] = useState("");

  const save = (updated: ChecklistItem[]) => onUpdate(panel.id, JSON.stringify(updated));

  const toggle = (id: string) => save(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  const add = () => {
    if (!newItem.trim()) return;
    save([...items, { id: Math.random().toString(36).slice(2, 8), text: newItem.trim(), done: false }]);
    setNewItem("");
  };

  return (
    <div className="flex-1 flex flex-col gap-2">
      <div className="space-y-1.5 flex-1">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-xs font-mono cursor-pointer">
            <Checkbox checked={item.done} onCheckedChange={() => toggle(item.id)} />
            <span className={item.done ? "line-through text-muted-foreground" : "text-foreground"}>{item.text}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          className="h-7 text-xs bg-secondary/30 border-border/20"
          placeholder="Add item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={add}><Plus className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}
