

## Role-Based Routing and Page Navigation

### Problem
All users currently get redirected to `/` (dashboard) after login, but only the admin (`solofilmsbusiness@gmail.com`) should access the dashboard. Non-admin users should only access Trading and Calendar pages. The Trading page also needs navigation toggles to switch between pages.

### Changes

**1. `src/pages/Login.tsx` — Role-based redirect after login**
- After successful sign-in, check `user_roles` table for admin role
- Admin → redirect to `/` (dashboard)
- Non-admin → redirect to `/trading`

**2. `src/pages/Index.tsx` — Guard dashboard for admins only**
- After auth check, query `user_roles` for admin role
- If not admin, redirect to `/trading`

**3. `src/pages/Trading.tsx` — Add page navigation toggles**
- Replace the "← Dashboard" back button with a navigation bar
- Add toggle buttons for Trading and Calendar (styled like the existing view toggles in CalendarHeader)
- Non-admins: show Trading | Calendar toggles only
- Admins: also show Dashboard option
- Use `navigate()` to switch pages

**4. `src/pages/Calendar.tsx` — Add matching page navigation**
- Add the same page toggle bar at the top of the calendar
- Same role-based visibility (admin sees Dashboard toggle, others don't)

**5. `src/App.tsx` — No route-level blocking needed**
- The page-level guards in Index.tsx handle admin-only access
- Trading and Calendar remain accessible to all authenticated users

### Navigation Toggle Design
Reuse the existing pill-toggle pattern (like the day/week/month switcher):
```
[ Trading | Calendar ]        ← non-admin
[ Dashboard | Trading | Calendar ]  ← admin
```
Styled as compact buttons in `bg-secondary/50` container, active page highlighted with `bg-primary text-primary-foreground`.

### Role Check Pattern
```typescript
const { data: roles } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", session.user.id);
const isAdmin = roles?.some(r => r.role === "admin");
```

