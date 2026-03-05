

## Add Delete Key Support for Graph Nodes

### Overview
When a node is selected in the graph and the user presses the Delete/Backspace key, show the same confirmation dialog used in AgentCards before deleting the agent.

### Changes

**`src/components/AgentGraph.tsx`**
- Add `onDeleteAgent` to props (passed from Index)
- Add `pendingDeleteId` state (string | null)
- Add a `useEffect` with a `keydown` listener for Delete/Backspace: if `selectedAgentId` is set and no connect mode active, set `pendingDeleteId = selectedAgentId`
- Render an `AlertDialog` (same pattern as AgentCards) controlled by `pendingDeleteId`, showing agent name, confirm calls `onDeleteAgent(pendingDeleteId)` + toast + clear state

**`src/pages/Index.tsx`**
- Pass `onDeleteAgent={handleDeleteAgent}` to `AgentGraph`

