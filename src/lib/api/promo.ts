import { createClient } from "@/lib/supabase/client";

export type RedeemResult = "ok" | "already" | "invalid" | "exhausted";

export type PromoCode = {
  id: string;
  code: string;
  label: string | null;
  active: boolean;
  max_redemptions: number | null;
  redemption_count: number;
  created_at: string;
};

export type AdSettings = {
  ads_enabled: boolean;
  ad_grace_days: number;
};

export async function getAdFreeStatus(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return false;
  const { data, error } = await supabase
    .from("promo_redemptions")
    .select("redeemed_at")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function redeemPromoCode(code: string): Promise<RedeemResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("redeem_promo_code", {
    p_code: code,
  });
  if (error) throw error;
  return data as RedeemResult;
}

export async function isAdmin(): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("am_i_admin");
  if (error) throw error;
  return !!data;
}

export async function getAdSettings(): Promise<AdSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("ads_enabled, ad_grace_days")
    .single();
  if (error) throw error;
  return data as AdSettings;
}

export async function updateAdSettings(
  patch: Partial<AdSettings>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("app_settings")
    .update(patch)
    .eq("id", true);
  if (error) throw error;
}

export async function listPromoCodes(): Promise<PromoCode[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select(
      "id, code, label, active, max_redemptions, redemption_count, created_at"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PromoCode[];
}

export async function createPromoCode(input: {
  code: string;
  label?: string;
  max_redemptions?: number | null;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("promo_codes").insert({
    code: input.code.trim(),
    label: input.label?.trim() || null,
    max_redemptions: input.max_redemptions ?? null,
  });
  if (error) throw error;
}

export async function updatePromoCode(
  id: string,
  patch: Partial<{
    code: string;
    label: string | null;
    max_redemptions: number | null;
  }>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("promo_codes")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function setPromoCodeActive(
  id: string,
  active: boolean
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("promo_codes")
    .update({ active })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePromoCode(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) throw error;
}

export type Redemption = {
  user_id: string;
  email: string | null;
  code: string;
  redeemed_at: string;
};

export async function listPromoRedemptions(): Promise<Redemption[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("list_promo_redemptions");
  if (error) throw error;
  return (data ?? []) as Redemption[];
}

export async function revokePromoRedemption(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("revoke_promo_redemption", {
    p_user_id: userId,
  });
  if (error) throw error;
}
