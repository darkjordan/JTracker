-- Multi-placement, multi-network ad config. Replaces the old single
-- hardcoded Dashboard/AdSense-only setup: each row is one placement (a spot
-- in the code where <AdSlot placement="..."/> is rendered), configured with
-- whichever network the admin wants to run there.

create table public.ad_slots (
  placement text primary key,
  network text not null check (network in ('adsense', 'medianet')),
  client_id text not null,
  slot_id text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.ad_slots enable row level security;

-- Public read: every visitor's browser needs this to know what to render,
-- and ad client/slot IDs are never secret — they're embedded in public HTML
-- by design (same reasoning as app_settings in 0016).
create policy ad_slots_read on public.ad_slots
  for select using (true);
create policy ad_slots_admin_write on public.ad_slots
  for all using (public.is_app_admin()) with check (public.is_app_admin());
