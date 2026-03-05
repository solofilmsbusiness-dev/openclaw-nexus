

## Fix: Kill Button Toggle & Node Info Popup Blocking Graph

### Problem 1: Kill Button Toggles (Kill → Revive on second press)

In `AgentCards.tsx` (lines 254-278), the hover buttons swap between a Kill icon (when alive) and a Revive icon (when dead). When a user clicks Kill, the button immediately becomes Revive, so a second click revives the agent. The user expects Kill to stay killed.

**Fix**: Remove the Revive button from the card hover state entirely. Reviving should only be possible through the expanded detail view's "Run" or "Restart" buttons — not from the same quick-action area. This prevents accidental double-click toggling.

In `AgentCards.tsx`:
- Remove the revive `<Zap>` button block (lines 267-278)
- Keep the kill `<Power>` button as-is (only shows when not dead)

### Problem 2: Node Info Popup Obstructs Graph

In `AgentGraph.tsx` (lines 1131-1171), clicking or hovering a node shows a `displayAgent` info panel at `absolute top-14 right-3` that overlaps the graph and zoom controls. It persists while a node is selected, blocking interaction.

**Fix**: Move this panel to the bottom-left corner (`bottom-20 left-3`) where it won't conflict with zoom controls (top-right) or the connect mode UI (top-left). Also make it smaller/more compact and add a close button so users can dismiss it.

In `AgentGraph.tsx`:
- Change position from `top-14 right-3` to `bottom-20 left-3`
- Reduce width from `w-64` to `w-56`
- Add a small X close button that calls `onSelectAgent(null)`

### Files Changed

| File | Changes |
|------|---------|
| `AgentCards.tsx` | Remove revive button from card hover actions |
| `AgentGraph.tsx` | Reposition node info panel to bottom-left, add close button |

