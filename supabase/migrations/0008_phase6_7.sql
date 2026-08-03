-- JTracker — Phase 6 (Accounts & Net Worth, manual) + Phase 7 (Recurring).
-- Accounts hold manually-updated balances; net worth = assets − liabilities.
-- recurring_dismissed persists series the user has hidden (detection itself is
-- computed client-side from transaction history — no AI, no stored series).

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('cash','bank','ewallet','investment','asset','liability')),
  balance_sen integer not null default 0,
  currency text not null default 'MYR',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.accounts enable row level security;
drop policy if exists accounts_all on public.accounts;
create policy accounts_all on public.accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.recurring_dismissed (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  merchant_norm text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, merchant_norm)
);
alter table public.recurring_dismissed enable row level security;
drop policy if exists recurring_dismissed_all on public.recurring_dismissed;
create policy recurring_dismissed_all on public.recurring_dismissed
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
