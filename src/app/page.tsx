"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import QuickEntry from "@/components/quick-entry";
import TransactionEditor from "@/components/transaction-editor";
import { listCategories } from "@/lib/api/categories";
import { listRecentTransactions } from "@/lib/api/transactions";
import { formatRM, formatSen } from "@/lib/money";
import type { Category, Transaction } from "@/lib/api/types";

function isThisMonth(dateStr: string): boolean {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return dateStr.startsWith(ym);
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function Dashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [cats, list] = await Promise.all([
        listCategories(),
        listRecentTransactions(),
      ]);
      setCategories(cats);
      setTxns(list);
    } catch {
      setError("Couldn’t load your data. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Nested async closure: state updates land after `await`, not synchronously
    // in the effect body (satisfies react-hooks/set-state-in-effect).
    (async () => {
      await load();
    })();
  }, [load]);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const month = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of txns) {
      if (!isThisMonth(t.occurred_at)) continue;
      if (t.type === "income") income += t.amount_sen;
      else expense += t.amount_sen;
    }
    return { income, expense, net: income - expense };
  }, [txns]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of txns) {
      const arr = map.get(t.occurred_at) ?? [];
      arr.push(t);
      map.set(t.occurred_at, arr);
    }
    return [...map.entries()]; // query already sorts desc
  }, [txns]);

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-indigo-700">
          JTracker
        </h1>
        <Link
          href="/settings"
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Settings
        </Link>
      </header>

      {/* This-month summary */}
      <section className="mb-4 rounded-2xl bg-indigo-600 p-4 text-white shadow-sm">
        <p className="text-xs text-indigo-100">
          {new Date().toLocaleDateString("en-MY", {
            month: "long",
            year: "numeric",
          })}
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {formatRM(month.net)}
        </p>
        <p className="mt-0.5 text-xs text-indigo-100">net this month</p>
        <div className="mt-3 flex gap-4 text-sm">
          <span className="tabular-nums">＋ {formatSen(month.income)}</span>
          <span className="tabular-nums">－ {formatSen(month.expense)}</span>
        </div>
      </section>

      <QuickEntry onAdded={(t) => setTxns((prev) => [t, ...prev])} />

      {/* Transaction list */}
      <section className="mt-5">
        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
        ) : error ? (
          <div className="py-10 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                load();
              }}
              className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : txns.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            No transactions yet. Add your first above.
          </p>
        ) : (
          groups.map(([date, rows]) => (
            <div key={date} className="mb-4">
              <p className="px-1 pb-1 text-xs font-medium text-gray-400">
                {dayLabel(date)}
              </p>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                {rows.map((t) => {
                  const cat = t.category_id ? catById.get(t.category_id) : null;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setEditing(t)}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-gray-50"
                      >
                        <span className="text-xl">{cat?.icon ?? "❓"}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-gray-900">
                            {t.merchant || (cat?.name ?? "Uncategorized")}
                          </span>
                          <span className="block truncate text-xs text-gray-400">
                            {cat?.name ?? "Uncategorized"}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 font-semibold tabular-nums ${
                            t.type === "income"
                              ? "text-emerald-600"
                              : "text-gray-900"
                          }`}
                        >
                          {t.type === "income" ? "+" : "−"}
                          {formatSen(t.amount_sen)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>

      {editing && (
        <TransactionEditor
          txn={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onChanged={load}
          onDeleted={(id) => setTxns((prev) => prev.filter((t) => t.id !== id))}
        />
      )}
    </main>
  );
}
