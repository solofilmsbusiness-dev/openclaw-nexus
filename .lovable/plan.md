

## More Creative Text for the Agent Graph

### Current State
Each node shows: agent name + status label (e.g. "Brain" / "HEALTHY"). The core shows "SOLO OS CORE" / "v2.26". That's it — minimal and static.

### Changes

**`src/components/AgentGraph.tsx`** — Richer node labels:
- Replace the plain status text below each node with the agent's `currentTask` (e.g. "Campaign orchestration" instead of "HEALTHY")
- Add a small live metric readout: show `progress%` as a tiny arc/ring around each node
- Add ambient floating text near the core — rotating taglines like "12 agents online", "47 tasks processed", "system nominal" that fade in/out on a cycle
- Show edge labels on hover — display the `kind` (control/data/comms/handoff) as small text along the curved path when that edge is highlighted
- Add a subtle "last active" timestamp under the agent name using relative time (e.g. "2m ago")

**`src/data/agents.ts`** — Richer agent descriptions:
- Add a `subtitle` field to each agent with a short creative descriptor:
  - Brain → "Chief Orchestrator"
  - Research → "Intelligence Gatherer"  
  - Scheduler → "Time Keeper"
  - Architect → "Systems Designer"
  - Scout → "Horizon Watcher"
  - Content Command → "Narrative Engine"
  - WebAgency → "Digital Craftsman"
  - The Wire → "Signal Tower"
  - FlipEngine → "Commerce Engine"
  - Videographer → "Visual Storyteller"
  - Analyst → "Pattern Reader"
  - Skool Master → "Knowledge Architect"

**`src/components/AgentGraph.tsx`** — Node text layout becomes:
1. Icon (emoji)
2. Agent name (bold)
3. Subtitle in italics (e.g. "Chief Orchestrator")
4. Current task in muted mono (e.g. "Campaign orchestration")
5. Progress arc ring around the node circle

**Core center text** — rotating ambient lines:
- Cycle through: "12 agents synced", "system nominal", "v2.26 stable", "neural mesh active" every 4s with fade transitions

