import { describe, expect, it } from "vitest";
import { dedupeHash, repeatKey } from "./dedupe";

const UID = "11111111-2222-3333-4444-555555555555";

/** Fingerprint a statement the way the importer does: number the repeats. */
async function fingerprint(
  rows: { date: string; amountSen: number; norm: string }[]
): Promise<string[]> {
  const seen = new Map<string, number>();
  const out: string[] = [];
  for (const r of rows) {
    const key = repeatKey(r.date, r.amountSen, r.norm);
    const nth = seen.get(key) ?? 0;
    seen.set(key, nth + 1);
    out.push(await dedupeHash(UID, r.date, r.amountSen, r.norm, nth));
  }
  return out;
}

const TEALIVE = { date: "2026-07-22", amountSen: 850, norm: "tealive" };
const GRAB = { date: "2026-07-21", amountSen: 1840, norm: "grab" };

describe("dedupeHash", () => {
  it("is stable for the same inputs", async () => {
    const a = await dedupeHash(UID, "2026-07-22", 850, "tealive");
    const b = await dedupeHash(UID, "2026-07-22", 850, "tealive");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{40}$/);
  });

  it("separates different users, dates, amounts and merchants", async () => {
    const base = await dedupeHash(UID, "2026-07-22", 850, "tealive");
    expect(await dedupeHash("other", "2026-07-22", 850, "tealive")).not.toBe(base);
    expect(await dedupeHash(UID, "2026-07-23", 850, "tealive")).not.toBe(base);
    expect(await dedupeHash(UID, "2026-07-22", 851, "tealive")).not.toBe(base);
    expect(await dedupeHash(UID, "2026-07-22", 850, "zus")).not.toBe(base);
  });

  it("leaves occurrence 0 byte-identical to the old formula", async () => {
    // Rows imported before the counter existed must keep matching, or a
    // re-import would duplicate everything already saved.
    const withDefault = await dedupeHash(UID, "2026-07-22", 850, "tealive");
    const explicitZero = await dedupeHash(UID, "2026-07-22", 850, "tealive", 0);
    expect(explicitZero).toBe(withDefault);
  });

  it("gives a repeated purchase its own fingerprint", async () => {
    const first = await dedupeHash(UID, "2026-07-22", 850, "tealive", 0);
    const second = await dedupeHash(UID, "2026-07-22", 850, "tealive", 1);
    expect(second).not.toBe(first);
  });
});

describe("statement fingerprinting", () => {
  it("keeps both of two identical purchases on the same day", async () => {
    const hashes = await fingerprint([TEALIVE, TEALIVE]);
    expect(new Set(hashes).size).toBe(2);
  });

  it("re-importing the same statement produces zero new rows", async () => {
    const rows = [TEALIVE, GRAB, TEALIVE, TEALIVE];
    const first = await fingerprint(rows);
    const second = await fingerprint(rows);
    expect(second).toEqual(first);

    const saved = new Set(first);
    expect(second.filter((h) => !saved.has(h))).toHaveLength(0);
  });

  it("an overlapping statement re-imports the shared row and adds the new one", async () => {
    // July statement had one Tealive; August's overlap shows two.
    const saved = new Set(await fingerprint([TEALIVE]));
    const incoming = await fingerprint([TEALIVE, TEALIVE]);
    const fresh = incoming.filter((h) => !saved.has(h));
    expect(fresh).toHaveLength(1);
    expect(saved.has(incoming[0])).toBe(true); // first is greyed out
  });

  it("order of unrelated rows does not shift the counters", async () => {
    const a = await fingerprint([TEALIVE, GRAB, TEALIVE]);
    const b = await fingerprint([TEALIVE, TEALIVE, GRAB]);
    expect(new Set(a)).toEqual(new Set(b));
  });
});

describe("repeatKey", () => {
  it("matches indistinguishable lines and separates distinct ones", () => {
    expect(repeatKey("2026-07-22", 850, "tealive")).toBe(
      repeatKey("2026-07-22", 850, "tealive")
    );
    expect(repeatKey("2026-07-22", 850, "tealive")).not.toBe(
      repeatKey("2026-07-22", 851, "tealive")
    );
  });
});
