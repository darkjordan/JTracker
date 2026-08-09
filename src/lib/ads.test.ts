import { describe, expect, it } from "vitest";
import { isWithinGracePeriod } from "./ads";

describe("isWithinGracePeriod", () => {
  const now = new Date("2026-08-09T00:00:00Z");

  it("is true for a brand-new account", () => {
    expect(isWithinGracePeriod(now, 7, now)).toBe(true);
  });

  it("is true just before the boundary", () => {
    const createdAt = new Date(now.getTime() - 6 * 86_400_000 - 1000);
    expect(isWithinGracePeriod(createdAt, 7, now)).toBe(true);
  });

  it("is false exactly at the boundary", () => {
    const createdAt = new Date(now.getTime() - 7 * 86_400_000);
    expect(isWithinGracePeriod(createdAt, 7, now)).toBe(false);
  });

  it("is false once past the grace window", () => {
    const createdAt = new Date(now.getTime() - 30 * 86_400_000);
    expect(isWithinGracePeriod(createdAt, 7, now)).toBe(false);
  });

  it("with graceDays=0, ads can start immediately", () => {
    expect(isWithinGracePeriod(now, 0, now)).toBe(false);
  });

  it("accepts a string createdAt (as returned by supabase-js)", () => {
    expect(isWithinGracePeriod(now.toISOString(), 7, now)).toBe(true);
  });
});
