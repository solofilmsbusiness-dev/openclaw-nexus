import { useSettings, type AccentColor, type FontSize } from "@/contexts/SettingsContext";
import { Palette } from "lucide-react";
import { Slider } from "@/components/ui/slider";

const ACCENTS: { id: AccentColor; label: string; hsl: string }[] = [
  { id: "blue",   label: "Blue",   hsl: "hsl(215, 80%, 60%)" },
  { id: "teal",   label: "Teal",   hsl: "hsl(172, 60%, 45%)" },
  { id: "purple", label: "Purple", hsl: "hsl(270, 50%, 60%)" },
  { id: "rose",   label: "Rose",   hsl: "hsl(350, 65%, 55%)" },
  { id: "amber",  label: "Amber",  hsl: "hsl(38, 70%, 55%)" },
];

const FONT_SIZES: { id: FontSize; label: string }[] = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
];

export default function ThemeSettings() {
  const { accentColor, setAccentColor, fontSize, setFontSize } = useSettings();

  return (
    <div className="space-y-6">
      {/* Accent Color */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-xs text-foreground">Accent Color</span>
        </div>
        <div className="flex gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAccentColor(a.id)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${
                accentColor === a.id
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/20 hover:border-border/40"
              }`}
            >
              <div
                className="w-8 h-8 rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: a.hsl,
                  borderColor: accentColor === a.id ? a.hsl : "transparent",
                  transform: accentColor === a.id ? "scale(1.15)" : "scale(1)",
                }}
              />
              <span className="text-[9px] font-mono text-muted-foreground">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <span className="font-display font-semibold text-xs text-foreground block mb-3">Font Size</span>
        <div className="flex gap-2">
          {FONT_SIZES.map((f) => (
            <button
              key={f.id}
              onClick={() => setFontSize(f.id)}
              className={`px-4 py-2 rounded-lg border font-mono text-xs transition-all ${
                fontSize === f.id
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border/20 text-muted-foreground hover:border-border/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
