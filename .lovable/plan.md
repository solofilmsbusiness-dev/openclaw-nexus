

## Bring Dashboard Visual DNA to the Agent Trade Pipeline

The current MiniAgentGraph is static rectangles with plain line connectors and a single JS-animated orb. The dashboard graph has rich SVG-declarative animations: stardust, orbital particles, energy rings, data orbs with comet trails on edges, progress arcs, floating motion, and soft glows. We need to port these effects into the linear 4-node pipeline layout.

### What Changes

**Rewrite `src/components/trading/MiniAgentGraph.tsx`** to add:

1. **Stardust background** -- 20 tiny dots across the viewBox that fade in/out via `<animate>`, same pattern as dashboard `Stardust`
2. **Soft glow around each node** -- Animated breathing circle behind each rect, like the dashboard's `<circle>` with pulsing radius
3. **Progress arcs** -- Thin colored arc strokes around each node (mapped to processed count as a percentage cap of 100), matching dashboard `ProgressArc`
4. **Floating/bobbing nodes** -- Each `<g>` node wrapper gets `<animateTransform type="translate">` with slightly different durations per node, same as dashboard `FloatingGroup`
5. **Curved connectors with data orbs** -- Replace straight `<line>` connectors with quadratic `<path>` curves. Add continuous green data orb particles with comet trail glows traveling along each path via `<animateMotion>` + `<mpath>`, matching dashboard `AnimatedEdge` style. Arrival pulses at each destination node.
6. **Energy rings from first node** -- 2-3 expanding circles from the Researcher node (pipeline source), mimicking dashboard `CoreEnergyRings` but scaled down
7. **SVG filter defs** -- Add `particleGlow`, `dataGlow` filters matching the dashboard, plus existing `pipe-glow`
8. **Flash glow enhancement** -- Current flash is fine, keep it
9. **Remove the JS requestAnimationFrame orb** -- Replace with the declarative SVG orb particles that run continuously on the connectors (the trade-triggered flash cascade stays)

### Layout Adjustments
- Increase `SVG_H` to ~180 to accommodate progress arcs + floating motion without clipping
- Keep the 4 rectangular nodes, stats row, activity feed, click-to-select -- all existing functionality preserved

### No other files change
Only `MiniAgentGraph.tsx` is modified. Context, data flow, and panel registration stay the same.

