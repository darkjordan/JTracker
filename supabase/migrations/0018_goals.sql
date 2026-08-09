-- Phase 8: Goals. Household-shared like `accounts` (not private like
-- `networth_items`) — a savings goal is everyday shared data, not the kind
-- of thing the net-worth PIN gate exists to protect.

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '🎯',
  target_sen integer not null check (target_sen > 0),
  target_date date,
  current_sen integer not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.goals enable row level security;
create policy goals_all on public.goals for all
  using (user_id in (select public.household_user_ids()))
  with check (user_id in (select public.household_user_ids()));
