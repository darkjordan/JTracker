// Stable per-transaction fingerprint to prevent double-importing a statement.
// SPEC §3: sha1(user_id + occurred_at + amount_sen + merchant_norm), plus an
// occurrence counter.
//
// Without the counter, two genuinely separate purchases — same shop, same
// amount, same day — fingerprint identically, and the UNIQUE (user_id,
// dedupe_hash) index throws the second one away. Buying the same coffee twice
// is not a double import. The counter separates repeats by their position among
// identical lines in the statement, and stays deterministic: importing the same
// file again recomputes the same counters, so re-imports still dedupe to zero.
export async function dedupeHash(
  userId: string,
  occurredAt: string,
  amountSen: number,
  merchantNorm: string,
  occurrence = 0
): Promise<string> {
  const base = `${userId}|${occurredAt}|${amountSen}|${merchantNorm}`;
  // The first occurrence keeps the original input verbatim, so fingerprints
  // stored by earlier imports stay valid and keep matching.
  const input = occurrence === 0 ? base : `${base}|#${occurrence}`;
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Identifies statement lines that are indistinguishable from one another. Rows
 * sharing a key are the same purchase repeated, and take successive occurrence
 * numbers.
 */
export function repeatKey(
  occurredAt: string,
  amountSen: number,
  merchantNorm: string
): string {
  return `${occurredAt}|${amountSen}|${merchantNorm}`;
}
