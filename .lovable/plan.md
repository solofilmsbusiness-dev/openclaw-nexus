

## Trading Analytics Dashboard — New Page

Add a `/trading` route with a full Trading Analytics page that acts as a control center for monitoring an AI trading agent. Uses simulated data initially, matching the existing glassmorphism/neon design language.

### New Files

**`src/pages/Trading.tsx`** — Main page with auth check (same pattern as `Index.tsx`), containing a top metrics bar for trading stats, then a responsive grid layout with these panels:

1. **Market Data Panel** — Table of stock tickers (AAPL, TSLA, NVDA, MSFT, AMZN, GOOGL, META, etc.) showing symbol, price, change, % change, volume. Green/red coloring for movement. Sparkline mini-charts using recharts `<LineChart>` inline. Auto-refreshes with simulated price fluctuations via `setInterval`.

2. **Trading Agent Panel** — Three tabs using existing `<Tabs>` component:
   - *Evaluating*: Stocks being analyzed with indicators (RSI, MACD, volume)
   - *Considering*: Potential trades with confidence % bar
   - *Executed*: Recent buy/sell actions with timestamp, price, quantity

3. **Trade History Log** — Scrollable table showing: type (Buy/Sell badge), asset, entry price, exit price, P/L (green/red), timestamp. Uses existing `<Table>` and `<Badge>` components.

4. **Learning Notes Panel** — A journal-style feed of AI observations and strategy adjustments, rendered as timestamped cards with category tags (Mistake, Insight, Adjustment, Pattern).

**`src/hooks/useTradingSimulation.ts`** — Custom hook that generates and updates mock market data, agent evaluations, trade executions, and learning notes on intervals. Returns all state needed by the panels.

### Modified Files

**`src/App.tsx`** — Add route: `<Route path="/trading" element={<Trading />} />`

**`src/components/MetricsBar.tsx`** — Add a navigation link/button to `/trading` (small chart icon next to the Settings gear).

### Layout

```text
┌─────────────────────────────────────────────────┐
│  Trading Metrics Bar (P/L, Trades, Win Rate)    │
├──────────────────────┬──────────────────────────┤
│                      │   Trading Agent Panel    │
│  Market Data Panel   │   (Tabs: Evaluating /    │
│  (Live tickers +     │    Considering /         │
│   sparklines)        │    Executed)             │
├──────────────────────┼──────────────────────────┤
│  Trade History Log   │   Learning Notes /       │
│  (Table)             │   Improvement Journal    │
└──────────────────────┴──────────────────────────┘
```

### Design Details

- All panels use `glass-panel neon-border` classes
- Headers match existing style: `font-display font-semibold text-xs tracking-wide text-muted-foreground` with dot indicators
- Sparklines use recharts `<LineChart>` with no axes, just the line stroke in green/red
- Simulated data updates every 2-3 seconds for market prices, every 5-10 seconds for agent actions
- Back navigation to main dashboard via header link

### Files Changed

| File | Change |
|------|--------|
| `src/pages/Trading.tsx` | New — full trading analytics page |
| `src/hooks/useTradingSimulation.ts` | New — mock data generation hook |
| `src/App.tsx` | Add `/trading` route |
| `src/components/MetricsBar.tsx` | Add nav link to trading page |

