import { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Mail, Key, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProfileSettings() {
  const { profile, setProfile } = useSettings();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email || "");
        if (!profile.displayName) {
          setDisplayName(user.email?.split("@")[0] || "");
        }
      }
    });
  }, [profile.displayName]);

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

  return (
    <div className="space-y-6">
      {/* Display Name */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-xs text-foreground">Profile</span>
        </div>
        <div className="space-y-3">
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
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">
              Email
            </label>
            <Input
              value={email}
              disabled
              className="bg-secondary/20 border-border/20 text-sm font-mono text-muted-foreground"
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
        </div>
      </div>

      {/* Change Password */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-xs text-foreground">Change Password</span>
        </div>
        <div className="space-y-3">
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
        </div>
      </div>
    </div>
  );
}
