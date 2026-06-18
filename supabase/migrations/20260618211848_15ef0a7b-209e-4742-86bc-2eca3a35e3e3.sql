
-- Extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ agent_config (singleton) ============
CREATE TABLE public.agent_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  symbol TEXT NOT NULL DEFAULT 'NQ',
  paper_symbol TEXT NOT NULL DEFAULT 'MNQ',
  htf_timeframe TEXT NOT NULL DEFAULT '4h',
  ltf_timeframe TEXT NOT NULL DEFAULT '5m',
  min_zone_touches INT NOT NULL DEFAULT 2,
  require_volume_expansion BOOLEAN NOT NULL DEFAULT true,
  min_rr NUMERIC NOT NULL DEFAULT 2.0,
  profit_lock_rr NUMERIC NOT NULL DEFAULT 1.0,
  profit_lock_ticks INT NOT NULL DEFAULT 3,
  max_hold_minutes INT NOT NULL DEFAULT 300,
  one_setup_per_zone_session BOOLEAN NOT NULL DEFAULT true,
  avoid_news_minutes INT NOT NULL DEFAULT 15,
  auto_trade BOOLEAN NOT NULL DEFAULT false,
  daily_profit_target NUMERIC NOT NULL DEFAULT 500,
  daily_loss_limit NUMERIC NOT NULL DEFAULT 300,
  account_balance NUMERIC NOT NULL DEFAULT 50000,
  risk_per_trade_pct NUMERIC NOT NULL DEFAULT 0.5,
  tick_size NUMERIC NOT NULL DEFAULT 0.25,
  point_value NUMERIC NOT NULL DEFAULT 2.0, -- MNQ = $2/pt; NQ = $20/pt
  data_provider TEXT NOT NULL DEFAULT 'polygon',
  data_proxy_symbol TEXT NOT NULL DEFAULT 'QQQ',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agent_config TO authenticated, anon;
GRANT ALL ON public.agent_config TO service_role;
ALTER TABLE public.agent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config read all" ON public.agent_config FOR SELECT USING (true);
CREATE POLICY "config admin write" ON public.agent_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER agent_config_updated BEFORE UPDATE ON public.agent_config
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.agent_config (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- ============ agent_decisions ============
CREATE TABLE public.agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision TEXT NOT NULL CHECK (decision IN ('BUY','SELL','HOLD')),
  symbol TEXT NOT NULL,
  reason TEXT,
  steps_passed JSONB NOT NULL DEFAULT '{}'::jsonb,
  htf_bias TEXT,
  entry NUMERIC, stop NUMERIC, target NUMERIC, rr NUMERIC,
  snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agent_decisions TO authenticated;
GRANT ALL ON public.agent_decisions TO service_role;
ALTER TABLE public.agent_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decisions read auth" ON public.agent_decisions FOR SELECT TO authenticated USING (true);
CREATE INDEX agent_decisions_created_idx ON public.agent_decisions(created_at DESC);

-- ============ paper_positions ============
CREATE TABLE public.paper_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('LONG','SHORT')),
  contracts INT NOT NULL DEFAULT 1,
  entry_price NUMERIC NOT NULL,
  stop_price NUMERIC NOT NULL,
  target_price NUMERIC NOT NULL,
  initial_stop NUMERIC NOT NULL,
  lock_active BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  exit_price NUMERIC,
  exit_reason TEXT,
  pnl NUMERIC,
  zone_key TEXT, -- "zoneHi:zoneLo:session" to enforce one-per-zone
  session_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/New_York')::date,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  decision_id UUID REFERENCES public.agent_decisions(id)
);
GRANT SELECT ON public.paper_positions TO authenticated;
GRANT ALL ON public.paper_positions TO service_role;
ALTER TABLE public.paper_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "positions read auth" ON public.paper_positions FOR SELECT TO authenticated USING (true);
CREATE INDEX paper_positions_open_idx ON public.paper_positions(status, opened_at DESC);
CREATE INDEX paper_positions_zone_idx ON public.paper_positions(zone_key, session_date);
