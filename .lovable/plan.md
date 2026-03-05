

## Add Edge Connections Between Graph Nodes

### Overview
Enable users to connect two nodes by clicking them in sequence, creating a new edge (cord) between them. Also allow deleting edges.

### Changes

**`src/pages/Index.tsx`**
- Lift `edges` into state: `useState<Edge[]>(EDGES)`
- Add `handleAddEdge(from, to, kind)` and `handleDeleteEdge(edgeId)` callbacks
- Pass `edges`, `onAddEdge`, `onDeleteEdge` to `AgentGraph`
- Clean up edges referencing a deleted agent in `handleDeleteAgent`

**`src/components/AgentGraph.tsx`**
- Accept new props: `edges`, `onAddEdge`, `onDeleteEdge`
- Replace the imported `EDGES` constant with the `edges` prop
- Add a **"connect mode"** toggle button (small link icon overlay in top-left of graph)
- When connect mode is active:
  - First node click sets `connectSource` state
  - Second node click calls `onAddEdge(source, target, "data")` with a default kind, then clears connect mode
  - Visual feedback: highlight the source node with a pulsing ring while waiting for the second click
  - ESC or clicking background cancels
- When an edge is highlighted (hovered/focused), show a small "×" delete button at the midpoint that calls `onDeleteEdge`
- Add a kind selector (small dropdown or cycle through control/data/comms/handoff) shown after selecting two nodes, before confirming the connection

**`src/data/agents.ts`**
- Export a `createEdge(from, to, kind)` helper that generates an edge with a unique id and default weight of 0.7

