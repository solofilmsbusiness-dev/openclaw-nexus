

## Add Mini Agent Graph & Calculator Panel Types

### Overview
Two new panel types: a **compact, live agent graph** showing the network as an interactive mini-map, and a **trading calculator** with standard arithmetic plus quick position-size/risk-reward helpers.

### Files to Create

**1. `src/components/trading/MiniAgentGraph.tsx`**
- Compact SVG (viewBox 0 0 400 300) rendering agents from `useAgents()` in a circular layout around a central core
- Status-colored nodes (using existing `statusColor`), thin connecting lines for edges
- Read-only -- no drag/connect/zoom, just a live view that updates with agent status changes
- Clicking a node shows a tiny tooltip with agent name + status
- Simplified orbital particle animation (5-8 particles via SVG `<animateTransform>`)
- Core node in center with subtle pulse animation

**2. `src/components/trading/CalculatorPanel.tsx`**
- Display area showing current expression and result
- Standard number pad (0-9, decimal) + operators (+, -, x, ÷, %)
- Three quick-calc mode buttons:
  - **Pos Size**: inputs for Account Size, Risk %, Stop Distance → outputs share count
  - **R:R Ratio**: inputs for Entry, Stop, Target → outputs ratio
  - **P/L**: inputs for Entry, Exit, Shares → outputs dollar P/L
- Compact grid layout, all interactive, state managed locally

### Files to Edit

**3. `src/contexts/TradingLayoutContext.tsx`**
- Change type: `"notes" | "embed" | "checklist"` → `"notes" | "embed" | "checklist" | "graph" | "calculator"`

**4. `src/components/trading/CustomPanel.tsx`**
- Import both new components
- Add icon mapping for `graph` (Network icon) and `calculator` (Calculator icon)
- Add render branches: `panel.type === "graph"` and `panel.type === "calculator"`

**5. `src/components/trading/AddPanelDialog.tsx`**
- Add two entries to `PREMADE_TEMPLATES`:
  - "Agent Network" -- type `graph`, icon `Network`, description "Live mini-map of your agent ecosystem"
  - "Calculator" -- type `calculator`, icon `Calculator`, description "Quick trading calculations & position sizing"

