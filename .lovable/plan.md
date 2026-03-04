

## Plan: Animated Data Particles Flowing Along Edges

### Approach
Add small glowing circles that travel along each edge's curved path using SVG `<animateMotion>` with `<mpath>`, reusing the same quadratic bezier path already computed in `AnimatedEdge`.

### Changes to `src/components/AgentGraph.tsx`

**1. Give each edge path a unique `id`**
- In `AnimatedEdge`, add `id={pathId}` prop to the `<path>` element so particles can reference it via `<mpath>`

**2. Add edge particles inside `AnimatedEdge`**
- Render 2-3 small `<circle>` elements (r=2-3) per edge that animate along the path using `<animateMotion>` + `<mpath href>`
- Each particle gets a staggered `begin` offset so they don't all travel together
- Duration scales inversely with `weight` (heavier edges = faster particles, ~3-6s)
- Particles use the edge's `color` with a bright fill and fade in/out via `<animate>` on opacity
- When `highlighted` (hovered), particles get larger (r=3.5), brighter, and move faster
- When not highlighted and another node is hovered, particles dim with the edge

**3. Add a small glow filter**
- Add a `<filter id="particleGlow">` with `feGaussianBlur` to `<defs>` for a soft glow on particles

### Technical details
- Pass `edge.id` as `pathId` prop to `AnimatedEdge`
- The existing `path` variable (`M... Q...`) is already the `d` attribute — just needs an `id`
- 2 particles per edge keeps performance reasonable (15 edges × 2 = 30 animated circles)
- Particle count could increase to 3 for highlighted edges

