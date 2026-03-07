

## Make Node Graph Connections Brighter and More Visual

The current edge rendering uses very low opacity values, making connections hard to see. The fix involves bumping opacity and glow intensity across the `AnimatedEdge` component.

### Changes in `src/components/AgentGraph.tsx`

**1. Increase base edge opacity** (line 368)
- Normal: `0.12` → `0.3`
- Highlighted: `0.5` → `0.75`

**2. Increase edge stroke width** (line 391)
- Normal: `weight * 1.2` → `weight * 1.8`
- Highlighted: `weight * 2` → `weight * 2.5`

**3. Boost the pulsing glow overlay** (lines 397-408)
- Increase glow stroke width: `weight * 2` → `weight * 3` (normal), `weight * 3` → `weight * 4` (highlighted)
- Boost glow pulse opacity: `0.02;0.06;0.02` → `0.06;0.15;0.06`

**4. Brighten traveling data orbs** (lines 420-431)
- Primary orb opacity: `0.6` → `0.85` (normal), `0.9` → `1.0` (highlighted)
- Comet trail glow opacity: `0.05` → `0.12` (normal), `0.12` → `0.22` (highlighted)
- Primary orb radius: `2` → `2.5` (normal), `3` → `3.5` (highlighted)

**5. Boost secondary orb + reverse particle** (lines 434-448)
- Secondary orb opacity: `0.45` → `0.65`, highlighted `0.7` → `0.9`
- Reverse particle opacity: `0.08` → `0.15`, highlighted `0.15` → `0.25`

**6. Brighten edge kind colors** (lines 45-50)
- Increase lightness by ~10% on each color for more pop:
  - control: `55%` → `65%`
  - data: `55%` → `65%`
  - comms: `60%` → `70%`
  - handoff: `55%` → `65%`

All changes are contained within `src/components/AgentGraph.tsx`.

