"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatRM, formatSen } from "@/lib/money";
import { listTransactionsSince } from "@/lib/api/transactions";
import {
  listDismissed,
  dismissRecurring,
  restoreRecurring,
} from "@/lib/api/recurring";
import { detectRecurring, monthlyTotalSen } from "@/lib/recurring";
import type { Transaction } from "@/lib/api/types";

function startEightMonthsAgo(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() - 7; // 8-month window incl. current
  const dt = new Date(y, m, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function RecurringPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, dis] = await Promise.all([
      listTransactionsSince(startEightMonthsAgo()),
      listDismissed(),
    ]);
    setTxns(list);
    setDismissed(dis);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const hits = useMemo(
    () => detectRecurring(txns, dismissed),
    [txns, dismissed]
  );
  const monthly = useMemo(() => monthlyTotalSen(hits), [hits]);

  // Names of dismissed merchants that would otherwise show (for the restore list).
  const dismissedHits = useMemo(
    () => detectRecurring(txns, new Set()).filter((h) => dismissed.has(h.merchantNorm)),
    [txns, dismissed]
  );

  async function dismiss(norm: string) {
    setDismissed((s) => new Set(s).add(norm));
    await dismissRecurring(norm);
  }
  async function restore(norm: string) {
    setDismissed((s) => {
      const n = new Set(s);
      n.delete(norm);
      return n;
    });
    await restoreRecurring(norm);
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          Recurring
        </h1>
        <Link href="/" className="text-sm font-medium text-indigo-600">Done</Link>
      </header>

      <section className="mb-4 rounded-2xl bg-indigo-600 p-4 text-white shadow-sm">
        <p className="text-xs text-indigo-100">Estimated monthly subscriptions</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{formatRM(monthly)}</p>
        <p className="text-xs text-indigo-100">{hits.length} detected</p>
      </section>

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : hits.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">
          No recurring charges detected yet. Once a merchant bills you monthly a
          few times, it’ll show up here.
        </p>
      ) : (
        <ul className="space-y-2">
          {hits.map((h) => (
            <li key={h.merchantNorm} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{h.merchant}</p>
                <p className="text-xs text-gray-400">
                  next ~{h.nextDue} · every ~{h.intervalDays}d · {h.count}×
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                {formatSen(h.amountSen)}
              </span>
              <button
                type="button"
                onClick={() => dismiss(h.merchantNorm)}
                className="shrink-0 text-xs font-medium text-gray-400 hover:text-red-500"
              >
                Dismiss
              </button>
            </li>
          ))}
        </ul>
      )}

      {dismissedHits.length > 0 && (
        <section className="mt-6">
          <p className="px-1 text-xs font-medium text-gray-400">Dismissed</p>
          <ul className="mt-1 space-y-1">
            {dismissedHits.map((h) => (
              <li key={h.merchantNorm} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                <span className="truncate text-sm text-gray-500">{h.merchant}</span>
                <button
                  type="button"
                  onClick={() => restore(h.merchantNorm)}
                  className="text-xs font-medium text-indigo-600"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
