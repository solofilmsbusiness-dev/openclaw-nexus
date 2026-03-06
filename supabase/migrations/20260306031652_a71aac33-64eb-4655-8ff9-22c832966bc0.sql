
-- Create idea_projects table
CREATE TABLE public.idea_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  prompt text NOT NULL,
  category text,
  mood text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.idea_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own idea projects" ON public.idea_projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own idea projects" ON public.idea_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own idea projects" ON public.idea_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own idea projects" ON public.idea_projects FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create idea_nodes table
CREATE TABLE public.idea_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.idea_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  details text DEFAULT '',
  notes text DEFAULT '',
  color text,
  position_x float DEFAULT 0,
  position_y float DEFAULT 0,
  parent_node_id uuid REFERENCES public.idea_nodes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.idea_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own idea nodes" ON public.idea_nodes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own idea nodes" ON public.idea_nodes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own idea nodes" ON public.idea_nodes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own idea nodes" ON public.idea_nodes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create idea_edges table
CREATE TABLE public.idea_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.idea_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  from_node_id uuid NOT NULL REFERENCES public.idea_nodes(id) ON DELETE CASCADE,
  to_node_id uuid NOT NULL REFERENCES public.idea_nodes(id) ON DELETE CASCADE,
  label text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.idea_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own idea edges" ON public.idea_edges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own idea edges" ON public.idea_edges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own idea edges" ON public.idea_edges FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own idea edges" ON public.idea_edges FOR DELETE TO authenticated USING (auth.uid() = user_id);
