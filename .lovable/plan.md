

## Fix: AI Evaluator Panel Not Appearing

### Root Cause
The user's browser likely has a cached layout in `localStorage` from before the AI Evaluator was added. While there's migration logic to add new builtins, it may not have triggered if the page loaded before the updated code was deployed. Once the stale state was saved back, the migration won't re-run since `ai-evaluator` may now exist in `hiddenBuiltins`.

### Changes

**1. `src/contexts/TradingLayoutContext.tsx` — Bump storage key to force re-migration**
- Change `STORAGE_KEY` from `"trading-layout-v2"` to `"trading-layout-v3"`
- Keep the v2 migration path (read from `trading-layout-v2` if `v3` doesn't exist) so existing panel arrangements are preserved
- The migration logic will then detect `ai-evaluator` is missing and add it

**2. `src/components/trading/AddPanelDialog.tsx` — Add AI Evaluator as a findable template**
- Add an "AI Evaluator" entry to `PREMADE_TEMPLATES` so users can always find and add it via search, even if the builtin migration fails
- When clicked, instead of creating a custom panel, call `restorePanel("ai-evaluator")` if it's hidden, making it behave correctly as a builtin

These two changes together ensure the panel appears automatically for new/migrated users AND is always discoverable through the Add Panel dialog search.

