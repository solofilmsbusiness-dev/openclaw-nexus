

## Hide Edges When a Connected Node Is Down

### Problem
When a node is killed/disabled, its edges remain visible (just dimmed and red). The user wants them to disappear entirely.

### Solution
In `src/components/AgentGraph.tsx`, inside the `AnimatedEdge` component, return `null` when `eitherDown` is true. This will completely hide all connections to/from any downed node.

### Changes
**File: `src/components/AgentGraph.tsx`**
- After the `eitherDown` variable is computed (~line 361), add an early return: `if (eitherDown) return null;`
- This removes the edge from the SVG entirely when either connected node is down
- When the node is revived, edges automatically reappear since the component re-renders

Single line change, one file.

