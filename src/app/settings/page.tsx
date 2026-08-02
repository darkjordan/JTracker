"use client";

import Link from "next/link";
import { useState } from "react";
import { listAllTransactions, todayLocal } from "@/lib/api/transactions";
import { listCategories } from "@/lib/api/categories";
import { transactionsToCsv, downloadCsv } from "@/lib/csv";

export default function SettingsPage() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function exportCsv() {
    setBusy(true);
    setMsg(null);
    try {
      const [txns, cats] = await Promise.all([
        listAllTransactions(),
        listCategories(),
      ]);
      if (txns.length === 0) {
        setMsg("Nothing to export yet.");
        return;
      }
      downloadCsv(`jtracker-${todayLocal()}.csv`, transactionsToCsv(txns, cats));
      setMsg(`Exported ${txns.length} transactions.`);
    } catch {
      setMsg("Export failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          Settings
        </h1>
        <Link href="/" className="text-sm font-medium text-indigo-600">
          Done
        </Link>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">Export data</h2>
        <p className="mt-1 text-xs text-gray-500">
          Download all your transactions as a CSV file — your data, anytime.
        </p>
        <button
          type="button"
          onClick={exportCsv}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Preparing…" : "Export CSV"}
        </button>
        {msg && <p className="mt-2 text-xs text-gray-600">{msg}</p>}
      </section>

      <p className="mt-6 px-1 text-center text-xs text-gray-400">
        JTracker · Phase 1 · your data lives in this browser until you sign in
        (coming soon).
      </p>
    </main>
  );
}
