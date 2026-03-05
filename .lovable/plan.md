

## Expand Onboarding Tour to Cover Missing Sections

The current 5-step tour skips the Connect button, graph toolbar tools (zoom, lock, kill switch, config), and treats Events + Terminal Log as one step. The fix is to split and add steps, plus add `data-tour` attributes to the relevant elements in `AgentGraph.tsx`.

### Changes

**`src/components/AgentGraph.tsx`** — Add `data-tour` attributes:
- `data-tour="graph-connect"` on the Connect mode button (line ~866)
- `data-tour="graph-tools"` on the zoom/tools column div (line ~941)

**`src/pages/Index.tsx`** — Split the right panel's two children into separate `data-tour` targets:
- `data-tour="event-timeline"` on the EventTimeline wrapper div (line ~143)
- `data-tour="terminal-log"` on the TerminalLog wrapper div (line ~150)
- Remove `data-tour="event-timeline"` from the outer right panel div (line ~137)

**`src/components/OnboardingTour.tsx`** — Replace the STEPS array with 8 steps:

| # | Target | Title | Description | Position |
|---|--------|-------|-------------|----------|
| 1 | `metrics-bar` | Metrics Bar | Monitor agents' health at a glance — total, healthy, active, degraded, and down. | bottom |
| 2 | `agent-cards` | Agent Cards | Browse and manage your agents. Click one to select it in the graph, or add new agents. | right |
| 3 | `agent-graph` | Node Graph | The living network map. Drag nodes to rearrange, scroll to zoom, and click nodes to inspect. | bottom |
| 4 | `graph-connect` | Connect Mode | Enter Connect mode to link agents. Click a source node, then a target, and pick a connection type. | bottom |
| 5 | `graph-tools` | Graph Tools | Zoom in/out, reset view, lock the layout, kill/revive all agents, or save/load configurations. | left |
| 6 | `event-timeline` | Event Timeline | Real-time event feed — filter by clicking an agent name. Shows status changes, messages, and alerts. | left |
| 7 | `terminal-log` | System Log | Raw terminal output of all system events. Scroll to review the latest 30 entries. | left |
| 8 | `cmd-k` | Command Palette | Press ⌘K to quickly search agents and run actions from anywhere. | top |

### Files Changed

| File | Change |
|------|--------|
| `src/components/OnboardingTour.tsx` | Replace STEPS array with 8 expanded steps |
| `src/components/AgentGraph.tsx` | Add `data-tour` attributes to Connect button and tools column |
| `src/pages/Index.tsx` | Move `data-tour` attributes to individual EventTimeline and TerminalLog wrappers |

