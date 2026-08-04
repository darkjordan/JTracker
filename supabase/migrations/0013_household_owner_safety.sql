-- JTracker — prevent a household from ever losing its owner.
--
-- Bug found 2026-08-05: join_household unconditionally overwrote the caller's
-- existing household_members row (role -> 'member') on conflict(user_id). If
-- the OWNER ever opened their own invite link and joined, their own row got
-- silently demoted from owner to member, leaving the household ownerless
-- (nobody left who could invite/approve/remove). Fixed a live household ("JP")
-- by hand; this migration closes the hole two ways:
--   1. join_household refuses to run if the caller is currently an active
--      owner of a household (any household) — they must leave/transfer first.
--   2. leave_household auto-promotes the longest-standing other active member
--      to owner when the owner leaves, so a household with members is never
--      left without one.

create or replace function public.join_household(p_token text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare
  hid uuid;
  my_role text;
  my_status text;
begin
  select role, status into my_role, my_status
    from public.household_members where user_id = auth.uid();
  if my_role = 'owner' and my_status = 'active' then
    raise exception 'You already own a household — leave it before joining another.';
  end if;

  select household_id into hid from public.household_invites where token = p_token and revoked = false;
  if hid is null then raise exception 'invalid invite'; end if;

  insert into public.household_members(household_id, user_id, role, email, status)
    values (hid, auth.uid(), 'member', nullif(auth.email(), ''), 'pending')
    on conflict (user_id) do update
      set household_id = excluded.household_id, role = 'member',
          email = nullif(auth.email(), ''), status = 'pending', joined_at = now();
  return hid;
end $$;

create or replace function public.leave_household() returns void
  language plpgsql security definer set search_path = public as $$
declare
  hid uuid;
  was_owner boolean;
  successor uuid;
begin
  select household_id, (role = 'owner') into hid, was_owner
    from public.household_members where user_id = auth.uid();
  if hid is null then return; end if;

  if was_owner then
    select user_id into successor
      from public.household_members
      where household_id = hid and user_id <> auth.uid() and status = 'active'
      order by joined_at asc
      limit 1;
    if successor is not null then
      update public.household_members set role = 'owner'
        where household_id = hid and user_id = successor;
    end if;
  end if;

  delete from public.household_members where user_id = auth.uid();
end $$;
