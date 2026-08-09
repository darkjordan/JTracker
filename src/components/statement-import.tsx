"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatSen, formatRM, normalizeMerchant } from "@/lib/money";
import { todayLocal } from "@/lib/api/transactions";
import { emptyStatementReason, parseStatement } from "@/lib/capture";
import { dedupeHash, repeatKey } from "@/lib/dedupe";
import { reconcile } from "@/lib/reconcile";
import { matchCategoryId } from "@/lib/category-match";
import {
  uploadStatement,
  existingHashes,
  commitImport,
} from "@/lib/api/imports";
import { getMerchantMemories, rememberMerchant } from "@/lib/api/merchant-memory";
import { useI18n } from "@/lib/i18n-client";
import type { TFn } from "@/lib/i18n";
import type { Category, TxType } from "@/lib/api/types";

type Row = {
  key: number;
  checked: boolean;
  dup: boolean;
  /** Only ever "existing" — a repeat within one statement is a real second row. */
  dupReason: "existing" | null;
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

/** Turn a PostgREST failure into something the user can act on. */
export function commitErrorMessage(e: unknown, t: TFn): string {
  const err = e as { message?: string; code?: string } | null;
  const code = err?.code;
  const msg = err?.message ?? "";
  if (code === "23505" || /duplicate key/i.test(msg))
    return t("import.dupSavedRepeat");
  if (code === "23514" || /violates check constraint/i.test(msg))
    return t("import.zeroInvalid");
  if (code === "42501" || /row-level security/i.test(msg))
    return t("import.sessionExpired");
  return msg ? t("import.genericErrorWithMsg", { msg }) : t("import.genericError");
}

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
  const [skipped, setSkipped] = useState(0);
  const { t } = useI18n();

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
    setSkipped(0);
    setCommitting(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError(null);
    setFile(f);
    setPhase("parsing");
    const res = await parseStatement(f, [...new Set(categories.map((c) => c.name))]);
    if (!res.ok) {
      setError(res.error);
      setPhase("idle");
      return;
    }
    const p = res.data;
    // A schema-valid `rows: []` is the quiet failure mode — the review sheet
    // would open empty with a disabled Import button and no explanation.
    if (p.rows.length === 0) {
      setError(emptyStatementReason(res.pdf));
      setPhase("idle");
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const uid = user?.id ?? "";
    const end = p.statement_end && isDate(p.statement_end) ? p.statement_end : null;

    const norms = p.rows.map((r) => normalizeMerchant(r.description));
    const mem = await getMerchantMemories(norms);

    const built: Row[] = [];
    const occurrences = new Map<string, number>();
    let skippedZero = 0;
    for (let i = 0; i < p.rows.length; i++) {
      const r = p.rows[i];
      const amountSen = Math.round((r.amount || 0) * 100);
      // transactions.amount_sen is CHECK (amount_sen > 0). Statements carry
      // RM 0.00 lines (unused cards, reversals) — one of those would abort the
      // whole insert, so drop them here rather than at the database.
      if (!Number.isFinite(amountSen) || amountSen <= 0) {
        skippedZero++;
        continue;
      }
      const occurred = isDate(r.date) ? r.date : end || todayLocal();
      const norm = norms[i];
      // Buying the same thing twice in a day is a real second transaction, so
      // number the repeats instead of collapsing them — see dedupe.ts.
      const key = repeatKey(occurred, amountSen, norm);
      const nth = occurrences.get(key) ?? 0;
      occurrences.set(key, nth + 1);
      const hash = await dedupeHash(uid, occurred, amountSen, norm, nth);
      const type: TxType = r.direction === "credit" ? "income" : "expense";
      // Memory beats the model: a category you confirmed before is a fact,
      // the suggestion is a guess.
      const categoryId =
        mem.get(norm)?.category_id ??
        matchCategoryId(r.suggested_category, categories, type);
      built.push({
        key: i,
        checked: true,
        dup: false,
        dupReason: null,
        type,
        amountSen,
        merchant: r.description || "(no description)",
        merchantNorm: norm,
        occurred_at: occurred,
        categoryId,
        dedupe_hash: hash,
      });
    }
    const existing = await existingHashes(built.map((b) => b.dedupe_hash));
    for (const b of built)
      if (existing.has(b.dedupe_hash)) {
        b.dup = true;
        b.dupReason = "existing";
        b.checked = false;
      }

    setSkipped(skippedZero);
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
    let creditSen = 0;
    let debitSen = 0;
    for (const r of rows) {
      if (r.type === "income") creditSen += r.amountSen;
      else debitSen += r.amountSen;
    }
    return reconcile({
      openingSen: meta.openingSen,
      closingSen: meta.closingSen,
      creditSen,
      debitSen,
    });
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
    } catch (e) {
      // Never swallow this: a constraint violation here is silent otherwise,
      // and "Try again" sends the user round a loop that cannot succeed.
      setError(commitErrorMessage(e, t));
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
        {t("entry.importStatement")}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={onFile}
        className="hidden"
      />
      {error && phase === "idle" && (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <p className="flex-1 text-xs leading-relaxed text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label={t("import.dismiss")}
            className="shrink-0 text-red-400"
          >
            ✕
          </button>
        </div>
      )}

      {/* Privacy notice */}
      {phase === "privacy" && (
        <Sheet onClose={() => setPhase("idle")}>
          <h2 className="text-base font-semibold text-gray-900">{t("import.beforeUpload")}</h2>
          <p className="mt-2 text-sm text-gray-600">
            {t("import.privacyNotice")}
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
            {t("import.dontShowAgain")}
          </label>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setPhase("idle")} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-600">
              {t("cancel")}
            </button>
            <button type="button" onClick={proceed} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white">
              {t("import.choosePdf")}
            </button>
          </div>
        </Sheet>
      )}

      {/* Parsing */}
      {phase === "parsing" && (
        <Sheet onClose={() => {}}>
          <p className="py-6 text-center text-sm text-gray-600">
            {t("import.reading")}
          </p>
        </Sheet>
      )}

      {/* Review */}
      {phase === "review" && meta && (
        <Sheet onClose={reset} tall>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">{t("import.reviewTitle")}</h2>
            <span className="text-xs text-gray-500">
              {t("import.newCount", { n: newCount })}
              {dupCount ? t("import.duplicateCount", { n: dupCount }) : ""}
              {skipped ? t("import.zeroSkippedCount", { n: skipped }) : ""}
            </span>
          </div>

          {recon && !recon.ok && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {t("import.reconcileWarning", {
                computed: formatRM(recon.computedSen),
                closing: formatRM(meta.closingSen ?? 0),
              })}
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
                    {r.dupReason === "existing" && t("import.alreadyImported")}
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
                      <option value="">{t("entry.uncategorized")}</option>
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
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={commit}
              disabled={committing || newCount === 0}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {committing
                ? t("import.importing")
                : newCount === 1
                  ? t("import.importOne")
                  : t("import.importMany", { n: newCount })}
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
