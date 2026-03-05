import { useRef } from "react";
import { useAgents } from "@/contexts/AgentContext";
import { Button } from "@/components/ui/button";
import { Download, Upload, Database } from "lucide-react";
import { toast } from "sonner";
import type { Agent, Edge } from "@/data/agents";

export default function DataManagement() {
  const { agents, edges, dragOffsets, nodeSizes, loadConfig } = useAgents();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const payload = {
      version: "solo-os-2.26",
      exportedAt: new Date().toISOString(),
      agents,
      edges,
      layout: { dragOffsets, nodeSizes },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solo-os-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Configuration exported");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.agents || !data.edges) {
          toast.error("Invalid config file", { description: "Missing agents or edges data" });
          return;
        }
        loadConfig(data.agents as Agent[], data.edges as Edge[], data.layout);
        toast.success("Configuration imported", { description: `${data.agents.length} agents, ${data.edges.length} edges` });
      } catch {
        toast.error("Failed to parse config file");
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-4 h-4 text-primary" />
        <span className="font-display font-semibold text-xs text-foreground">Data Management</span>
      </div>

      {/* Export */}
      <div className="p-4 rounded-lg border border-border/20 bg-secondary/10 space-y-3">
        <div>
          <span className="text-xs font-display font-semibold text-foreground">Export Configuration</span>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Download current agents, edges, and layout as a JSON file
          </p>
        </div>
        <Button
          onClick={handleExport}
          className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 font-mono text-xs"
        >
          <Download className="w-3.5 h-3.5 mr-2" />
          Export to JSON
        </Button>
      </div>

      {/* Import */}
      <div className="p-4 rounded-lg border border-border/20 bg-secondary/10 space-y-3">
        <div>
          <span className="text-xs font-display font-semibold text-foreground">Import Configuration</span>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Load a previously exported JSON config file. This will replace the current graph.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="font-mono text-xs border-border/40"
        >
          <Upload className="w-3.5 h-3.5 mr-2" />
          Import from JSON
        </Button>
      </div>

      {/* Stats */}
      <div className="p-4 rounded-lg border border-border/20 bg-secondary/10">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">Current State</span>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Agents", value: agents.length },
            { label: "Edges", value: edges.length },
            { label: "Custom Positions", value: Object.keys(dragOffsets).length },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-mono font-semibold text-primary">{s.value}</div>
              <div className="text-[9px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
