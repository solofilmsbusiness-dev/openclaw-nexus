import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { User, Mail, Key, Save, Loader2, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import PageNav from "@/components/PageNav";
import { useSettings } from "@/contexts/SettingsContext";

export default function Profile() {
  const navigate = useNavigate();
  const { profile, setProfile } = useSettings();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login", { replace: true });
        return;
      }
      setEmail(session.user.email || "");
      if (!profile.displayName) {
        setDisplayName(session.user.email?.split("@")[0] || "");
      }
      setAuthChecked(true);
    });
  }, [navigate, profile.displayName]);

  const handleSaveProfile = () => {
    setSaving(true);
    setProfile({ displayName: displayName.trim() });
    toast.success("Profile updated");
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Password change failed", { description: error.message });
    } else {
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (!authChecked) return null;

  const initials = (displayName || email)
    .split(/[@.\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background text-foreground"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-secondary/20">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-sm tracking-wide text-foreground">SOLO OS</span>
          <PageNav />
        </div>
      </div>

      <div className="max-w-lg mx-auto py-10 px-4 space-y-6">
        {/* Avatar & name */}
        <div className="flex flex-col items-center gap-3">
          <Avatar className="h-20 w-20 border-2 border-primary/40">
            <AvatarFallback className="bg-primary/20 text-primary text-2xl font-display">
              {initials}
            </AvatarFallback>
          </Avatar>
          <p className="text-muted-foreground text-xs font-mono">{email}</p>
        </div>

        {/* Profile card */}
        <Card className="bg-card/60 border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-display">
              <User className="w-4 h-4 text-primary" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">
                Display Name
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-secondary/30 border-border/30 text-sm font-mono"
                placeholder="Your display name"
              />
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 font-mono text-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* Password card */}
        <Card className="bg-card/60 border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-display">
              <Key className="w-4 h-4 text-primary" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-secondary/30 border-border/30 text-sm font-mono"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">
                Confirm Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-secondary/30 border-border/30 text-sm font-mono"
                placeholder="••••••••"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword}
              variant="outline"
              className="font-mono text-xs border-border/40"
            >
              {changingPassword ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Key className="w-3.5 h-3.5 mr-2" />}
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Sign out */}
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full font-mono text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-3.5 h-3.5 mr-2" /> Sign Out
        </Button>
      </div>
    </motion.div>
  );
}
