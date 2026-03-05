

## Admin Settings Panel

Add a tabbed settings section to the existing Admin page with four panels: Theme, Notifications, Users, and System Config. All settings stored in localStorage (no DB needed for preferences) except user management which uses the existing `user_roles` table.

### Changes

**`src/pages/Admin.tsx`** — Add a new "Settings" section below the existing Agent Registry, using tabs:

1. **Theme & Appearance tab**
   - Dark/light mode toggle (using `next-themes` already installed)
   - Accent color picker (swap CSS `--primary` between preset colors: blue, teal, purple, rose, amber)
   - Font size slider (small/medium/large) applied to root

2. **Notifications tab**
   - Toggle switches for: system alerts, agent status changes, kill switch warnings, sound effects
   - All stored in localStorage, read via a `useSettings` hook

3. **User Management tab**
   - List current admin users by querying `user_roles` table
   - Input to add a new admin by email (inserts into `user_roles` via an edge function that looks up user by email)
   - Remove admin button (with confirmation)

4. **System Config tab**
   - Simulation speed slider (controls the tick interval in `useSimulation`)
   - Auto-refresh interval selector
   - Log retention count (how many events to keep)
   - Expose these via the `AgentContext` or a separate `SettingsContext`

### New Files
- `src/contexts/SettingsContext.tsx` — stores theme, notification, and system preferences in localStorage with React context
- `src/hooks/useSettings.ts` — convenience hook wrapping the context
- `supabase/functions/manage-admin/index.ts` — edge function to add/remove admins by email (needs service role key, already available)

### Modified Files
- `src/pages/Admin.tsx` — add the tabbed settings UI below existing sections
- `src/App.tsx` — wrap with `SettingsProvider`
- `src/hooks/useSimulation.ts` — read simulation speed from settings context
- `src/index.css` — add CSS variable overrides for accent color presets

