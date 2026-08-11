
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE public.agent_config
  ADD COLUMN IF NOT EXISTS tv_signal_ttl_minutes INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS tv_confluence_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_stop_ticks INT NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS kill_switch BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.tradingview_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy','sell')),
  entry NUMERIC,
  tp NUMERIC,
  sl NUMERIC,
  indicator TEXT,
  timeframe TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  consumed BOOLEAN NOT NULL DEFAULT false,
  consumed_at TIMESTAMPTZ,
  consume_reason TEXT
);
GRANT SELECT ON public.tradingview_signals TO authenticated;
GRANT ALL ON public.tradingview_signals TO service_role;
ALTER TABLE public.tradingview_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tv signals read auth" ON public.tradingview_signals;
CREATE POLICY "tv signals read auth" ON public.tradingview_signals
  FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS tv_signals_fresh_idx
  ON public.tradingview_signals(consumed, received_at DESC);

CREATE TABLE IF NOT EXISTS public.trade_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID REFERENCES public.paper_positions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  note TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trade_events TO authenticated;
GRANT ALL ON public.trade_events TO service_role;
ALTER TABLE public.trade_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trade events read auth" ON public.trade_events;
CREATE POLICY "trade events read auth" ON public.trade_events
  FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS trade_events_pos_idx
  ON public.trade_events(position_id, created_at DESC);

ALTER TABLE public.agent_decisions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'brt',
  ADD COLUMN IF NOT EXISTS tv_signal_id UUID
    REFERENCES public.tradingview_signals(id) ON DELETE SET NULL;

INSERT INTO public.agent_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
