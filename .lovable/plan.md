

## Rebuild "Agent Trade" Panel as a Trade Flow Tracker

### What it does now
The current `MiniAgentGraph` is a bare-bones SVG with simple colored dots and static lines -- nothing like the rich dashboard graph.

### What it should be
A compact replica of the dashboard graph's visual style, repurposed as a **trade flow tracker**. It shows agents evaluating, considering, and executing trades in real-time with animated data orbs flowing between nodes.

### Changes

#### 1. Rewrite `src/components/trading/MiniAgentGraph.tsx`

Port the dashboard graph's visual DNA into a compact panel:

- **Visual parity with dashboard**: Orbital particles, energy rings, stardust dots, core node with pulse, curved edges with green data orbs and comet trails, progress arcs around nodes, status-colored glows, floating animation
- **Compact layout**: viewBox `0 0 400 300`, smaller radii and sizes scaled down proportionally
- **Trade flow integration**: Pull `considerations`, `executedTrades`, and `evaluations` from the trading simulation hook to show:
  - **Flash pulses** on agent nodes when a trade is executed (brief bright ring)
  - **Activity feed overlay**: A small scrolling text area at the bottom showing the last 3-4 trade events ("🟢 BUY AAPL @198.50", "🔴 SELL TSLA @245.10")
  - **Edge data orbs speed up** when trades are active
- **Tooltip on hover**: Show agent name, status, and current task
- **Core label**: Rotating taglines like "tracking 8 symbols", "3 trades/min", etc.

However, since the trading simulation data lives in `useTradingSimulation()` (called in the Trading page), and the MiniAgentGraph lives inside a custom panel, I need to pass trade data down. The cleanest approach: access executedTrades and considerations from the trading page context.

#### 2. Update `src/pages/Trading.tsx` -- expose trade data via context

Create a lightweight `TradingDataContext` that wraps the trading page and exposes `executedTrades`, `considerations`, and `evaluations` so the MiniAgentGraph panel can consume them without prop drilling.

Alternatively, since the panel is rendered inside Trading.tsx which already calls `useTradingSimulation()`, I can create a simple React context in a new file.

#### 3. Create `src/contexts/TradingDataContext.tsx`

A thin context that holds references to the simulation's live trade data arrays so child panels can read them.

#### 4. Update `src/components/trading/AddPanelDialog.tsx`

Rename the template from "Agent Network" to "Agent Trade" with description "Live agent trade flow tracker".

### Files

| File | Action |
|---|---|
| `src/components/trading/MiniAgentGraph.tsx` | **Rewrite** -- full visual overhaul with dashboard-style rendering + trade flow indicators |
| `src/contexts/TradingDataContext.tsx` | **Create** -- thin context exposing executedTrades, considerations from simulation |
| `src/pages/Trading.tsx` | **Edit** -- wrap content in TradingDataProvider |
| `src/components/trading/AddPanelDialog.tsx` | **Edit** -- rename template to "Agent Trade" |

### Visual spec (compact panel)

```text
┌─────────────────────────────────┐
│ ● AGENT TRADE          🔗      │
│                                 │
│      ✨  ·    ·                 │
│    🔍──────🧠──────📅          │
│   ╱  ·  ╲  │  ╱  ·  ╲         │
│  📝    📡 [CORE] 📊   🎓      │
│   ╲  ·  ╱  │  ╲  ·  ╱         │
│    🌐──────🔄──────🎬          │
│      · ✨    ·                  │
│                                 │
│ 🟢 BUY AAPL @198.50  12:03:22 │
│ 🔴 SELL TSLA @245.10  12:03:15│
│ 🟡 EVAL NVDA RSI:42   12:03:08│
└─────────────────────────────────┘
```

Key visual elements ported from dashboard:
- Curved quadratic edges (not straight lines)
- Green data orbs with comet trails flowing along edges
- Orbital particles around core
- Energy rings expanding from core
- Progress arcs around agent nodes
- Stardust background dots
- Floating/bobbing node animation
- Status-based node coloring and glow

