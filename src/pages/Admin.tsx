import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAgents } from "@/contexts/AgentContext";
import { statusColor } from "@/data/agents";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Skull, HeartPulse, Pencil, Check, X, LogOut, ArrowLeft, Zap, Settings, User, Layout, Database, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ThemeSettings from "@/components/admin/ThemeSettings";
import NotificationSettings from "@/components/admin/NotificationSettings";
import UserManagement from "@/components/admin/UserManagement";
import SystemConfigSettings from "@/components/admin/SystemConfigSettings";
import ProfileSettings from "@/components/admin/ProfileSettings";
import LayoutSettings from "@/components/admin/LayoutSettings";
import DataManagement from "@/components/admin/DataManagement";
import CustomToolkit from "@/components/admin/CustomToolkit";

export default function Admin() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [killConfirm, setKillConfirm] = useState(false);

  const { agents, killAll, reviveAll, renameAgent } = useAgents();
  const allDown = agents.every((a) => a.status === "down");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      if (!isAdmin) {
        toast.error("Access denied — admin only");
        navigate("/");
        return;
      }
      setAuthorized(true);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      renameAgent(editingId, editName.trim());
      toast.success(`Agent renamed to "${editName.trim()}"`);
    }
    setEditingId(null);
    setEditName("");
  };

  const handleKill = () => {
    killAll();
    setKillConfirm(false);
    toast.error("☠️ KILL SWITCH ACTIVATED", { description: "All agents terminated" });
  };

  const handleRevive = () => {
    reviveAll();
    toast.success("All agents revived", { description: "Systems nominal" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="glass-panel rounded-none border-x-0 border-t-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold text-sm tracking-wide text-foreground">Admin Control</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">SOLO OS 2.26</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-muted-foreground">
            {allDown ? "⚠️ ALL SYSTEMS DOWN" : `✅ ${agents.filter(a => a.status !== "down").length}/${agents.length} ONLINE`}
          </span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 bg-secondary/30 text-muted-foreground hover:text-foreground text-[10px] font-mono tracking-wider transition-colors">
            <LogOut className="w-3 h-3" />
            LOGOUT
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Kill Switch Section */}
        <div className="glass-panel neon-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-destructive" />
            <h2 className="font-display font-semibold text-base text-foreground">System Override</h2>
          </div>
          <div className="flex gap-3">
            {!killConfirm ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setKillConfirm(true)}
                disabled={allDown}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-destructive/10 border-2 border-destructive/40 text-destructive font-mono text-sm tracking-wider uppercase hover:bg-destructive/20 hover:border-destructive/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Skull className="w-5 h-5" />
                KILL ALL AGENTS
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3"
              >
                <span className="font-mono text-xs text-destructive animate-pulse">⚠️ CONFIRM KILL?</span>
                <button onClick={handleKill} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-mono text-xs tracking-wider uppercase hover:bg-destructive/90 transition-colors">CONFIRM</button>
                <button onClick={() => setKillConfirm(false)} className="px-4 py-2 rounded-lg border border-border/30 bg-secondary/30 text-muted-foreground font-mono text-xs tracking-wider uppercase hover:bg-secondary/50 transition-colors">CANCEL</button>
              </motion.div>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRevive}
              disabled={!allDown}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neon-green/5 border-2 border-neon-green/30 font-mono text-sm tracking-wider uppercase hover:bg-neon-green/10 hover:border-neon-green/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: "hsl(152, 60%, 48%)" }}
            >
              <HeartPulse className="w-5 h-5" />
              REVIVE ALL
            </motion.button>
          </div>
        </div>

        {/* Agent Control Table */}
        <div className="glass-panel neon-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-base text-foreground">Agent Registry</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{agents.length} NODES</span>
          </div>
          <div className="space-y-1">
            <div className="hidden md:grid grid-cols-[40px_1fr_120px_140px_80px_60px] gap-3 px-3 py-2 text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
              <span>Icon</span><span>Name</span><span>Status</span><span>Task</span><span>Progress</span><span>Edit</span>
            </div>
            <AnimatePresence>
              {agents.map((agent, i) => {
                const color = statusColor(agent.status);
                const isEditing = editingId === agent.id;
                return (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`rounded-lg border transition-all ${agent.status === "down" ? "border-destructive/30 bg-destructive/5" : "border-border/20 hover:border-border/40 hover:bg-secondary/20"}`}
                  >
                    <div className="hidden md:grid grid-cols-[40px_1fr_120px_140px_80px_60px] gap-3 px-3 py-3">
                      <span className="text-lg flex items-center">{agent.icon}</span>
                      <div className="flex items-center gap-2 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingId(null); }} autoFocus className="flex-1 h-7 px-2 rounded border border-primary/50 bg-secondary/50 text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/30" />
                            <button onClick={handleSaveEdit} className="text-neon-green hover:scale-110 transition-transform"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <div className="truncate">
                            <span className="font-display font-semibold text-xs text-foreground">{agent.name}</span>
                            <p className="text-[9px] text-muted-foreground truncate">{agent.subtitle}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className="text-[9px] font-mono font-semibold px-2 py-1 rounded" style={{ color: color.bg, backgroundColor: `${color.bg}15` }}>
                          {agent.status === "down" && agent.currentTask === "KILLED" ? "KILLED" : agent.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground truncate flex items-center">{agent.currentTask}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: color.bg }} animate={{ width: `${agent.progress}%` }} transition={{ duration: 0.5 }} />
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground w-7 text-right">{agent.progress}%</span>
                      </div>
                      <div className="flex items-center justify-center">
                        {!isEditing && (
                          <button onClick={() => handleStartEdit(agent.id, agent.name)} className="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Mobile card */}
                    <div className="md:hidden p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-lg">{agent.icon}</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingId(null); }} autoFocus className="flex-1 h-7 px-2 rounded border border-primary/50 bg-secondary/50 text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/30" />
                              <button onClick={handleSaveEdit} className="text-neon-green hover:scale-110 transition-transform"><Check className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="truncate">
                              <span className="font-display font-semibold text-xs text-foreground">{agent.name}</span>
                              <p className="text-[9px] text-muted-foreground truncate">{agent.subtitle}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-semibold px-2 py-1 rounded" style={{ color: color.bg, backgroundColor: `${color.bg}15` }}>
                            {agent.status === "down" && agent.currentTask === "KILLED" ? "KILLED" : agent.status.toUpperCase()}
                          </span>
                          {!isEditing && (
                            <button onClick={() => handleStartEdit(agent.id, agent.name)} className="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-mono text-muted-foreground truncate flex-1">{agent.currentTask}</span>
                        <div className="flex items-center gap-2 w-24">
                          <div className="flex-1 h-1.5 bg-muted rounded-full">
                            <motion.div className="h-full rounded-full" style={{ backgroundColor: color.bg }} animate={{ width: `${agent.progress}%` }} transition={{ duration: 0.5 }} />
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground">{agent.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Settings Panel — Expanded with new tabs */}
        <div className="glass-panel neon-border p-6">
          <div className="flex items-center gap-3 mb-5">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-base text-foreground">Settings</h2>
          </div>

          <Tabs defaultValue="theme" className="w-full">
            <TabsList className="bg-secondary/30 border border-border/20 mb-5 flex-wrap h-auto gap-0.5 p-1">
              <TabsTrigger value="profile" className="text-[10px] font-mono tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <User className="w-3 h-3 mr-1" /> PROFILE
              </TabsTrigger>
              <TabsTrigger value="theme" className="text-[10px] font-mono tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">THEME</TabsTrigger>
              <TabsTrigger value="layout" className="text-[10px] font-mono tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Layout className="w-3 h-3 mr-1" /> LAYOUT
              </TabsTrigger>
              <TabsTrigger value="notifications" className="text-[10px] font-mono tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">ALERTS</TabsTrigger>
              <TabsTrigger value="data" className="text-[10px] font-mono tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Database className="w-3 h-3 mr-1" /> DATA
              </TabsTrigger>
              <TabsTrigger value="toolkit" className="text-[10px] font-mono tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Wrench className="w-3 h-3 mr-1" /> TOOLKIT
              </TabsTrigger>
              <TabsTrigger value="users" className="text-[10px] font-mono tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">USERS</TabsTrigger>
              <TabsTrigger value="system" className="text-[10px] font-mono tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">SYSTEM</TabsTrigger>
            </TabsList>

            <TabsContent value="profile"><ProfileSettings /></TabsContent>
            <TabsContent value="theme"><ThemeSettings /></TabsContent>
            <TabsContent value="layout"><LayoutSettings /></TabsContent>
            <TabsContent value="notifications"><NotificationSettings /></TabsContent>
            <TabsContent value="data"><DataManagement /></TabsContent>
            <TabsContent value="toolkit"><CustomToolkit /></TabsContent>
            <TabsContent value="users"><UserManagement /></TabsContent>
            <TabsContent value="system"><SystemConfigSettings /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
