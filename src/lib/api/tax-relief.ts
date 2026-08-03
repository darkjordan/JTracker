import { createClient } from "@/lib/supabase/client";
import type { ReliefRow } from "@/lib/relief";

/** Relief categories for a year with the effective cap (user override ?? LHDN default). */
export async function listReliefs(year: number): Promise<ReliefRow[]> {
  const supabase = createClient();
  const [{ data: defs }, { data: overrides }] = await Promise.all([
    supabase
      .from("tax_relief_categories")
      .select("code, name_en, annual_cap_sen, notes")
      .eq("year", year)
      .order("name_en"),
    supabase.from("relief_settings").select("code, annual_cap_sen").eq("year", year),
  ]);
  const ov = new Map(
    ((overrides ?? []) as { code: string; annual_cap_sen: number | null }[]).map(
      (o) => [o.code, o.annual_cap_sen]
    )
  );
  return (
    (defs ?? []) as {
      code: string;
      name_en: string;
      annual_cap_sen: number | null;
      notes: string | null;
    }[]
  ).map((d) => ({
    code: d.code,
    name: d.name_en,
    capSen: ov.has(d.code) ? ov.get(d.code)! : d.annual_cap_sen,
    notes: d.notes,
  }));
}

/** Override a cap for a code/year; passing null reverts to the LHDN default. */
export async function setReliefCap(
  code: string,
  year: number,
  capSen: number | null
): Promise<void> {
  const supabase = createClient();
  if (capSen === null) {
    await supabase
      .from("relief_settings")
      .delete()
      .eq("code", code)
      .eq("year", year);
    return;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("relief_settings").upsert(
    {
      user_id: user.id,
      code,
      year,
      annual_cap_sen: capSen,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,code,year" }
  );
}

export type ReliefTxn = {
  tax_relief_code: string | null;
  amount_sen: number;
  type: string;
  occurred_at: string;
  merchant: string;
};

/** All relief-tagged transactions in a year (for progress + the report). */
export async function listReliefTxnsForYear(year: number): Promise<ReliefTxn[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("transactions")
    .select("tax_relief_code, amount_sen, type, occurred_at, merchant")
    .gte("occurred_at", `${year}-01-01`)
    .lt("occurred_at", `${year + 1}-01-01`)
    .not("tax_relief_code", "is", null)
    .order("occurred_at", { ascending: true });
  return (data ?? []) as ReliefTxn[];
}
