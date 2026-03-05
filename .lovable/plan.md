

## Remove Node Info Popup from Graph

**`src/components/AgentGraph.tsx`**:
- Delete the entire `displayAgent` popup block (lines 1131-1180) — the `motion.div` that shows agent name, status, task, progress, backlog, and activity sparkline when a node is selected/hovered.
- Also remove the `hovered` state and `displayAgent` derived variable (line 855) since they're no longer needed for this popup. The `selectedAgentId` will still be used for node highlighting but won't trigger any overlay panel.

