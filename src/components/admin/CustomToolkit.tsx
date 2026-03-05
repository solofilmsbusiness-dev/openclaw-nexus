import { useState } from "react";
import { useSettings, type CustomTool } from "@/contexts/SettingsContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Plus, Trash2, ExternalLink, Code, Webhook, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const TOOL_ICONS = ["🔧", "⚡", "🚀", "📡", "🔗", "📊", "🎯", "💡", "🛠️", "📌", "🧩", "🔥"];
const TOOL_COLORS = [
  "hsl(215, 80%, 60%)",
  "hsl(152, 60%, 48%)",
  "hsl(270, 50%, 60%)",
  "hsl(350, 65%, 55%)",
  "hsl(38, 70%, 55%)",
  "hsl(195, 60%, 55%)",
];

const TYPE_META = {
  link: { icon: ExternalLink, label: "Link", placeholder: "https://example.com" },
  snippet: { icon: Code, label: "Code Snippet", placeholder: "console.log('hello')" },
  webhook: { icon: Webhook, label: "Webhook", placeholder: "https://hooks.example.com/trigger" },
};

export default function CustomToolkit() {
  const { customTools, addCustomTool, removeCustomTool, updateCustomTool } = useSettings();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    icon: "🔧",
    type: "link" as CustomTool["type"],
    value: "",
    color: TOOL_COLORS[0],
  });

  const resetForm = () => {
    setForm({ name: "", icon: "🔧", type: "link", value: "", color: TOOL_COLORS[0] });
    setShowAdd(false);
  };

  const handleAdd = () => {
    if (!form.name.trim() || !form.value.trim()) {
      toast.error("Name and value are required");
      return;
    }
    addCustomTool({
      id: `tool-${Date.now()}`,
      name: form.name.trim(),
      icon: form.icon,
      type: form.type,
      value: form.value.trim(),
      color: form.color,
    });
    toast.success(`Tool "${form.name}" created`);
    resetForm();
  };

  const handleExecute = (tool: CustomTool) => {
    switch (tool.type) {
      case "link":
        window.open(tool.value, "_blank", "noopener");
        break;
      case "snippet":
        navigator.clipboard.writeText(tool.value);
        toast.success("Snippet copied to clipboard");
        break;
      case "webhook":
        fetch(tool.value, { method: "POST", body: JSON.stringify({ source: "solo-os", ts: Date.now() }) })
          .then(() => toast.success(`Webhook fired: ${tool.name}`))
          .catch(() => toast.error("Webhook failed"));
        break;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-xs text-foreground">Custom Toolkit</span>
          <span className="text-[9px] font-mono text-muted-foreground">{customTools.length} tools</span>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          className="h-7 text-xs font-mono bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Tool
        </Button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
              <div className="flex gap-2">
                {/* Icon picker */}
                <Select value={form.icon} onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}>
                  <SelectTrigger className="w-16 bg-secondary/30 border-border/30">
                    <SelectValue>{form.icon}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TOOL_ICONS.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Tool name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="bg-secondary/30 border-border/30 text-sm font-mono flex-1"
                />
              </div>

              {/* Type select */}
              <Select value={form.type} onValueChange={(v: CustomTool["type"]) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-secondary/30 border-border/30 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_META) as CustomTool["type"][]).map((t) => (
                    <SelectItem key={t} value={t} className="text-xs font-mono">
                      {TYPE_META[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value */}
              <Input
                placeholder={TYPE_META[form.type].placeholder}
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                className="bg-secondary/30 border-border/30 text-sm font-mono"
              />

              {/* Color */}
              <div className="flex gap-1.5">
                {TOOL_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      form.color === c ? "scale-125 border-foreground/50" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAdd} size="sm" className="text-xs font-mono bg-primary/20 text-primary border border-primary/40">
                  <Check className="w-3 h-3 mr-1" /> Create
                </Button>
                <Button onClick={resetForm} size="sm" variant="ghost" className="text-xs font-mono">
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tool list */}
      {customTools.length === 0 && !showAdd ? (
        <div className="text-center py-8 text-muted-foreground">
          <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs font-mono">No custom tools yet</p>
          <p className="text-[9px] text-muted-foreground mt-1">Create links, code snippets, or webhooks</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence>
            {customTools.map((tool) => {
              const TypeIcon = TYPE_META[tool.type].icon;
              return (
                <motion.div
                  key={tool.id}
                  layout
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-border/20 bg-secondary/20 hover:bg-secondary/40 transition-colors group"
                >
                  <span className="text-lg" style={{ filter: "saturate(1.2)" }}>{tool.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-semibold text-foreground truncate">{tool.name}</span>
                      <TypeIcon className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <p className="text-[9px] text-muted-foreground truncate">{tool.value}</p>
                  </div>
                  <div
                    className="w-2 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: tool.color, opacity: 0.6 }}
                  />
                  <button
                    onClick={() => handleExecute(tool)}
                    className="px-2 py-1 rounded text-[9px] font-mono bg-primary/10 text-primary hover:bg-primary/20 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Run
                  </button>
                  <button
                    onClick={() => removeCustomTool(tool.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
