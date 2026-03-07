

## Fix FlipEngine Connection Issue

### Problem
FlipEngine starts with status `"down"`. Its edge (e9) renders at **0.04 opacity** — essentially invisible. When you try to connect to it via Connect Mode, `handleAddEdge` finds the existing edge and silently updates its kind, but the edge remains nearly invisible because the node is still "down." It looks like nothing happened.

### Root Cause
The `AnimatedEdge` component sets `edgeOpacity = 0.04` when either connected node is down — too dim to see.

### Solution
Two changes in **`src/components/AgentGraph.tsx`**:

1. **Make down-node edges visible** — Change the "down" edge opacity from `0.04` to `0.15` and render with a dashed stroke so the connection is clearly visible but visually distinct from active edges.

2. **Auto-revive node on connect** — When a user explicitly connects to a "down" node via Connect Mode, automatically change that node's status to `"degraded"` (bringing it back online). This way the connection immediately looks active after connecting. This requires passing `onStatusChange` into the graph and calling it in `handleConfirmEdge`.

This way:
- Existing connections to down nodes are faintly visible (dashed, ~0.15 opacity)
- When a user deliberately connects to a down node, it comes back online automatically

