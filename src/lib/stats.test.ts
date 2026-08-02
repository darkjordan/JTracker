import { describe, it, expect } from "vitest";
import { computeKpis, expenseByCategory } from "./stats";
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
