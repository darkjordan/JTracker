-- The attempt that CAUSES the lockout (the 5th wrong try) was returning
-- 'wrong' instead of 'locked', since the lock was set as a side effect of
-- the same UPDATE but the return value wasn't checked against it — the UI
-- only saw "locked" on attempt 6. Read back the row the UPDATE just wrote.
create or replace function public.verify_networth_pin(p_pin text) returns text
  language plpgsql security definer set search_path = public as $$
declare
  r record;
  max_attempts constant int := 5;
  lock_minutes constant int := 5;
  new_locked_until timestamptz;
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
      where user_id = auth.uid()
      returning locked_until into new_locked_until;
    if new_locked_until is not null and new_locked_until > now() then
      return 'locked';
    end if;
    return 'wrong';
  end if;
end $$;
