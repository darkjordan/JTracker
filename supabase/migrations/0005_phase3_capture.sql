-- JTracker — Phase 3: screenshot capture support.
-- merchant_memory (per-user: normalized merchant → category/relief, so a known
-- merchant never needs AI again) + ai_usage (server-authoritative AI-call log &
-- daily-cap source of truth). RLS user_id = auth.uid(); ai_usage is written only
-- by the edge function via the service role (which bypasses RLS).

create table if not exists public.merchant_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  merchant_norm text not null,
  category_id uuid references public.categories(id) on delete set null,
  tax_relief_code text,
  times_used int not null default 1,
  updated_at timestamptz not null default now(),
  unique (user_id, merchant_norm)
);
alter table public.merchant_memory enable row level security;
drop policy if exists merchant_memory_all on public.merchant_memory;
create policy merchant_memory_all on public.merchant_memory
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('screenshot','pdf','text')),
  ok boolean not null default true,
  latency_ms int,
  created_at timestamptz not null default now()
);
alter table public.ai_usage enable row level security;
drop policy if exists ai_usage_read on public.ai_usage;
create policy ai_usage_read on public.ai_usage
  for select using (user_id = auth.uid());
create index if not exists ai_usage_user_day on public.ai_usage(user_id, created_at);
