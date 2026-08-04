import { createClient } from "@/lib/supabase/client";
import { normalizeMerchant } from "@/lib/money";
import type { Transaction, NewTransaction } from "./types";

const COLS =
  "id,user_id,type,amount_sen,currency,merchant,merchant_norm,category_id,tax_relief_code,occurred_at,note,source,reviewed,created_at";

/** Local (not UTC) YYYY-MM-DD, so a late-night entry lands on the right day. */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export async function listRecentTransactions(limit = 200): Promise<Transaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(COLS)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

/** Light rows over a date range [startISO, endISOExclusive) — for the trend. */
export async function listRangeLite(
  startISO: string,
  endISOExclusive: string
): Promise<{ type: string; amount_sen: number; occurred_at: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount_sen, occurred_at")
    .gte("occurred_at", startISO)
    .lt("occurred_at", endISOExclusive);
  if (error) throw error;
  return (data ?? []) as {
    type: string;
    amount_sen: number;
    occurred_at: string;
  }[];
}

export async function listTransactionsForMonth(
  year: number,
  month: number // 1-12
): Promise<Transaction[]> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(COLS)
    .gte("occurred_at", start)
    .lt("occurred_at", end)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function createTransaction(input: NewTransaction): Promise<Transaction> {
  const supabase = createClient();
  const row = {
    type: input.type,
    amount_sen: input.amount_sen,
    merchant: input.merchant,
    merchant_norm: input.merchant_norm ?? normalizeMerchant(input.merchant),
    category_id: input.category_id ?? null,
    tax_relief_code: input.tax_relief_code ?? null,
    occurred_at: input.occurred_at ?? todayLocal(),
    note: input.note ?? null,
    source: input.source ?? "manual",
    // user_id is filled by the DB default auth.uid().
  };
  const { data, error } = await supabase
    .from("transactions")
    .insert(row)
    .select(COLS)
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function updateTransaction(
  id: string,
  patch: Partial<NewTransaction>
): Promise<void> {
  const supabase = createClient();
  const p: Record<string, unknown> = { ...patch };
  if (patch.merchant !== undefined && patch.merchant_norm === undefined) {
    p.merchant_norm = normalizeMerchant(patch.merchant);
  }
  const { error } = await supabase.from("transactions").update(p).eq("id", id);
  if (error) throw error;
}

export async function setReviewed(id: string, reviewed: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("transactions")
    .update({ reviewed })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

/** All transactions on/after a date (for recurring detection). */
export async function listTransactionsSince(
  startISO: string
): Promise<Transaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(COLS)
    .gte("occurred_at", startISO)
    .order("occurred_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function listAllTransactions(): Promise<Transaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(COLS)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Transaction[];
}
