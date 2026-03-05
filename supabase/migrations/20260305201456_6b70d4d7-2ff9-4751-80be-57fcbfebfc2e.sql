
-- Trade history table
CREATE TABLE public.trade_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('buy', 'sell')),
  asset text NOT NULL,
  entry_price numeric NOT NULL,
  exit_price numeric,
  pnl numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own trades" ON public.trade_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON public.trade_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Learning notes table
CREATE TABLE public.learning_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL CHECK (category IN ('Mistake', 'Insight', 'Adjustment', 'Pattern')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notes" ON public.learning_notes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" ON public.learning_notes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON public.learning_notes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
