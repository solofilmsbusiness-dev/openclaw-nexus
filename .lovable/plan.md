

## Plan: 2D Grid Drag-and-Drop with Snap-to-Place Panels

### Problem
Currently panels use `framer-motion`'s `Reorder.Group` with `axis="y"` which only supports vertical reordering. Panels cannot be moved left/right or diagonally.

### Approach
Replace the `Reorder`-based system with a **CSS Grid + framer-motion `drag`** approach where:
- Each panel is freely draggable in all directions using `motion.div` with `drag` enabled
- On drag end, the panel snaps to the nearest grid cell
- Panels swap positions when one is dropped onto another's cell
- Visual drop indicators show where a panel will land

### Technical Changes

**`src/contexts/TradingLayoutContext.tsx`**
- Change `panels` from an ordered array to include grid position data: `{ id, isCustom, row, col }`
- Add `swapPanels(draggedId, targetId)` function to swap two panels' grid positions
- Add `movePanelTo(id, row, col)` to place a panel at a specific grid cell
- Auto-compute positions when panels are added/removed (fill gaps left-to-right, top-to-bottom)

**`src/components/trading/PanelWrapper.tsx`**
- Replace `Reorder.Item` with a `motion.div` using `drag` (both axes)
- On drag, calculate which grid cell the panel is hovering over based on pointer position
- On drag end, snap to the nearest cell and swap with any panel already there
- Add a subtle highlight/outline on the target cell during drag
- Use `dragSnapToOrigin` for smooth snap-back animation if drop is invalid

**`src/pages/Trading.tsx`**
- Remove `Reorder.Group` wrapper
- Use a regular CSS Grid container (`display: grid`)
- Render panels with explicit `grid-row` / `grid-column` styles based on their position data
- Keep column count selector working (recalculates positions when columns change)

### UX Details
- Drag handle stays in panel header (grip icon)
- During drag: panel gets elevated `z-index` and slight scale-up, target cell shows a glowing border
- On drop: smooth spring animation to snap into place
- When column count changes, panels re-flow automatically into the new grid shape

### Files Modified
- `src/contexts/TradingLayoutContext.tsx` — position-based panel state
- `src/components/trading/PanelWrapper.tsx` — 2D drag + snap logic  
- `src/pages/Trading.tsx` — grid layout with explicit positioning

