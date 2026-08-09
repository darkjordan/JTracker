-- Tag income transactions to a goal, and make goal progress a computed
-- total instead of a hand-typed number — the previous "type your total
-- savings into a box" UX drifted from reality the moment anyone edited or
-- deleted a tagged entry, since nothing kept it in sync.

alter table public.transactions
  add column goal_id uuid references public.goals(id) on delete set null;
create index if not exists transactions_goal_id_idx
  on public.transactions(goal_id) where goal_id is not null;

-- The old `current_sen` becomes `base_sen`: a manual starting amount (e.g.
-- savings from before using JTracker) that tagged income transactions
-- accumulate on top of. Existing values carry over unchanged as the base.
alter table public.goals rename column current_sen to base_sen;
comment on column public.goals.base_sen is
  'Manual starting amount. Actual progress = base_sen + sum of income transactions tagged to this goal (see goals_with_progress).';

-- security_invoker = true is NOT the default and is NOT optional here: a
-- plain view runs with the OWNER's privileges (postgres, which bypasses
-- RLS entirely as a superuser) rather than the querying user's — verified
-- live that a bare `create view` leaked every household's goals to an
-- unrelated anonymous session. With security_invoker, RLS on the
-- underlying goals/transactions tables is evaluated as the actual caller.
create view public.goals_with_progress
  with (security_invoker = true)
as
select
  g.id,
  g.user_id,
  g.name,
  g.emoji,
  g.target_sen,
  g.target_date,
  g.base_sen,
  g.base_sen + coalesce((
    select sum(t.amount_sen) from public.transactions t
    where t.goal_id = g.id and t.type = 'income'
  ), 0) as current_sen,
  g.sort_order,
  g.created_at,
  g.updated_at
from public.goals g;

-- Views aren't covered by the tables' default privilege grants — PostgREST
-- needs an explicit grant or it 403s. RLS on the underlying goals/
-- transactions tables still does the actual row filtering.
grant select on public.goals_with_progress to authenticated, anon;
