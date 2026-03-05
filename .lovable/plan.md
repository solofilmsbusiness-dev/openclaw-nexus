

## Add Delete Confirmation Dialog

### Overview
Wrap agent deletion (in AgentCards) with an AlertDialog confirmation prompt before actually deleting.

### Changes

**`src/components/AgentCards.tsx`**
- Import `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger` from `@/components/ui/alert-dialog`
- In `AgentsTab`, add state `pendingDeleteId` (string | null)
- Replace the direct `onDeleteAgent` call on the trash button with setting `pendingDeleteId = agent.id`
- Add a single `<AlertDialog>` controlled by `pendingDeleteId !== null` that shows the agent name and asks "Are you sure you want to delete {name}?"
- On confirm: call `onDeleteAgent(pendingDeleteId)`, show toast, clear state
- On cancel: clear `pendingDeleteId`

