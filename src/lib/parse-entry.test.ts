import { describe, it, expect } from "vitest";
import { parseQuickEntry } from "./parse-entry";

describe("parseQuickEntry — gate cases", () => {
  it("parses 'nasi lemak 8.50' as an expense", () => {
    expect(parseQuickEntry("nasi lemak 8.50")).toEqual({
      amountSen: 850,
      type: "expense",
      merchant: "nasi lemak",
      merchantNorm: "NASI LEMAK",
    });
  });

  it("flips to income on the income keyword", () => {
    const r = parseQuickEntry("salary 5200 income");
    expect(r?.type).toBe("income");
    expect(r?.amountSen).toBe(520000);
    expect(r?.merchant).toBe("salary");
  });

  it("handles an RM prefix", () => {
    const r = parseQuickEntry("grab RM 12.30");
    expect(r?.amountSen).toBe(1230);
    expect(r?.merchant).toBe("grab");
    expect(r?.type).toBe("expense");
  });

  it("handles thousands separators", () => {
    const r = parseQuickEntry("rent 1,250.00");
    expect(r?.amountSen).toBe(125000);
    expect(r?.merchant).toBe("rent");
  });

  it("prefers the decimal/RM amount over a number inside the description", () => {
    const r = parseQuickEntry("7 eleven 8.50");
    expect(r?.amountSen).toBe(850);
    expect(r?.merchant).toBe("7 eleven");
  });

  it("rejects lines with no amount", () => {
    expect(parseQuickEntry("nasi lemak")).toBeNull();
    expect(parseQuickEntry("")).toBeNull();
    expect(parseQuickEntry("   ")).toBeNull();
  });
});
