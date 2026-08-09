"use client";

import { useMemo, useState } from "react";
import { formatSen, normalizeMerchant } from "@/lib/money";
import { createTransaction, todayLocal } from "@/lib/api/transactions";
import { findOrCreateCategory } from "@/lib/api/categories";
import { enqueue } from "@/lib/offline-queue";
import AmountInput from "@/components/amount-input";
import { useI18n } from "@/lib/i18n-client";
import type { Category, Transaction, TxType } from "@/lib/api/types";

const OTHER = "__other__";

// Structured quick-add: Expense/Income toggle, numeric amount, description,
// category (or "Other…" free text), and a date that defaults to today but can
// be back-dated.
export default function QuickEntry({
  categories,
  onAdded,
  onCategoryCreated,
  onQueuedOffline,
}: {
  categories: Category[];
  onAdded: (t: Transaction) => void;
  onCategoryCreated?: () => void;
  onQueuedOffline?: () => void;
}) {
  const [type, setType] = useState<TxType>("expense");
  const [amountSen, setAmountSen] = useState(0);
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [customCat, setCustomCat] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

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
      setError(t("entry.enterAmount"));
      return;
    }
    setError(null);
    setBusy(true);

    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    // Creating a new category needs the network to resolve/insert it — not
    // something the offline queue can defer, so that combination is the one
    // offline path we don't support.
    if (offline && categoryId === OTHER) {
      setError(t("entry.offlineNewCategory"));
      setBusy(false);
      return;
    }

    try {
      let category_id: string | null = null;
      let created = false;
      if (categoryId === OTHER) {
        const name = customCat.trim();
        if (!name) {
          setError(t("entry.nameNewCategory"));
          setBusy(false);
          return;
        }
        const cat = await findOrCreateCategory(name, type);
        category_id = cat.id;
        created = true;
      } else if (categoryId) {
        category_id = categoryId;
      }

      const payload = {
        type,
        amount_sen: sen,
        merchant: merchant.trim() || (isIncome ? "Income" : "Expense"),
        merchant_norm: normalizeMerchant(merchant),
        category_id,
        occurred_at: date,
        source: "manual" as const,
      };

      let txn: Transaction;
      try {
        if (offline) throw new Error("offline");
        txn = await createTransaction(payload);
      } catch {
        // Either genuinely offline, or the request itself failed (also
        // treated as offline — a spotty connection looks the same to the
        // user either way). Queue it and show it optimistically; the real
        // row lands once drainQueue() syncs it.
        await enqueue(payload);
        txn = {
          id: `offline-${crypto.randomUUID()}`,
          user_id: "",
          currency: "MYR",
          tax_relief_code: null,
          note: null,
          reviewed: false,
          created_at: new Date().toISOString(),
          ...payload,
        };
        onQueuedOffline?.();
      }

      setAmountSen(0);
      setMerchant("");
      setCategoryId("");
      setCustomCat("");
      setDate(todayLocal());
      onAdded(txn);
      if (created) onCategoryCreated?.();
    } catch {
      setError(t("entry.saveFailed"));
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
          {t("entry.expense")}
        </button>
        <button
          type="button"
          onClick={() => switchType("income")}
          className={`rounded-xl py-2.5 text-sm font-semibold ${
            isIncome ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          {t("entry.income")}
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
          ariaLabel={t("entry.amountLabel")}
          className="w-full bg-transparent py-2.5 text-2xl font-bold tabular-nums outline-none placeholder:text-gray-300"
        />
      </div>

      {/* Description */}
      <input
        type="text"
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        placeholder={t("entry.description")}
        aria-label={t("entry.descriptionLabel")}
        className={`mt-2 w-full ${field}`}
      />

      {/* Category + Date */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label={t("entry.categoryLabel")}
          className={`w-full bg-white ${field}`}
        >
          <option value="">{t("entry.uncategorized")}</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ""}
              {c.name}
            </option>
          ))}
          <option value={OTHER}>{t("entry.otherCategory")}</option>
        </select>
        <input
          type="date"
          value={date}
          max={todayLocal()}
          onChange={(e) => setDate(e.target.value)}
          aria-label={t("entry.dateLabel")}
          className={`w-full ${field}`}
        />
      </div>

      {categoryId === OTHER && (
        <input
          type="text"
          value={customCat}
          onChange={(e) => setCustomCat(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={t("entry.newCategoryName")}
          aria-label={t("entry.newCategoryName")}
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
          ? t("entry.adding")
          : amountSen
            ? t(isIncome ? "entry.addIncomeAmount" : "entry.addExpenseAmount", {
                amount: formatSen(amountSen),
              })
            : t("entry.add")}
      </button>
    </div>
  );
}
