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
  // In a household there may be a row per member for the same merchant; take the
  // most-used one.
  const { data } = await supabase
    .from("merchant_memory")
    .select("category_id, tax_relief_code")
    .eq("merchant_norm", merchantNorm)
    .order("times_used", { ascending: false })
    .limit(1);
  return ((data && data[0]) as MerchantMemory) ?? null;
}

/** Bulk lookup for many merchants at once (for statement import). */
export async function getMerchantMemories(
  norms: string[]
): Promise<Map<string, MerchantMemory>> {
  const unique = [...new Set(norms.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const supabase = createClient();
  const { data } = await supabase
    .from("merchant_memory")
    .select("merchant_norm, category_id, tax_relief_code, times_used")
    .in("merchant_norm", unique)
    .order("times_used", { ascending: false });
  const map = new Map<string, MerchantMemory>();
  for (const r of (data ?? []) as (MerchantMemory & { merchant_norm: string })[]) {
    // ordered by times_used desc → first (most-used) wins per merchant
    if (!map.has(r.merchant_norm)) {
      map.set(r.merchant_norm, {
        category_id: r.category_id,
        tax_relief_code: r.tax_relief_code,
      });
    }
  }
  return map;
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
