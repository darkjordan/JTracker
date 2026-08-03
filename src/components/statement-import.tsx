"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatSen, formatRM, normalizeMerchant } from "@/lib/money";
import { todayLocal } from "@/lib/api/transactions";
import { parseStatement } from "@/lib/capture";
import { dedupeHash } from "@/lib/dedupe";
import {
  uploadStatement,
  existingHashes,
  commitImport,
} from "@/lib/api/imports";
import { getMerchantMemories, rememberMerchant } from "@/lib/api/merchant-memory";
import type { Category, TxType } from "@/lib/api/types";

type Row = {
  key: number;
  checked: boolean;
  dup: boolean;
  type: TxType;
  amountSen: number;
  merchant: string;
  merchantNorm: string;
  occurred_at: string;
  categoryId: string;
  dedupe_hash: string;
};
type Meta = {
  start: string | null;
  end: string | null;
  openingSen: number | null;
  closingSen: number | null;
};

const ACK_KEY = "jtracker:pdfPrivacyAck";
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export default function StatementImport({
  categories,
  onCommitted,
}: {
  categories: Category[];
  onCommitted: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "privacy" | "parsing" | "review">("idle");
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  const catName = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  function start() {
    setError(null);
    if (localStorage.getItem(ACK_KEY) === "1") inputRef.current?.click();
    else setPhase("privacy");
  }
  function proceed() {
    if (dontShow) localStorage.setItem(ACK_KEY, "1");
    setPhase("idle");
    inputRef.current?.click();
  }
  function reset() {
    setPhase("idle");
    setRows([]);
    setMeta(null);
    setFile(null);
    setCommitting(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError(null);
    setFile(f);
    setPhase("parsing");
    const res = await parseStatement(f);
    if (!res.ok) {
      setError(res.error);
      setPhase("idle");
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const uid = user?.id ?? "";
    const p = res.data;
    const end = p.statement_end && isDate(p.statement_end) ? p.statement_end : null;

    const norms = p.rows.map((r) => normalizeMerchant(r.description));
    const mem = await getMerchantMemories(norms);

    const built: Row[] = [];
    for (let i = 0; i < p.rows.length; i++) {
      const r = p.rows[i];
      const amountSen = Math.round((r.amount || 0) * 100);
      const occurred = isDate(r.date) ? r.date : end || todayLocal();
      const norm = norms[i];
      const hash = await dedupeHash(uid, occurred, amountSen, norm);
      built.push({
        key: i,
        checked: true,
        dup: false,
        type: r.direction === "credit" ? "income" : "expense",
        amountSen,
        merchant: r.description || "(no description)",
        merchantNorm: norm,
        occurred_at: occurred,
        categoryId: mem.get(norm)?.category_id ?? "",
        dedupe_hash: hash,
      });
    }
    const existing = await existingHashes(built.map((b) => b.dedupe_hash));
    for (const b of built)
      if (existing.has(b.dedupe_hash)) {
        b.dup = true;
        b.checked = false;
      }

    setRows(built);
    setMeta({
      start: p.statement_start && isDate(p.statement_start) ? p.statement_start : null,
      end,
      openingSen: p.opening_balance ? Math.round(p.opening_balance * 100) : null,
      closingSen: p.closing_balance ? Math.round(p.closing_balance * 100) : null,
    });
    setPhase("review");
  }

  const recon = useMemo(() => {
    if (!meta || meta.openingSen === null || meta.closingSen === null) return null;
    let credit = 0;
    let debit = 0;
    for (const r of rows) {
      if (r.type === "income") credit += r.amountSen;
      else debit += r.amountSen;
    }
    const computed = meta.openingSen + credit - debit;
    return { ok: Math.abs(computed - meta.closingSen) <= 10, computed };
  }, [rows, meta]);

  const newCount = rows.filter((r) => r.checked && !r.dup).length;
  const dupCount = rows.filter((r) => r.dup).length;

  async function commit() {
    setCommitting(true);
    setError(null);
    try {
      const selected = rows.filter((r) => r.checked && !r.dup);
      let filePath: string | null = null;
      try {
        if (file) filePath = await uploadStatement(file);
      } catch {
        /* file storage is best-effort */
      }
      await commitImport(
        {
          filePath,
          statement_start: meta?.start ?? null,
          statement_end: meta?.end ?? null,
          opening_sen: meta?.openingSen ?? null,
          closing_sen: meta?.closingSen ?? null,
        },
        selected.map((r) => ({
          type: r.type,
          amount_sen: r.amountSen,
          merchant: r.merchant,
          merchant_norm: r.merchantNorm,
          category_id: r.categoryId || null,
          occurred_at: r.occurred_at,
          dedupe_hash: r.dedupe_hash,
        }))
      );
      await Promise.all(
        selected
          .filter((r) => r.categoryId)
          .map((r) => rememberMerchant(r.merchantNorm, r.categoryId, null))
      );
      onCommitted();
      reset();
    } catch {
      setError("Couldn’t import. Try again.");
      setCommitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-700 active:scale-[0.99]"
      >
        📄 Import bank statement (PDF)
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={onFile}
        className="hidden"
      />
      {error && <p className="mt-1 px-1 text-xs text-red-600">{error}</p>}

      {/* Privacy notice */}
      {phase === "privacy" && (
        <Sheet onClose={() => setPhase("idle")}>
          <h2 className="text-base font-semibold text-gray-900">Before you upload</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your statement is sent to Google Gemini (free tier) to read the
            transactions — Google may use free-tier data to improve its products.
            Consider cropping or hiding your account number first.
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
            Don’t show this again
          </label>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setPhase("idle")} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-600">
              Cancel
            </button>
            <button type="button" onClick={proceed} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white">
              Choose PDF
            </button>
          </div>
        </Sheet>
      )}

      {/* Parsing */}
      {phase === "parsing" && (
        <Sheet onClose={() => {}}>
          <p className="py-6 text-center text-sm text-gray-600">
            Reading your statement… this takes ~15s.
          </p>
        </Sheet>
      )}

      {/* Review */}
      {phase === "review" && meta && (
        <Sheet onClose={reset} tall>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Review import</h2>
            <span className="text-xs text-gray-500">
              {newCount} new{dupCount ? ` · ${dupCount} already imported` : ""}
            </span>
          </div>

          {recon && !recon.ok && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ Balances don’t reconcile ({formatRM(recon.computed)} vs closing{" "}
              {formatRM(meta.closingSen ?? 0)}). Some rows may be misread — check before saving.
            </p>
          )}

          <ul className="mt-3 max-h-[52vh] divide-y divide-gray-100 overflow-y-auto">
            {rows.map((r, i) => (
              <li
                key={r.key}
                className={`flex items-center gap-2 py-2 ${r.dup ? "opacity-40" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={r.checked}
                  disabled={r.dup}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, checked: e.target.checked } : x))
                    )
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{r.merchant}</p>
                  <p className="text-xs text-gray-400">
                    {r.occurred_at}
                    {r.dup && " · already imported"}
                  </p>
                  {!r.dup && (
                    <select
                      value={r.categoryId}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, categoryId: e.target.value } : x))
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none"
                    >
                      <option value="">Uncategorized</option>
                      {categories
                        .filter((c) => c.type === r.type || c.type === "both")
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.icon ? `${c.icon} ` : ""}
                            {c.name}
                          </option>
                        ))}
                    </select>
                  )}
                  {r.dup && r.categoryId && (
                    <p className="text-xs text-gray-400">
                      {catName.get(r.categoryId)?.name}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    r.type === "income" ? "text-emerald-600" : "text-gray-900"
                  }`}
                >
                  {r.type === "income" ? "+" : "−"}
                  {formatSen(r.amountSen)}
                </span>
              </li>
            ))}
          </ul>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={reset} disabled={committing} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={commit}
              disabled={committing || newCount === 0}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {committing ? "Importing…" : `Import ${newCount} transaction${newCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}

function Sheet({
  children,
  onClose,
  tall,
}: {
  children: React.ReactNode;
  onClose: () => void;
  tall?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 ${tall ? "max-h-[88vh]" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
        {children}
      </div>
    </div>
  );
}
