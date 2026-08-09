import { describe, expect, it } from "vitest";
import { goalProgress } from "./goals";

describe("goalProgress", () => {
  it("computes percentage and remaining for a partial goal", () => {
    const p = goalProgress({ target_sen: 100_00, current_sen: 30_00, target_date: null });
    expect(p.pct).toBe(30);
    expect(p.remainingSen).toBe(70_00);
    expect(p.done).toBe(false);
    expect(p.daysLeft).toBe(null);
  });

  it("clamps pct at 100 and remaining at 0 when overshot", () => {
    const p = goalProgress({ target_sen: 100_00, current_sen: 150_00, target_date: null });
    expect(p.pct).toBe(100);
    expect(p.remainingSen).toBe(0);
    expect(p.done).toBe(true);
  });

  it("is done exactly at the target", () => {
    const p = goalProgress({ target_sen: 100_00, current_sen: 100_00, target_date: null });
    expect(p.done).toBe(true);
    expect(p.pct).toBe(100);
  });

  it("computes days left for a future target date", () => {
    const p = goalProgress(
      { target_sen: 100_00, current_sen: 0, target_date: "2026-08-20" },
      "2026-08-09"
    );
    expect(p.daysLeft).toBe(11);
  });

  it("returns negative daysLeft for an overdue target date", () => {
    const p = goalProgress(
      { target_sen: 100_00, current_sen: 0, target_date: "2026-08-01" },
      "2026-08-09"
    );
    expect(p.daysLeft).toBe(-8);
  });

  it("handles zero current_sen without pct being NaN", () => {
    const p = goalProgress({ target_sen: 50_00, current_sen: 0, target_date: null });
    expect(p.pct).toBe(0);
    expect(p.remainingSen).toBe(50_00);
  });
});
