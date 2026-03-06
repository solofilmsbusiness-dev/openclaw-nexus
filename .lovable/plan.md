

## Fix: Panel Controls Overlapping with Drag/Remove Buttons

### Problem
The `PanelWrapper` component places the drag handle (grip icon) and remove button (X) absolutely positioned at `top-2 right-2`. Meanwhile, each panel's own header row (e.g., the Settings gear in MarketPanel, icons in CustomPanel) uses `ml-auto` to push controls to the right edge. These two sets of buttons overlap and become unusable.

### Solution
Add right padding to each panel's header row so its controls don't overlap with the PanelWrapper's drag/remove buttons. The simplest approach:

**`src/components/trading/PanelWrapper.tsx`** — Add `pr-12` (or similar) padding to the panel content area so children content stays clear of the absolute-positioned buttons. Specifically, wrap `{children}` in a div with top-right padding, or add padding-right to the panel's top area.

Concretely, change the `{children}` area to include a spacer:
- Add `pt-2` or a small top margin to `{children}` wrapper so content starts below the button row
- Or better: move the drag/remove buttons **into the flow** of the panel header instead of using absolute positioning — place them as the first child with `float-right` or integrate into a flex header row

**Recommended approach**: Change PanelWrapper to render the drag handle + X button as a **flex header row** inside the panel (not absolute), then render `{children}` below. This eliminates all overlap issues permanently.

```text
Before:                          After:
┌──────────────────┐            ┌──────────────────┐
│ Panel Title ⚙  ⋮✕│ ← overlap │          [⋮] [✕] │ ← wrapper controls
│ content...       │            │ Panel Title  ⚙   │ ← panel header
│                  │            │ content...       │
└──────────────────┘            └──────────────────┘
```

### File Changes

1. **`src/components/trading/PanelWrapper.tsx`**: Remove absolute positioning from the controls div. Instead, render it as a flex row at the top of the panel with `justify-end`, then render `{children}` after it. The controls remain hidden until hover (`opacity-0 group-hover/panel:opacity-100`).

