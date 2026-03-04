

## Improvement Plan: Full Dashboard Upgrade

### 1. Real-Time Simulation Engine
Create a simulation hook (`useSimulation`) that runs on an interval and randomly mutates agent state to make the dashboard feel alive:
- **Agent status changes**: Randomly toggle agents between healthy/active/degraded/down every 8-15s
- **Progress ticking**: Increment progress bars over time, reset when reaching 100%
- **Live event streaming**: Generate new events and prepend them to the timeline and terminal log with entrance animations
- **Metrics refresh**: Shift sparkline data arrays with new random values so charts scroll
- **MetricsBar updates**: Derive counts from live agent state instead of static `AGENTS` import

**Files**: New `src/hooks/useSimulation.ts`, update `Index.tsx`, `MetricsBar.tsx`, `EventTimeline.tsx`, `TerminalLog.tsx`

### 2. Click-to-Select & Cross-Component Sync
Add a selected agent concept that syncs graph ↔ sidebar:
- **Graph nodes**: Click to select (highlighted ring, other nodes dim). Click again or click background to deselect
- **Sidebar**: Auto-scroll to and expand the selected agent's card. Clicking a card selects it in the graph too
- **Detail panel**: When selected, the right panel's EventTimeline filters to show only that agent's events (with a "Show All" toggle)
- Shared `selectedAgentId` state lifted to `Index.tsx`

**Files**: Update `Index.tsx`, `AgentGraph.tsx`, `AgentCards.tsx`, `EventTimeline.tsx`

### 3. Visual Polish
- **Loading skeleton**: Brief skeleton pulse on initial mount before data appears
- **Theme toggle**: Dark (current) / Midnight Blue variant via a small toggle in MetricsBar
- **Mobile improvements**: Stack panels vertically with swipeable tabs instead of collapse buttons on small screens
- **Toast notifications**: When simulation changes agent status, fire a subtle toast ("⚠️ FlipEngine went down")
- **Smooth scroll**: Wrap sidebar and timeline in `ScrollArea` for styled scrollbars

**Files**: Update `Index.tsx`, `MetricsBar.tsx`, `AgentCards.tsx`, `EventTimeline.tsx`, `TerminalLog.tsx`, `index.css`

### 4. Command Palette & Search
- **Cmd+K palette**: Using the existing `cmdk` dependency, add a command palette to quickly jump to agents, trigger actions (run/pause/restart), or filter views
- **Agent search**: Add a search input at the top of the AgentCards sidebar that filters the agent list in real-time
- **Notification badges**: Show a small red dot on the MetricsBar when agents go down, clickable to jump to the issue

**Files**: New `src/components/CommandPalette.tsx`, update `Index.tsx`, `AgentCards.tsx`, `MetricsBar.tsx`

### Implementation Order
1. Real-time simulation hook (foundation for everything else)
2. Click-to-select sync across components
3. Command palette + search
4. Visual polish pass (scrollbars, toasts, loading states)

This is a substantial set of changes across ~10 files. Each step builds on the previous and can be verified independently.

