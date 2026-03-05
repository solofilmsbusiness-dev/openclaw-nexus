

## Polish Improvements for Solo OS

After reviewing the full codebase, here are targeted improvements to take the site from functional to fully polished:

### 1. Styled 404 Page
The NotFound page uses a plain `bg-muted` style that breaks the dark theme. Restyle it to match the app aesthetic with the glass-panel treatment, orbital particle animation (reuse from Login), and a "Return to Base" button.

### 2. Loading / Auth Check Skeleton
When `authChecked` is false on Index, the page renders nothing (`return null`). Add a centered loading spinner matching the Admin page pattern (spinning ring + "Initializing..." text) so users see feedback immediately.

### 3. Smooth Page Transitions
Wrap the `<Routes>` in a framer-motion `AnimatePresence` with fade transitions between pages (Login → Dashboard, Dashboard → Admin). Lightweight crossfade using `motion.div` wrappers on each page route.

### 4. MetricsBar Micro-Interactions
- Add staggered entry animations to each metric (already partially done, but the delay is uniform at 0.1 — make it `i * 0.08`)
- Pulse the "Online" dot with the existing `pulse-glow` animation

### 5. Empty State for Events & Terminal
When there are no events (or all filtered out), show a minimal empty state: a muted icon + "No events" text instead of a blank panel.

### 6. Keyboard Shortcut Hints
The `⌘K` button in the bottom-right corner is easy to miss. Add a subtle tooltip on hover explaining "Command Palette". Also show `ESC` hint in the command dialog.

### 7. Mobile Responsiveness Tweaks
- The Admin page's agent registry table uses a 6-column grid that breaks on small screens. Switch to a stacked card layout on mobile (`< md`).
- The MetricsBar wraps awkwardly on narrow screens — hide labels below `sm` (already partially done) and reduce gaps.

### 8. Toast Consistency
Some toasts use `sonner`'s `toast` and others use the shadcn `useToast` hook. Standardize on `sonner` throughout (it's already the primary one) to avoid two toast systems rendering simultaneously.

---

### Files Changed

| File | Changes |
|------|---------|
| `src/pages/NotFound.tsx` | Full restyle with dark theme, particles, glass-panel card |
| `src/pages/Index.tsx` | Add loading spinner when `authChecked` is false |
| `src/components/MetricsBar.tsx` | Stagger metric animations, pulse Online dot |
| `src/components/EventTimeline.tsx` | Add empty state when no events |
| `src/components/TerminalLog.tsx` | Add empty state when no events |
| `src/pages/Admin.tsx` | Responsive card layout for agent registry on mobile |
| `src/components/AgentGraph.tsx` | Standardize toast imports to sonner |

