-- Dashboard + trading schema

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists public.agent_health (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  status text not null,
  status_text text,
  metrics jsonb default '{}'::jsonb,
  source text default 'openclaw',
  created_at timestamptz not null default now()
);
alter table public.agent_health add column if not exists agent_id text;
alter table public.agent_health add column if not exists status text;
alter table public.agent_health add column if not exists status_text text;
alter table public.agent_health add column if not exists metrics jsonb default '{}'::jsonb;
alter table public.agent_health add column if not exists source text default 'openclaw';
alter table public.agent_health add column if not exists created_at timestamptz default now();
create index if not exists agent_health_agent_idx on public.agent_health(agent_id);
create index if not exists agent_health_created_idx on public.agent_health(created_at desc);

create table if not exists public.agent_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  from_agent text,
  to_agent text,
  payload jsonb default '{}'::jsonb,
  activity_ref text,
  created_at timestamptz not null default now()
);
create index if not exists agent_events_event_type_idx on public.agent_events(event_type);
create index if not exists agent_events_created_idx on public.agent_events(created_at desc);

create table if not exists public.topstep_accounts (
  account_id text primary key,
  nickname text,
  balance numeric,
  drawdown_limit numeric,
  can_trade boolean,
  metadata jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.topstep_positions (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references public.topstep_accounts(account_id) on delete cascade,
  symbol text not null,
  side text not null,
  qty numeric not null,
  avg_price numeric,
  unrealized_pnl numeric,
  opened_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists topstep_positions_account_idx on public.topstep_positions(account_id);

create table if not exists public.trade_events (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references public.topstep_accounts(account_id) on delete cascade,
  agent_id text,
  symbol text,
  action text not null,
  direction text,
  size numeric,
  confidence numeric,
  notes text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists trade_events_account_idx on public.trade_events(account_id);
create index if not exists trade_events_symbol_idx on public.trade_events(symbol);

create table if not exists public.strategy_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  strategy_name text not null,
  status text not null,
  metrics jsonb default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists strategy_runs_agent_idx on public.strategy_runs(agent_id);

create table if not exists public.project_schedule (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner text,
  workstream text,
  status text default 'planned',
  scheduled_at timestamptz,
  duration_minutes integer,
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists project_schedule_scheduled_idx on public.project_schedule(scheduled_at);

