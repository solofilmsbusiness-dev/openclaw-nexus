

## Fix Overlapping Tooltip on Connect Button

### Problem
When clicking "Connect", the tooltip ("Click to enter connect mode...") overlaps the "CONNECTING..." text, as shown in the screenshot.

### Solution
**File: `src/components/AgentGraph.tsx` (~line 1010-1012)**

Conditionally hide the tooltip when `connectMode` is active. The simplest fix: only render `TooltipContent` when `connectMode` is false, since the nearby "Click source node" / "Click target node" hints already guide the user.

```tsx
{!connectMode && (
  <TooltipContent side="bottom" className="max-w-[240px] text-center">
    Click to enter connect mode. Then click a source node, then a target node to create a link. Double-click a node to quick-connect. Press ESC to cancel.
  </TooltipContent>
)}
```

Single-line conditional wrap -- no other changes needed.

