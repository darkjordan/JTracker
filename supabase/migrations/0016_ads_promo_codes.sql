-- Ads: a global kill-switch + grace period, and a promo-code system that
-- permanently unlocks ad-free for whichever real account redeems a valid
-- code. All authorization enforced in Postgres (RLS + SECURITY DEFINER),
-- never trusted client-side — same shape as the networth PIN gate in
-- 0014_networth_pin.sql.

-- First-ever admin concept in this app. A tiny allowlist table, unreadable
-- via PostgREST directly (no policies) — same "unreachable except through
-- the RPC" pattern as pin_locks in 0014.
create table public.app_admins (
  email text primary key
);
alter table public.app_admins enable row level security;
insert into public.app_admins (email) values ('jordan.chin90@gmail.com');

create or replace function public.is_app_admin() returns boolean
  language sql security definer set search_path = public as $$
  select exists(select 1 from public.app_admins where email = auth.jwt() ->> 'email');
$$;

-- One client-callable admin check, purely for UI gating — the real
-- enforcement is the RLS policies below, not this function.
create or replace function public.am_i_admin() returns boolean
  language sql security definer set search_path = public as $$
  select public.is_app_admin();
$$;

-- Single-row config table (id boolean primary key, always true, so a second
-- insert always collides — there can never be more than one row). Public
-- read: every visitor, including anonymous, needs this to decide whether to
-- render an ad, and it holds nothing sensitive. Admin-only write.
create table public.app_settings (
  id boolean primary key default true check (id),
  ads_enabled boolean not null default true,
  ad_grace_days int not null default 7,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
insert into public.app_settings (id) values (true);

create policy app_settings_read on public.app_settings
  for select using (true);
create policy app_settings_write on public.app_settings
  for update using (public.is_app_admin()) with check (public.is_app_admin());

-- Promo codes: admin-managed, no public read (so a non-admin can't list
-- active codes by querying the table directly).
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label text,
  active boolean not null default true,
  max_redemptions int,
  redemption_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
create policy promo_codes_admin_all on public.promo_codes
  for all using (public.is_app_admin()) with check (public.is_app_admin());

-- One redemption per user, ever (primary key on user_id) — this is the
-- "permanent per-account unlock". No insert/update/delete policy: writes
-- only happen through redeem_promo_code below, which validates the code.
create table public.promo_redemptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_id uuid not null references public.promo_codes(id),
  redeemed_at timestamptz not null default now()
);
alter table public.promo_redemptions enable row level security;
create policy promo_redemptions_read on public.promo_redemptions
  for select using (user_id = auth.uid() or public.is_app_admin());

create or replace function public.redeem_promo_code(p_code text) returns text
  language plpgsql security definer set search_path = public as $$
declare
  c record;
begin
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception 'Sign in required';
  end if;

  if exists(select 1 from public.promo_redemptions where user_id = auth.uid()) then
    return 'already';
  end if;

  select * into c from public.promo_codes
    where upper(code) = upper(p_code) and active
    for update;
  if c is null then
    return 'invalid';
  end if;
  if c.max_redemptions is not null and c.redemption_count >= c.max_redemptions then
    return 'exhausted';
  end if;

  insert into public.promo_redemptions (user_id, code_id) values (auth.uid(), c.id);
  update public.promo_codes set redemption_count = redemption_count + 1 where id = c.id;
  return 'ok';
end $$;
