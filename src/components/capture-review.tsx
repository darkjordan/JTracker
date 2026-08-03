"use client";

import { useEffect, useMemo, useState } from "react";
import { parseAmountToSen, normalizeMerchant } from "@/lib/money";
import { createTransaction, todayLocal } from "@/lib/api/transactions";
import { getMerchantMemory, rememberMerchant } from "@/lib/api/merchant-memory";
import type { Category, TxType } from "@/lib/api/types";
import type { ParsedCapture } from "@/lib/capture";
import type { ReliefRow } from "@/lib/relief";

// Review-before-save sheet for a scanned screenshot (SPEC decision #3).
export default function CaptureReview({
  parsed,
  categories,
  reliefs,
  onClose,
  onSaved,
}: {
  parsed: ParsedCapture;
  categories: Category[];
  reliefs: ReliefRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const merchantNorm = useMemo(
    () => normalizeMerchant(parsed.merchant),
    [parsed.merchant]
  );

  const [type, setType] = useState<TxType>(parsed.type ?? "expense");
  const [amount, setAmount] = useState(
    parsed.amount ? parsed.amount.toFixed(2) : ""
  );
  const [merchant, setMerchant] = useState(parsed.merchant ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [reliefCode, setReliefCode] = useState("");
  const [date, setDate] = useState(parsed.date || todayLocal());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromMemory, setFromMemory] = useState(false);

  const options = categories.filter((c) => c.type === type || c.type === "both");

  // Resolve the initial category: merchant_memory wins; else match the AI's
  // suggested_category name to a real category.
  useEffect(() => {
    (async () => {
      const remembered = await getMerchantMemory(merchantNorm);
      if (remembered?.tax_relief_code) setReliefCode(remembered.tax_relief_code);
      if (remembered?.category_id) {
        setFromMemory(true);
        setCategoryId(remembered.category_id);
        return;
      }
      const suggestion = parsed.suggested_category?.trim().toLowerCase();
      if (suggestion) {
        const match = categories.find(
          (c) => c.name.toLowerCase() === suggestion
        );
        if (match) setCategoryId(match.id);
      }
    })();
  }, [merchantNorm, parsed.suggested_category, categories]);

  async function save() {
    const sen = parseAmountToSen(amount);
    if (sen === null || sen <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const relief = type === "expense" ? reliefCode || null : null;
      await createTransaction({
        type,
        amount_sen: sen,
        merchant: merchant.trim() || (type === "income" ? "Income" : "Expense"),
        merchant_norm: merchantNorm,
        category_id: categoryId || null,
        tax_relief_code: relief,
        occurred_at: date,
        source: "screenshot",
      });
      await rememberMerchant(merchantNorm, categoryId || null, relief);
      onSaved();
      onClose();
    } catch {
      setError("Couldn’t save. Try again.");
      setBusy(false);
    }
  }

  const field =
    "mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Review scan</h2>
          <span className="text-xs text-gray-400">Check, then save</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(["expense", "income"] as TxType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-xl py-2 text-sm font-semibold capitalize ${
                type === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-xs text-gray-500">Amount (RM)</label>
        <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />

        <label className="mt-3 block text-xs text-gray-500">Merchant</label>
        <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} className={field} />

        <label className="mt-3 block text-xs text-gray-500">
          Category {fromMemory && <span className="text-indigo-600">· remembered</span>}
        </label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${field} bg-white`}>
          <option value="">Uncategorized</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ""}
              {c.name}
            </option>
          ))}
        </select>

        {type === "expense" && reliefs.length > 0 && (
          <>
            <label className="mt-3 block text-xs text-gray-500">Tax relief (LHDN)</label>
            <select value={reliefCode} onChange={(e) => setReliefCode(e.target.value)} className={`${field} bg-white`}>
              <option value="">None</option>
              {reliefs.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </>
        )}

        <label className="mt-3 block text-xs text-gray-500">Date</label>
        <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} className={field} />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={busy} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Saving…" : "Save transaction"}
          </button>
        </div>
      </div>
    </div>
  );
}
