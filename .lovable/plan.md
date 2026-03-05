

## Add & Delete Agents (Graph + Cards Synced)

### Overview
Add a "Delete" button to each agent card and a "+" button to add new agents. Since `agents` state lives in `Index.tsx` and is passed to both `AgentCards` and `AgentGraph`, changes automatically reflect in both.

### Changes

**`src/pages/Index.tsx`**
- Add `handleAddAgent` callback that creates a new agent with defaults (random id, placeholder name/icon, healthy status, empty metrics) and appends to `agents`
- Add `handleDeleteAgent(id)` callback that filters the agent out, clears `selectedAgentId` if it matches, and also removes related events
- Pass `onAddAgent` and `onDeleteAgent` props to `AgentCards`

**`src/components/AgentCards.tsx`**
- Accept new props: `onAddAgent` and `onDeleteAgent`
- Add a "+" button in the header area (near search bar) that opens a small inline form or dialog to enter name, icon (emoji picker or text input), type, and subtitle, then calls `onAddAgent`
- Add a delete button (Trash icon) on each agent card in the `AgentsTab` — visible on hover or in the expanded detail view. Clicking calls `onDeleteAgent(agent.id)` with a confirmation toast
- Use a simple Dialog or inline form for the "Add Agent" flow with fields: name, subtitle, icon (text input), type (select from existing types)

**`src/data/agents.ts`**
- Export a helper `createAgent(overrides: Partial<Agent>): Agent` that fills in defaults (random id, empty metrics arrays, 0 progress, etc.)

**`src/components/AgentGraph.tsx`**
- No changes needed — it already dynamically renders from the `agents` prop and computes positions via `getNodePositions(agents)`

**`src/hooks/useSimulation.ts`**
- No changes needed — it operates on whatever agents array is passed in

