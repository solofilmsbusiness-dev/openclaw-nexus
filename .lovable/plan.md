

## Plan: Floating Nodes + Interactive Grid

### 1. Floating/Hovering Nodes (`AgentGraph.tsx`)
Each agent node and the core node will have a gentle continuous floating animation using SVG `<animateTransform>` with unique timing per node so they feel organic and independent:
- Each `AgentNode` gets a slow drift animation (translate oscillation, ~6-8s cycle, ±3-5px range) with randomized phase offsets per agent
- Core node group gets its own slower, larger float cycle
- On hover, nodes scale up (1.15x) with a brighter glow ring and the float pauses

### 2. Interactive Grid Background
Replace the static grid with a reactive one:
- Track mouse position over the SVG via `onMouseMove`
- Render a radial highlight gradient that follows the cursor position, illuminating nearby grid lines
- Add a subtle parallax effect: grid pattern offset shifts slightly based on mouse position (CSS transform on the grid rect)
- Grid lines near the cursor brighten/change color (computed via a radial gradient mask centered on mouse)
- Add faint animated "data particles" — small dots that travel along grid lines periodically using `<circle>` with `<animateMotion>`

### 3. Enhanced Hover on Nodes
- On hover: node scales up smoothly, glow ring intensifies, connected edges brighten to full opacity
- Edges connected to hovered node pulse faster and get thicker

### Technical approach
- Mouse tracking via `useState<{x,y}>` + `onMouseMove` on the SVG element, converting to SVG coordinates
- Radial gradient for cursor glow: dynamic `cx`/`cy` attributes updated from mouse state
- Floating: each node wrapped in a `<g>` with `<animateTransform type="translate">` using unique `dur` and `values` per node index
- Particles: 4-6 small `<circle>` elements with `<animateMotion>` along predefined grid-line paths
- Hovered agent ID tracked to conditionally brighten connected edges

### Files changed
- `src/components/AgentGraph.tsx` — all changes contained here

