-- JTracker — Phase 1: money core schema (transactions, categories, tax relief) + RLS + seed.
-- Single-user model: every row is owned by one auth user. RLS is user_id = auth.uid()
-- on all writes; system-default categories and the tax-relief reference table are
-- world-readable. No security-definer / public link access anywhere (SPEC §3).

-- ---------- categories ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,  -- null = system default
  name text not null,
  icon text,
  color text,
  type text not null check (type in ('income','expense','both')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
  for select using (user_id is null or user_id = auth.uid());
drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- tax relief reference (per assessment year) ----------
create table if not exists public.tax_relief_categories (
  code text not null,
  year int not null,
  name_en text not null,
  name_ms text not null,
  name_zh text not null,
  annual_cap_sen integer,   -- null = no cap / rebate
  notes text,
  primary key (code, year)
);
alter table public.tax_relief_categories enable row level security;
drop policy if exists relief_read on public.tax_relief_categories;
create policy relief_read on public.tax_relief_categories for select using (true);

-- ---------- transactions ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  amount_sen integer not null check (amount_sen > 0),   -- always positive; sign implied by type
  currency text not null default 'MYR',
  merchant text not null default '',
  merchant_norm text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  tax_relief_code text,          -- validated app-side against tax_relief_categories (no FK: composite key)
  occurred_at date not null default current_date,
  note text,
  source text not null default 'manual' check (source in ('manual','text','screenshot','pdf')),
  reviewed boolean not null default false,   -- "mark reviewed" (Phase 2)
  import_id uuid,                -- fk added in Phase 4 (imports)
  dedupe_hash text,
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
drop policy if exists transactions_all on public.transactions;
create policy transactions_all on public.transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create unique index if not exists transactions_dedupe
  on public.transactions(user_id, dedupe_hash) where dedupe_hash is not null;
create index if not exists transactions_user_date
  on public.transactions(user_id, occurred_at desc);
