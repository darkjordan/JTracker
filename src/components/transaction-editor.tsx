"use client";

import { useState } from "react";
import { normalizeMerchant } from "@/lib/money";
import {
  updateTransaction,
  deleteTransaction,
} from "@/lib/api/transactions";
import { rememberMerchant } from "@/lib/api/merchant-memory";
import AmountInput from "@/components/amount-input";
import { useI18n } from "@/lib/i18n-client";
import type { Goal } from "@/lib/goals";
import type { Category, Transaction, TxType } from "@/lib/api/types";
import type { ReliefRow } from "@/lib/relief";

// Bottom-sheet editor for a single transaction: category + tax-relief tagging.
export default function TransactionEditor({
  txn,
  categories,
  reliefs,
  goals,
  onClose,
  onChanged,
  onDeleted,
}: {
  txn: Transaction;
  categories: Category[];
  reliefs: ReliefRow[];
  goals: Goal[];
  onClose: () => void;
  onChanged: () => void;
  onDeleted: (id: string) => void;
}) {
  const [type, setType] = useState<TxType>(txn.type);
  const [amountSen, setAmountSen] = useState(txn.amount_sen);
  const [merchant, setMerchant] = useState(txn.merchant);
  const [categoryId, setCategoryId] = useState<string>(txn.category_id ?? "");
  const [reliefCode, setReliefCode] = useState<string>(txn.tax_relief_code ?? "");
  const [goalId, setGoalId] = useState<string>(txn.goal_id ?? "");
  const [date, setDate] = useState(txn.occurred_at);
  const [note, setNote] = useState(txn.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const options = categories.filter((c) => c.type === type || c.type === "both");

  async function save() {
    if (amountSen <= 0) {
      setError(t("txn.invalidAmount"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const relief = type === "expense" ? reliefCode || null : null;
      await updateTransaction(txn.id, {
        type,
        amount_sen: amountSen,
        merchant,
        category_id: categoryId || null,
        tax_relief_code: relief,
        goal_id: type === "income" ? goalId || null : null,
        occurred_at: date,
        note: note.trim() || null,
      });
      // Confirming a category/relief teaches merchant memory (R3).
      if (categoryId || relief) {
        await rememberMerchant(normalizeMerchant(merchant), categoryId || null, relief);
      }
      onChanged();
      onClose();
    } catch {
      setError(t("txn.saveFailed"));
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
      setError(t("txn.deleteFailed"));
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
          {(["expense", "income"] as TxType[]).map((ty) => (
            <button
              key={ty}
              type="button"
              onClick={() => setType(ty)}
              className={`rounded-xl py-2 text-sm font-semibold ${
                type === ty
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {t(ty === "expense" ? "txn.expense" : "txn.income")}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-xs text-gray-500">{t("txn.amountRM")}</label>
        <AmountInput
          sen={amountSen}
          onChangeSen={setAmountSen}
          ariaLabel={t("txn.amountRM")}
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600"
        />

        <label className="mt-3 block text-xs text-gray-500">{t("txn.merchant")}</label>
        <input
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600"
        />

        <label className="mt-3 block text-xs text-gray-500">{t("txn.category")}</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base outline-none focus:border-indigo-600"
        >
          <option value="">{t("entry.uncategorized")}</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ""}
              {c.name}
            </option>
          ))}
        </select>

        {type === "income" && goals.length > 0 && (
          <>
            <label className="mt-3 block text-xs text-gray-500">
              {t("goals.tagToGoal")}
            </label>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base outline-none focus:border-indigo-600"
            >
              <option value="">{t("goals.noGoal")}</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.name}
                </option>
              ))}
            </select>
          </>
        )}

        {type === "expense" && reliefs.length > 0 && (
          <>
            <label className="mt-3 block text-xs text-gray-500">
              {t("txn.taxRelief")}
            </label>
            <select
              value={reliefCode}
              onChange={(e) => setReliefCode(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base outline-none focus:border-indigo-600"
            >
              <option value="">{t("txn.none")}</option>
              {reliefs.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </>
        )}

        <label className="mt-3 block text-xs text-gray-500">{t("txn.date")}</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600"
        />

        <label className="mt-3 block text-xs text-gray-500">{t("txn.note")}</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("txn.optional")}
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
            {t("delete")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
