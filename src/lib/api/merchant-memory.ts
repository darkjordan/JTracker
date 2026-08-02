import { createClient } from "@/lib/supabase/client";

export type MerchantMemory = {
  category_id: string | null;
  tax_relief_code: string | null;
};

/** Look up a remembered category/relief for a normalized merchant (or null). */
export async function getMerchantMemory(
  merchantNorm: string
): Promise<MerchantMemory | null> {
  if (!merchantNorm) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("merchant_memory")
    .select("category_id, tax_relief_code")
    .eq("merchant_norm", merchantNorm)
    .maybeSingle();
  return (data as MerchantMemory) ?? null;
}

/** Remember (or update) a merchant's category/relief for next time. */
export async function rememberMerchant(
  merchantNorm: string,
  categoryId: string | null,
  taxReliefCode: string | null
): Promise<void> {
  if (!merchantNorm) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("merchant_memory").upsert(
    {
      user_id: user.id,
      merchant_norm: merchantNorm,
      category_id: categoryId,
      tax_relief_code: taxReliefCode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,merchant_norm" }
  );
}
