

## Fix: Toggle Kill/Revive with Same Button

The kill button currently only shows when the agent is alive (`!isDead`). Change it to always show, toggling between kill and revive actions based on state.

**`src/components/AgentCards.tsx`** (lines 253-266):
- Remove the `{!isDead && ...}` condition
- When `isDead`: show a green Zap icon, clicking sets status to `"active"` with task "Resuming" and toasts success
- When alive: show the red Power icon, clicking sets status to `"down"` with task "KILLED" and toasts error

This makes a single button that toggles between kill/revive.

