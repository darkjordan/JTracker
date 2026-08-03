-- JTracker — Phase 5: tax relief. Per-user cap overrides so LHDN caps stay
-- editable in Settings without a code change (the seeded caps in
-- tax_relief_categories are shared reference/defaults; a user's edit lives here).
create table if not exists public.relief_settings (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  code text not null,
  year int not null,
  annual_cap_sen integer,
  updated_at timestamptz not null default now(),
  primary key (user_id, code, year)
);
alter table public.relief_settings enable row level security;
drop policy if exists relief_settings_all on public.relief_settings;
create policy relief_settings_all on public.relief_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
