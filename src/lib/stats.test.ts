import { describe, it, expect } from "vitest";
import {
  computeKpis,
  expenseByCategory,
  dailyExpense,
  bucketMonthly,
  cashFlow,
  monthsEndingAt,
} from "./stats";
import type { Transaction, Category } from "./api/types";

function tx(p: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36),
    type: "expense",
    amount_sen: 0,
    currency: "MYR",
    merchant: "",
    merchant_norm: "",
    category_id: null,
    tax_relief_code: null,
    occurred_at: "2026-08-01",
    note: null,
    source: "manual",
    created_at: "",
    ...p,
  };
}

const cats: Category[] = [
  { id: "food", user_id: null, name: "Food & Drink", icon: "🍜", color: "#ef8a3a", type: "expense", sort_order: 10 },
  { id: "transport", user_id: null, name: "Transport", icon: "🚗", color: "#4a89dc", type: "expense", sort_order: 30 },
];

describe("computeKpis", () => {
  it("sums income/expense, net, savings rate", () => {
    const k = computeKpis([
      tx({ type: "income", amount_sen: 500000 }),
      tx({ type: "expense", amount_sen: 100000 }),
      tx({ type: "expense", amount_sen: 50000 }),
    ]);
    expect(k.incomeSen).toBe(500000);
    expect(k.expenseSen).toBe(150000);
    expect(k.netSen).toBe(350000);
    expect(k.savingsRatePct).toBe(70);
  });
  it("savings rate is null with no income", () => {
    expect(computeKpis([tx({ amount_sen: 100 })]).savingsRatePct).toBeNull();
  });
  it("net can be negative", () => {
    const k = computeKpis([
      tx({ type: "income", amount_sen: 100 }),
      tx({ type: "expense", amount_sen: 300 }),
    ]);
    expect(k.netSen).toBe(-200);
    expect(k.savingsRatePct).toBe(-200);
  });
});

describe("expenseByCategory", () => {
  it("groups expenses by category, largest first, ignores income", () => {
    const slices = expenseByCategory(
      [
        tx({ category_id: "food", amount_sen: 1000 }),
        tx({ category_id: "food", amount_sen: 500 }),
        tx({ category_id: "transport", amount_sen: 2000 }),
        tx({ category_id: null, amount_sen: 300 }),
        tx({ type: "income", category_id: "food", amount_sen: 99999 }),
      ],
      cats
    );
    expect(slices.map((s) => [s.name, s.valueSen])).toEqual([
      ["Transport", 2000],
      ["Food & Drink", 1500],
      ["Uncategorized", 300],
    ]);
    expect(slices[2].color).toBe("#9aa5b1"); // uncategorized fallback color
  });
});

describe("dailyExpense", () => {
  it("sums expense per day, ignores income, right length", () => {
    const d = dailyExpense(
      [
        tx({ occurred_at: "2026-02-01", amount_sen: 100 }),
        tx({ occurred_at: "2026-02-01", amount_sen: 50 }),
        tx({ occurred_at: "2026-02-10", amount_sen: 200 }),
        tx({ occurred_at: "2026-02-10", type: "income", amount_sen: 9999 }),
      ],
      2026,
      2
    );
    expect(d.length).toBe(28); // Feb 2026
    expect(d[0]).toEqual({ day: 1, sen: 150 });
    expect(d[9]).toEqual({ day: 10, sen: 200 });
  });
});

describe("monthsEndingAt + bucketMonthly", () => {
  it("lists N months ending at target, crossing a year boundary", () => {
    expect(monthsEndingAt(2026, 2, 4)).toEqual([
      { y: 2025, m: 11 },
      { y: 2025, m: 12 },
      { y: 2026, m: 1 },
      { y: 2026, m: 2 },
    ]);
  });
  it("buckets rows into the right months", () => {
    const months = monthsEndingAt(2026, 2, 3); // Dec, Jan, Feb
    const pts = bucketMonthly(
      [
        { type: "income", amount_sen: 500, occurred_at: "2026-02-05" },
        { type: "expense", amount_sen: 200, occurred_at: "2026-02-06" },
        { type: "expense", amount_sen: 100, occurred_at: "2025-12-31" },
        { type: "expense", amount_sen: 999, occurred_at: "2025-06-01" }, // out of range → ignored
      ],
      months
    );
    expect(pts.map((p) => [p.key, p.incomeSen, p.expenseSen, p.netSen])).toEqual([
      ["2025-12", 0, 100, -100],
      ["2026-01", 0, 0, 0],
      ["2026-02", 500, 200, 300],
    ]);
  });
});

describe("cashFlow", () => {
  it("computes income, expense, saved, and segments", () => {
    const cf = cashFlow(
      [
        tx({ type: "income", amount_sen: 100000 }),
        tx({ category_id: "food", amount_sen: 30000 }),
        tx({ category_id: "transport", amount_sen: 20000 }),
      ],
      cats
    );
    expect(cf.incomeSen).toBe(100000);
    expect(cf.expenseSen).toBe(50000);
    expect(cf.savedSen).toBe(50000);
    expect(cf.segments.map((s) => s.name)).toEqual(["Food & Drink", "Transport"]);
  });
  it("saved floored at 0 when overspending", () => {
    const cf = cashFlow(
      [
        tx({ type: "income", amount_sen: 100 }),
        tx({ amount_sen: 500 }),
      ],
      cats
    );
    expect(cf.savedSen).toBe(0);
  });
});
