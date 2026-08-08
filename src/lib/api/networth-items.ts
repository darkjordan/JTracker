import { createClient } from "@/lib/supabase/client";
import type { NetWorthItem, ItemKind } from "@/lib/networth-items";

const COLS = "id, name, kind, balance_sen, sort_order";

export async function listNetWorthItems(): Promise<NetWorthItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("networth_items")
    .select(COLS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NetWorthItem[];
}

export async function createNetWorthItem(input: {
  name: string;
  kind: ItemKind;
  balance_sen: number;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("networth_items").insert({
    name: input.name,
    kind: input.kind,
    balance_sen: input.balance_sen,
  });
  if (error) throw error;
}

export async function updateNetWorthItem(
  id: string,
  patch: Partial<{ name: string; kind: ItemKind; balance_sen: number }>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("networth_items")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteNetWorthItem(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("networth_items").delete().eq("id", id);
  if (error) throw error;
}
