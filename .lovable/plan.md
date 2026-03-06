

## Enhance Pipeline Nodes: Live Status, Glow, and Adjustable Sizing

### Problem
The current pipeline nodes show static short status labels ("scan AAPL", "idle") that don't convey the feeling of active AI agents working. The glow is subtle, and nodes aren't adjustable.

### Changes -- All in `src/components/trading/MiniAgentGraph.tsx`

**1. Rich Sequential Status State Machine**

Replace the simple `nodeStatus` memo with a proper state machine that cycles each node through descriptive phases tied to real simulation data:

- **Researcher**: "Scanning markets..." → "Researching {symbol}..." → "Collecting {indicator} data..." → "Data ready ✓"
- **Analyst**: "Waiting for data..." → "Analyzing {symbol}..." → "Evaluating {indicator}: {value}..." → "Analysis complete ✓"  
- **Strategist**: "Waiting for analysis..." → "Planning {symbol} entry..." → "Confidence: {n}%..." → "Strategy ready ✓"
- **Executor**: "Awaiting strategy..." → "Preparing order..." → "Executing {BUY/SELL} {symbol}..." → "{BUY/SELL} @{price} ✓"

Each phase auto-advances on a timer (1-2s per phase), triggered when new evaluations/considerations/trades arrive. The active phase gets a brighter glow. When idle, shows "Monitoring..." with a dim pulse.

**2. Stronger Node Glow**

- Increase the breathing glow ellipse opacity from `0.04-0.12` to `0.08-0.25`
- Add an inner glow layer with the node's color at higher opacity
- When a node is in its "active processing" phase, boost glow further with a pulsing ring
- Add a second outer glow ring that scales with activity intensity

**3. Adjustable Node Sizing**

- Convert from fixed SVG constants to React state: `nodeScales` record tracking per-node scale factor (0.8 to 1.4)
- Add a small drag handle (corner grip icon) on each node, visible on hover/selection
- Mouse drag on handle adjusts scale factor, which multiplies `NODE_W` and `NODE_H` for that node
- Persist scales in localStorage under a key like `"mini-graph-node-scales"`
- Recalculate connector paths dynamically based on current node sizes

**4. Sequential Data Flow Visualization**

- When a new evaluation arrives, start the Researcher phase cycle, then after ~2s trigger the Analyst phase
- When a new consideration arrives, trigger Strategist phase
- When a new trade arrives, trigger Executor phase with cascade flash
- Each transition sends a highlighted data orb along the connector between the two nodes (brighter, larger than the ambient orbs)

### Technical Approach

- New `useReducer` or multiple `useState` for `nodePhases: Record<PipelineId, { phase: string; detail: string; active: boolean }>`
- `useEffect` watchers on `evaluations`, `considerations`, `executedTrades` lengths to trigger phase transitions with `setTimeout` chains
- Node glow uses existing SVG filter `mini-nodeGlow` but with higher opacity values and an additional animated ring element
- Resize state stored as `Record<PipelineId, number>` (scale multipliers), with mouse event handlers on small corner SVG rects
- Layout functions `nodeX()`, `nodeCX()`, etc. become functions of scale state rather than pure constants

### No other files change
Only `MiniAgentGraph.tsx` is modified. The simulation data sources and context remain the same.

