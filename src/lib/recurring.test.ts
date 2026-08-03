import { describe, it, expect } from "vitest";
import {
  detectRecurring,
  monthlyTotalSen,
  monthlyEquivalentSen,
  plansMonthlySen,
  addCadence,
  planProgress,
  planSchedule,
  type RecurringTxn,
  type RecurringPlan,
  type Cadence,
} from "./recurring";

function mkPlan(over: Partial<RecurringPlan> = {}): RecurringPlan {
  return {
    id: "x",
    name: "n",
    amount_sen: 10000,
    cadence: "monthly",
    next_due: null,
    occurrences: null,
    paid_count: 0,
    category_id: null,
    ...over,
  };
}

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
  const plan = (amount_sen: number, cadence: Cadence): RecurringPlan =>
    mkPlan({ amount_sen, cadence });
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

describe("addCadence", () => {
  it("adds months, clamping day, crossing years", () => {
    expect(addCadence("2026-01-31", "monthly", 1)).toBe("2026-02-28");
    expect(addCadence("2026-11-15", "monthly", 3)).toBe("2027-02-15");
    expect(addCadence("2026-08-04", "monthly", -2)).toBe("2026-06-04");
  });
  it("weekly and yearly", () => {
    expect(addCadence("2026-08-04", "weekly", 2)).toBe("2026-08-18");
    expect(addCadence("2026-08-04", "yearly", 1)).toBe("2027-08-04");
  });
});

describe("planProgress + planSchedule", () => {
  // 12-payment monthly plan, 3 paid, next payment 2026-08-10
  const p = mkPlan({
    amount_sen: 20000,
    cadence: "monthly",
    next_due: "2026-08-10",
    occurrences: 12,
    paid_count: 3,
  });
  it("computes start, end, remaining and totals", () => {
    const pr = planProgress(p);
    expect(pr.startDate).toBe("2026-05-10"); // next_due − 3 months
    expect(pr.endDate).toBe("2027-04-10"); // start + 11 months
    expect(pr.remaining).toBe(9);
    expect(pr.totalSen).toBe(240000);
    expect(pr.paidSen).toBe(60000);
  });
  it("builds a full schedule with paid flags + cumulative", () => {
    const s = planSchedule(p);
    expect(s.length).toBe(12);
    expect(s[0]).toEqual({ index: 1, date: "2026-05-10", cumulativeSen: 20000, paid: true });
    expect(s[3].paid).toBe(false); // 4th payment not yet paid
    expect(s[11].cumulativeSen).toBe(240000);
  });
  it("ongoing plan (no occurrences) has no schedule/end", () => {
    const pr = planProgress(mkPlan({ next_due: "2026-08-10" }));
    expect(pr.endDate).toBeNull();
    expect(planSchedule(mkPlan({ next_due: "2026-08-10" }))).toEqual([]);
  });
});
