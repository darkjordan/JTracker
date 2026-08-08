-- Net Worth: a separate, PIN-gated personal ledger (investments/EPF/property/
-- other assets & liabilities) distinct from the everyday `accounts` table.

create table public.networth_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('investment','epf','property','other','liability')),
  balance_sen integer not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.networth_items enable row level security;
-- Deliberately user_id = auth.uid(), NOT household_user_ids(): net worth
-- items are personal even inside a shared household (unlike every other
-- table, which Phase 10 re-scoped to the whole household) — this is what
-- the PIN in front of this data is meant to protect.
create policy networth_items_all on public.networth_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- PIN lock, keyed 1:1 on the user. No RLS policies at all: this table must
-- never be readable via PostgREST directly (not even the hash) — only the
-- SECURITY DEFINER RPCs below may touch it, and they never return pin_hash.
create table public.pin_locks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pin_locks enable row level security;

create or replace function public.has_networth_pin() returns boolean
  language sql security definer set search_path = public as $$
  select exists(select 1 from public.pin_locks where user_id = auth.uid());
$$;

create or replace function public.set_networth_pin(p_pin text) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be 4 digits';
  end if;
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception 'Sign in required';
  end if;
  insert into public.pin_locks (user_id, pin_hash, failed_attempts, locked_until, updated_at)
    values (auth.uid(), extensions.crypt(p_pin, extensions.gen_salt('bf')), 0, null, now())
  on conflict (user_id) do update
    set pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null, updated_at = now();
end $$;

create or replace function public.verify_networth_pin(p_pin text) returns text
  language plpgsql security definer set search_path = public as $$
declare
  r record;
  max_attempts constant int := 5;
  lock_minutes constant int := 5;
begin
  select * into r from public.pin_locks where user_id = auth.uid();
  if r is null then
    return 'no_pin';
  end if;
  if r.locked_until is not null and r.locked_until > now() then
    return 'locked';
  end if;
  if r.pin_hash = extensions.crypt(p_pin, r.pin_hash) then
    update public.pin_locks set failed_attempts = 0, locked_until = null, updated_at = now()
      where user_id = auth.uid();
    return 'ok';
  else
    update public.pin_locks
      set failed_attempts = failed_attempts + 1,
          locked_until = case when failed_attempts + 1 >= max_attempts
                               then now() + (lock_minutes || ' minutes')::interval
                               else locked_until end,
          updated_at = now()
      where user_id = auth.uid();
    return 'wrong';
  end if;
end $$;

create or replace function public.clear_networth_pin() returns void
  language plpgsql security definer set search_path = public as $$
begin
  delete from public.pin_locks where user_id = auth.uid();
end $$;
