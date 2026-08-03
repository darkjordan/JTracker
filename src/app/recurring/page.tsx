"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatRM, formatSen, parseAmountToSen } from "@/lib/money";
import { listTransactionsSince } from "@/lib/api/transactions";
import {
  listDismissed,
  dismissRecurring,
  restoreRecurring,
  listPlans,
  createPlan,
} from "@/lib/api/recurring";
import {
  detectRecurring,
  monthlyTotalSen,
  plansMonthlySen,
  type RecurringPlan,
  type Cadence,
} from "@/lib/recurring";
import PlanCard from "@/components/plan-card";
import InstallmentsChart from "@/components/installments-chart";
import type { Transaction } from "@/lib/api/types";

const CADENCES: Cadence[] = ["weekly", "monthly", "yearly"];

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
  const [plans, setPlans] = useState<RecurringPlan[]>([]);
  const [loading, setLoading] = useState(true);
  // Add-plan form
  const [pName, setPName] = useState("");
  const [pAmount, setPAmount] = useState("");
  const [pCadence, setPCadence] = useState<Cadence>("monthly");
  const [pDue, setPDue] = useState("");
  const [pTimes, setPTimes] = useState("");

  const reloadPlans = useCallback(async () => {
    setPlans(await listPlans());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, dis, pl] = await Promise.all([
      listTransactionsSince(startEightMonthsAgo()),
      listDismissed(),
      listPlans(),
    ]);
    setTxns(list);
    setDismissed(dis);
    setPlans(pl);
    setLoading(false);
  }, []);

  async function addPlan() {
    const sen = parseAmountToSen(pAmount);
    if (!pName.trim() || sen === null || sen <= 0) return;
    const times = parseInt(pTimes, 10);
    await createPlan({
      name: pName.trim(),
      amount_sen: sen,
      cadence: pCadence,
      next_due: pDue || null,
      occurrences: Number.isFinite(times) && times > 0 ? times : null,
    });
    setPName("");
    setPAmount("");
    setPDue("");
    setPTimes("");
    setPCadence("monthly");
    await reloadPlans();
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const hits = useMemo(
    () => detectRecurring(txns, dismissed),
    [txns, dismissed]
  );
  const monthly = useMemo(
    () => monthlyTotalSen(hits) + plansMonthlySen(plans),
    [hits, plans]
  );

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
        <p className="text-xs text-indigo-100">
          {hits.length} detected · {plans.length} planned
        </p>
      </section>

      {/* Planned (manual) */}
      <section className="mb-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
        <p className="text-sm font-medium text-gray-900">Plan a recurring item</p>
        <input
          type="text"
          value={pName}
          onChange={(e) => setPName(e.target.value)}
          placeholder="Name (e.g. Spotify, rent, insurance)"
          className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600"
        />
        <div className="mt-2 flex gap-2">
          <div className="flex flex-1 items-center rounded-xl border border-gray-300 px-2 focus-within:border-indigo-600">
            <span className="mr-1 text-sm text-gray-400">RM</span>
            <input
              type="text"
              inputMode="decimal"
              value={pAmount}
              onChange={(e) => setPAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent py-2.5 text-base tabular-nums outline-none"
            />
          </div>
          <select
            value={pCadence}
            onChange={(e) => setPCadence(e.target.value as Cadence)}
            className="rounded-xl border border-gray-300 bg-white px-2 py-2.5 text-sm outline-none"
          >
            {CADENCES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs text-gray-400">Next due</label>
          <input
            type="date"
            value={pDue}
            onChange={(e) => setPDue(e.target.value)}
            className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-600"
          />
          <input
            type="text"
            inputMode="numeric"
            value={pTimes}
            onChange={(e) => setPTimes(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="× times"
            aria-label="Number of payments"
            className="w-20 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-600"
          />
        </div>
        <button
          type="button"
          onClick={addPlan}
          disabled={!pName.trim() || !pAmount.trim()}
          className="mt-2 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add plan
        </button>

        {plans.length > 0 && (
          <ul className="mt-3 space-y-2">
            {plans.map((pl) => (
              <PlanCard key={pl.id} plan={pl} onChanged={reloadPlans} />
            ))}
          </ul>
        )}
      </section>

      <InstallmentsChart plans={plans} />

      <p className="mb-2 px-1 text-xs font-medium text-gray-400">
        Detected from your history
      </p>

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
