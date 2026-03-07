

## Draggable, Removable, and Expandable Top Bar Widgets

### Current State
The top bar has 9 widget slots (session clock, P/L, trades, win rate, theme toggle, compact mode, column layout, add panel, data status). They can be toggled on/off via a settings popover, but they **cannot be reordered** and there's no way to **add new widget types**.

### Plan

**1. Make top bar items reorderable via drag-and-drop**
- Store `topBarItems` as an ordered array (already done in context) — the render order in `Trading.tsx` will follow this array order instead of hardcoded JSX blocks
- Add drag handles to each top bar widget using the same framer-motion drag pattern used in `PanelWrapper`
- On drag, swap positions in the `topBarItems` array

**2. Add more widget options to the top bar**
- Expand `TOP_BAR_ITEMS` in `TradingLayoutContext.tsx` with new widgets:
  - `"maxdd"` — Max Drawdown ($)
  - `"avgwin"` — Avg Win ($)
  - `"avgloss"` — Avg Loss ($)  
  - `"openpos"` — Open Positions count
  - `"margin"` — Margin Utilization %
  - `"pagenav"` — Page Navigation (Trading/Calendar toggle)
- Each new widget renders a small metric display similar to existing P/L / Trades widgets

**3. Refactor top bar rendering in `Trading.tsx`**
- Replace the current hardcoded conditional blocks with a single loop over `layout.topBarItems`
- Create a `TopBarWidget` component that takes a widget ID and renders the appropriate content
- Each widget gets a small drag handle (grip icon) on hover and an X button to hide it
- The settings popover becomes the "add back" mechanism (already works via toggles)

**4. Update `TradingLayoutContext.tsx`**
- Add new widget IDs to `TOP_BAR_ITEMS` array and `TopBarItemId` type
- `topBarItems` order = render order (drag reorder updates this array)
- Add `reorderTopBarItem(fromIndex, toIndex)` method

### Files Changed
- **`src/contexts/TradingLayoutContext.tsx`** — Add new widget IDs, add reorder function
- **`src/pages/Trading.tsx`** — Refactor top bar to loop-based rendering with draggable widgets, add new metric renders
- **`src/components/trading/TopBarWidget.tsx`** (new) — Encapsulates per-widget rendering with drag handle and remove button

