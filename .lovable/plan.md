

## Make Notifications Page-Aware

### Problem
The `useSimulation` hook fires agent status toast notifications (e.g., "Agent went down", "Agent is back online") globally, even when the user is on the Trading, Calendar, or other pages. These dashboard-specific notifications are irrelevant and distracting on non-dashboard pages.

### Root Cause
`useSimulation` is called inside `AgentContext`, which wraps the entire app. Its toast calls in the status-change effect (lines 128-134) fire regardless of the current route.

### Solution
Pass the current pathname into `useSimulation` and only fire agent status toasts when the user is on the dashboard (`/`). This is the minimal, targeted fix.

**File: `src/contexts/AgentContext.tsx`**
- Import `useLocation` from `react-router-dom`
- Get `pathname` and pass it to `useSimulation` as a new parameter

**File: `src/hooks/useSimulation.ts`**
- Add a `pathname` parameter (default `"/"`)
- Guard the three toast calls (lines 128-134) with `if (pathname === "/")` so agent status toasts only appear on the dashboard
- Event generation continues on all pages (no change), only the toast popups are suppressed

This keeps page-specific toasts (Trading, Calendar, Admin) untouched since those are triggered by user actions within their respective pages, not by the simulation loop.

