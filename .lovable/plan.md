

## Redesign: New Layout + Black & Gold Color Scheme + Interactive Timeline

### Layout Restructuring

Current layout: left sidebar (agents/backlog/insights) | center graph | right column (event timeline + terminal log)

New layout:
```text
┌──────────────────────────────────────────────────┐
│  MetricsBar (top nav)                            │
├──────────────────────────────────────────────────┤
│  Agents | Backlog | Insights  (horizontal cards) │
├──────────────────────────────────────────────────┤
│                                                  │
│           Agent Graph (main focus)               │
│                                                  │
├──────────────────────────────────────────────────┤
│  Interactive Timeline (draggable/zoomable)        │
├──────────────────────────────────────────────────┤
│  Event Timeline + Terminal Log (side by side)     │
└──────────────────────────────────────────────────┘
```

### 1. Color Scheme: Black & Gold with Bright Accents

**`src/index.css`** — Replace CSS variables:
- `--background`: deep black (`0 0% 3%`)
- `--card`: near-black (`0 0% 6%`)
- `--primary`: gold (`45 100% 50%`) — the brand accent, replaces green
- `--border`: dark charcoal with warm tint
- Keep neon status colors (green/orange/red/blue) for agent states but shift the "system" accent from cyan/green to gold
- Add `--gold: 45 100% 50%` and `--gold-dim: 45 80% 35%` custom tokens
- Update `.neon-border`, `.glass-panel`, core glow, grid colors to use gold tones
- Update `.terminal-text` to gold-tinted

### 2. Top Horizontal Agent/Backlog/Insights Strip

**`src/components/AgentCards.tsx`** — Refactor from vertical sidebar to horizontal top panel:
- Render as a horizontal scrollable row of compact cards
- Tabs remain (Agents/Backlog/Insights) but in a compact horizontal bar
- Agent cards become small pill-like items in a horizontal flex/scroll container
- Backlog and Insights render as compact horizontal card grids (2-3 columns)
- Remove the sidebar collapse toggle from Index.tsx since it's now always visible at the top
- Keep drag-to-reorder, expand-on-click, and status change actions

### 3. New Interactive Timeline Component

**`src/components/InteractiveTimeline.tsx`** — New component:
- Horizontal timeline bar showing events plotted along a time axis
- Each event is a dot/marker colored by agent status, positioned by timestamp
- Hover shows event detail tooltip
- Click on a marker highlights the event in the Event Timeline below
- Draggable viewport / zoom via mouse wheel on the timeline range
- Built with SVG for precision, using mouse events for pan/zoom
- Gold accent line with bright colored event dots

### 4. Bottom Section Layout

**`src/pages/Index.tsx`** — Restructure:
- Remove left sidebar + collapse toggle
- Top: `MetricsBar`
- Below: horizontal `AgentCards` strip (fixed height ~180px)
- Center: `AgentGraph` (fills remaining vertical space)
- Below graph: `InteractiveTimeline` (fixed height ~80px)
- Bottom: `EventTimeline` + `TerminalLog` side by side

### 5. Graph Color Updates

**`src/components/AgentGraph.tsx`**:
- Core node glow: shift from cyan to gold
- Grid lines: dark warm gray, cursor glow in gold
- Edge default color: gold-tinted
- "OPENCLAW CORE" text: gold
- Particle colors: gold

### Files Changed
- `src/index.css` — new black & gold color tokens
- `tailwind.config.ts` — add gold color utilities
- `src/pages/Index.tsx` — new vertical stack layout
- `src/components/AgentCards.tsx` — horizontal compact layout
- `src/components/AgentGraph.tsx` — gold-tinted core/grid
- `src/components/MetricsBar.tsx` — gold accent updates
- `src/components/InteractiveTimeline.tsx` — new component
- `src/components/EventTimeline.tsx` — minor color updates
- `src/components/TerminalLog.tsx` — gold terminal text

