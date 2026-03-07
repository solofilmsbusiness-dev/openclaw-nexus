
## Simplify Connect Button Layout

### Problem
The connect button (lines 987-1008) is positioned at `top-3 left-3` with a pill shape. When in "CONNECTING..." mode, an adjacent instructional message (lines 1018-1022) positioned at `top-3 left-28` overlaps and cuts off the button text.

### Solution
Remove the separate instructional text divs (lines 1018-1027) entirely. Instead, embed the instruction directly into the button tooltip or button content. Simplify the connect button to:
- Keep the pill-shaped design with icon + label
- Use the existing tooltip to show instructions
- Remove the adjacent "Click source node" and "Click target node" text overlays
- When `connectMode` is true, optionally show a small badge/indicator on the graph instead of separate text blocks

### Changes
**File: `src/components/AgentGraph.tsx`**
1. Remove lines 1018-1027 (the two instruction text divs)
2. Enhance the tooltip content (lines 1010-1013) to include dynamic instructions based on connection state
3. Optionally add a small centered "Instructions" text on the canvas background when in connect mode, positioned away from the button

### Result
Single, clean connect button with no text cutoff. Instructions only visible in tooltip when hovering or via a single instruction area, not overlapping the button itself.
