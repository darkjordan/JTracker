// Money lives here and nowhere else.
//
// RULE (see CLAUDE.md / SPEC §11): all money is an integer number of sen. Money
// never exists as a float outside this file. Every money variable ends in `_sen`
// or `Sen`. Convert to a human string only at the very edge, via the formatters
// below. v1 is MYR only.

/** Format sen as a plain amount string with thousands separators, e.g. 125000 → "1,250.00". */
export function formatSen(sen: number): string {
  const rounded = Math.round(sen);
  const neg = rounded < 0;
  const abs = Math.abs(rounded);
  const intPart = Math.trunc(abs / 100);
  const fracPart = abs % 100;
  const intStr = String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${intStr}.${String(fracPart).padStart(2, "0")}`;
}

/** Format sen with the RM prefix, e.g. 125000 → "RM 1,250.00". */
export function formatRM(sen: number): string {
  return `RM ${formatSen(sen)}`;
}

/**
 * Parse a bare amount string into integer sen. Tolerant of an `RM` prefix,
 * surrounding spaces, and thousands separators. Returns null if no numeric
 * amount is present. Examples: "8.50"→850, "RM 8.5"→850, "1,250.00"→125000,
 * "8"→800. More than two decimal places, or no digits, → null.
 */
export function parseAmountToSen(input: string): number | null {
  if (typeof input !== "string") return null;
  // Anchor on a number: optional thousands groups, optional 1–2 decimals.
  const m = input.match(/(\d[\d,]*)(?:\.(\d{1,2}))?/);
  if (!m) return null;
  const intDigits = m[1].replace(/,/g, "");
  if (!intDigits) return null;
  const fracDigits = (m[2] ?? "").padEnd(2, "0").slice(0, 2);
  const sen = parseInt(intDigits, 10) * 100 + parseInt(fracDigits || "0", 10);
  return Number.isFinite(sen) ? sen : null;
}

/**
 * Normalize a merchant string into a stable key for merchant_memory / dedupe:
 * uppercase, collapse whitespace, strip trailing store numbers and common
 * punctuation. e.g. "Tealive SS15 #023" → "TEALIVE SS15".
 */
export function normalizeMerchant(merchant: string): string {
  return (merchant ?? "")
    .toUpperCase()
    .replace(/#\s*\d+/g, " ") // store numbers like "#023"
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // punctuation → space
    .replace(/\s+/g, " ")
    .trim();
}
