// Stable per-transaction fingerprint to prevent double-importing a statement.
// SPEC §3: sha1(user_id + occurred_at + amount_sen + merchant_norm).
export async function dedupeHash(
  userId: string,
  occurredAt: string,
  amountSen: number,
  merchantNorm: string
): Promise<string> {
  const input = `${userId}|${occurredAt}|${amountSen}|${merchantNorm}`;
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
