import { createClient } from "@/lib/supabase/client";
import type { AccountRow, AccountKind } from "@/lib/networth";

const COLS = "id, name, kind, balance_sen, sort_order";

export async function listAccounts(): Promise<AccountRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select(COLS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AccountRow[];
}

export async function createAccount(input: {
  name: string;
  kind: AccountKind;
  balance_sen: number;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("accounts").insert({
    name: input.name,
    kind: input.kind,
    balance_sen: input.balance_sen,
  });
  if (error) throw error;
}

export async function updateAccount(
  id: string,
  patch: Partial<{ name: string; kind: AccountKind; balance_sen: number }>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("accounts").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteAccount(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}
