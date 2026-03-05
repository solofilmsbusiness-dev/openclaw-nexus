

## Plan: Kill Switch Animation, Auto-load Last Config on Login, Config State Preservation

### 1. Kill Switch Smooth Red Fade Transition

**`src/components/AgentGraph.tsx`**:
- Add a CSS transition wrapper around the entire SVG graph that smoothly transitions colors over ~1.5s when `killSwitchActive` changes
- Use `useEffect` + a `killTransitioning` state that triggers a CSS class with `transition: all 1.5s ease` on the graph container
- For the SVG `<defs>` gradients/colors: since SVG attributes don't transition natively, use a `killProgress` animated value (0→1 over 1.5s via `requestAnimationFrame` or a simple interval) that interpolates between normal and red colors
- Simpler approach: wrap the SVG in a `<div>` with a red overlay that fades in (`opacity: 0 → 0.15`) over 1.5s using CSS transition, creating a "wash to red" effect. Combine with `framer-motion`'s `animate` on the core node elements for the status text fade-in ("SYSTEM KILLED")
- Node agents already use `motion.g` with spring animations — they'll naturally animate to their "down" state colors

**Specific visual transitions**:
- Add a full-SVG red overlay `<rect>` with `opacity` transitioning from 0→0.12 over 1.5s when kill activates
- Core node stroke/glow: use CSS `transition` on inline styles where possible
- The grid pattern color shift won't smoothly transition (SVG pattern limitation), but the overlay handles the visual feel

### 2. Auto-load Last Saved Config on Login

**`src/contexts/AgentContext.tsx`**:
- Add a new function `loadLastConfig` that queries `graph_configs` for the user's most recently updated config and calls `loadConfig` with it
- Expose it from context

**`src/pages/Index.tsx`**:
- After `authChecked` is set to true, call a new effect that fetches the user's last saved config from the database (`graph_configs` ordered by `updated_at DESC`, limit 1)
- If found, call `loadConfig(agents_data, edges_data)` to unravel the graph into their custom setup
- If no saved config exists, use the default agents/edges (current behavior)

### 3. Loading a Config Preserves Node Positions/Sizes

Currently `loadConfig` only sets agents and edges but doesn't persist drag offsets or node sizes. The positions are computed from agent count, so loading the same agents will recreate the same orbital layout. However, custom drag positions and node sizes are lost.

**`src/components/ConfigManager.tsx`**:
- When saving, also capture and store `dragOffsets` and `nodeSizes` from the graph state alongside `agents_data` and `edges_data`
- When loading, restore those as well

**`src/contexts/AgentContext.tsx`**:
- Extend `loadConfig` to accept optional `dragOffsets` and `nodeSizes` and expose setters or pass them through

**`src/components/AgentGraph.tsx`**:
- Expose `dragOffsets` and `nodeSizes` state so `ConfigManager` can read them when saving
- Accept restored `dragOffsets`/`nodeSizes` when a config is loaded (via a callback or context)
- Alternative simpler approach: store `dragOffsets` and `nodeSizes` in context alongside agents/edges, so ConfigManager can access them directly

**Database**: Add `layout_data` jsonb column to `graph_configs` to store `{ dragOffsets, nodeSizes }`, or just embed them in the existing `agents_data`/`edges_data` json. Using existing jsonb fields (adding layout info into agents_data as a wrapper object) avoids a migration.

**Revised approach** (no migration needed): Save format becomes `{ agents: [...], layout: { dragOffsets: {...}, nodeSizes: {...} } }` inside `agents_data`. Load parses this format. Backward compatible — if `agents_data` is a plain array, treat it as agents-only (old format).

### Technical Summary

| File | Changes |
|------|---------|
| `AgentGraph.tsx` | Add red fade overlay with CSS transition on kill; move `dragOffsets`/`nodeSizes` to be accessible by ConfigManager |
| `AgentContext.tsx` | Extend `loadConfig` to handle layout data; add auto-load on auth |
| `ConfigManager.tsx` | Save/load `dragOffsets` + `nodeSizes` alongside agents/edges |
| `Index.tsx` | Trigger auto-load of last config after auth check |

No database migration needed — layout data stored within existing `agents_data` jsonb column.

