import { createClient } from "@/lib/supabase/client";

export type VerifyResult = "ok" | "wrong" | "locked" | "no_pin";

export async function hasNetWorthPin(): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("has_networth_pin");
  if (error) throw error;
  return !!data;
}

export async function setNetWorthPin(pin: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_networth_pin", { p_pin: pin });
  if (error) throw error;
}

export async function verifyNetWorthPin(pin: string): Promise<VerifyResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("verify_networth_pin", {
    p_pin: pin,
  });
  if (error) throw error;
  return data as VerifyResult;
}

export async function clearNetWorthPin(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("clear_networth_pin");
  if (error) throw error;
}
