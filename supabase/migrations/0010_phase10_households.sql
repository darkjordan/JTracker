-- JTracker — Phase 10: Households (fully shared).
-- Ownership shifts from per-user to per-household: every data row is visible to
-- all members of the owner's household. v1 = one household per user. Invite by
-- token, join via a security-definer RPC (like JKira's guest-join pattern).
-- household_user_ids() returns just the caller when they're in no household, so
-- solo users are unaffected.

-- ---------- tables ----------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Household',
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  email text,
  primary key (household_id, user_id),
  unique (user_id)                       -- one household per user (v1)
);
create table if not exists public.household_invites (
  token text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- helpers (SECURITY DEFINER avoids RLS recursion) ----------
create or replace function public.my_household_ids() returns setof uuid
  language sql security definer stable set search_path = public as $$
  select household_id from public.household_members where user_id = auth.uid()
$$;

create or replace function public.household_user_ids() returns setof uuid
  language sql security definer stable set search_path = public as $$
  select auth.uid()
  union
  select hm.user_id from public.household_members hm
  where hm.household_id in (
    select household_id from public.household_members where user_id = auth.uid()
  )
$$;

-- ---------- RLS for household tables ----------
alter table public.households enable row level security;
drop policy if exists households_read on public.households;
create policy households_read on public.households for select
  using (id in (select public.my_household_ids()));

alter table public.household_members enable row level security;
drop policy if exists hm_read on public.household_members;
create policy hm_read on public.household_members for select
  using (household_id in (select public.my_household_ids()));
drop policy if exists hm_leave on public.household_members;
create policy hm_leave on public.household_members for delete
  using (user_id = auth.uid());

alter table public.household_invites enable row level security;
drop policy if exists hi_read on public.household_invites;
create policy hi_read on public.household_invites for select
  using (household_id in (select public.my_household_ids()));

-- ---------- RPCs ----------
create or replace function public.create_household(p_name text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select household_id into hid from public.household_members where user_id = auth.uid() limit 1;
  if hid is not null then return hid; end if;
  insert into public.households(name, created_by)
    values (coalesce(nullif(p_name, ''), 'My Household'), auth.uid()) returning id into hid;
  insert into public.household_members(household_id, user_id, role, email) values (hid, auth.uid(), 'owner', auth.email());
  return hid;
end $$;

create or replace function public.create_invite() returns text
  language plpgsql security definer set search_path = public as $$
declare hid uuid; tok text;
begin
  select household_id into hid from public.household_members where user_id = auth.uid() limit 1;
  if hid is null then hid := public.create_household('My Household'); end if;
  tok := replace(gen_random_uuid()::text, '-', '');
  insert into public.household_invites(token, household_id, created_by) values (tok, hid, auth.uid());
  return tok;
end $$;

create or replace function public.join_household(p_token text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select household_id into hid from public.household_invites where token = p_token and revoked = false;
  if hid is null then raise exception 'invalid invite'; end if;
  insert into public.household_members(household_id, user_id, role, email) values (hid, auth.uid(), 'member', auth.email())
    on conflict (user_id) do update set household_id = excluded.household_id, role = 'member', email = auth.email(), joined_at = now();
  return hid;
end $$;

create or replace function public.leave_household() returns void
  language plpgsql security definer set search_path = public as $$
begin
  delete from public.household_members where user_id = auth.uid();
end $$;

-- ---------- re-scope data tables to the household ----------
drop policy if exists transactions_all on public.transactions;
create policy transactions_all on public.transactions for all
  using (user_id in (select public.household_user_ids()))
  with check (user_id in (select public.household_user_ids()));

drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select
  using (user_id is null or user_id in (select public.household_user_ids()));
drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories for all
  using (user_id in (select public.household_user_ids()))
  with check (user_id in (select public.household_user_ids()));

drop policy if exists merchant_memory_all on public.merchant_memory;
create policy merchant_memory_all on public.merchant_memory for all
  using (user_id in (select public.household_user_ids()))
  with check (user_id in (select public.household_user_ids()));

drop policy if exists imports_all on public.imports;
create policy imports_all on public.imports for all
  using (user_id in (select public.household_user_ids()))
  with check (user_id in (select public.household_user_ids()));

drop policy if exists accounts_all on public.accounts;
create policy accounts_all on public.accounts for all
  using (user_id in (select public.household_user_ids()))
  with check (user_id in (select public.household_user_ids()));

drop policy if exists recurring_plans_all on public.recurring_plans;
create policy recurring_plans_all on public.recurring_plans for all
  using (user_id in (select public.household_user_ids()))
  with check (user_id in (select public.household_user_ids()));

drop policy if exists recurring_dismissed_all on public.recurring_dismissed;
create policy recurring_dismissed_all on public.recurring_dismissed for all
  using (user_id in (select public.household_user_ids()))
  with check (user_id in (select public.household_user_ids()));

drop policy if exists relief_settings_all on public.relief_settings;
create policy relief_settings_all on public.relief_settings for all
  using (user_id in (select public.household_user_ids()))
  with check (user_id in (select public.household_user_ids()));
