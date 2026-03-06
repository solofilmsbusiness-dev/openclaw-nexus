

## Creative Calendar Redesign -- Solid Block Event Cards

### What Changes

**JobEventCard.tsx** -- complete visual overhaul for both compact and expanded modes:

**Compact mode** (Month/Week views):
- Solid colored blocks with rounded corners (no border-left trick, fully filled background)
- Status-based solid background colors at ~85% opacity with white/dark text for contrast
- Tiny status icon inline, truncated title only
- Running jobs get a subtle shimmer animation overlay
- Completed jobs get a slightly desaturated/muted tone
- Failed jobs get a striped diagonal pattern overlay (CSS)

**Expanded mode** (Day view):
- Solid color block spanning the full width of the time slot
- Left accent strip (4px) in the agent's type color for quick visual grouping
- Status icon, title, agent name, time all laid out in a single dense row
- Running state: pulsing glow shadow + shimmer sweep
- Duration visualized as a subtle progress-bar-style fill inside the block

**Additional creative touches across views:**

**MonthView**: Add a small colored dot-stack indicator below the day number showing how many jobs by color (like a mini heat-map row of 3-4 dots).

**DayView**: Job blocks rendered as solid bars that visually span their duration (if `duration_minutes` exists, calculate height proportionally within the hour slot).

**index.css**: Add a `.job-block-shimmer` keyframe and a `.job-stripe-pattern` utility for the failed state diagonal lines.

### Files to Edit
1. **`src/components/calendar/JobEventCard.tsx`** -- rebuild compact and full card as solid colored blocks
2. **`src/index.css`** -- add shimmer keyframe + striped pattern utility
3. **`src/components/calendar/DayView.tsx`** -- minor: use duration-based height for job blocks
4. **`src/components/calendar/MonthView.tsx`** -- add colored dot indicators per day

