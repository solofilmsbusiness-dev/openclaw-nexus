

## Add Dark/Light Mode Toggle to Trading Page

### Problem
The trading page has no theme toggle -- users can only switch between dark and light mode from the main dashboard's MetricsBar.

### Solution
Add a Sun/Moon toggle button to the trading page's top bar (right side, near the compact/layout controls), using the same `useTheme` hook from `next-themes` that the dashboard already uses.

### Changes

**File: `src/pages/Trading.tsx`**
- Import `useTheme` from `next-themes` and `Sun`, `Moon` icons from `lucide-react`
- Add a theme toggle button in the top bar's right-side control group (next to compact mode button), matching the same pattern used in `MetricsBar.tsx`

This is a single-line button addition -- no new components or files needed. All trading page panels already use CSS variables (`text-foreground`, `bg-secondary`, etc.) so they will automatically respond to the theme change.

