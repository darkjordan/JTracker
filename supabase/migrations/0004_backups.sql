-- JTracker — free nightly in-database backups (accidental-delete / bad-migration
-- protection). Rows are stored as JSONB so snapshots survive schema changes.
-- The `backups` schema is NOT exposed via PostgREST (only `public` is), so this
-- data is not reachable by anon/authenticated clients.
--
-- NOTE: this protects against in-DB mistakes, not total project loss. For
-- disaster recovery, upgrade to Supabase Pro (daily backups + PITR).

create schema if not exists backups;

create table if not exists backups.snapshots (
  id bigint generated always as identity primary key,
  snapshot_at timestamptz not null default now(),
  table_name text not null,
  row_data jsonb not null
);
create index if not exists snapshots_at_idx on backups.snapshots(snapshot_at);

-- Snapshot user data (skips seeded system categories); keep 14 days.
create or replace function backups.take_snapshot()
returns void language plpgsql security definer set search_path = public as $fn$
begin
  insert into backups.snapshots(table_name, row_data)
    select 'transactions', to_jsonb(t) from public.transactions t;
  insert into backups.snapshots(table_name, row_data)
    select 'categories', to_jsonb(c) from public.categories c where c.user_id is not null;
  delete from backups.snapshots where snapshot_at < now() - interval '14 days';
end $fn$;

-- Nightly at 02:00 UTC (runs before the 03:00 anon purge).
select cron.schedule('nightly_snapshot', '0 2 * * *', $$select backups.take_snapshot();$$);
