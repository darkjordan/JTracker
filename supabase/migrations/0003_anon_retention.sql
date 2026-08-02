-- JTracker — anonymous-data retention policy.
--
-- Model: anonymous session = ephemeral, per-browser. On Google sign-in the
-- anonymous user is UPGRADED in place (linkIdentity), so its data becomes the
-- permanent account's data — no copy, nothing orphaned. To prevent stray
-- anonymous data from accumulating (privacy / leak prevention), a daily job
-- purges stale anonymous accounts. Deleting an auth user cascades their
-- transactions and user-created categories (FK ON DELETE CASCADE).

create extension if not exists pg_cron;

-- Daily at 03:00 UTC: delete anonymous users that are either
--   (a) older than 30 days, or
--   (b) empty (no transactions) and older than 1 day.
-- Signed-in users are not anonymous, so they are never touched.
select cron.schedule('purge_stale_anon', '0 3 * * *', $job$
  delete from auth.users u
  where u.is_anonymous
    and (
      u.created_at < now() - interval '30 days'
      or (u.created_at < now() - interval '1 day'
          and not exists (select 1 from public.transactions t where t.user_id = u.id))
    );
$job$);
