import { createClient } from "@/lib/supabase/client";
import type { Goal } from "@/lib/goals";

const COLS = "id, name, emoji, target_sen, target_date, current_sen, sort_order";

export async function listGoals(): Promise<Goal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goals")
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
    current_sen: number;
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
