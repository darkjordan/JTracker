import { createClient } from "@/lib/supabase/client";

export type HouseholdMember = {
  user_id: string;
  role: "owner" | "member";
  email: string | null;
  status: "pending" | "active";
};
export type Household = {
  id: string;
  name: string;
  members: HouseholdMember[];
};

/** The caller's household (with members), or null if they're not in one. */
export async function getHousehold(): Promise<Household | null> {
  const supabase = createClient();
  // Keep the caller's stored email current (e.g. after they sign in post-join).
  await supabase.rpc("sync_household_email");
  const { data: hh } = await supabase
    .from("households")
    .select("id, name")
    .limit(1)
    .maybeSingle();
  if (!hh) return null;
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, role, email, status")
    .eq("household_id", hh.id);
  return {
    id: hh.id,
    name: hh.name,
    members: (members ?? []) as HouseholdMember[],
  };
}

export async function createHousehold(name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("create_household", { p_name: name });
  if (error) throw error;
}

/** Create an invite and return a shareable join URL. */
export async function createInviteUrl(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_invite");
  if (error) throw error;
  const token = data as string;
  return `${window.location.origin}/household?invite=${token}`;
}

export async function joinHousehold(token: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("join_household", { p_token: token });
  if (error) throw error;
}

export async function leaveHousehold(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("leave_household");
  if (error) throw error;
}

/** Owner only: approve a pending join request. */
export async function approveMember(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("approve_member", { p_user_id: userId });
  if (error) throw error;
}

/** Owner only: reject (delete) a pending join request. */
export async function rejectMember(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("reject_member", { p_user_id: userId });
  if (error) throw error;
}

/** Owner only: remove an active member from the household. */
export async function removeMember(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("remove_member", { p_user_id: userId });
  if (error) throw error;
}
