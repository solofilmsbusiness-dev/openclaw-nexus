import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
}

export default function UserManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  const fetchAdmins = async () => {
    const { data } = await supabase.from("user_roles").select("*").eq("role", "admin");
    setAdmins(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleAdd = async () => {
    if (!email.trim()) return;
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", {
        body: { action: "add", email: email.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Admin added: ${email.trim()}`);
      setEmail("");
      fetchAdmins();
    } catch (e: any) {
      toast.error(e.message || "Failed to add admin");
    }
    setAdding(false);
  };

  const handleRemove = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", {
        body: { action: "remove", userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Admin removed");
      setRemoveConfirm(null);
      fetchAdmins();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove admin");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-primary" />
        <span className="font-display font-semibold text-xs text-foreground">User Management</span>
        <span className="text-[9px] font-mono text-muted-foreground">{admins.length} ADMINS</span>
      </div>

      {/* Add admin */}
      <div className="flex gap-2">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add admin by email..."
          className="h-8 text-xs font-mono bg-secondary/30 border-border/30"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !email.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-[10px] font-mono tracking-wider hover:bg-primary/20 transition-colors disabled:opacity-30"
        >
          <Plus className="w-3 h-3" />
          ADD
        </button>
      </div>

      {/* Admin list */}
      <div className="space-y-1">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <p className="text-[10px] font-mono text-muted-foreground text-center py-4">No admins found</p>
        ) : (
          <AnimatePresence>
            {admins.map((admin) => (
              <motion.div
                key={admin.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/20 hover:border-border/40 transition-colors"
              >
                <div>
                  <span className="text-xs font-mono text-foreground">{admin.user_id}</span>
                  <p className="text-[9px] font-mono text-muted-foreground">{admin.role}</p>
                </div>
                {removeConfirm === admin.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-destructive animate-pulse">Confirm?</span>
                    <button
                      onClick={() => handleRemove(admin.user_id)}
                      className="px-2 py-1 rounded bg-destructive text-destructive-foreground text-[9px] font-mono"
                    >
                      YES
                    </button>
                    <button
                      onClick={() => setRemoveConfirm(null)}
                      className="px-2 py-1 rounded border border-border/30 text-muted-foreground text-[9px] font-mono"
                    >
                      NO
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setRemoveConfirm(admin.id)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
