import { useSettings } from "@/contexts/SettingsContext";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";

const TOGGLES = [
  { key: "systemAlerts" as const, label: "System Alerts", desc: "Toast notifications for system events" },
  { key: "statusChanges" as const, label: "Agent Status Changes", desc: "Notify when agents change state" },
  { key: "killSwitchWarnings" as const, label: "Kill Switch Warnings", desc: "Confirm before kill operations" },
  { key: "soundEffects" as const, label: "Sound Effects", desc: "Play audio on critical events" },
];

export default function NotificationSettings() {
  const { notifications, setNotifications } = useSettings();

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-primary" />
        <span className="font-display font-semibold text-xs text-foreground">Notification Preferences</span>
      </div>
      {TOGGLES.map((t) => (
        <div
          key={t.key}
          className="flex items-center justify-between py-3 px-3 rounded-lg border border-border/20 hover:border-border/40 transition-colors"
        >
          <div>
            <span className="text-xs font-display font-semibold text-foreground">{t.label}</span>
            <p className="text-[9px] text-muted-foreground">{t.desc}</p>
          </div>
          <Switch
            checked={notifications[t.key]}
            onCheckedChange={(v) => setNotifications({ [t.key]: v })}
          />
        </div>
      ))}
    </div>
  );
}
