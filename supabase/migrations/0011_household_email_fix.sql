-- JTracker — fix household member emails.
-- auth.email() returns '' (not null) for anonymous sessions, so members were
-- stored with email '' — and a member who joined anonymously then signed in
-- kept the stale '' forever. Store NULL when there's no email, backfill from
-- auth.users, and add sync_household_email() (called on app load) so a member's
-- email becomes visible once they sign in.

update public.household_members set email = null where email = '';

update public.household_members hm
set email = u.email
from auth.users u
where u.id = hm.user_id and u.email is not null and hm.email is null;

create or replace function public.sync_household_email() returns void
  language plpgsql security definer set search_path = public as $$
begin
  update public.household_members
  set email = nullif(auth.email(), '')
  where user_id = auth.uid()
    and email is distinct from nullif(auth.email(), '');
end $$;

-- create_household / join_household now store nullif(auth.email(), '')
-- (see updated bodies applied to the live DB; mirrored here for a fresh setup).
create or replace function public.create_household(p_name text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select household_id into hid from public.household_members where user_id = auth.uid() limit 1;
  if hid is not null then return hid; end if;
  insert into public.households(name, created_by)
    values (coalesce(nullif(p_name, ''), 'My Household'), auth.uid()) returning id into hid;
  insert into public.household_members(household_id, user_id, role, email)
    values (hid, auth.uid(), 'owner', nullif(auth.email(), ''));
  return hid;
end $$;

create or replace function public.join_household(p_token text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select household_id into hid from public.household_invites where token = p_token and revoked = false;
  if hid is null then raise exception 'invalid invite'; end if;
  insert into public.household_members(household_id, user_id, role, email)
    values (hid, auth.uid(), 'member', nullif(auth.email(), ''))
    on conflict (user_id) do update set household_id = excluded.household_id, role = 'member', email = nullif(auth.email(), ''), joined_at = now();
  return hid;
end $$;
