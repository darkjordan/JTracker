import { createClient } from "@/lib/supabase/client";

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
