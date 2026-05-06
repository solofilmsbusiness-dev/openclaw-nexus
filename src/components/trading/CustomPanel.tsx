import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Globe, CheckSquare, Network, Calculator, ExternalLink, Clapperboard } from "lucide-react";
import type { CustomPanelDef } from "@/contexts/TradingLayoutContext";
import { useTradingLayout } from "@/contexts/TradingLayoutContext";
import MiniAgentGraph from "./MiniAgentGraph";
import CalculatorPanel from "./CalculatorPanel";
import HyperFramesPanel from "./HyperFramesPanel";

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export default function CustomPanel({ panel }: { panel: CustomPanelDef }) {
  const { updateCustomPanel } = useTradingLayout();

  const iconMap: Record<string, React.ReactNode> = {
    notes: <FileText className="w-3.5 h-3.5" />,
    embed: <Globe className="w-3.5 h-3.5" />,
    checklist: <CheckSquare className="w-3.5 h-3.5" />,
    graph: <Network className="w-3.5 h-3.5" />,
    calculator: <Calculator className="w-3.5 h-3.5" />,
    hyperframes: <Clapperboard className="w-3.5 h-3.5" />,
  };
  const icon = iconMap[panel.type] ?? <FileText className="w-3.5 h-3.5" />;

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
      {panel.type === "graph" && <MiniAgentGraph />}
      {panel.type === "calculator" && <CalculatorPanel />}
      {panel.type === "hyperframes" && <HyperFramesPanel />}
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
  const [failed, setFailed] = useState(false);

  if (!panel.content) return <p className="text-xs text-muted-foreground font-mono text-center py-8">No URL set</p>;

  return (
    <div className="flex-1 flex flex-col gap-1.5 min-h-[200px] relative">
      {!failed ? (
        <iframe
          src={panel.content}
          className="flex-1 rounded-lg border border-border/20"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="no-referrer"
          title={panel.title}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex-1 rounded-lg border border-border/20 bg-secondary/30 flex flex-col items-center justify-center gap-2 p-4">
          <Globe className="w-6 h-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground font-mono text-center">This site doesn't allow embedding.</p>
          <a
            href={panel.content}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
          >
            Open in new tab <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
      <a
        href={panel.content}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] font-mono text-muted-foreground hover:text-primary flex items-center gap-1 self-end transition-colors"
      >
        Open in new tab <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
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
