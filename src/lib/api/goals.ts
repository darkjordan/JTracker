import { createClient } from "@/lib/supabase/client";
import type { Goal } from "@/lib/goals";

const COLS = "id, name, emoji, target_sen, target_date, base_sen, current_sen, sort_order";

/** Reads from the goals_with_progress view — current_sen is computed there
 * (base_sen + tagged income transactions), never stored directly. */
export async function listGoals(): Promise<Goal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goals_with_progress")
    .select(COLS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Goal[];
}

export async function createGoal(input: {
  name: string;
  emoji: string;
  target_sen: number;
  target_date: string | null;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("goals").insert({
    name: input.name,
    emoji: input.emoji,
    target_sen: input.target_sen,
    target_date: input.target_date,
  });
  if (error) throw error;
}

export async function updateGoal(
  id: string,
  patch: Partial<{
    name: string;
    emoji: string;
    target_sen: number;
    target_date: string | null;
    base_sen: number;
  }>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("goals").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}
