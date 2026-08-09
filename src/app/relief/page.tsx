"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatSen, formatRM, parseAmountToSen } from "@/lib/money";
import {
  listReliefs,
  setReliefCap,
  listReliefTxnsForYear,
  type ReliefTxn,
} from "@/lib/api/tax-relief";
import {
  spendByReliefCode,
  reliefProgress,
  totalReliefSen,
  type ReliefRow,
} from "@/lib/relief";
import { downloadCsv } from "@/lib/csv";
import { useI18n } from "@/lib/i18n-client";

const CUR_YEAR = new Date().getFullYear();

export default function ReliefPage() {
  const [year, setYear] = useState(CUR_YEAR);
  const [reliefs, setReliefs] = useState<ReliefRow[]>([]);
  const [txns, setTxns] = useState<ReliefTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [caps, setCaps] = useState<Record<string, string>>({});
  const { t } = useI18n();

  const load = useCallback(async (y: number) => {
    setLoading(true);
    const [rel, tx] = await Promise.all([
      listReliefs(y),
      listReliefTxnsForYear(y),
    ]);
    setReliefs(rel);
    setTxns(tx);
    setCaps(
      Object.fromEntries(
        rel.map((r) => [r.code, r.capSen !== null ? (r.capSen / 100).toFixed(0) : ""])
      )
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      await load(year);
    })();
  }, [year, load]);

  const spend = useMemo(() => spendByReliefCode(txns), [txns]);
  const progress = useMemo(() => reliefProgress(reliefs, spend), [reliefs, spend]);
  const total = useMemo(() => totalReliefSen(spend), [spend]);

  async function saveCap(code: string) {
    const sen = caps[code]?.trim() ? parseAmountToSen(caps[code]) : null;
    await setReliefCap(code, year, sen);
    await load(year);
  }

  function exportReport() {
    const header = ["Code", "Category", "Spent (RM)", "Cap (RM)", "% of cap"];
    const rows = progress.map((r) => [
      r.code,
      r.name,
      formatSen(r.spentSen),
      r.capSen !== null ? formatSen(r.capSen) : "",
      r.pct !== null ? String(r.pct) : "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((c) => (/[",\n]/.test(c) ? `"${c}"` : c)).join(","))
      .join("\r\n");
    downloadCsv(`jtracker-relief-${year}.csv`, csv);
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          {t("relief.title")}
        </h1>
        <Link href="/" className="text-sm font-medium text-indigo-600">
          {t("done")}
        </Link>
      </header>

      {/* Year + total */}
      <section className="mb-4 rounded-2xl bg-indigo-600 p-4 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setYear((y) => y - 1)} className="px-2 text-lg" aria-label={t("relief.prevYear")}>
            ‹
          </button>
          <span className="text-sm font-semibold">YA {year}</span>
          <button
            type="button"
            onClick={() => setYear((y) => Math.min(CUR_YEAR, y + 1))}
            disabled={year >= CUR_YEAR}
            className="px-2 text-lg disabled:opacity-30"
            aria-label={t("relief.nextYear")}
          >
            ›
          </button>
        </div>
        <p className="mt-1 text-center text-3xl font-bold tabular-nums">
          {formatRM(total)}
        </p>
        <p className="text-center text-xs text-indigo-100">{t("relief.claimedSoFar")}</p>
      </section>

      <button
        type="button"
        onClick={exportReport}
        className="mb-4 w-full rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-700"
      >
        {t("relief.exportReport")}
      </button>

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">{t("loading")}</p>
      ) : progress.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">
          {t("relief.noCategories", { year })}
        </p>
      ) : (
        <ul className="space-y-3">
          {progress.map((r) => (
            <li key={r.code} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-gray-900">{r.name}</span>
                <span className="text-sm tabular-nums text-gray-700">
                  {formatSen(r.spentSen)}
                  {r.capSen !== null && (
                    <span className="text-gray-400"> / {formatSen(r.capSen)}</span>
                  )}
                </span>
              </div>
              {r.capSen !== null && (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${
                      (r.pct ?? 0) >= 100 ? "bg-amber-500" : "bg-indigo-600"
                    }`}
                    style={{ width: `${r.pct ?? 0}%` }}
                  />
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-gray-400">{t("relief.capLabel")}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={caps[r.code] ?? ""}
                  placeholder={t("relief.capNone")}
                  onChange={(e) =>
                    setCaps((c) => ({ ...c, [r.code]: e.target.value }))
                  }
                  onBlur={() => saveCap(r.code)}
                  className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-indigo-600"
                />
                <span className="text-[11px] text-gray-400">
                  {t("relief.editHint", { year })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 px-1 text-center text-[11px] text-gray-400">
        {t("relief.footer")}
      </p>
    </main>
  );
}
