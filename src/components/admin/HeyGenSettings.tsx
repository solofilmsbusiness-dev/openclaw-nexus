import { useState, useCallback } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Video, CheckCircle2, XCircle, Loader2, Key } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

type ConnectionStatus = "idle" | "testing" | "ok" | "error";

export default function HeyGenSettings() {
  const { heygen, setHeyGen } = useSettings();
  const [showKey, setShowKey] = useState(false);
  const [draftKey, setDraftKey] = useState(heygen.apiKey);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const isDirty = draftKey !== heygen.apiKey;

  const handleSave = () => {
    setHeyGen({ apiKey: draftKey.trim() });
    toast.success("HeyGen API key saved");
    setStatus("idle");
  };

  const handleTest = useCallback(async () => {
    const keyToTest = isDirty ? draftKey.trim() : heygen.apiKey;
    if (!keyToTest) {
      toast.error("Enter an API key first");
      return;
    }
    setStatus("testing");
    setStatusMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("heygen-proxy", {
        body: { action: "test_connection", apiKey: keyToTest },
      });
      if (error || data?.error) {
        setStatus("error");
        setStatusMsg(data?.error || error?.message || "Connection failed");
        toast.error("HeyGen connection failed", { description: data?.error || error?.message });
      } else {
        setStatus("ok");
        const quota = data?.remaining_quota ?? data?.quota?.remaining;
        setStatusMsg(quota != null ? `Connected · ${quota} credits remaining` : "Connected successfully");
        toast.success("HeyGen API key is valid");
      }
    } catch (e) {
      setStatus("error");
      const msg = e instanceof Error ? e.message : "Unknown error";
      setStatusMsg(msg);
      toast.error("Connection test failed", { description: msg });
    }
  }, [draftKey, heygen.apiKey, isDirty]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Video className="w-4 h-4 text-primary" />
        <span className="font-display font-semibold text-xs text-foreground">HeyGen · HyperFrames</span>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-primary/10 text-primary ml-auto">AI VIDEO</span>
      </div>

      <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
        HyperFrames lets you compose HTML/CSS frames into AI-generated videos using HeyGen avatars.
        Enter your HeyGen API key below to enable the HyperFrames panel in your dashboard.
      </p>

      {/* API Key input */}
      <div className="space-y-2">
        <Label className="text-xs font-mono flex items-center gap-1.5">
          <Key className="w-3 h-3" /> API Key
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? "text" : "password"}
              value={draftKey}
              onChange={(e) => { setDraftKey(e.target.value); setStatus("idle"); }}
              placeholder="sk-••••••••••••••••"
              className="bg-secondary/30 border-border/30 text-xs font-mono pr-9"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={status === "testing"}
            className="text-xs font-mono border-border/30 shrink-0"
          >
            {status === "testing" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Test"
            )}
          </Button>
        </div>

        {/* Status badge */}
        <AnimatePresence mode="wait">
          {status !== "idle" && (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-md w-fit ${
                status === "ok"
                  ? "bg-neon-green/10 text-neon-green"
                  : status === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {status === "ok" && <CheckCircle2 className="w-3 h-3" />}
              {status === "error" && <XCircle className="w-3 h-3" />}
              {status === "testing" && <Loader2 className="w-3 h-3 animate-spin" />}
              {status === "testing" ? "Testing connection…" : statusMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {isDirty && (
          <Button
            size="sm"
            onClick={handleSave}
            className="text-xs font-mono bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 h-7"
          >
            Save Key
          </Button>
        )}
      </div>

      {/* HyperFrames toggle */}
      <div className="flex items-center justify-between py-2 border-t border-border/20">
        <div>
          <p className="text-xs font-mono text-foreground">Enable HyperFrames Panel</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Show the HyperFrames video composer in your dashboard</p>
        </div>
        <Switch
          checked={heygen.hyperFramesEnabled}
          onCheckedChange={(v) => setHeyGen({ hyperFramesEnabled: v })}
        />
      </div>

      {/* Info box */}
      <div className="rounded-lg border border-border/30 bg-secondary/20 p-3 space-y-1.5">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">About HyperFrames</p>
        <ul className="space-y-1">
          {[
            "Write HTML/CSS to design video frames",
            "Combine with HeyGen AI avatars",
            "Generate MP4 videos via the API",
            "No per-render fees with your own key",
          ].map((item) => (
            <li key={item} className="text-[10px] text-foreground flex items-center gap-1.5">
              <span className="text-primary">▸</span> {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
