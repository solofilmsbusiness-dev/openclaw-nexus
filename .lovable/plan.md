

## Plan: Customizable Instrument Selection + Futures Support

### Problem
The Market Data panel is hardcoded to 8 stock tickers (AAPL, TSLA, etc.). Users cannot change which instruments they see, and there is no support for futures contracts.

### Changes

**1. Expand instrument universe with futures**

Add futures contracts to the available instruments pool in `useTradingSimulation.ts`:
- **Stock Futures**: ES (S&P 500 E-mini), NQ (Nasdaq E-mini), YM (Dow E-mini), RTY (Russell 2000 E-mini)
- **Commodity Futures**: CL (Crude Oil), GC (Gold), SI (Silver), NG (Natural Gas)
- **Other**: ZB (Treasury Bonds), 6E (Euro FX)

Each instrument gets a `type` field: `"stock"` or `"futures"` so the UI can display them differently (contract labels, tick sizes, etc.).

**2. User-selectable active tickers**

- Add state for `activeSymbols: string[]` to `useTradingSimulation` (defaulting to the current 8 stocks)
- Add `setActiveSymbols` callback and an `allInstruments` list exposed from the hook
- Only simulate/fetch data for active symbols
- Persist active selection to `localStorage`

**3. Instrument selector UI in Market Data panel**

Add a toolbar row at the top of the `MarketPanel` in `Trading.tsx`:
- A "Manage Instruments" button that opens a popover/dialog
- Shows all available instruments grouped by type (Stocks / Futures)
- Toggle checkboxes to add/remove instruments from the active view
- Badge showing instrument type (Stock/Future) in the market data table
- Update the edge function to handle futures symbols (Alpha Vantage supports some via `symbol=ES=F` format; fallback to simulation for unsupported ones)

**4. Update portfolio and agent simulation**

- Agent evaluations/considerations/trades will only use active symbols
- Portfolio holdings filter to show only active stock symbols
- Watchlist `AVAILABLE_SYMBOLS` derives from the active instruments list

### Files to modify
- `src/hooks/useTradingSimulation.ts` — add futures seed data, `activeSymbols` state, filter all simulation to active set, persist to localStorage
- `src/pages/Trading.tsx` — add instrument selector UI to `MarketPanel`, show instrument type badges
- `src/components/trading/Watchlist.tsx` — derive available symbols from active instruments instead of hardcoded list
- `supabase/functions/market-data/index.ts` — handle futures symbol format for Alpha Vantage (append `=F` suffix for futures queries)

### Key details
- Futures use simulated base prices since Alpha Vantage free tier has limited futures support; the edge function will attempt to fetch but gracefully fall back to simulation
- Instrument type badge in the table: green "STK" or orange "FUT"
- localStorage key: `trading-active-instruments`

