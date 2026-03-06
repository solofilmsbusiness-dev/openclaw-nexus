

## Customizable Trading Top Bar

### Overview
Make the trading page top bar items toggleable — users can show/hide individual metrics and controls via a settings popover, with preferences persisted in localStorage.

### What changes

**File: `src/contexts/TradingLayoutContext.tsx`**
- Add a `topBarItems` array and `setTopBarItems` to the context
- Define all available top bar items with IDs: `"session"`, `"pnl"`, `"trades"`, `"winrate"`, `"theme"`, `"compact"`, `"columns"`, `"addpanel"`, `"status"`
- Persist selections in the existing `trading-layout-v2` localStorage key
- Default: all items visible

**File: `src/pages/Trading.tsx`**
- Add a `Settings2` gear icon button in the top bar (right side) that opens a `Popover`
- The popover contains a checklist of all top bar items with labels and toggles (using `Switch` or `Checkbox`)
- Each metric/control section in the top bar is conditionally rendered based on `topBarItems` visibility
- Wrap each section with a check like `{isVisible("session") && (<div>...</div>)}` 
- The "Back to Dashboard" button and "Futures Trading" title are always visible (not removable)

### Top bar item definitions
| ID | Label | What it controls |
|---|---|---|
| `session` | Session Clock | RTH/ETH/CLOSED clock |
| `pnl` | P/L | Dollar P/L display |
| `trades` | Trade Count | Total trades counter |
| `winrate` | Win Rate | Win rate percentage |
| `theme` | Theme Toggle | Dark/light mode button |
| `compact` | Compact Mode | Compact toggle button |
| `columns` | Column Layout | 1/2/3 column selector |
| `addpanel` | Add Panel | Add panel button |
| `status` | Data Status | Live/Simulated indicator |

### UX
- Gear icon sits alongside existing right-side controls
- Popover shows a clean list with switches for each item
- Changes apply instantly (no save button needed)
- At least the title/back button always remain visible

