-- Two devices signed into the same account (e.g. testing with a shared
-- login) each keep their own local optimistic copy of hearts/coins/level
-- progress, and previously only updated it in response to their own
-- actions. If device A spent coins, device B's screen stayed stale until
-- its next full re-login/hydrate. Enabling Realtime on these tables lets
-- every device react to changes made anywhere (any device, or a server-side
-- process), keeping both in sync as long as either app is open.
--
-- No RLS changes needed — Realtime's Postgres Changes already honors the
-- existing `select own row` policies below, so a client only ever receives
-- change events for its own authenticated user.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table players;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'level_completions'
  ) then
    alter publication supabase_realtime add table level_completions;
  end if;
end $$;

-- Full row images on UPDATE (not just changed columns) so the client can
-- apply the new row directly without a follow-up fetch.
alter table players replica identity full;
alter table level_completions replica identity full;
