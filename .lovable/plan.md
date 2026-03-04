

## Plan: Animate Side Panel + Hover Effects + Drag-to-Reorder

### Changes to `src/components/AgentCards.tsx`

**1. Enhanced hover effects on agent cards**
- Add `whileHover` and `whileTap` props to each `motion.div` card across all tabs:
  - `whileHover={{ scale: 1.02, x: 4 }}` — slight lift and shift right
  - Glow effect on hover using a dynamic `boxShadow` matching the agent's status color
  - Cursor pointer styling

**2. Drag-to-reorder in Agents tab**
- Use Framer Motion's `Reorder` component (`Reorder.Group` + `Reorder.Item`) to make agent cards draggable
- Store agent order in local state (`useState` initialized from `AGENTS`)
- Each card gets a drag handle icon (`GripVertical` from lucide) visible on hover
- `Reorder.Item` provides built-in drag animations (layout shifts, spring transitions)

**3. Panel entrance animation**
- Wrap the entire panel content in a staggered `motion.div` container so it animates in when the sidebar expands
- Add a subtle slide-in-from-left animation on mount

### Technical details
- Import `Reorder` from `framer-motion` (already installed)
- `Reorder.Group` takes `axis="y"`, `values`, and `onReorder` props
- `Reorder.Item` replaces `motion.div` for agent cards, keyed by `agent.id`
- Backlog and Insights tabs keep their existing sort logic (no reorder needed)
- Hover glow: `whileHover={{ boxShadow: \`0 0 15px \${color.bg}40\` }}`

