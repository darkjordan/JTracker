"use client";

import { useState } from "react";
import { parseQuickEntry } from "@/lib/parse-entry";
import { createTransaction } from "@/lib/api/transactions";
import { formatRM } from "@/lib/money";
import type { Transaction } from "@/lib/api/types";

// The everyday path: type "nasi lemak 8.50" and hit Add. Parses locally — no AI.
export default function QuickEntry({
  onAdded,
}: {
  onAdded: (t: Transaction) => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseQuickEntry(value);

  async function add() {
    const p = parseQuickEntry(value);
    if (!p) {
      setError("Add an amount, e.g. “nasi lemak 8.50”.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const t = await createTransaction({
        type: p.type,
        amount_sen: p.amountSen,
        merchant: p.merchant || (p.type === "income" ? "Income" : "Expense"),
        merchant_norm: p.merchantNorm,
        source: "text",
      });
      setValue("");
      onAdded(t);
    } catch {
      setError("Couldn’t save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="nasi lemak 8.50"
          className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="button"
          onClick={add}
          disabled={busy || !parsed}
          className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? "…" : "Add"}
        </button>
      </div>
      {parsed ? (
        <p className="mt-1.5 px-1 text-xs text-gray-500">
          {parsed.type === "income" ? "＋ Income" : "－ Expense"} ·{" "}
          <span className="font-medium text-gray-700">
            {formatRM(parsed.amountSen)}
          </span>
          {parsed.merchant && ` · ${parsed.merchant}`}
        </p>
      ) : error ? (
        <p className="mt-1.5 px-1 text-xs text-red-600">{error}</p>
      ) : (
        <p className="mt-1.5 px-1 text-xs text-gray-400">
          Tip: add “income” for money in — “salary 5200 income”.
        </p>
      )}
    </div>
  );
}
