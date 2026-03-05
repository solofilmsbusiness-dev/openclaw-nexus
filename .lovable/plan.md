

## Plan: Rebrand to "Solo OS 2.26" with Apple-Inspired Design

### Text Changes
Replace all "OpenClaw" references with "Solo OS" branding:
- **`index.html`**: Title → "Solo OS 2.26", meta tags updated
- **`MetricsBar.tsx`**: Logo text → "Solo OS" with a refined "2.26" version badge
- **`AgentGraph.tsx`**: Core label → "SOLO OS CORE", subtitle → "v2.26"

### Apple-Inspired Visual Overhaul

**`src/index.css`** — New design tokens:
- Shift palette from cyberpunk neon to Apple-style soft, muted tones: cool grays, soft blues, gentle greens
- Replace harsh glow/neon effects with subtle, refined shadows and translucent blurs
- Increase `backdrop-blur` values for frosted glass effect (SF-style glassmorphism)
- Soften border colors, increase border-radius for rounder cards
- Remove scanline effect and aggressive text-shadow glows
- Lighter text hierarchy: primary white, secondary gray-400, tertiary gray-500

**`tailwind.config.ts`** — Font & color updates:
- Replace Space Grotesk with **Inter** (or SF Pro-like system font stack: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter"`)
- Soften neon color palette to pastel/muted variants (green → soft teal, red → soft rose, orange → warm amber)
- Increase default border-radius to `1rem`

**`MetricsBar.tsx`** — Apple top bar feel:
- Clean, minimal layout with SF-style font weights
- Replace pulsing neon dot with a subtle, steady green circle
- Version badge "2.26" as a small pill/chip next to the name

**`AgentGraph.tsx`** — Cleaner core visualization:
- Softer gradients instead of neon glows on the central node
- Muted connection lines, subtle opacity transitions
- Clean sans-serif labels

**`AgentCards.tsx`** — Card refinement:
- Rounder corners, subtle shadow instead of neon border
- Clean status indicators (small colored dots, no glow)

**`EventTimeline.tsx` & `TerminalLog.tsx`**:
- Softer background, refined typography
- Remove terminal aesthetic from log (keep monospace but lighter colors)

**`index.css`** component classes:
- `.glass-panel` → increase blur, reduce border opacity, add subtle white/5% inner glow
- `.neon-border` → rename/restyle to `.subtle-border` with soft shadow
- Remove `.scanline`, `.terminal-text` glow effects
- Status classes use soft colors without text-shadow

### Google Font
- Add **Inter** font import to replace Space Grotesk (keep JetBrains Mono for code)

