

## Plan: Project-based Node Configuration Save/Load System

### Overview
Add a configuration management feature that lets users save, load, rename, and organize their node graph setups (agents, edges, and their states) as named configurations tied to projects.

### Database Changes

**New table: `graph_configs`**
- `id` (uuid, PK)
- `user_id` (uuid, references auth.users, NOT NULL)
- `name` (text, NOT NULL) — e.g. "Marketing Team", "Dev Cluster"
- `project` (text) — optional project/folder grouping
- `agents_data` (jsonb) — serialized agents array
- `edges_data` (jsonb) — serialized edges array
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

**RLS**: Users can only CRUD their own configs (`auth.uid() = user_id`).

### UI Changes

**`src/components/AgentGraph.tsx`** — Add a "Save/Load" button (e.g. `FolderOpen` icon) to the toolbar next to the kill switch. Clicking opens a dialog.

**New: `src/components/ConfigManager.tsx`** — Dialog component with:
- **Save current config**: Name input + optional project tag, saves current agents/edges to DB
- **Load config list**: Shows saved configs grouped by project, click to load
- **Organize**: Rename, change project tag, delete configs
- **Overwrite**: If loading a config with the same name, option to overwrite

### Context Changes

**`src/contexts/AgentContext.tsx`** — Add `loadConfig(agents, edges)` helper that replaces current agents/edges state from a saved config.

### Flow
1. User clicks folder icon in toolbar → ConfigManager dialog opens
2. "Save" tab: enter name + project → saves current `agents` + `edges` as JSON to `graph_configs`
3. "Load" tab: browse saved configs grouped by project → click one → replaces current graph state
4. Configs persist per user in the database

