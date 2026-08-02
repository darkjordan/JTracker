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
