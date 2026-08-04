-- JTracker — household join approval + owner removal.
-- Joining via invite now creates a PENDING member; the owner must approve
-- before that person can see/write shared data. household_user_ids() only
-- expands to active members of a household the CALLER is themselves active
-- in — so a pending member sees only their own data (safe default), never the
-- household's, until approved.

alter table public.household_members
  add column if not exists status text not null default 'active'
  check (status in ('pending','active'));

create or replace function public.household_user_ids() returns setof uuid
  language sql security definer stable set search_path = public as $$
  select auth.uid()
  union
  select hm.user_id from public.household_members hm
  where hm.status = 'active'
    and hm.household_id in (
      select household_id from public.household_members
      where user_id = auth.uid() and status = 'active'
    )
$$;

create or replace function public.create_household(p_name text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select household_id into hid from public.household_members where user_id = auth.uid() limit 1;
  if hid is not null then return hid; end if;
  insert into public.households(name, created_by)
    values (coalesce(nullif(p_name, ''), 'My Household'), auth.uid()) returning id into hid;
  insert into public.household_members(household_id, user_id, role, email, status)
    values (hid, auth.uid(), 'owner', nullif(auth.email(), ''), 'active');
  return hid;
end $$;

-- Joining now creates a PENDING request, not immediate membership.
create or replace function public.join_household(p_token text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select household_id into hid from public.household_invites where token = p_token and revoked = false;
  if hid is null then raise exception 'invalid invite'; end if;
  insert into public.household_members(household_id, user_id, role, email, status)
    values (hid, auth.uid(), 'member', nullif(auth.email(), ''), 'pending')
    on conflict (user_id) do update
      set household_id = excluded.household_id, role = 'member',
          email = nullif(auth.email(), ''), status = 'pending', joined_at = now();
  return hid;
end $$;

create or replace function public.approve_member(p_user_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare hid uuid; caller_role text;
begin
  select household_id, role into hid, caller_role
    from public.household_members where user_id = auth.uid() and status = 'active';
  if caller_role is distinct from 'owner' then
    raise exception 'only the owner can approve members';
  end if;
  update public.household_members set status = 'active'
    where user_id = p_user_id and household_id = hid and status = 'pending';
end $$;

create or replace function public.reject_member(p_user_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare hid uuid; caller_role text;
begin
  select household_id, role into hid, caller_role
    from public.household_members where user_id = auth.uid() and status = 'active';
  if caller_role is distinct from 'owner' then
    raise exception 'only the owner can reject members';
  end if;
  delete from public.household_members
    where user_id = p_user_id and household_id = hid and status = 'pending';
end $$;

create or replace function public.remove_member(p_user_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare hid uuid; caller_role text;
begin
  select household_id, role into hid, caller_role
    from public.household_members where user_id = auth.uid() and status = 'active';
  if caller_role is distinct from 'owner' then
    raise exception 'only the owner can remove members';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'use leave_household to remove yourself';
  end if;
  delete from public.household_members
    where user_id = p_user_id and household_id = hid;
end $$;
