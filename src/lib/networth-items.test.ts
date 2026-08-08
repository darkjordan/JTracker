import { describe, it, expect } from "vitest";
import { netWorth, isLiability, type NetWorthItem } from "./networth-items";

const item = (kind: NetWorthItem["kind"], balance_sen: number): NetWorthItem => ({
  id: Math.random().toString(36),
  name: kind,
  kind,
  balance_sen,
  sort_order: 0,
});

describe("netWorth (items)", () => {
  it("assets minus liabilities", () => {
    const nw = netWorth([
      item("investment", 500000),
      item("epf", 2000000),
      item("property", 10000000),
      item("liability", 300000),
    ]);
    expect(nw.assetsSen).toBe(12500000);
    expect(nw.liabilitiesSen).toBe(300000);
    expect(nw.netSen).toBe(12200000);
  });
  it("can be negative", () => {
    expect(netWorth([item("other", 100), item("liability", 500)]).netSen).toBe(-400);
  });
  it("classifies kinds", () => {
    expect(isLiability("liability")).toBe(true);
    expect(isLiability("investment")).toBe(false);
  });
});
