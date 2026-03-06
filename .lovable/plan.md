
## Move Legend from Left to Right

The edge kind color legend (Control, Data, Comms, Handoff) is currently positioned at `bottom-3 left-3`. Moving it to the right side requires a single CSS class change.

**Change in `src/components/AgentGraph.tsx` (line 1144):**
- Replace `bottom-3 left-3` with `bottom-3 right-3`
- The div will move from the bottom-left corner to the bottom-right corner
- All other styling remains unchanged

This is a straightforward positioning change with no functional impact.
