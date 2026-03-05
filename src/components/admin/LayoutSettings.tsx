import { useSettings, type LayoutPreset, LAYOUT_PRESETS } from "@/contexts/SettingsContext";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Layout, Monitor, Columns, AlignLeft } from "lucide-react";

const PRESETS: { id: LayoutPreset; label: string; desc: string; icon: typeof Layout }[] = [
  { id: "default", label: "Default", desc: "Balanced 3-column layout", icon: Columns },
  { id: "compact", label: "Compact", desc: "Narrower panels, denser UI", icon: Monitor },
  { id: "wide-graph", label: "Wide Graph", desc: "Maximize the graph area", icon: Layout },
  { id: "logs-focus", label: "Logs Focus", desc: "Wider event & log panels", icon: AlignLeft },
];

export default function LayoutSettings() {
  const { layout, setLayout, setLayoutPreset } = useSettings();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Layout className="w-4 h-4 text-primary" />
        <span className="font-display font-semibold text-xs text-foreground">Dashboard Layout</span>
      </div>

      {/* Presets */}
      <div>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">Presets</span>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setLayoutPreset(p.id)}
              className={`flex flex-col items-start gap-1 p-3 rounded-lg border transition-all text-left ${
                layout.preset === p.id
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/20 hover:border-border/40"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <p.icon className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-mono font-semibold text-foreground">{p.label}</span>
              </div>
              <span className="text-[9px] text-muted-foreground">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Panel widths */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-foreground">Left Panel Width</span>
            <span className="text-[10px] font-mono text-muted-foreground">{layout.leftPanelWidth}px</span>
          </div>
          <Slider
            min={200}
            max={450}
            step={10}
            value={[layout.leftPanelWidth]}
            onValueChange={([v]) => setLayout({ leftPanelWidth: v, preset: "default" as LayoutPreset })}
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-foreground">Right Panel Width</span>
            <span className="text-[10px] font-mono text-muted-foreground">{layout.rightPanelWidth}px</span>
          </div>
          <Slider
            min={180}
            max={450}
            step={10}
            value={[layout.rightPanelWidth]}
            onValueChange={([v]) => setLayout({ rightPanelWidth: v, preset: "default" as LayoutPreset })}
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-1">
        <div className="flex items-center justify-between py-3 px-3 rounded-lg border border-border/20 hover:border-border/40 transition-colors">
          <div>
            <span className="text-xs font-display font-semibold text-foreground">Compact Mode</span>
            <p className="text-[9px] text-muted-foreground">Reduce spacing and padding throughout</p>
          </div>
          <Switch
            checked={layout.compactMode}
            onCheckedChange={(v) => setLayout({ compactMode: v })}
          />
        </div>
        <div className="flex items-center justify-between py-3 px-3 rounded-lg border border-border/20 hover:border-border/40 transition-colors">
          <div>
            <span className="text-xs font-display font-semibold text-foreground">Show Metrics Bar</span>
            <p className="text-[9px] text-muted-foreground">Toggle the top status bar visibility</p>
          </div>
          <Switch
            checked={layout.showMetricsBar}
            onCheckedChange={(v) => setLayout({ showMetricsBar: v })}
          />
        </div>
      </div>
    </div>
  );
}
