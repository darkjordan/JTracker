import { createClient } from "@/lib/supabase/client";
import type { RecurringPlan, Cadence } from "@/lib/recurring";

const PLAN_COLS = "id, name, amount_sen, cadence, next_due, category_id";

export async function listPlans(): Promise<RecurringPlan[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("recurring_plans")
    .select(PLAN_COLS)
    .order("next_due", { ascending: true, nullsFirst: false });
  return (data ?? []) as RecurringPlan[];
}

export async function createPlan(input: {
  name: string;
  amount_sen: number;
  cadence: Cadence;
  next_due: string | null;
  category_id?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("recurring_plans").insert({
    name: input.name,
    amount_sen: input.amount_sen,
    cadence: input.cadence,
    next_due: input.next_due,
    category_id: input.category_id ?? null,
  });
  if (error) throw error;
}

export async function updatePlan(
  id: string,
  patch: Partial<{ name: string; amount_sen: number; cadence: Cadence; next_due: string | null }>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("recurring_plans").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePlan(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("recurring_plans").delete().eq("id", id);
  if (error) throw error;
}

/** Merchant_norms the user has dismissed from the recurring list. */
export async function listDismissed(): Promise<Set<string>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("recurring_dismissed")
    .select("merchant_norm");
  return new Set(
    ((data ?? []) as { merchant_norm: string }[]).map((r) => r.merchant_norm)
  );
}

export async function dismissRecurring(merchantNorm: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("recurring_dismissed")
    .upsert(
      { user_id: user.id, merchant_norm: merchantNorm },
      { onConflict: "user_id,merchant_norm" }
    );
}

export async function restoreRecurring(merchantNorm: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("recurring_dismissed")
    .delete()
    .eq("merchant_norm", merchantNorm);
}
