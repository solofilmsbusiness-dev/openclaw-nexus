begin;
delete from public.agent_health where agent_id is null or agent_name = 'manual-check-agent';
commit;
