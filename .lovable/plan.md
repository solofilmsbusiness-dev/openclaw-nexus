

## Add Tooltip to Connect Button

**`src/components/AgentGraph.tsx`** (around line 862-883):
- Wrap the existing Connect button in a `Tooltip` / `TooltipProvider` / `TooltipTrigger` / `TooltipContent` from the existing UI components
- Tooltip content: "Click to enter connect mode. Then click a source node, then a target node to create a link. Double-click a node to quick-connect. Press ESC to cancel."
- Only show the tooltip when `connectMode` is **false** (no need for it while actively connecting since the inline hints already guide the user)
- Add import for `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` from `@/components/ui/tooltip`

