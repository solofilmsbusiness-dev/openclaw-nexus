import { useSettings } from "@/contexts/SettingsContext";
import { Slider } from "@/components/ui/slider";
import { Cpu } from "lucide-react";

export default function SystemConfigSettings() {
  const { system, setSystemConfig } = useSettings();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Cpu className="w-4 h-4 text-primary" />
        <span className="font-display font-semibold text-xs text-foreground">System Configuration</span>
      </div>

      {/* Simulation Speed */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono text-foreground">Simulation Tick</span>
          <span className="text-[10px] font-mono text-muted-foreground">{system.simulationSpeed}ms</span>
        </div>
        <Slider
          min={500}
          max={5000}
          step={250}
          value={[system.simulationSpeed]}
          onValueChange={([v]) => setSystemConfig({ simulationSpeed: v })}
        />
        <p className="text-[9px] text-muted-foreground">Lower = faster agent updates</p>
      </div>

      {/* Auto-Refresh */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono text-foreground">Auto-Refresh</span>
          <span className="text-[10px] font-mono text-muted-foreground">{system.autoRefreshInterval}s</span>
        </div>
        <Slider
          min={5}
          max={120}
          step={5}
          value={[system.autoRefreshInterval]}
          onValueChange={([v]) => setSystemConfig({ autoRefreshInterval: v })}
        />
      </div>

      {/* Log Retention */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono text-foreground">Log Retention</span>
          <span className="text-[10px] font-mono text-muted-foreground">{system.logRetention} events</span>
        </div>
        <Slider
          min={20}
          max={200}
          step={10}
          value={[system.logRetention]}
          onValueChange={([v]) => setSystemConfig({ logRetention: v })}
        />
        <p className="text-[9px] text-muted-foreground">Max events kept in timeline</p>
      </div>
    </div>
  );
}
