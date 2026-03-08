begin;
alter table public.agent_health add column if not exists agent_id text;
alter table public.agent_health add column if not exists agent_name text;
alter table public.agent_health add column if not exists status text;
alter table public.agent_health add column if not exists status_text text;
alter table public.agent_health add column if not exists created_at timestamptz default now();
create unique index if not exists agent_health_agent_id_key on public.agent_health(agent_id);
insert into public.agent_health (agent_id, agent_name, status, status_text)
values
  ('solo-core','SOLO OS CORE','healthy','v2.28 stable • 10/10 online'),
  ('brain','Brain','healthy','Strategy planning'),
  ('market-sentinel','Market Sentinel','active','Watches the market'),
  ('research','Research','active','Audience profiling'),
  ('architect','Architect','healthy','Architecture audit'),
  ('scheduler','Scheduler','healthy','Queue management'),
  ('executor','Executor','active','Poster & Logger'),
  ('of-marketing','OF Marketing','active','Campaign processing'),
  ('trading-guardian','Trading Guardian','healthy','Emergency Services'),
  ('position-manager','Position Manager','healthy','Manage trades after entry'),
  ('risk-manager','Risk Manager','degraded','Protect the account')
on conflict (agent_id) do update
set agent_name = excluded.agent_name,
    status = excluded.status,
    status_text = excluded.status_text,
    created_at = now();

alter table public.project_schedule add column if not exists owner text;
update public.project_schedule
set owner = initcap(owner)
where lower(owner) in (
  'solo os core','brain','market sentinel','research','architect','scheduler',
  'executor','of marketing','trading guardian','position manager','risk manager'
);
commit;
