

## Add Zoom, Pan, and Node Resizing to Graph

### Overview
Add mouse wheel zoom, click-drag pan on the background, and drag-to-resize on nodes. All implemented via SVG viewBox manipulation and per-node size state.

### Changes

**`src/components/AgentGraph.tsx`**

**1. Zoom & Pan via ViewBox state**
- Add state: `viewBox` = `{ x: 0, y: 0, w: 800, h: 600 }` replacing the fixed `viewBox="0 0 800 600"`
- Add `onWheel` handler on the SVG: adjust `viewBox.w` and `viewBox.h` (zoom in/out) centered on the cursor position, clamped to min/max bounds (e.g. 200-2400 width)
- Modify `handleMouseMove`: when dragging on background (no node drag active), pan by adjusting `viewBox.x` and `viewBox.y`
- Add `isPanning` ref to track background drag vs node drag — initiated on `onMouseDown` on the SVG background (not on a node)
- Update `getSvgPoint` to account for the dynamic viewBox
- Add zoom controls UI (+ / - buttons and a reset button) in the top-right corner

**2. Node Resizing**
- Add `nodeSizes` state: `Record<string, number>` to store per-node size overrides
- In `AgentNode`, add a small resize handle (a tiny circle or square at the bottom-right of the node) visible on hover/selection
- On mousedown of the resize handle, enter resize mode tracking distance from node center to determine new size (clamped to min 15, max 60)
- Pass `nodeSizes` into each `AgentNode` to override the default `20 + agent.backlogCount * 1.5` size calculation

**3. Coordinate Updates**
- Update parallax calculation to use viewBox center instead of fixed 400/300
- Ensure connect mode, delete, and double-click all work correctly with the new viewBox transforms

