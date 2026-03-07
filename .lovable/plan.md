

## Fix: Reconnecting Edges to Down Nodes

### Problem
When a node is disabled/killed, edges are hidden (we return `null` in `AnimatedEdge`). But the edge data still exists in state. When a user tries to re-add a connection via Connect Mode, `handleAddEdge` detects the edge already exists and silently skips it. The edge stays hidden because the node is still "down".

### Solution
Two changes:

**1. `src/components/AgentGraph.tsx` — Allow down nodes to show edges in connect mode or fade them instead of hiding**
- Instead of `return null` when `eitherDown`, render the edge with very low opacity (e.g., `0.08`) and a dashed stroke so users can see existing connections even on down nodes. No particles.

**2. `src/components/AgentGraph.tsx` — Show feedback when edge already exists**
- In `handleConfirmEdge`, after calling `onAddEdge`, check if the edge was actually new. Alternatively, show a toast if the connection already exists.

OR simpler approach:

**1. `src/components/AgentGraph.tsx`** — Replace the hard `return null` with a dim, dashed rendering:
- `if (eitherDown)`: render just the base path with ~0.08 opacity, dashed stroke, no particles, no glow
- This lets users see that a connection still exists on a downed node

This single change fixes the core issue — users will see the connection is still there (just very faint/dashed) and won't try to re-add it.

### Changes
**File: `src/components/AgentGraph.tsx`** (~line 362)
- Remove `if (eitherDown) return null;`
- The existing code already handles `eitherDown` with reduced opacity (`0.04`), red color, and no particles — this was already implemented before the previous change. Simply removing the early return restores that behavior with a dim red edge shown instead of nothing.

Single line removal, one file.

