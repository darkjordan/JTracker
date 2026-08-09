"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import QuickEntry from "@/components/quick-entry";
import ScanButton from "@/components/scan-button";
import StatementImport from "@/components/statement-import";
import InstallPrompt from "@/components/install-prompt";
import TransactionEditor from "@/components/transaction-editor";
import TransactionList from "@/components/transaction-list";
import FilterBar, { type TypeFilter } from "@/components/filter-bar";
import TabBar, { type MainTab } from "@/components/tab-bar";
import ScopeToggle, { type Scope } from "@/components/scope-toggle";
import SuccessToast from "@/components/success-toast";
import KpiTiles from "@/components/kpi-tiles";
import CategoryDonut from "@/components/category-donut";
import CashFlowBar from "@/components/cash-flow-bar";
import Sparkline from "@/components/sparkline";
import TrendChart from "@/components/trend-chart";
import AdSlot from "@/components/ad-slot";
import { PrivacyToggle } from "@/components/money-privacy";
import { listCategories } from "@/lib/api/categories";
import { listReliefs } from "@/lib/api/tax-relief";
import { getHousehold } from "@/lib/api/household";
import { getAdEligibility } from "@/lib/api/promo";
import { createClient } from "@/lib/supabase/client";
import { memberBadges, type MemberBadge } from "@/lib/member-colors";
import type { ReliefRow } from "@/lib/relief";
import {
  listTransactionsForMonth,
  listRangeLite,
  setReviewed,
} from "@/lib/api/transactions";
import {
  computeKpis,
  expenseByCategory,
  categoryKey,
  dailyExpense,
  cashFlow,
  bucketMonthly,
  monthsEndingAt,
  type MonthPoint,
} from "@/lib/stats";
import { formatRM } from "@/lib/money";
import type { Category, Transaction } from "@/lib/api/types";

const pad = (n: number) => String(n).padStart(2, "0");

const now = new Date();
const CUR = { y: now.getFullYear(), m: now.getMonth() + 1 };

const SCOPE_KEY = "jtracker:txnScope";

export default function Dashboard() {
  const [sel, setSel] = useState(CUR); // { y, m } — selected month
  const [categories, setCategories] = useState<Category[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [trend, setTrend] = useState<MonthPoint[]>([]);
  const [reliefs, setReliefs] = useState<ReliefRow[]>([]);
  const [memberMap, setMemberMap] = useState<Map<string, MemberBadge>>(new Map());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [reviewedOnly, setReviewedOnly] = useState(false);
  const [showScopeToggle, setShowScopeToggle] = useState(false);
  const [scope, setScope] = useState<Scope>("household");
  const [tab, setTab] = useState<MainTab>("add");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    // One-time read of the persisted preference (see money-privacy.tsx for why
    // this lives in an effect rather than a lazy initializer: SSR can't see
    // localStorage, so reading it up front would cause a hydration mismatch).
    const saved = localStorage.getItem(SCOPE_KEY);
    if (saved === "self" || saved === "household") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScope(saved);
    }
  }, []);

  function changeScope(next: Scope) {
    setLoading(true);
    setScope(next);
    try {
      localStorage.setItem(SCOPE_KEY, next);
    } catch {
      /* ignore storage failures (private mode) */
    }
  }

  const load = useCallback(async (y: number, m: number, sc: Scope) => {
    try {
      setError(null);
      const months = monthsEndingAt(y, m, 6);
      const start = `${months[0].y}-${pad(months[0].m)}-01`;
      const endExcl = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
      const supabase = createClient();
      const [
        cats,
        {
          data: { user },
        },
        rel,
        hh,
        adEligible,
      ] = await Promise.all([
        listCategories(),
        supabase.auth.getUser(),
        listReliefs(y),
        getHousehold(),
        getAdEligibility(),
      ]);
      setShowAd(adEligible);
      // Only offer the scope toggle (and tag transactions by member) when
      // actually sharing with >1 APPROVED member — pending requesters have
      // no shared data yet.
      const activeMembers = hh?.members.filter((m) => m.status === "active") ?? [];
      const sharing = activeMembers.length > 1;
      setShowScopeToggle(sharing);
      setMemberMap(sharing ? memberBadges(activeMembers) : new Map());
      const selfId = sharing && sc === "self" ? user?.id : undefined;
      const [list, range] = await Promise.all([
        listTransactionsForMonth(y, m, selfId),
        listRangeLite(start, endExcl, selfId),
      ]);
      setCategories(cats);
      setTxns(list);
      setTrend(bucketMonthly(range, months));
      setReliefs(rel);
    } catch {
      setError("Couldn’t load your data. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load(sel.y, sel.m, scope);
    })();
  }, [sel, scope, load]);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const kpis = useMemo(() => computeKpis(txns), [txns]);
  const slices = useMemo(
    () => expenseByCategory(txns, categories),
    [txns, categories]
  );
  const cf = useMemo(() => cashFlow(txns, categories), [txns, categories]);
  const daily = useMemo(
    () => dailyExpense(txns, sel.y, sel.m),
    [txns, sel]
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return txns.filter(
      (t) =>
        (typeFilter === "all" || t.type === typeFilter) &&
        (!catFilter || categoryKey(t) === catFilter) &&
        (!reviewedOnly || !t.reviewed) &&
        (!q || t.merchant.toLowerCase().includes(q))
    );
  }, [txns, catFilter, typeFilter, reviewedOnly, search]);

  async function toggleReviewed(t: Transaction) {
    const next = !t.reviewed;
    setTxns((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, reviewed: next } : x))
    );
    try {
      await setReviewed(t.id, next);
    } catch {
      setTxns((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, reviewed: !next } : x))
      );
    }
  }
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
  const hasFilter =
    !!catFilter ||
    typeFilter !== "all" ||
    reviewedOnly ||
    search.trim() !== "";

  return (
    <>
      <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-indigo-700">
            JTracker
          </h1>
          <div className="flex items-center gap-2">
            <PrivacyToggle />
            <Link href="/settings" className="text-sm font-medium text-gray-500">
              Settings
            </Link>
          </div>
        </header>

        <InstallPrompt />

        {tab === "add" ? (
          <>
            <QuickEntry
              categories={categories}
              onAdded={(t) => {
                load(sel.y, sel.m, scope);
                setToastMsg(
                  `Added ${formatRM(t.amount_sen)} ${t.type === "income" ? "income" : "expense"}`
                );
              }}
            />

            <ScanButton
              categories={categories}
              reliefs={reliefs}
              onSaved={() => {
                load(sel.y, sel.m, scope);
                setToastMsg("Saved from scan");
              }}
            />

            <StatementImport
              categories={categories}
              onCommitted={() => {
                load(sel.y, sel.m, scope);
                setToastMsg("Statement imported");
              }}
            />
          </>
        ) : (
          <>
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

            {showScopeToggle && (
              <ScopeToggle scope={scope} onScope={changeScope} disabled={loading} />
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600" />
                <p className="text-sm text-gray-400">Loading…</p>
              </div>
            ) : error ? (
              <div className="py-10 text-center">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    load(sel.y, sel.m, scope);
                  }}
                  className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <KpiTiles kpis={kpis} />
                </div>

                <nav className="mb-4 grid grid-cols-2 gap-2">
                  {[
                    { href: "/accounts", label: "💰 Accounts" },
                    { href: "/recurring", label: "🔁 Recurring" },
                    { href: "/relief", label: "🎯 Relief" },
                    { href: "/goals", label: "🏁 Goals" },
                    { href: "/household", label: "👨‍👩‍👧 Household" },
                  ].map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="rounded-xl bg-white py-2 text-center text-xs font-medium text-gray-700 shadow-sm ring-1 ring-black/5 active:scale-[0.98]"
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>

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

                <div className="mt-4 space-y-4">
                  <CashFlowBar cf={cf} />
                  <Sparkline daily={daily} />
                  <TrendChart points={trend} />
                </div>

                <section className="mt-5">
                  <div className="mb-3">
                    <FilterBar
                      search={search}
                      onSearch={setSearch}
                      type={typeFilter}
                      onType={setTypeFilter}
                      category={catFilter}
                      onCategory={setCatFilter}
                      categories={categories}
                      reviewedOnly={reviewedOnly}
                      onReviewedOnly={setReviewedOnly}
                    />
                  </div>
                  {shown.length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-500">
                      {hasFilter
                        ? "No transactions match these filters."
                        : "No transactions this month. Tap Add below to log one."}
                    </p>
                  ) : (
                    <TransactionList
                      groups={groups}
                      catById={catById}
                      members={memberMap}
                      onEdit={setEditing}
                      onToggleReviewed={toggleReviewed}
                    />
                  )}
                </section>
              </>
            )}
          </>
        )}

        {editing && (
          <TransactionEditor
            txn={editing}
            categories={categories}
            reliefs={reliefs}
            onClose={() => setEditing(null)}
            onChanged={() => load(sel.y, sel.m, scope)}
            onDeleted={(id) => setTxns((prev) => prev.filter((t) => t.id !== id))}
          />
        )}

        {showAd && <AdSlot placement="dashboard" />}
      </main>

      {toastMsg && (
        <SuccessToast message={toastMsg} onDone={() => setToastMsg(null)} />
      )}

      <TabBar tab={tab} onTab={setTab} />
    </>
  );
}
