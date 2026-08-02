"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import QuickEntry from "@/components/quick-entry";
import TransactionEditor from "@/components/transaction-editor";
import KpiTiles from "@/components/kpi-tiles";
import CategoryDonut from "@/components/category-donut";
import { listCategories } from "@/lib/api/categories";
import { listTransactionsForMonth } from "@/lib/api/transactions";
import { computeKpis, expenseByCategory, categoryKey } from "@/lib/stats";
import { formatSen } from "@/lib/money";
import type { Category, Transaction } from "@/lib/api/types";

const now = new Date();
const CUR = { y: now.getFullYear(), m: now.getMonth() + 1 };

function dayLabel(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function Dashboard() {
  const [sel, setSel] = useState(CUR); // { y, m } — selected month
  const [categories, setCategories] = useState<Category[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [catFilter, setCatFilter] = useState<string | null>(null);

  const load = useCallback(async (y: number, m: number) => {
    try {
      setError(null);
      const [cats, list] = await Promise.all([
        listCategories(),
        listTransactionsForMonth(y, m),
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
    (async () => {
      await load(sel.y, sel.m);
    })();
  }, [sel, load]);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const kpis = useMemo(() => computeKpis(txns), [txns]);
  const slices = useMemo(
    () => expenseByCategory(txns, categories),
    [txns, categories]
  );

  const shown = useMemo(
    () => (catFilter ? txns.filter((t) => categoryKey(t) === catFilter) : txns),
    [txns, catFilter]
  );
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of shown) {
      const arr = map.get(t.occurred_at) ?? [];
      arr.push(t);
      map.set(t.occurred_at, arr);
    }
    return [...map.entries()];
  }, [shown]);

  const isCurrentMonth = sel.y === CUR.y && sel.m === CUR.m;
  const monthLabel = new Date(sel.y, sel.m - 1, 1).toLocaleDateString("en-MY", {
    month: "long",
    year: "numeric",
  });
  const step = (d: number) => {
    const idx = sel.y * 12 + (sel.m - 1) + d;
    setLoading(true);
    setCatFilter(null);
    setSel({ y: Math.floor(idx / 12), m: (idx % 12) + 1 });
  };
  const filterName =
    catFilter && (slices.find((s) => s.id === catFilter)?.name ?? "Filtered");

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-indigo-700">
          JTracker
        </h1>
        <Link href="/settings" className="text-sm font-medium text-gray-500">
          Settings
        </Link>
      </header>

      {/* Month switcher */}
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-white px-2 py-1.5 shadow-sm ring-1 ring-black/5">
        <button
          type="button"
          onClick={() => step(-1)}
          className="rounded-lg px-3 py-1 text-lg text-gray-500 active:bg-gray-100"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={isCurrentMonth}
          className="rounded-lg px-3 py-1 text-lg text-gray-500 active:bg-gray-100 disabled:opacity-30"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mb-4">
        <KpiTiles kpis={kpis} />
      </div>

      <QuickEntry
        categories={categories}
        onAdded={() => load(sel.y, sel.m)}
      />

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : error ? (
        <div className="py-10 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              load(sel.y, sel.m);
            }}
            className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {slices.length > 0 && (
            <div className="mt-4">
              <CategoryDonut
                slices={slices}
                totalSen={kpis.expenseSen}
                activeId={catFilter}
                onSelect={setCatFilter}
              />
            </div>
          )}

          <section className="mt-5">
            {catFilter && (
              <button
                type="button"
                onClick={() => setCatFilter(null)}
                className="mb-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
              >
                {filterName} ✕
              </button>
            )}
            {shown.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                {catFilter
                  ? "No transactions in this category."
                  : "No transactions this month. Add one above."}
              </p>
            ) : (
              groups.map(([date, rows]) => (
                <div key={date} className="mb-4">
                  <p className="px-1 pb-1 text-xs font-medium text-gray-400">
                    {dayLabel(date)}
                  </p>
                  <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                    {rows.map((t) => {
                      const cat = t.category_id
                        ? catById.get(t.category_id)
                        : null;
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
        </>
      )}

      {editing && (
        <TransactionEditor
          txn={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onChanged={() => load(sel.y, sel.m)}
          onDeleted={(id) => setTxns((prev) => prev.filter((t) => t.id !== id))}
        />
      )}
    </main>
  );
}
