import { describe, it, expect } from "vitest";
import {
  detectRecurring,
  monthlyTotalSen,
  monthlyEquivalentSen,
  plansMonthlySen,
  type RecurringTxn,
  type RecurringPlan,
} from "./recurring";

const t = (
  merchant_norm: string,
  amount_sen: number,
  occurred_at: string,
  type = "expense"
): RecurringTxn => ({
  merchant: merchant_norm,
  merchant_norm,
  amount_sen,
  type,
  occurred_at,
});

describe("detectRecurring", () => {
  it("flags a monthly charge with a plausible next-due", () => {
    const hits = detectRecurring([
      t("NETFLIX", 2290, "2026-05-04"),
      t("NETFLIX", 2290, "2026-06-04"),
      t("NETFLIX", 2290, "2026-07-04"),
      t("TEALIVE", 850, "2026-07-01"), // only once → not recurring
    ]);
    expect(hits.length).toBe(1);
    expect(hits[0].merchantNorm).toBe("NETFLIX");
    expect(hits[0].amountSen).toBe(2290);
    expect(hits[0].count).toBe(3);
    expect(hits[0].nextDue).toBe("2026-08-04"); // 2026-07-04 + 31d (median gap)
  });

  it("ignores non-monthly cadence", () => {
    const hits = detectRecurring([
      t("RANDOM", 100, "2026-01-01"),
      t("RANDOM", 100, "2026-01-05"),
      t("RANDOM", 100, "2026-01-09"),
    ]);
    expect(hits.length).toBe(0); // ~4-day gaps, not monthly
  });

  it("excludes dismissed merchants and income", () => {
    const rows = [
      t("SPOTIFY", 1590, "2026-05-10"),
      t("SPOTIFY", 1590, "2026-06-10"),
      t("SPOTIFY", 1590, "2026-07-10"),
    ];
    expect(detectRecurring(rows, new Set(["SPOTIFY"]))).toHaveLength(0);
    expect(detectRecurring(rows.map((r) => ({ ...r, type: "income" })))).toHaveLength(0);
  });

  it("monthlyTotalSen sums representative amounts", () => {
    const hits = detectRecurring([
      t("NETFLIX", 2290, "2026-05-04"),
      t("NETFLIX", 2290, "2026-06-04"),
      t("NETFLIX", 2290, "2026-07-04"),
      t("MAXIS", 8000, "2026-05-15"),
      t("MAXIS", 8000, "2026-06-15"),
      t("MAXIS", 8000, "2026-07-15"),
    ]);
    expect(monthlyTotalSen(hits)).toBe(10290);
  });
});

describe("planned recurring", () => {
  const plan = (amount_sen: number, cadence: RecurringPlan["cadence"]): RecurringPlan => ({
    id: "x",
    name: "n",
    amount_sen,
    cadence,
    next_due: null,
    category_id: null,
  });
  it("normalizes cadence to a monthly-equivalent", () => {
    expect(monthlyEquivalentSen(1000, "monthly")).toBe(1000);
    expect(monthlyEquivalentSen(1200, "yearly")).toBe(100);
    expect(monthlyEquivalentSen(1000, "weekly")).toBe(4333);
  });
  it("plansMonthlySen sums monthly-equivalents", () => {
    expect(
      plansMonthlySen([plan(2290, "monthly"), plan(12000, "yearly")])
    ).toBe(2290 + 1000);
  });
});
