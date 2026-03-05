

## Plan: Manual Note Creation + Drag-to-Rearrange Trading Panels + Custom Panels

### 1. Manual Learning Note Creation

Add a "New Note" button to the Learning Journal panel header that opens an inline form (or a small dialog) with:
- A category selector (Mistake / Insight / Adjustment / Pattern)
- A text area for the note content
- Save button that persists to the `learning_notes` table and prepends to local state

Add an `addLearningNote` function to `useTradingSimulation` hook that inserts into both state and DB.

### 2. Drag-to-Rearrange Panel Grid

Replace the static CSS grid in `Trading.tsx` with a **drag-and-drop grid layout** system:

- Create a `TradingLayoutContext` that stores the ordered list of visible panel IDs and persists to `localStorage`
- Each existing panel (Market Data, Trading Agent, Trade History, Learning Journal, Portfolio Summary, Watchlist, Analytics) becomes a registered panel with an `id`, `title`, `icon`, and `render` function
- Use `framer-motion` `Reorder` components (already installed) to enable drag-to-reorder of panels within the grid
- Each panel gets a small drag handle in its header bar
- Panel order is saved to localStorage under a key like `trading-panel-order`

### 3. Custom Panels

- Add an "Add Panel" button (fixed at the bottom of the grid or in the top bar) that opens a dialog
- Users can create custom panels with:
  - Panel title
  - Panel type: "Notes" (free-text markdown-like area), "Embed" (iframe URL), or "Checklist" (simple todo items)
- Custom panel definitions stored in localStorage (with content)
- Custom panels are deletable and rearrangeable just like built-in ones

### Technical Approach

**Files to create:**
- `src/contexts/TradingLayoutContext.tsx` — manages panel order, custom panel definitions, localStorage persistence
- `src/components/trading/CustomPanel.tsx` — renders custom panel types (Notes/Embed/Checklist)
- `src/components/trading/AddPanelDialog.tsx` — dialog for creating custom panels
- `src/components/trading/PanelWrapper.tsx` — wraps each panel with drag handle and optional remove button

**Files to modify:**
- `src/hooks/useTradingSimulation.ts` — add `addLearningNote` callback
- `src/pages/Trading.tsx` — refactor from hardcoded panels to a dynamic panel registry rendered via `Reorder.Group`
- `src/App.tsx` — wrap Trading route with `TradingLayoutProvider`

**Key decisions:**
- Use `framer-motion`'s `Reorder` API (already in deps) for drag-and-drop — no new packages needed
- Panel grid columns stay responsive (`grid-cols-1 lg:grid-cols-2 xl:grid-cols-3`) but items are ordered dynamically
- Custom panels persist to localStorage only (no DB table needed for panel layout/content)

