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
