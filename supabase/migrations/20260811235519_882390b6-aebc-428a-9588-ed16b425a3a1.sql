ALTER TABLE public.agent_decisions REPLICA IDENTITY FULL;
ALTER TABLE public.trade_events REPLICA IDENTITY FULL;
ALTER TABLE public.tradingview_signals REPLICA IDENTITY FULL;
ALTER TABLE public.paper_positions REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_decisions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tradingview_signals; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.paper_positions; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;