-- JTracker — Phase 7 extension: user-planned recurring items (subscriptions /
-- bills you add manually, so upcoming due dates + the monthly total show even
-- before three charges exist to auto-detect). RLS user_id = auth.uid().
create table if not exists public.recurring_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  amount_sen integer not null default 0,
  cadence text not null default 'monthly' check (cadence in ('weekly','monthly','yearly')),
  next_due date,
  category_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.recurring_plans enable row level security;
drop policy if exists recurring_plans_all on public.recurring_plans;
create policy recurring_plans_all on public.recurring_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
