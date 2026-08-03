import { describe, expect, it } from "vitest";
import { matchCategoryId } from "./category-match";
import type { Category } from "./api/types";

const cats: Category[] = [
  { id: "food", user_id: null, name: "Food & Drink", icon: "🍜", color: null, type: "expense", sort_order: 10 },
  { id: "transport", user_id: null, name: "Transport", icon: "🚗", color: null, type: "expense", sort_order: 20 },
  { id: "salary", user_id: null, name: "Salary", icon: "💰", color: null, type: "income", sort_order: 30 },
  { id: "other", user_id: null, name: "Other", icon: null, color: null, type: "both", sort_order: 40 },
];

describe("matchCategoryId", () => {
  it("matches an exact name", () => {
    expect(matchCategoryId("Transport", cats, "expense")).toBe("transport");
  });

  it("ignores case and spacing", () => {
    expect(matchCategoryId("  transport ", cats, "expense")).toBe("transport");
  });

  it("treats & and 'and' as the same", () => {
    expect(matchCategoryId("Food and Drink", cats, "expense")).toBe("food");
    expect(matchCategoryId("food & drink", cats, "expense")).toBe("food");
  });

  it("allows a both-type category for either direction", () => {
    expect(matchCategoryId("Other", cats, "expense")).toBe("other");
    expect(matchCategoryId("Other", cats, "income")).toBe("other");
  });

  it("refuses an income category for an expense row", () => {
    expect(matchCategoryId("Salary", cats, "expense")).toBe("");
    expect(matchCategoryId("Salary", cats, "income")).toBe("salary");
  });

  it("returns Uncategorized for a category the user does not have", () => {
    expect(matchCategoryId("Cryptocurrency", cats, "expense")).toBe("");
  });

  it("treats an explicit 'Uncategorized' as no match", () => {
    expect(matchCategoryId("Uncategorized", cats, "expense")).toBe("");
  });

  it("handles missing, empty and punctuation-only suggestions", () => {
    expect(matchCategoryId(undefined, cats, "expense")).toBe("");
    expect(matchCategoryId(null, cats, "expense")).toBe("");
    expect(matchCategoryId("", cats, "expense")).toBe("");
    expect(matchCategoryId("---", cats, "expense")).toBe("");
  });

  it("does not partial-match a different category", () => {
    // "Food" alone must not silently become "Food & Drink" — too loose a guess.
    expect(matchCategoryId("Food", cats, "expense")).toBe("");
  });
});
