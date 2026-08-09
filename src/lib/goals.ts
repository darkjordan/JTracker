// Pure goal-progress math (Phase 8, SPEC §10). Money stays in sen.

export type Goal = {
  id: string;
  name: string;
  emoji: string;
  target_sen: number;
  target_date: string | null; // YYYY-MM-DD
  // Computed: base_sen + sum of income transactions tagged to this goal
  // (see the goals_with_progress view) — never hand-edited directly.
  current_sen: number;
  // The one editable piece: a manual starting amount (e.g. savings from
  // before using JTracker), on top of which tagged transactions accumulate.
  base_sen: number;
  sort_order: number;
};

export type GoalProgress = {
  pct: number; // 0–100
  remainingSen: number;
  done: boolean;
  daysLeft: number | null; // null if no target_date, negative if overdue
};

const DAY = 86400000;
const toDays = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / DAY);

export function goalProgress(
  goal: Pick<Goal, "target_sen" | "current_sen" | "target_date">,
  today: string = new Date().toISOString().slice(0, 10)
): GoalProgress {
  const done = goal.current_sen >= goal.target_sen;
  const pct = goal.target_sen > 0
    ? Math.max(0, Math.min(100, Math.round((goal.current_sen / goal.target_sen) * 100)))
    : 0;
  const remainingSen = Math.max(goal.target_sen - goal.current_sen, 0);
  const daysLeft = goal.target_date
    ? toDays(goal.target_date) - toDays(today)
    : null;
  return { pct, remainingSen, done, daysLeft };
}
