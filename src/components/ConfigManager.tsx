import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAgents, type LayoutData } from "@/contexts/AgentContext";
import { toast } from "sonner";
import { Save, FolderOpen, Trash2, Pencil, Loader2 } from "lucide-react";
import type { Agent, Edge } from "@/data/agents";

interface GraphConfig {
  id: string;
  name: string;
  project: string;
  agents_data: Agent[];
  edges_data: Edge[];
  created_at: string;
  updated_at: string;
}

interface ConfigManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigManager({ open, onOpenChange }: ConfigManagerProps) {
  const { agents, edges, dragOffsets, nodeSizes, loadConfig } = useAgents();
  const [configs, setConfigs] = useState<GraphConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editProject, setEditProject] = useState("");

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("graph_configs")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Error loading configs", { description: error.message });
    } else {
      setConfigs((data as unknown as GraphConfig[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchConfigs();
  }, [open, fetchConfigs]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in to save configs");
      setSaving(false);
      return;
    }
    const payload = {
      user_id: user.id,
      name: name.trim(),
      project: project.trim(),
      agents_data: JSON.parse(JSON.stringify({ agents, layout: { dragOffsets, nodeSizes } })),
      edges_data: JSON.parse(JSON.stringify(edges)),
    };
    const { error } = await supabase.from("graph_configs").insert(payload);
    if (error) {
      toast.error("Save failed", { description: error.message });
    } else {
      toast.success("Configuration saved");
      setName("");
      setProject("");
      fetchConfigs();
    }
    setSaving(false);
  };

  const handleLoad = (config: GraphConfig) => {
    const agentsData = config.agents_data as unknown as { agents?: Agent[]; layout?: LayoutData } | Agent[];
    const edgesData = config.edges_data as unknown as Edge[];
    if (agentsData && typeof agentsData === "object" && !Array.isArray(agentsData) && agentsData.agents) {
      loadConfig(agentsData.agents as Agent[], edgesData as Edge[], agentsData.layout);
    } else {
      loadConfig(agentsData as Agent[], edgesData as Edge[]);
    }
    toast.success(`Loaded "${config.name}"`);
    onOpenChange(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("graph_configs").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed", { description: error.message });
    } else {
      setConfigs((prev) => prev.filter((c) => c.id !== id));
      toast.success("Configuration deleted");
    }
  };

  const handleUpdate = async (id: string) => {
    const { error } = await supabase
      .from("graph_configs")
      .update({ name: editName.trim(), project: editProject.trim(), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Update failed", { description: error.message });
    } else {
      setEditingId(null);
      fetchConfigs();
      toast.success("Configuration updated");
    }
  };

  // Group configs by project
  const grouped = configs.reduce<Record<string, GraphConfig[]>>((acc, c) => {
    const key = c.project || "Ungrouped";
    (acc[key] = acc[key] || []).push(c);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-wider uppercase text-foreground">
            Graph Configurations
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="save" className="mt-2">
          <TabsList className="w-full bg-secondary/50">
            <TabsTrigger value="save" className="flex-1 text-xs font-mono">Save</TabsTrigger>
            <TabsTrigger value="load" className="flex-1 text-xs font-mono">Load</TabsTrigger>
          </TabsList>

          <TabsContent value="save" className="space-y-3 mt-3">
            <Input
              placeholder="Configuration name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary/30 border-border/30 text-sm font-mono"
            />
            <Input
              placeholder="Project (optional)"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="bg-secondary/30 border-border/30 text-sm font-mono"
            />
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="w-full bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 font-mono text-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
              Save Current Config
            </Button>
          </TabsContent>

          <TabsContent value="load" className="mt-3">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
              </div>
            ) : configs.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs font-mono py-8">No saved configurations</p>
            ) : (
              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {Object.entries(grouped).map(([proj, items]) => (
                  <div key={proj}>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <FolderOpen className="w-3 h-3" /> {proj}
                    </p>
                    <div className="space-y-1.5">
                      {items.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-2 p-2 rounded-lg border border-border/20 bg-secondary/20 hover:bg-secondary/40 transition-colors group"
                        >
                          {editingId === c.id ? (
                            <div className="flex-1 flex gap-1.5">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-7 text-xs bg-secondary/30 border-border/30 font-mono"
                              />
                              <Input
                                value={editProject}
                                onChange={(e) => setEditProject(e.target.value)}
                                placeholder="Project"
                                className="h-7 text-xs bg-secondary/30 border-border/30 font-mono w-24"
                              />
                              <Button size="sm" onClick={() => handleUpdate(c.id)} className="h-7 text-xs px-2 bg-primary/20 text-primary border border-primary/30">
                                OK
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs px-2">
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleLoad(c)}
                                className="flex-1 text-left"
                              >
                                <span className="text-xs font-mono text-foreground">{c.name}</span>
                                <span className="text-[10px] text-muted-foreground ml-2">
                                  {new Date(c.updated_at).toLocaleDateString()}
                                </span>
                              </button>
                              <button
                                onClick={() => { setEditingId(c.id); setEditName(c.name); setEditProject(c.project); }}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
