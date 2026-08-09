import { createClient } from "@/lib/supabase/client";

export type AdNetwork = "adsense" | "medianet";

export type AdSlotRow = {
  placement: string;
  network: AdNetwork;
  client_id: string;
  slot_id: string;
  enabled: boolean;
  updated_at: string;
};

const COLS = "placement, network, client_id, slot_id, enabled, updated_at";

export async function getAdSlot(placement: string): Promise<AdSlotRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ad_slots")
    .select(COLS)
    .eq("placement", placement)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as AdSlotRow | null;
}

export async function listAdSlots(): Promise<AdSlotRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ad_slots")
    .select(COLS)
    .order("placement", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdSlotRow[];
}

export async function createAdSlot(input: {
  placement: string;
  network: AdNetwork;
  client_id: string;
  slot_id: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("ad_slots").insert({
    placement: input.placement.trim(),
    network: input.network,
    client_id: input.client_id.trim(),
    slot_id: input.slot_id.trim(),
  });
  if (error) throw error;
}

export async function updateAdSlot(
  placement: string,
  patch: Partial<{
    network: AdNetwork;
    client_id: string;
    slot_id: string;
    enabled: boolean;
  }>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ad_slots")
    .update(patch)
    .eq("placement", placement);
  if (error) throw error;
}

export async function deleteAdSlot(placement: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ad_slots")
    .delete()
    .eq("placement", placement);
  if (error) throw error;
}
