

## Plan: Living Ecosystem Node Graph Enhancement

### 1. Node Color Customization

**`src/data/agents.ts`** — Add optional `color` field to `Agent` interface (e.g. `color?: string`).

**`src/components/AgentCards.tsx`** — Add a color picker in `AgentDetailView`:
- A row of preset color swatches (8-10 hues) plus a small HSL slider for custom colors
- Clicking a swatch updates `agent.color` via `onAgentsChange`
- Uses the custom color for the card's left border, sparklines, and status indicators (falls back to `statusColor()` if unset)

**`src/components/AgentGraph.tsx`** — In `AgentNode`, use `agent.color ?? statusColor(agent.status).bg` for stroke, glow, progress arc, and label colors. This lets users visually categorize nodes by role/type.

**`src/data/agents.ts`** — Update `statusColor()` usage sites to accept an optional override color.

### 2. Enhanced Data Flow Particles

**`src/components/AgentGraph.tsx`** — Rework `AnimatedEdge` to show directional green data transfer orbs:

- **Directional particles**: Change the existing bi-directional particles to primarily flow `from → to` (source to destination). Keep the reverse particle but make it much fainter.
- **Green data orbs**: Add a bright green (`hsl(152, 70%, 55%)`) particle with a comet-trail glow filter that travels along the edge path. Size ~3-4px with a larger glow halo (~8px).
- **Arrival pulse**: At the destination end, add a brief radial pulse animation — a circle that expands and fades at the endpoint when a particle completes its journey. Use SVG `<animate>` with synchronized timing to the particle's `dur`.
- **Activity-based frequency**: Tie particle speed/count to edge `weight` — higher weight = more frequent particles. Add a second green orb on high-weight edges (weight > 0.7) with staggered timing.
- **Dead edges**: When either connected node is `"down"`, particles stop (already handled) but also dim the edge stroke to near-invisible and change color to red/grey.

### 3. Sparkline Flatline for Dead Agents

**`src/components/AgentCards.tsx`** — Modify `Sparkline` component:
- Accept `isDead` prop
- When `isDead`, render a flat horizontal line at y=14 (bottom) in red/grey instead of actual data
- Pass `agent.status === "down"` from the card rendering (lines 213-225)
- Dim the entire card (lower opacity, muted border) when agent is down

### 4. Individual Kill Button per Agent

**`src/components/AgentCards.tsx`** — Add kill functionality:
- In `AgentDetailView` action buttons (lines 97-113), add a 4th "Kill" button with `Power` icon
- Calls `onStatusChange(agent.id, "down", { currentTask: "KILLED", progress: 0 })`
- Disabled when agent is already `"down"`
- Styled with red/destructive coloring
- Also add a small kill icon on card hover (next to the delete trash icon, line 182-191)

### 5. Connection Activity Indicators

**`src/components/AgentGraph.tsx`** — Add visual cues that connections represent active communication:
- When a node status changes or an event fires, trigger a brief "data burst" — 3-4 rapid particles along connected edges
- Add a subtle pulsing glow on the edge path itself (not just particles) when both connected nodes are active/healthy
- Edge opacity scales with combined health of connected nodes (both healthy = bright, one degraded = dimmer, one down = nearly invisible)

### Files Changed

| File | Changes |
|------|---------|
| `src/data/agents.ts` | Add `color?: string` to Agent interface |
| `src/components/AgentGraph.tsx` | Custom node colors, directional green particles, arrival pulses, activity-based edge opacity |
| `src/components/AgentCards.tsx` | Color picker in detail view, sparkline flatline, kill button, dead-agent card styling |

No database migration needed — `color` is stored in-memory and persisted through the existing config save (agents_data jsonb).

