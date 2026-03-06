

## Make Agent Names Editable in Calendar

The calendar currently pulls agent names from the hardcoded `AGENTS` array and stores them as static `agent_name` text in `scheduled_jobs`. The `AgentContext` already has a `renameAgent` function that updates agent names in memory.

### Approach

Make agent names editable directly from the **CalendarSidebar** filter list -- each agent row gets a small edit icon that toggles an inline text input. When renamed, it updates:
1. The agent name in `AgentContext` (via existing `renameAgent`)
2. All existing `scheduled_jobs` rows for that agent (bulk update `agent_name` in the database)
3. The local jobs state so the UI reflects changes immediately

### Files to Edit

1. **`src/components/calendar/CalendarSidebar.tsx`**
   - Add an inline edit mode per agent row in the Agents filter section
   - On hover, show a small pencil icon next to the agent name
   - Clicking it toggles a small `Input` field; pressing Enter or blur saves
   - Call `renameAgent` from `AgentContext` + a new `onRenameAgent` callback prop to update jobs

2. **`src/pages/Calendar.tsx`**
   - Pass an `onRenameAgent` handler to `CalendarSidebar`
   - Handler calls `renameAgent` on the context, then bulk-updates `scheduled_jobs` rows where `agent_id` matches, setting the new `agent_name`
   - Refresh local jobs state with the new name

### Interaction Flow
- User hovers an agent name in the sidebar filter list
- A pencil icon appears; clicking it turns the name into an editable input
- User types new name, presses Enter (or clicks away) to save
- All calendar events for that agent immediately reflect the new name
- Pressing Escape cancels the edit

