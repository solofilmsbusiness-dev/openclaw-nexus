
CREATE TABLE public.graph_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  project text DEFAULT '',
  agents_data jsonb NOT NULL,
  edges_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.graph_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own configs"
  ON public.graph_configs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own configs"
  ON public.graph_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own configs"
  ON public.graph_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own configs"
  ON public.graph_configs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
