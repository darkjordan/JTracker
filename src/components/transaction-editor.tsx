"use client";

import { useState } from "react";
import { parseAmountToSen, formatSen } from "@/lib/money";
import {
  updateTransaction,
  deleteTransaction,
} from "@/lib/api/transactions";
import type { Category, Transaction, TxType } from "@/lib/api/types";

// Bottom-sheet editor for a single transaction. Category tagging here; tax-relief
// tagging is added in Phase 5.
export default function TransactionEditor({
  txn,
  categories,
  onClose,
  onChanged,
  onDeleted,
}: {
  txn: Transaction;
  categories: Category[];
  onClose: () => void;
  onChanged: () => void;
  onDeleted: (id: string) => void;
}) {
  const [type, setType] = useState<TxType>(txn.type);
  const [amount, setAmount] = useState(formatSen(txn.amount_sen));
  const [merchant, setMerchant] = useState(txn.merchant);
  const [categoryId, setCategoryId] = useState<string>(txn.category_id ?? "");
  const [date, setDate] = useState(txn.occurred_at);
  const [note, setNote] = useState(txn.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = categories.filter((c) => c.type === type || c.type === "both");

  async function save() {
    const amountSen = parseAmountToSen(amount);
    if (amountSen === null || amountSen <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateTransaction(txn.id, {
        type,
        amount_sen: amountSen,
        merchant,
        category_id: categoryId || null,
        occurred_at: date,
        note: note.trim() || null,
      });
      onChanged();
      onClose();
    } catch {
      setError("Couldn’t save. Try again.");
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteTransaction(txn.id);
      onDeleted(txn.id);
      onClose();
    } catch {
      setError("Couldn’t delete. Try again.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />

        <div className="grid grid-cols-2 gap-2">
          {(["expense", "income"] as TxType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-xl py-2 text-sm font-semibold capitalize ${
                type === t
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-xs text-gray-500">Amount (RM)</label>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600"
        />

        <label className="mt-3 block text-xs text-gray-500">Merchant</label>
        <input
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600"
        />

        <label className="mt-3 block text-xs text-gray-500">Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base outline-none focus:border-indigo-600"
        >
          <option value="">Uncategorized</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ""}
              {c.name}
            </option>
          ))}
        </select>

        <label className="mt-3 block text-xs text-gray-500">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600"
        />

        <label className="mt-3 block text-xs text-gray-500">Note</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="optional"
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600"
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
