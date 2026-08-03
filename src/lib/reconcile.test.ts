import { describe, expect, it } from "vitest";
import { reconcile } from "./reconcile";

describe("reconcile", () => {
  it("balances a deposit account (money in raises the balance)", () => {
    const r = reconcile({
      openingSen: 100_00,
      closingSen: 130_00,
      creditSen: 50_00,
      debitSen: 20_00,
    });
    expect(r.ok).toBe(true);
    expect(r.basis).toBe("account");
    expect(r.computedSen).toBe(130_00);
  });

  it("balances a credit card (a purchase raises what you owe)", () => {
    const r = reconcile({
      openingSen: 100_00,
      closingSen: 70_00,
      creditSen: 50_00,
      debitSen: 20_00,
    });
    expect(r.ok).toBe(true);
    expect(r.basis).toBe("card");
    expect(r.computedSen).toBe(70_00);
  });

  // The real RHB import: 63 rows that were correct but flagged as misread.
  it("accepts the RHB statement that used to warn falsely", () => {
    const openingSen = 2_958_68;
    const netSen = 288_04; // credits − debits
    const debitSen = 1_000_00;
    const creditSen = debitSen + netSen;
    const r = reconcile({
      openingSen,
      closingSen: 2_670_64,
      creditSen,
      debitSen,
    });
    expect(r.ok).toBe(true);
    expect(r.basis).toBe("card");
    expect(r.computedSen).toBe(2_670_64);
  });

  it("still catches a genuinely misread statement", () => {
    const r = reconcile({
      openingSen: 100_00,
      closingSen: 999_00,
      creditSen: 50_00,
      debitSen: 20_00,
    });
    expect(r.ok).toBe(false);
    expect(r.basis).toBe(null);
  });

  it("reports the closer orientation when neither matches", () => {
    const r = reconcile({
      openingSen: 0,
      closingSen: 100_00,
      creditSen: 90_00,
      debitSen: 0,
    });
    expect(r.ok).toBe(false);
    expect(r.computedSen).toBe(90_00); // account (90.00) beats card (−90.00)
  });

  it("tolerates rounding of up to 10 sen", () => {
    expect(
      reconcile({ openingSen: 0, closingSen: 100_08, creditSen: 100_00, debitSen: 0 }).ok
    ).toBe(true);
    expect(
      reconcile({ openingSen: 0, closingSen: 100_11, creditSen: 100_00, debitSen: 0 }).ok
    ).toBe(false);
  });
});
