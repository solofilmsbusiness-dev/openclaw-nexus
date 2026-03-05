

## Plan: Auth-gated routing

### What changes

1. **`src/pages/Index.tsx`** — Add auth check on mount. If no session, redirect to `/login`. Remove the settings gear button (admin access moves to `/admin` directly after login).

2. **`src/pages/Login.tsx`** — After successful login, check if user has admin role. If admin, navigate to `/admin`. If not, navigate to `/` (dashboard).

3. **`src/pages/Admin.tsx`** — Already has auth + admin role check. No changes needed.

4. **`src/pages/Index.tsx`** — Keep the settings button but make it navigate to `/admin` as before (admin check happens on the Admin page itself).

### Flow
- App opens → `/` → checks session → no session → redirect `/login`
- Login success → if admin → `/admin`, else → `/`
- Settings gear on dashboard → navigates to `/admin` → admin check happens there
- Non-admin clicking settings → gets bounced back with "access denied" toast (existing behavior)

