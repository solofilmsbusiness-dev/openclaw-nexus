

## Plan: Collapsible Left Sidebar + Graph-Focused Layout

### What changes
1. **`src/pages/Index.tsx`** — Replace the grid layout with a flex layout. The left AgentCards panel becomes a collapsible sidebar with a toggle button. When collapsed, the graph expands to fill the space. The graph area gets more columns by default (8 of 12 instead of 6).

2. **`src/components/AgentCards.tsx`** — Add a collapse/expand toggle button (chevron icon) at the top of the panel. Accept an `isCollapsed` prop or manage state internally. When collapsed, the panel shrinks to ~0 width with a smooth Framer Motion animation, showing only the toggle button.

3. **`src/pages/Index.tsx` layout restructure**:
   - Use a flex row layout instead of CSS grid for the main content area
   - Left panel: fixed width (~320px) when open, 0 when collapsed, with `overflow-hidden` and transition
   - Center graph: `flex-1` so it naturally expands when the sidebar collapses
   - Right panel: fixed width (~280px)
   - On mobile, the sidebar starts collapsed

4. **Graph emphasis**: Give the graph area more visual prominence by making it take the majority of space by default and expanding further when the sidebar is collapsed.

### Technical approach
- Use React `useState` in `Index.tsx` for the collapsed state
- Pass it down to `AgentCards` or keep the toggle in `Index.tsx`
- Use CSS `transition-all duration-300` for smooth width animation
- Add a small floating toggle button (ChevronLeft/ChevronRight) on the left edge when collapsed
- On mobile (`md` breakpoint and below), default to collapsed

