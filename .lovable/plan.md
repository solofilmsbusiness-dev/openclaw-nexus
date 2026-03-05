

## Login Page, Admin Dashboard & Kill Switch

### Overview
Build a futuristic login screen branded "Solo OS 2.26" with flying particles, a protected admin dashboard for controlling all nodes (rename, kill switch), and restrict admin access to `solofilmsbusiness@gmail.com` using Lovable Cloud (Supabase).

### Architecture

```text
/login          →  LoginPage (public, futuristic particle UI)
/               →  Index (existing graph dashboard, public)
/admin          →  AdminDashboard (protected, admin only)
```

### Step-by-step Plan

**1. Set up Lovable Cloud + Auth**
- Enable Lovable Cloud to get Supabase auth
- Create a `user_roles` table with RLS + `has_role()` security definer function
- Seed `solofilmsbusiness@gmail.com` as admin via a trigger or manual insert

**2. Create Login Page (`src/pages/Login.tsx`)**
- Full-screen dark page with the "Solo OS 2.26" title in large futuristic mono font
- Animated particle background using SVG (reusing the stardust/orbital particle pattern from the graph)
- Email + password form centered on screen, styled with glass-panel + neon-border classes
- Supabase `signInWithPassword` for login
- Redirect to `/admin` on successful admin login
- Subtle pulsing energy rings behind the login card

**3. Create Admin Dashboard (`src/pages/Admin.tsx`)**
- Protected route: checks auth session + `has_role(uid, 'admin')` via RPC; redirects to `/login` if unauthorized
- **Node Control Table**: Lists all agents with editable name fields (inline edit with save)
- **Kill Switch**: A prominent red button that sets ALL agents to `status: "down"`, `progress: 0`, `currentTask: "KILLED"` — turns every node red with intensified red glow particles
- **Revive All**: A green button to set all agents back to `healthy`
- Passes state changes back to the shared agent state (lift state or use a context/store)

**4. Shared State between Admin & Graph**
- Lift agent state into a React context (`AgentContext`) so both Index and Admin pages can read/write the same agents array
- The kill switch in Admin updates context → graph nodes instantly turn red with glowing red particles

**5. Kill Switch Visual Effect in AgentGraph**
- When all agents are "down", enhance the particle effects: orbital particles shift to red hue, energy rings pulse red, stardust takes a red tint
- Add a `killed` boolean derived from agents state (`agents.every(a => a.status === 'down')`) to trigger the red particle mode

**6. Routing Updates (`src/App.tsx`)**
- Add `/login` → `LoginPage`
- Add `/admin` → `AdminDashboard` (with auth guard)

### Files to Create/Modify
- **Create**: `src/pages/Login.tsx`, `src/pages/Admin.tsx`, `src/contexts/AgentContext.tsx`
- **Modify**: `src/App.tsx` (routes), `src/pages/Index.tsx` (use context), `src/components/AgentGraph.tsx` (red kill mode particles)
- **Supabase**: `user_roles` table, `has_role` function, RLS policies, seed admin role

