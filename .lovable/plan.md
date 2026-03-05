

## Add Keyboard Navigation to Onboarding Tour

### Changes to `src/components/OnboardingTour.tsx`

**Keyboard support:** Add a `useEffect` with a `keydown` listener when the tour is active:
- `ArrowRight` → go to next step (same as "Next" button)
- `ArrowLeft` → go to previous step (if `step > 0`, decrement and re-measure)
- `Escape` → finish/skip the tour

Also add a `goBack` function (mirror of `goNext` but decrements step).

**Add keyboard hint** in the tooltip footer: show a subtle `← → ESC` hint next to the step dots so users know keyboard nav is available.

**Tour target verification:** All 5 `data-tour` attributes in Index.tsx match the STEPS targets correctly:
- `metrics-bar` ✓ (line 57)
- `agent-cards` ✓ (line 70) — note: this div collapses to `w-0` on mobile, but the tour auto-starts after 1s and sidebar defaults to expanded on desktop
- `agent-graph` ✓ (line 105)
- `event-timeline` ✓ (line 137) — same collapse concern for right panel, but defaults open
- `cmd-k` ✓ (line 160)

No issues with the current tour targeting.

### Files Changed

| File | Change |
|------|--------|
| `src/components/OnboardingTour.tsx` | Add keydown listener for ArrowRight/ArrowLeft/Escape, add `goBack` function, show keyboard hint in tooltip |

