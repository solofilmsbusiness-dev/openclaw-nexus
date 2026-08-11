ALTER TABLE public.agent_config
  ADD COLUMN IF NOT EXISTS topstep_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS topstep_account_search text NOT NULL DEFAULT 'PRAC',
  ADD COLUMN IF NOT EXISTS topstep_contract_search text NOT NULL DEFAULT 'MNQ',
  ADD COLUMN IF NOT EXISTS topstep_allow_non_practice boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contracts_per_trade integer NOT NULL DEFAULT 1;

ALTER TABLE public.paper_positions
  ADD COLUMN IF NOT EXISTS topstep_order_id text,
  ADD COLUMN IF NOT EXISTS topstep_position_ids jsonb NOT NULL DEFAULT '{}'::jsonb;