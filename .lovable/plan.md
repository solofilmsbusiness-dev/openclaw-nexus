

## Allow Connecting Nodes to the Core Node

The core node is currently a static SVG element with no click handler, so it can't participate in Connect mode. The fix is to make the core node clickable during connect mode, treating `"core"` as a valid source or target ID.

### Changes to `src/components/AgentGraph.tsx`

1. **Add a click handler to the core node group** (around line 1080): Add an `onClick` on the `FloatingGroup` wrapping the core that, when in connect mode, sets `"core"` as the connect source (if no source yet) or sets the pending edge target to `"core"` (if a source is already selected). Also add a `cursor: pointer` style when in connect mode.

2. **Add a visual highlight on the core node in connect mode**: When `connectMode` is active and `connectSource` is set, give the core node a highlight ring (similar to how agent nodes highlight as potential targets). When `connectSource === "core"`, show it as the selected source.

3. **No data model changes needed**: The edges already use string IDs for `from`/`to`, and `"core"` is already used in the default `EDGES` array in `agents.ts` — so the existing edge rendering and storage already supports core connections.

### File Changed

| File | Change |
|------|--------|
| `src/components/AgentGraph.tsx` | Add onClick handler + visual feedback to core node SVG group for connect mode |

