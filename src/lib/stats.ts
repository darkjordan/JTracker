// Pure, client-side aggregations for the dashboard. Zero AI — just reductions
// over a month's transactions (SPEC §5). Money stays in integer sen.

import type { Transaction, Category } from "./api/types";

export type Kpis = {
  incomeSen: number;
  expenseSen: number;
  netSen: number;
  savingsRatePct: number | null; // null when there's no income
};

export function computeKpis(txns: Transaction[]): Kpis {
  let incomeSen = 0;
  let expenseSen = 0;
  for (const t of txns) {
    if (t.type === "income") incomeSen += t.amount_sen;
    else expenseSen += t.amount_sen;
  }
  const netSen = incomeSen - expenseSen;
  const savingsRatePct =
    incomeSen > 0 ? Math.round((netSen / incomeSen) * 100) : null;
  return { incomeSen, expenseSen, netSen, savingsRatePct };
}

export type CategorySlice = {
  id: string; // category id, or "uncat"
  name: string;
  icon: string;
  color: string;
  valueSen: number;
};

const UNCAT_COLOR = "#9aa5b1";

/** Expense totals per category for a donut, largest first. */
export function expenseByCategory(
  txns: Transaction[],
  categories: Category[]
): CategorySlice[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const acc = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== "expense") continue;
    const key = t.category_id ?? "uncat";
    acc.set(key, (acc.get(key) ?? 0) + t.amount_sen);
  }
  const slices: CategorySlice[] = [];
  for (const [key, valueSen] of acc) {
    const c = key === "uncat" ? undefined : byId.get(key);
    slices.push({
      id: key,
      name: c?.name ?? "Uncategorized",
      icon: c?.icon ?? "❓",
      color: c?.color ?? UNCAT_COLOR,
      valueSen,
    });
  }
  return slices.sort((a, b) => b.valueSen - a.valueSen);
}

/** The category key a transaction belongs to (mirrors expenseByCategory keys). */
export function categoryKey(t: Transaction): string {
  return t.category_id ?? "uncat";
}

/** Daily expense totals for a month (index 0 = day 1), for the sparkline. */
export function dailyExpense(
  txns: Transaction[],
  year: number,
  month: number
): { day: number; sen: number }[] {
  const days = new Date(year, month, 0).getDate();
  const arr = Array.from({ length: days }, (_, i) => ({ day: i + 1, sen: 0 }));
  for (const t of txns) {
    if (t.type !== "expense") continue;
    const d = parseInt(t.occurred_at.slice(8, 10), 10);
    if (d >= 1 && d <= days) arr[d - 1].sen += t.amount_sen;
  }
  return arr;
}

export type MonthPoint = {
  key: string; // YYYY-MM
  label: string; // e.g. "Aug"
  incomeSen: number;
  expenseSen: number;
  netSen: number;
};

// Light row shape used by the 6-month trend (only these fields are fetched).
export type LiteRow = { type: string; amount_sen: number; occurred_at: string };

/** Bucket light rows into the given ordered months (income/expense/net each). */
export function bucketMonthly(
  rows: LiteRow[],
  months: { y: number; m: number }[]
): MonthPoint[] {
  const idx = new Map<string, MonthPoint>();
  const points = months.map(({ y, m }) => {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const p: MonthPoint = {
      key,
      label: new Date(y, m - 1, 1).toLocaleDateString("en-MY", { month: "short" }),
      incomeSen: 0,
      expenseSen: 0,
      netSen: 0,
    };
    idx.set(key, p);
    return p;
  });
  for (const r of rows) {
    const p = idx.get(r.occurred_at.slice(0, 7));
    if (!p) continue;
    if (r.type === "income") p.incomeSen += r.amount_sen;
    else p.expenseSen += r.amount_sen;
  }
  for (const p of points) p.netSen = p.incomeSen - p.expenseSen;
  return points;
}

export type CashFlow = {
  incomeSen: number;
  expenseSen: number;
  savedSen: number; // income − expense, floored at 0
  segments: { id: string; name: string; color: string; valueSen: number }[];
};

/** Where the month's income went: expense categories + what was saved. */
export function cashFlow(txns: Transaction[], categories: Category[]): CashFlow {
  const incomeSen = txns
    .filter((t) => t.type === "income")
    .reduce((a, t) => a + t.amount_sen, 0);
  const segments = expenseByCategory(txns, categories);
  const expenseSen = segments.reduce((a, s) => a + s.valueSen, 0);
  return {
    incomeSen,
    expenseSen,
    savedSen: Math.max(0, incomeSen - expenseSen),
    segments: segments.map(({ id, name, color, valueSen }) => ({
      id,
      name,
      color,
      valueSen,
    })),
  };
}

/** The N months (as {y,m}) ending at (and including) the given month. */
export function monthsEndingAt(
  endY: number,
  endM: number,
  count: number
): { y: number; m: number }[] {
  const out: { y: number; m: number }[] = [];
  const endIdx = endY * 12 + (endM - 1);
  for (let i = count - 1; i >= 0; i--) {
    const idx = endIdx - i;
    out.push({ y: Math.floor(idx / 12), m: (idx % 12) + 1 });
  }
  return out;
}
