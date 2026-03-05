

## Plan: Fix admin login flow & restrict settings access

### Changes

1. **`src/pages/Login.tsx`** — After successful login, always navigate to `/` (dashboard) regardless of role. Remove the admin role check and `/admin` redirect from login.

2. **`src/pages/Index.tsx`** — Settings button stays. It already navigates to `/admin` where the admin check happens.

3. **`src/pages/Admin.tsx`** — Already has admin role protection. No changes needed.

### Flow
- Login → always go to `/` (dashboard)
- Settings gear (top-right) → `/admin` → admin check on that page denies non-admins

