import { describe, it, expect } from "vitest";
import { formatSen, formatRM, parseAmountToSen, normalizeMerchant } from "./money";

describe("formatSen / formatRM", () => {
  it("formats sen to 2dp with thousands separators", () => {
    expect(formatSen(850)).toBe("8.50");
    expect(formatSen(8)).toBe("0.08");
    expect(formatSen(100)).toBe("1.00");
    expect(formatSen(125000)).toBe("1,250.00");
    expect(formatSen(1234567)).toBe("12,345.67");
    expect(formatSen(0)).toBe("0.00");
    expect(formatSen(-850)).toBe("-8.50");
  });
  it("adds the RM prefix", () => {
    expect(formatRM(125000)).toBe("RM 1,250.00");
  });
});

describe("parseAmountToSen — gate cases", () => {
  it("parses plain decimals", () => {
    expect(parseAmountToSen("8.50")).toBe(850);
  });
  it("parses an RM prefix and a single decimal", () => {
    expect(parseAmountToSen("RM 8.5")).toBe(850);
    expect(parseAmountToSen("rm8.5")).toBe(850);
  });
  it("parses thousands separators", () => {
    expect(parseAmountToSen("1,250.00")).toBe(125000);
  });
  it("parses integers as whole ringgit", () => {
    expect(parseAmountToSen("8")).toBe(800);
    expect(parseAmountToSen("5200")).toBe(520000);
  });
  it("rejects strings with no number", () => {
    expect(parseAmountToSen("nasi lemak")).toBeNull();
    expect(parseAmountToSen("")).toBeNull();
  });
  it("round-trips through the formatter", () => {
    for (const s of [850, 8, 125000, 100, 999999]) {
      expect(parseAmountToSen(formatSen(s))).toBe(s);
    }
  });
});

describe("normalizeMerchant", () => {
  it("uppercases, collapses spaces, strips store numbers/punctuation", () => {
    expect(normalizeMerchant("Tealive SS15 #023")).toBe("TEALIVE SS15");
    expect(normalizeMerchant("  mcdonald's   klcc ")).toBe("MCDONALD S KLCC");
  });
});
