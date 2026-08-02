"use client";

import { useState } from "react";
import { parseAmountToSen, formatSen, normalizeMerchant } from "@/lib/money";
import { createTransaction } from "@/lib/api/transactions";
import type { Transaction, TxType } from "@/lib/api/types";

// Structured quick-add: pick Expense/Income, enter the amount on the number
// keypad, add an optional description. No keyword parsing needed.
export default function QuickEntry({
  onAdded,
}: {
  onAdded: (t: Transaction) => void;
}) {
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountSen = parseAmountToSen(amount);
  const isIncome = type === "income";

  // Keep the amount field to digits + a single 2-dp decimal.
  function onAmountChange(v: string) {
    let cleaned = v.replace(/[^0-9.]/g, "");
    const dot = cleaned.indexOf(".");
    if (dot !== -1) {
      const intPart = cleaned.slice(0, dot);
      const dec = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
      cleaned = `${intPart}.${dec}`;
    }
    setAmount(cleaned);
    if (error) setError(null);
  }

  async function add() {
    const sen = parseAmountToSen(amount);
    if (sen === null || sen <= 0) {
      setError("Enter an amount.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const t = await createTransaction({
        type,
        amount_sen: sen,
        merchant: merchant.trim() || (isIncome ? "Income" : "Expense"),
        merchant_norm: normalizeMerchant(merchant),
        source: "manual",
      });
      setAmount("");
      setMerchant("");
      onAdded(t);
    } catch {
      setError("Couldn’t save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType("expense")}
          className={`rounded-xl py-2.5 text-sm font-semibold ${
            !isIncome ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          − Expense
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className={`rounded-xl py-2.5 text-sm font-semibold ${
            isIncome ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          + Income
        </button>
      </div>

      {/* Amount — opens the number keypad on phones */}
      <div className="mt-3 flex items-center rounded-xl border border-gray-300 px-3 focus-within:border-indigo-600">

        <span className="mr-1.5 text-lg font-semibold text-gray-400">RM</span>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="0.00"
          aria-label="Amount"
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
        className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600"
      />

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
