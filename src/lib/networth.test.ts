import { describe, it, expect } from "vitest";
import { netWorth, isLiability, type AccountRow } from "./networth";

const acct = (kind: AccountRow["kind"], balance_sen: number): AccountRow => ({
  id: Math.random().toString(36),
  name: kind,
  kind,
  balance_sen,
  sort_order: 0,
});

describe("netWorth", () => {
  it("assets minus liabilities", () => {
    const nw = netWorth([
      acct("bank", 500000),
      acct("cash", 20000),
      acct("investment", 1000000),
      acct("liability", 300000),
    ]);
    expect(nw.assetsSen).toBe(1520000);
    expect(nw.liabilitiesSen).toBe(300000);
    expect(nw.netSen).toBe(1220000);
  });
  it("can be negative", () => {
    expect(netWorth([acct("bank", 100), acct("liability", 500)]).netSen).toBe(-400);
  });
  it("classifies kinds", () => {
    expect(isLiability("liability")).toBe(true);
    expect(isLiability("bank")).toBe(false);
  });
});
