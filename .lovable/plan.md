

## Fix: Isolated Scroll Panels + Fill Graph Dead Space

### Problem
- Left sidebar (AgentCards) and right panel (EventTimeline/TerminalLog) scroll with the page instead of having their own independent scroll containers
- The center graph area has too much dead space — the SVG viewBox is fixed at 800x600 and doesn't scale to fill available space

### Changes

**`src/pages/Index.tsx`**
- Make the main content area `h-[calc(100vh-<metricsbar>)]` with `overflow-hidden` so the outer page never scrolls
- Left sidebar: add `h-full overflow-hidden` so AgentCards is contained
- Right panel: add `h-full overflow-hidden` with flex column so EventTimeline and TerminalLog each get `flex-1 overflow-hidden`
- Graph container: ensure `flex-1 h-full min-h-0` fills all available center space

**`src/components/AgentCards.tsx`**
- Ensure the component root is `h-full overflow-hidden flex flex-col`
- Tab content wrapped in `ScrollArea` with `flex-1` so cards scroll independently within the panel

**`src/components/AgentGraph.tsx`**
- Change SVG to use `width="100%" height="100%"` with `viewBox` and `preserveAspectRatio="xMidYMid meet"` so it scales to fill the container
- Increase `RADIUS` to better utilize space, or use a responsive approach

**`src/components/EventTimeline.tsx`** & **`src/components/TerminalLog.tsx`**
- Ensure root divs are `h-full overflow-hidden flex flex-col` with content in `ScrollArea flex-1`

