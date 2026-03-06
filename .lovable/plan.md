

## Rebuild Agent Trade Panel: 4-Node Linear Pipeline

### Concept
Replace the current circular orbital graph with a **horizontal pipeline of 4 rectangular agent nodes** connected by directional connectors. Each node represents a stage in the trade flow:

1. **Researcher** -- scans markets, gathers data (icon: 🔍)
2. **Analyst** -- evaluates indicators, scores signals (icon: 📊)
3. **Strategist** -- decides entry/exit, position sizing (icon: 🧠)
4. **Executor** -- places and manages trades (icon: ⚡)

### Visual Layout

```text
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ 🔍       │───▶│ 📊       │───▶│ 🧠       │───▶│ ⚡       │
│Researcher│    │ Analyst  │    │Strategist│    │ Executor │
│ scanning │    │ eval RSI │    │ sizing   │    │ BUY AAPL │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### How It Works
- **Trade flow tracking**: When a new trade event happens, a data orb animates along the connectors from Researcher → Analyst → Strategist → Executor, showing the pipeline in action
- **Node states**: Each node shows its current activity text (e.g., "scanning AAPL", "RSI: 42", "sizing 50 shares", "BUY @198.50") pulled from `evaluations`, `considerations`, and `executedTrades`
- **Click to select**: Clicking a node sets `selectedAgentId` to filter the trade history panel (reusing existing context)
- **Flash on activity**: Nodes briefly glow when their stage processes something
- **Activity feed**: Keep the bottom feed showing last 3-4 trade events

### Files to Change

**Rewrite `src/components/trading/MiniAgentGraph.tsx`**
- Remove circular layout, orbital particles, stardust, energy rings, core node
- Define 4 hardcoded trading agents (Researcher, Analyst, Strategist, Executor) with fixed IDs
- Render as 4 rounded rectangles in a horizontal row with arrow connectors between them
- Each rectangle shows: icon, name, current status text
- Green data orb animates along connector paths when trades flow through
- Selected node gets a highlight ring; unselected nodes dim
- Bottom activity feed stays

**Update `src/contexts/TradingDataContext.tsx`**
- The `tradeAgentMap` now maps trade IDs to the pipeline agent IDs (researcher/analyst/strategist/executor) instead of random dashboard agents
- No longer imports from `useAgents()` -- these are self-contained trading pipeline agents

No other files need changes -- the context, panel type, and template name are already wired up.

