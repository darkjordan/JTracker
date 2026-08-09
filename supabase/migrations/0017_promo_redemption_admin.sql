-- Admin visibility + revocation for promo redemptions. auth.users is not
-- exposed via PostgREST, so listing "who redeemed" needs a SECURITY DEFINER
-- function to join it — gated in the function body itself (not RLS, since a
-- SECURITY DEFINER function bypasses RLS entirely).

create or replace function public.list_promo_redemptions()
returns table(user_id uuid, email text, code text, redeemed_at timestamptz)
  language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;
  return query
    select pr.user_id, u.email::text, pc.code, pr.redeemed_at
    from public.promo_redemptions pr
    join public.promo_codes pc on pc.id = pr.code_id
    join auth.users u on u.id = pr.user_id
    order by pr.redeemed_at desc;
end $$;

-- Revoking deletes the redemption row (ads resume for that account) and
-- decrements the code's redemption_count so a max_redemptions-limited code
-- frees up a slot. Kept as an RPC, not a delete RLS policy, to match
-- promo_redemptions' existing "writes only through an RPC" shape.
create or replace function public.revoke_promo_redemption(p_user_id uuid)
returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_code_id uuid;
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;
  delete from public.promo_redemptions where user_id = p_user_id
    returning code_id into v_code_id;
  if v_code_id is not null then
    update public.promo_codes set redemption_count = greatest(redemption_count - 1, 0)
      where id = v_code_id;
  end if;
end $$;
