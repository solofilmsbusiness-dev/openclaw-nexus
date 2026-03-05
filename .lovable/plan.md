

## Add Kill Switch button to graph toolbar

### Change

**`src/components/AgentGraph.tsx`**:
- Import `useAgents` from `AgentContext` to access `killAll`, `reviveAll`, and `killSwitchActive`
- Add a kill switch toggle button to the zoom controls toolbar (top-right, after the lock button, around line 915)
- Button uses `Power` or `Zap` icon from lucide-react
- When `killSwitchActive` is false, clicking calls `killAll()`; when true, clicking calls `reviveAll()`
- Style: red destructive styling when active (`border-red-500/60 bg-red-500/20 text-red-500`), default muted when inactive

Since `killSwitchActive` is already passed as a prop and `killAll`/`reviveAll` are in the context, we just need to pull them from `useAgents()` inside the component and add the button.

