"use client";

import { useMemo, useState } from "react";
import { formatSen, normalizeMerchant } from "@/lib/money";
import { createTransaction, todayLocal } from "@/lib/api/transactions";
import { findOrCreateCategory } from "@/lib/api/categories";
import AmountInput from "@/components/amount-input";
import type { Category, Transaction, TxType } from "@/lib/api/types";

const OTHER = "__other__";

// Structured quick-add: Expense/Income toggle, numeric amount, description,
// category (or "Other…" free text), and a date that defaults to today but can
// be back-dated.
export default function QuickEntry({
  categories,
  onAdded,
  onCategoryCreated,
}: {
  categories: Category[];
  onAdded: (t: Transaction) => void;
  onCategoryCreated?: () => void;
}) {
  const [type, setType] = useState<TxType>("expense");
  const [amountSen, setAmountSen] = useState(0);
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [customCat, setCustomCat] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIncome = type === "income";

  const options = useMemo(
    () => categories.filter((c) => c.type === type || c.type === "both"),
    [categories, type]
  );

  function switchType(t: TxType) {
    setType(t);
    setCategoryId("");
    setCustomCat("");
  }

  function onAmountChange(v: number) {
    setAmountSen(v);
    if (error) setError(null);
  }

  async function add() {
    const sen = amountSen;
    if (sen <= 0) {
      setError("Enter an amount.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      let category_id: string | null = null;
      let created = false;
      if (categoryId === OTHER) {
        const name = customCat.trim();
        if (!name) {
          setError("Name the new category, or pick one.");
          setBusy(false);
          return;
        }
        const cat = await findOrCreateCategory(name, type);
        category_id = cat.id;
        created = true;
      } else if (categoryId) {
        category_id = categoryId;
      }

      const t = await createTransaction({
        type,
        amount_sen: sen,
        merchant: merchant.trim() || (isIncome ? "Income" : "Expense"),
        merchant_norm: normalizeMerchant(merchant),
        category_id,
        occurred_at: date,
        source: "manual",
      });

      setAmountSen(0);
      setMerchant("");
      setCategoryId("");
      setCustomCat("");
      setDate(todayLocal());
      onAdded(t);
      if (created) onCategoryCreated?.();
    } catch {
      setError("Couldn’t save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600";

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => switchType("expense")}
          className={`rounded-xl py-2.5 text-sm font-semibold ${
            !isIncome ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          − Expense
        </button>
        <button
          type="button"
          onClick={() => switchType("income")}
          className={`rounded-xl py-2.5 text-sm font-semibold ${
            isIncome ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          + Income
        </button>
      </div>

      {/* Amount — opens the number keypad on phones. Type digits only:
          the last two are cents, e.g. 1005 → RM10.05. */}
      <div className="mt-3 flex items-center rounded-xl border border-gray-300 px-3 focus-within:border-indigo-600">
        <span className="mr-1.5 text-lg font-semibold text-gray-400">RM</span>
        <AmountInput
          sen={amountSen}
          onChangeSen={onAmountChange}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="w-full bg-transparent py-2.5 text-2xl font-bold tabular-nums outline-none placeholder:text-gray-300"
        />
      </div>

      {/* Description */}
      <input
        type="text"
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        placeholder="What for? (e.g. Nasi Lemak)"
        aria-label="Description"
        className={`mt-2 w-full ${field}`}
      />

      {/* Category + Date */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Category"
          className={`w-full bg-white ${field}`}
        >
          <option value="">Uncategorized</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ""}
              {c.name}
            </option>
          ))}
          <option value={OTHER}>＋ Other…</option>
        </select>
        <input
          type="date"
          value={date}
          max={todayLocal()}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Date"
          className={`w-full ${field}`}
        />
      </div>

      {categoryId === OTHER && (
        <input
          type="text"
          value={customCat}
          onChange={(e) => setCustomCat(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="New category name"
          aria-label="New category name"
          className={`mt-2 w-full ${field}`}
          autoFocus
        />
      )}

      {error && <p className="mt-2 px-1 text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={add}
        disabled={busy}
        className={`mt-3 w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 ${
          isIncome ? "bg-emerald-600" : "bg-indigo-600"
        }`}
      >
        {busy
          ? "Adding…"
          : amountSen
            ? `Add ${formatSen(amountSen)} ${isIncome ? "income" : "expense"}`
            : "Add"}
      </button>
    </div>
  );
}
