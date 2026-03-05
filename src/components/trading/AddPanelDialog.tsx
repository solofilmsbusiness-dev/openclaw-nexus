import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Globe, CheckSquare, RotateCcw } from "lucide-react";
import { useTradingLayout, type CustomPanelType, type BuiltinPanelId } from "@/contexts/TradingLayoutContext";

const BUILTIN_LABELS: Record<BuiltinPanelId, string> = {
  market: "Live Market Data",
  agent: "Trading Agent",
  history: "Trade History",
  journal: "Learning Journal",
  portfolio: "Portfolio Summary",
  watchlist: "Watchlist",
  analytics: "Analytics",
};

export default function AddPanelDialog() {
  const { addCustomPanel, hiddenBuiltins, restorePanel } = useTradingLayout();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CustomPanelType>("notes");
  const [embedUrl, setEmbedUrl] = useState("");

  const handleCreate = () => {
    if (!title.trim()) return;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    addCustomPanel({
      id,
      title: title.trim(),
      type,
      content: type === "embed" ? embedUrl : type === "checklist" ? "[]" : "",
    });
    setTitle("");
    setEmbedUrl("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs font-mono border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5">
          <Plus className="w-3.5 h-3.5" /> Add Panel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-sm">Add Panel</DialogTitle>
        </DialogHeader>

        {/* Restore hidden builtins */}
        {hiddenBuiltins.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Restore hidden panels:</p>
            <div className="flex flex-wrap gap-1.5">
              {hiddenBuiltins.map((id) => (
                <Button key={id} variant="secondary" size="sm" className="text-[10px] gap-1 h-7" onClick={() => { restorePanel(id); setOpen(false); }}>
                  <RotateCcw className="w-3 h-3" /> {BUILTIN_LABELS[id as BuiltinPanelId] || id}
                </Button>
              ))}
            </div>
            <div className="border-t border-border/30 my-2" />
          </div>
        )}

        {/* Create custom */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-mono">Title</Label>
            <Input className="mt-1 h-8 text-xs" placeholder="My Custom Panel" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-mono">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as CustomPanelType)}>
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notes"><span className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> Notes</span></SelectItem>
                <SelectItem value="embed"><span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> Embed (URL)</span></SelectItem>
                <SelectItem value="checklist"><span className="flex items-center gap-1.5"><CheckSquare className="w-3 h-3" /> Checklist</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "embed" && (
            <div>
              <Label className="text-xs font-mono">URL</Label>
              <Input className="mt-1 h-8 text-xs" placeholder="https://..." value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} />
            </div>
          )}
          <Button className="w-full" size="sm" onClick={handleCreate} disabled={!title.trim()}>
            Create Panel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
