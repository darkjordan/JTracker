import { createClient } from "@/lib/supabase/client";
import type { Category } from "./types";

const COLS = "id,user_id,name,icon,color,type,sort_order";

/** System defaults (user_id null) + the current user's own categories. */
export async function listCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(COLS)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

/**
 * Return an existing category matching `name` (case-insensitive, of this type or
 * "both"), or create a new user-owned one. Used by the "Other…" free-text option.
 */
export async function findOrCreateCategory(
  name: string,
  type: "income" | "expense"
): Promise<Category> {
  const supabase = createClient();
  const trimmed = name.trim();
  const { data: existing } = await supabase
    .from("categories")
    .select(COLS)
    .ilike("name", trimmed)
    .in("type", [type, "both"])
    .limit(1);
  if (existing && existing.length) return existing[0] as Category;

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: trimmed, type, icon: "🏷️", sort_order: 500 }) // user_id via default auth.uid()
    .select(COLS)
    .single();
  if (error) throw error;
  return data as Category;
}
