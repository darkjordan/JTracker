import { describe, expect, it } from "vitest";
import { buildAgeDays, buildLabel } from "./version";

describe("buildLabel", () => {
  it("renders the sha and build time in Malaysian local time", () => {
    // 11:17 UTC is 19:17 in Kuala Lumpur (UTC+8).
    expect(buildLabel("e4298bd", "2026-08-03T11:17:04Z")).toBe(
      "e4298bd · 3 Aug 2026, 19:17"
    );
  });

  it("falls back to the sha alone when there is no timestamp", () => {
    expect(buildLabel("e4298bd", "")).toBe("e4298bd");
  });

  it("does not render Invalid Date for a malformed timestamp", () => {
    expect(buildLabel("e4298bd", "not-a-date")).toBe("e4298bd");
  });

  it("shows dev for an unstamped local build", () => {
    expect(buildLabel("dev", "")).toBe("dev");
  });
});

describe("buildAgeDays", () => {
  it("counts whole days since the build", () => {
    const age = buildAgeDays("2026-08-01T00:00:00Z", new Date("2026-08-03T12:00:00Z"));
    expect(age).toBe(2);
  });

  it("is 0 for a build made today", () => {
    const age = buildAgeDays("2026-08-03T00:00:00Z", new Date("2026-08-03T12:00:00Z"));
    expect(age).toBe(0);
  });

  it("returns null when unstamped", () => {
    expect(buildAgeDays("")).toBe(null);
  });
});
