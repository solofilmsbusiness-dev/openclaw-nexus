

## Idea Generator / Concept Engine — New Page

### Overview

A new `/ideas` page that serves as a creative brainstorming engine. Users input a topic/theme and AI generates multiple idea concepts, visualized as an interactive node graph (reusing the platform's SVG graph patterns). Ideas can be expanded, connected, color-coded, saved, and organized.

### Architecture

```text
┌─────────────────────────────────────────────────┐
│  MetricsBar (nav link added: Lightbulb icon)    │
├────────┬────────────────────────────┬───────────┤
│ Input  │                            │  Detail   │
│ Panel  │    Idea Graph (SVG)        │  Panel    │
│        │    - Central prompt node   │  - Expand │
│ Topic  │    - Idea nodes branch out │  - Notes  │
│ Mood   │    - Animated connections  │  - Combine│
│ Category│   - Drag/rearrange       │  - Variants│
│ Submit │    - Color-coded clusters  │           │
│        │                            │           │
│ Saved  │                            │           │
│ Projects│                           │           │
└────────┴────────────────────────────┴───────────┘
```

### Database Changes

New table: `idea_projects`
- `id` uuid PK
- `user_id` uuid NOT NULL
- `name` text NOT NULL
- `prompt` text NOT NULL
- `category` text
- `mood` text
- `created_at` timestamptz DEFAULT now()
- `updated_at` timestamptz DEFAULT now()

New table: `idea_nodes`
- `id` uuid PK
- `project_id` uuid FK -> idea_projects.id ON DELETE CASCADE
- `user_id` uuid NOT NULL
- `content` text NOT NULL (the idea text)
- `details` text (expanded description)
- `notes` text (user annotations)
- `color` text (hex color for node)
- `position_x` float DEFAULT 0
- `position_y` float DEFAULT 0
- `parent_node_id` uuid (nullable, FK -> idea_nodes.id, for branching)
- `created_at` timestamptz DEFAULT now()

New table: `idea_edges`
- `id` uuid PK
- `project_id` uuid FK -> idea_projects.id ON DELETE CASCADE
- `user_id` uuid NOT NULL
- `from_node_id` uuid FK -> idea_nodes.id ON DELETE CASCADE
- `to_node_id` uuid FK -> idea_nodes.id ON DELETE CASCADE
- `label` text (relationship type)
- `created_at` timestamptz DEFAULT now()

RLS: All three tables get standard user-owns-row policies (SELECT/INSERT/UPDATE/DELETE where `auth.uid() = user_id`).

### AI Integration

An edge function `generate-ideas` will call the Lovable AI Gateway (google/gemini-3-flash-preview) with structured output via tool calling:
- Input: topic, category, mood, constraints, optional parent idea for expansion
- Output: array of idea objects `{ title, description, related_tags }` (3-5 ideas per call)
- A second mode "expand" takes an existing idea and generates variations/deeper concepts

### New Files

1. **`supabase/functions/generate-ideas/index.ts`** — Edge function for AI idea generation with two modes: `generate` (from prompt) and `expand` (from existing idea)

2. **`src/pages/Ideas.tsx`** — Main page component with:
   - Auth check (same pattern as Index.tsx)
   - Three-panel layout: input sidebar, SVG graph center, detail panel right
   - State management for current project, nodes, edges, selected node

3. **`src/components/ideas/IdeaInputPanel.tsx`** — Left sidebar with form fields (topic, category/industry, mood/tone, constraints), submit button, and saved projects list

4. **`src/components/ideas/IdeaGraph.tsx`** — SVG-based interactive graph (simplified version of AgentGraph pattern):
   - Central prompt node with branching idea nodes
   - Animated connections with the same orbital particle/glow aesthetic
   - Drag-to-rearrange nodes, zoom/pan
   - Color-coded nodes
   - Click to select, double-click to expand via AI

5. **`src/components/ideas/IdeaDetailPanel.tsx`** — Right sidebar showing selected idea details:
   - Full description, notes editor
   - "Expand Further" button (calls AI to generate sub-ideas)
   - "Generate Variations" button
   - Color picker for node
   - "Combine with..." dropdown to merge two ideas

6. **`src/hooks/useIdeas.ts`** — Hook for CRUD operations on idea_projects, idea_nodes, idea_edges + AI generation calls

### Modified Files

1. **`src/App.tsx`** — Add `/ideas` route
2. **`src/components/MetricsBar.tsx`** — Add Lightbulb nav icon linking to `/ideas`

### Visual Design

- Same glassmorphism (`glass-panel`, `neon-border`) as the rest of the platform
- Idea nodes use soft colored circles with glow effects matching the neon palette
- New ideas animate in with `scale-in` + `fade-in`
- Connection lines animate with flowing particles (same SVG `<animateMotion>` pattern)
- AI processing shows a pulsing indicator on the central node
- Light/dark mode compatible using existing CSS variables

### Interaction Flow

1. User navigates to `/ideas` from MetricsBar
2. Fills in topic + optional fields, clicks "Generate"
3. Edge function calls AI, returns 3-5 ideas
4. Ideas appear as animated nodes branching from a central prompt node
5. Clicking a node shows details in right panel
6. "Expand" generates sub-ideas that branch from the selected node
7. User can drag nodes, color-code them, add notes
8. Projects auto-save; user can load previous projects from the sidebar

