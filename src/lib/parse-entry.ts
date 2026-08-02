// Local quick-entry parser — the everyday cash path.
//
// SPEC §4.1 / R2: free-text quick entry does NOT call AI. Parse locally: pull
// the amount out with a regex, flip to income on the "income" keyword, and treat
// the remaining text as the merchant/description. Category resolution (via
// merchant_memory) happens downstream, not here.

import { parseAmountToSen, normalizeMerchant } from "./money";

export type ParsedEntry = {
  amountSen: number;
  type: "income" | "expense";
  merchant: string;
  merchantNorm: string;
};

// The literal keyword that flips a line to income (SPEC example: "salary 5200 income").
const INCOME_RE = /\bincome\b/i;

// An amount token: optional "RM" prefix, digits with optional thousands commas,
// optional 1–2 decimals. Global so we can pick the best candidate.
const AMOUNT_RE = /(?:rm\s*)?\d[\d,]*(?:\.\d{1,2})?/gi;

/**
 * Parse a quick-entry line like "nasi lemak 8.50" or "salary 5200 income".
 * Returns null if there's no usable positive amount (no-amount rejection).
 */
export function parseQuickEntry(input: string): ParsedEntry | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  const matches = [...raw.matchAll(AMOUNT_RE)];
  if (matches.length === 0) return null;

  // Prefer an RM-prefixed or decimal amount; otherwise take the last number
  // (descriptions rarely end in the price's position, and trailing amounts are
  // the common "nasi lemak 8.50" shape).
  const preferred =
    matches.find((m) => /rm/i.test(m[0]) || m[0].includes(".")) ??
    matches[matches.length - 1];

  const amountSen = parseAmountToSen(preferred[0]);
  if (amountSen === null || amountSen <= 0) return null;

  // Merchant = the line minus the matched amount token and the income keyword.
  const start = preferred.index ?? 0;
  const merchant = (raw.slice(0, start) + raw.slice(start + preferred[0].length))
    .replace(INCOME_RE, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    amountSen,
    type: INCOME_RE.test(raw) ? "income" : "expense",
    merchant,
    merchantNorm: normalizeMerchant(merchant),
  };
}
