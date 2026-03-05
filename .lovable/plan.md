

## Fix: Connect Button & Settings Button Placement

### Problem
1. **Connect button** — functional but visually plain; could be more polished and prominent
2. **Settings gear** (Index.tsx, `fixed top-4 right-4`) overlaps the zoom controls column (AgentGraph.tsx, `absolute top-3 right-3`), blocking the online status text rendered in the SVG core area

### Changes

**`src/pages/Index.tsx`** — Move the Settings button from `fixed top-4 right-4` to `fixed top-4 right-16` (shift left ~48px) so it clears the zoom controls column. Alternatively, integrate it into the MetricsBar as a small gear icon on the far right, removing the floating button entirely.

**`src/components/AgentGraph.tsx`** — Improve the Connect button:
- Make it slightly larger with an icon-label layout, using a pill shape (`rounded-full px-3 py-1.5`)
- When active, show a pulsing dot indicator and "CONNECTING…" label with a subtle glow animation
- When inactive, show a clean "Connect" label with the Link icon
- Move the connection-type popup (`pendingEdge` panel at `top-14 left-3`) down slightly to `top-12` to avoid crowding

**`src/pages/Index.tsx`** — Move the Settings button into the `MetricsBar` component as a gear icon on the right side, removing the floating overlay entirely. This frees the top-right corner for zoom controls only.

### Files Changed

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Remove floating Settings button, pass `onSettings` callback to MetricsBar |
| `src/components/MetricsBar.tsx` | Add Settings gear icon on the far right of the bar |
| `src/components/AgentGraph.tsx` | Restyle Connect button to pill shape with improved active state |

