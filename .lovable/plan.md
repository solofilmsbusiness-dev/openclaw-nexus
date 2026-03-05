

## Fix particles to fill viewport + Remove progress numbers above nodes

### Changes to `src/components/AgentGraph.tsx`

**1. Remove progress percentage text above nodes**
- Delete the `<text>` element at lines 276-278 that shows `{agent.progress}%` above each node.

**2. Make OrbitalParticles viewport-aware**
- Pass `viewBox` prop to `OrbitalParticles`
- Scale orbital radii relative to the viewBox dimensions so particles spread across the visible area when zoomed out
- Increase the max orbital radius to scale with `viewBox.w` (e.g., `radius = 80 + ((i * 37) % 270)` becomes proportional to `viewBox.w / 800` scale factor)

**3. Make CoreEnergyRings viewport-aware**
- Pass `viewBox` prop to `CoreEnergyRings`
- Scale the max expansion radius (`to` value of the `r` animation) proportionally to `viewBox.w` so rings expand further when zoomed out

