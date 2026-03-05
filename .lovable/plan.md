

## Double-Click Node to Start Connection

### Overview
Double-clicking a node will automatically enter connect mode with that node pre-selected as the source, so the user just needs to click a target node to complete the connection.

### Changes

**`src/components/AgentGraph.tsx`**
- Add an `onDoubleClick` handler to `AgentNode` that calls a new `handleNodeDoubleClick` callback
- `handleNodeDoubleClick(agent)`: sets `connectMode = true`, `connectSource = agent.id`, bypassing the need to first toggle connect mode and then click a source
- In `AgentNode`, add `onDoubleClick` prop and attach it to the `<motion.g>` element (with `e.stopPropagation()`)
- Ensure single-click drag/select behavior is unaffected (double-click is a distinct event)

