

## Plan: Kill Switch locks system + red particles

### Problem
Currently, the kill switch sets all agents to "down" but the simulation can still change their status back. Particles remain their default blue/purple colors.

### Changes

1. **`src/contexts/AgentContext.tsx`** — Add a `killSwitchActive` boolean state. `killAll` sets it to `true`, `reviveAll` sets it to `false`. Expose it in context.

2. **`src/hooks/useSimulation.ts`** — Accept `killSwitchActive` flag. When active:
   - Skip all progress ticking (no updates)
   - Skip all status change scheduling (agents stay dead)
   - Skip event generation (no data transfer)

3. **`src/components/AgentGraph.tsx`** — When `killSwitchActive` is true:
   - `OrbitalParticles`: Change all particle colors to red (`hsl(0, 70%, 50%)`)
   - `Stardust`: Change star colors to red
   - `CoreEnergyRings`: Change ring stroke to red
   - Add a red glow filter or increase glow intensity on particles
   - Edge animated particles stop or turn red (no data flow)

4. **`src/pages/Admin.tsx`** — No changes needed (already calls `killAll`/`reviveAll`)

### Technical Details

- `killSwitchActive` will be stored in `AgentContext` alongside agents
- The simulation hook already skips `down` agents for progress, but status changes can still flip them back — the flag prevents that entirely
- Graph components will read `killSwitchActive` from context and conditionally apply red color scheme
- Edge particles will have opacity set to 0 or be hidden when kill switch is active (no data transfer)

