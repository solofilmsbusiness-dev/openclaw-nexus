

## Plan: Collapsible Right Panel

Mirror the left sidebar's collapse pattern for the right panel.

### Changes to `src/pages/Index.tsx`

1. **Add state**: `const [rightCollapsed, setRightCollapsed] = useState(false)`
2. **Add desktop toggle button** between the graph and the right panel — same style as the left toggle but with mirrored chevron directions (ChevronLeft to expand, ChevronRight to collapse)
3. **Add mobile toggle button** — same pattern as left mobile toggle ("Show Panels" / "Hide Panels")
4. **Wrap right panel div** with `transition-all duration-300` and conditional width classes: collapsed = `w-0 lg:w-0` with `overflow-hidden`, expanded = `w-full lg:w-[280px]`
5. **Inner wrapper** keeps fixed `lg:w-[280px]` so content doesn't reflow during animation

Single file change, same pattern already used for the left sidebar.

