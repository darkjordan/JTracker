import { describe, it, expect } from "vitest";
import { spendByReliefCode, reliefProgress, totalReliefSen } from "./relief";

const txns = [
  { tax_relief_code: "lifestyle", amount_sen: 150000, type: "expense" },
  { tax_relief_code: "lifestyle", amount_sen: 50000, type: "expense" },
  { tax_relief_code: "medical_self", amount_sen: 30000, type: "expense" },
  { tax_relief_code: "lifestyle", amount_sen: 99999, type: "income" }, // income ignored
  { tax_relief_code: null, amount_sen: 8000, type: "expense" }, // untagged ignored
];

describe("spendByReliefCode", () => {
  it("sums expenses per code, ignoring income and untagged", () => {
    expect(spendByReliefCode(txns)).toEqual({
      lifestyle: 200000,
      medical_self: 30000,
    });
  });
});

describe("reliefProgress", () => {
  const reliefs = [
    { code: "lifestyle", name: "Lifestyle", capSen: 250000 },
    { code: "medical_self", name: "Medical", capSen: 1000000 },
    { code: "zakat", name: "Zakat", capSen: null }, // no cap → pct null
  ];
  it("computes spent + pct, most-spent first, caps pct at 100", () => {
    const p = reliefProgress(reliefs, spendByReliefCode(txns));
    expect(p.map((r) => [r.code, r.spentSen, r.pct])).toEqual([
      ["lifestyle", 200000, 80],
      ["medical_self", 30000, 3],
      ["zakat", 0, null],
    ]);
  });
  it("caps pct at 100 when over the limit", () => {
    const p = reliefProgress([{ code: "lifestyle", name: "L", capSen: 100000 }], {
      lifestyle: 300000,
    });
    expect(p[0].pct).toBe(100);
  });
});

describe("totalReliefSen", () => {
  it("sums all codes", () => {
    expect(totalReliefSen(spendByReliefCode(txns))).toBe(230000);
  });
});
