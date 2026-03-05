
CREATE POLICY "Users can delete own trades" ON public.trade_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
