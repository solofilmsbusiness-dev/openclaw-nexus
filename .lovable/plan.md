

## API Integration Layer for OpenClaw + Topstep/ProjectX

### Context
You're building a full automation pipeline: market data → strategy (via OpenClaw AI agent) → trade execution (via Topstep's ProjectX API) → scheduling (calendar). Currently the app uses simulated data with Alpha Vantage as a fallback. This plan creates a modular API integration layer so everything can connect to real services.

### Architecture

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Frontend   │────▶│  Edge Functions   │────▶│  External APIs  │
│  (React)    │     │  (Backend proxy)  │     │                 │
│             │     │                   │     │  • ProjectX API │
│ Trading.tsx │     │ projectx-trading  │     │  • OpenClaw     │
│ Calendar    │     │ openclaw-proxy    │     │                 │
│ Dashboard   │     │ market-data ✓     │     │  (Topstep accts)│
└─────────────┘     └──────────────────┘     └─────────────────┘
```

### Phase 1: ProjectX/Topstep Trading API (execute trades + live data)

**New edge function: `supabase/functions/projectx-trading/index.ts`**
- Handles authentication with ProjectX API (`POST /api/Auth/loginKey` using API key)
- Proxies order endpoints: place order, cancel order, get positions, get account info
- Caches the session token and refreshes on expiry
- Endpoints exposed: `auth`, `place-order`, `positions`, `accounts`, `orders`

**New secrets needed:**
- `PROJECTX_API_KEY` — Your Topstep/ProjectX API key
- `PROJECTX_USERNAME` — Your Topstep login username

**New file: `src/services/projectx.ts`**
- Client-side service layer that calls the edge function
- Functions: `authenticate()`, `placeOrder()`, `getPositions()`, `getAccounts()`, `cancelOrder()`
- Typed interfaces matching ProjectX API responses

**New file: `src/hooks/useProjectX.ts`**
- React hook wrapping the service with state management
- Tracks connection status, account info, positions
- Auto-reconnects on token expiry
- Provides `isConnected`, `accounts`, `positions`, `placeOrder()`, `error`

### Phase 2: OpenClaw Integration (AI strategy agent)

**New edge function: `supabase/functions/openclaw-proxy/index.ts`**
- Proxies requests to your self-hosted OpenClaw instance
- Forwards webhook triggers and agent commands
- Supports: sending prompts, receiving strategy signals, triggering automations

**New secrets needed:**
- `OPENCLAW_BASE_URL` — Your OpenClaw instance URL
- `OPENCLAW_API_TOKEN` — Webhook/API token from OpenClaw config

**New file: `src/services/openclaw.ts`**
- Client-side service: `sendPrompt()`, `triggerWebhook()`, `getAgentStatus()`

**New file: `src/hooks/useOpenClaw.ts`**
- React hook: manages connection state, sends strategy queries, receives signals

### Phase 3: Wire It Together

**Update `src/pages/Trading.tsx`**
- Add a "Connections" section in the top bar (toggleable via existing customization)
- Show ProjectX connection status (connected/disconnected) with account selector
- Show OpenClaw agent status
- When connected, real order placement replaces simulated trades

**Update `src/hooks/useTradingSimulation.ts`**
- Add a `mode` flag: `"simulated"` | `"paper"` | `"live"`
- In paper/live mode, route `executeTrade()` through `useProjectX.placeOrder()`
- In paper/live mode, fetch real positions from ProjectX instead of simulating

**Update `src/pages/Calendar.tsx` / `useScheduledJobs.ts`**
- Add a new job type: `"api-trigger"` that can fire OpenClaw webhooks or ProjectX orders at scheduled times
- Calendar jobs can reference a strategy template + target account

**New file: `src/components/trading/ConnectionsPanel.tsx`**
- New panel type for the trading layout showing:
  - ProjectX auth status + account list
  - OpenClaw connection status
  - Quick-connect buttons with credential input
  - Recent API call log

### Phase 4: Admin Settings

**Update `src/pages/Admin.tsx`**
- New "API Connections" tab in admin settings
- Configure ProjectX credentials, OpenClaw URL
- Test connection buttons
- Toggle between simulated/paper/live modes globally

### Implementation Order
1. **Start with secrets** — Prompt for `PROJECTX_API_KEY`, `PROJECTX_USERNAME`, `OPENCLAW_BASE_URL`, `OPENCLAW_API_TOKEN`
2. **Build ProjectX edge function + service + hook** — Core trading connectivity
3. **Build OpenClaw edge function + service + hook** — AI agent connectivity
4. **Add ConnectionsPanel** to trading layout
5. **Update simulation hook** with mode switching
6. **Add API-trigger job type** to calendar
7. **Add admin settings** for connection management

This is a large feature set. I recommend implementing it in stages, starting with Phase 1 (ProjectX) to get live account connectivity working first.

