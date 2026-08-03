import { createClient } from "@/lib/supabase/client";
import type { NewTransaction } from "./types";

export type ImportRow = {
  id: string;
  created_at: string;
  txn_count: number;
  file_path: string | null;
  statement_start: string | null;
  statement_end: string | null;
};

/** Recent statement imports (for the rollback list in Settings). */
export async function listImports(): Promise<ImportRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("imports")
    .select("id, created_at, txn_count, file_path, statement_start, statement_end")
    .order("created_at", { ascending: false });
  return (data ?? []) as ImportRow[];
}

/** Upload a statement PDF to the private bucket under <user_id>/<uuid>.pdf. */
export async function uploadStatement(file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("no-session");
  const path = `${user.id}/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage
    .from("statements")
    .upload(path, file, { contentType: "application/pdf", upsert: false });
  if (error) throw error;
  return path;
}

/** Which of these dedupe hashes are already in the user's transactions. */
export async function existingHashes(hashes: string[]): Promise<Set<string>> {
  if (hashes.length === 0) return new Set();
  const supabase = createClient();
  const { data } = await supabase
    .from("transactions")
    .select("dedupe_hash")
    .in("dedupe_hash", hashes);
  return new Set(
    ((data ?? []) as { dedupe_hash: string | null }[])
      .map((r) => r.dedupe_hash)
      .filter((h): h is string => !!h)
  );
}

export type ImportMeta = {
  filePath: string | null;
  statement_start?: string | null;
  statement_end?: string | null;
  opening_sen?: number | null;
  closing_sen?: number | null;
};
export type CommitRow = NewTransaction & { dedupe_hash: string };

/** Create the import record and insert its rows in one go (rolls back on error). */
export async function commitImport(
  meta: ImportMeta,
  rows: CommitRow[]
): Promise<{ id: string; inserted: number }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("no-session");

  const { data: imp, error: impErr } = await supabase
    .from("imports")
    .insert({
      user_id: user.id,
      kind: "pdf",
      status: "committed",
      file_path: meta.filePath,
      txn_count: rows.length,
      statement_start: meta.statement_start || null,
      statement_end: meta.statement_end || null,
      opening_sen: meta.opening_sen ?? null,
      closing_sen: meta.closing_sen ?? null,
    })
    .select("id")
    .single();
  if (impErr || !imp) throw impErr ?? new Error("import-failed");

  if (rows.length) {
    const payload = rows.map((r) => ({
      user_id: user.id,
      type: r.type,
      amount_sen: r.amount_sen,
      merchant: r.merchant,
      merchant_norm: r.merchant_norm,
      category_id: r.category_id ?? null,
      occurred_at: r.occurred_at,
      source: "pdf",
      import_id: imp.id,
      dedupe_hash: r.dedupe_hash,
    }));
    const { error: txErr } = await supabase.from("transactions").insert(payload);
    if (txErr) {
      await supabase.from("imports").delete().eq("id", imp.id); // rollback
      throw txErr;
    }
  }
  return { id: imp.id, inserted: rows.length };
}

/** Undo an import: delete the record (cascades its transactions) + the file. */
export async function rollbackImport(
  id: string,
  filePath: string | null
): Promise<void> {
  const supabase = createClient();
  await supabase.from("imports").delete().eq("id", id);
  if (filePath) await supabase.storage.from("statements").remove([filePath]);
}
