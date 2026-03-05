

## Onboarding Tooltips for New Users

Build a guided tooltip walkthrough that highlights key dashboard areas on first login, stored in `localStorage` so it only shows once.

### New File: `src/components/OnboardingTour.tsx`
A self-contained component that manages a multi-step tooltip tour using a spotlight overlay + positioned tooltip card with framer-motion animations.

**Steps (5 total):**
1. **MetricsBar** — "Monitor your agents' health at a glance — total, healthy, active, degraded, and down."
2. **Agent Cards (left sidebar)** — "Browse and manage your agents here. Click one to select it in the graph."
3. **Agent Graph (center)** — "Visualize agent connections. Use the Connect button to link agents, and drag to rearrange."
4. **Event Timeline (right panel)** — "Track real-time events and filter by agent. The terminal below shows raw logs."
5. **⌘K button** — "Use the Command Palette (⌘K) to quickly search agents and run actions."

**Implementation:**
- Each step targets an element via a `data-tour` attribute (e.g., `data-tour="metrics-bar"`)
- Uses `getBoundingClientRect()` to position a spotlight cutout (dark overlay with a transparent hole) and a tooltip card near the target
- Tooltip card has: step title, description, step indicator dots, "Next" / "Skip" / "Finish" buttons
- On completion or skip, sets `localStorage.setItem("solo-os-onboarding-done", "true")`
- Framer-motion `AnimatePresence` for smooth transitions between steps
- Auto-starts 1 second after dashboard mounts (only if localStorage flag is absent)

### Modified Files

| File | Change |
|------|--------|
| `src/components/OnboardingTour.tsx` | New component with tour logic, overlay, and tooltip UI |
| `src/pages/Index.tsx` | Add `data-tour` attributes to MetricsBar wrapper, left sidebar, graph, right panel, and ⌘K button. Render `<OnboardingTour />` after auth check. |
| `src/components/MetricsBar.tsx` | Accept and forward a `data-tour` prop on the root div |

No external dependencies needed — uses framer-motion (already installed) for animations and native DOM APIs for positioning.

