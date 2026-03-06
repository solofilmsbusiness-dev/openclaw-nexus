

## Futures-First Trading Dashboard Overhaul

### Overview
Transform the trading page from stock-centric to futures-focused across 7 areas: instruments, terminology, data columns, P&L math, portfolio/margin, calculator, and session awareness.

### 1. Instruments & Defaults — `src/hooks/useTradingSimulation.ts`

- **Add `pointValue` and `margin` fields** to `InstrumentInfo`
- **Remove stocks and crypto** from `ALL_INSTRUMENTS` entirely
- **Expand futures** with micros and commodities: MES, MNQ, ZC, ZS, ZW, HG, PL, HE, LE
- **Change `DEFAULT_ACTIVE`** to `["ES", "NQ", "YM", "CL", "GC"]`
- **Remove the `type` field** (or set all to `"futures"`) — no more stock/crypto distinction
- **Quantity simulation**: change `randInt(5, 100)` to `randInt(1, 5)` for contracts

### 2. P&L Calculation — `src/hooks/useTradingSimulation.ts`

- Trade P&L currently uses `(exitPrice - entryPrice) * quantity` (share math)
- Change to: `((exitPrice - entryPrice) / tickSize) * pointValue * contracts` using each instrument's `tickSize` and `pointValue`

### 3. Portfolio → Margin Tracking — `src/hooks/useTradingSimulation.ts`

- Rename `PortfolioHolding.shares` → `contracts`
- Replace `avgCost` with `initialMargin` per contract
- Portfolio summary: show **Account Balance**, **Used Margin**, **Available Margin**, **Margin Utilization %** instead of stock-style cost basis
- Remove `allocation` pie chart (doesn't apply to futures margin)

### 4. Market Panel UI — `src/pages/Trading.tsx`

- **Remove** Stocks/Futures/Crypto category sections in the instrument picker — show a single flat list grouped by Index Futures / Commodities / Rates & FX
- **Remove** STK/FUT/CRY type badges from the table
- **Add columns**: Tick Size, Point Value, Contract Month
- **Show contract month** next to symbol name (e.g., "ES Mar 26")
- **Title**: "Trading Analytics" → "Futures Trading"

### 5. Terminology — `src/pages/Trading.tsx`

- Portfolio table: "Shares" → "Contracts"
- Executed trades: `×{quantity}` → `×{quantity} ct`
- History panel: no changes needed (already shows Asset/Entry/Exit/P&L)

### 6. Calculator Futures Modes — `src/components/trading/CalculatorPanel.tsx`

- **Replace** "Pos Size" mode with **Tick Value** mode: inputs are Symbol (dropdown), Ticks, Contracts → outputs dollar value (`ticks × pointValue × contracts`)
- **Update** P/L mode to use tick-based math: Entry, Exit, Tick Size, Point Value, Contracts → `((exit-entry)/tickSize) × pointValue × contracts`

### 7. Session Clock — `src/pages/Trading.tsx`

- Add a small **session indicator** in the top bar showing current futures session:
  - RTH: 9:30 AM - 4:00 PM ET (green)
  - ETH/Globex: 6:00 PM - 9:30 AM ET (orange)
  - Weekend: Closed (red)
- Show countdown to next session open/close

### 8. Edge Function — `supabase/functions/market-data/index.ts`

- Remove `CRYPTO_SYMBOLS` set and crypto handling
- Add new futures symbols (MES, MNQ, ZC, ZS, ZW, HG, PL, HE, LE) to `FUTURES_SYMBOLS`
- Treat all symbols as futures (append `=F`)

### Files Modified
- `src/hooks/useTradingSimulation.ts` — instruments, types, P&L math, portfolio→margin
- `src/pages/Trading.tsx` — UI: columns, terminology, session clock, instrument picker
- `src/components/trading/CalculatorPanel.tsx` — tick value mode, futures P/L mode
- `supabase/functions/market-data/index.ts` — remove crypto, add futures symbols

