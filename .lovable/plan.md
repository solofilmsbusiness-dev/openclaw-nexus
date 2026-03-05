

## Add Minimap to Graph

### Overview
Add a small minimap in the bottom-left corner of the graph that shows all nodes and edges at a bird's-eye scale, with a semi-transparent rectangle indicating the current viewport.

### Changes

**`src/components/AgentGraph.tsx`**

1. **Add a `Minimap` component** (inline in the same file) that renders inside the graph's container `div`:
   - Positioned `absolute bottom-3 left-3`, roughly 160x120px, with `glass-panel` styling and reduced opacity
   - Contains a small `<svg>` with a fixed viewBox computed to encompass all node positions (with padding)
   - Renders:
     - Simplified edges as thin lines (no labels, no particles)
     - Nodes as small colored circles (radius ~3px, colored by status)
     - The core as a slightly larger circle
     - A semi-transparent rectangle representing the current `viewBox` relative to the full extent
   - Clicking on the minimap pans the main view to center on the clicked location

2. **Props**: Pass `agents`, `edges`, `positions`, `viewBox`, `setViewBox`, and `getNodeSize` to the minimap

3. **Viewport rectangle**: Computed from `viewBox` state mapped into the minimap's coordinate space — shows exactly what area is currently visible

4. **Click-to-pan**: On click, convert minimap click coords to graph coords and center the viewBox there

