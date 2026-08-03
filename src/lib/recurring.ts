// Pure recurring-charge detection from transaction history (zero AI, SPEC §10
// Phase 7). Groups expenses by normalized merchant and flags roughly-monthly
// series so subscriptions surface with a plausible next-due date.

export type RecurringTxn = {
  merchant: string;
  merchant_norm: string;
  amount_sen: number;
  type: string;
  occurred_at: string; // YYYY-MM-DD
};

export type RecurringHit = {
  merchant: string;
  merchantNorm: string;
  amountSen: number; // representative (median) amount
  count: number;
  lastDate: string;
  nextDue: string;
  intervalDays: number;
};

const DAY = 86400000;
const toDays = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / DAY);
const fromDays = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/**
 * Detect roughly-monthly recurring expenses. A series needs at least `minCount`
 * charges (default 3) from the same merchant with a median gap of ~24–35 days.
 * Dismissed merchants (by merchant_norm) are excluded.
 */
export function detectRecurring(
  txns: RecurringTxn[],
  dismissed: Set<string> = new Set(),
  opts: { minCount?: number } = {}
): RecurringHit[] {
  const minCount = opts.minCount ?? 3;
  const groups = new Map<string, RecurringTxn[]>();
  for (const t of txns) {
    if (t.type !== "expense" || !t.merchant_norm) continue;
    if (dismissed.has(t.merchant_norm)) continue;
    const arr = groups.get(t.merchant_norm) ?? [];
    arr.push(t);
    groups.set(t.merchant_norm, arr);
  }

  const hits: RecurringHit[] = [];
  for (const [norm, list] of groups) {
    if (list.length < minCount) continue;
    const sorted = [...list].sort(
      (a, b) => toDays(a.occurred_at) - toDays(b.occurred_at)
    );
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(toDays(sorted[i].occurred_at) - toDays(sorted[i - 1].occurred_at));
    }
    const gap = median(gaps);
    if (gap < 24 || gap > 35) continue; // not monthly

    const last = sorted[sorted.length - 1];
    hits.push({
      merchant: last.merchant || norm,
      merchantNorm: norm,
      amountSen: median(sorted.map((t) => t.amount_sen)),
      count: sorted.length,
      lastDate: last.occurred_at,
      nextDue: fromDays(toDays(last.occurred_at) + gap),
      intervalDays: gap,
    });
  }
  return hits.sort((a, b) => toDays(a.nextDue) - toDays(b.nextDue));
}

/** Sum of representative amounts — the estimated monthly subscription spend. */
export function monthlyTotalSen(hits: RecurringHit[]): number {
  return hits.reduce((a, h) => a + h.amountSen, 0);
}

// ---- User-planned recurring items ----
export type Cadence = "weekly" | "monthly" | "yearly";

export type RecurringPlan = {
  id: string;
  name: string;
  amount_sen: number;
  cadence: Cadence;
  next_due: string | null;
  category_id: string | null;
};

/** Normalize any cadence to a monthly-equivalent amount (for the total). */
export function monthlyEquivalentSen(amountSen: number, cadence: Cadence): number {
  if (cadence === "weekly") return Math.round((amountSen * 52) / 12);
  if (cadence === "yearly") return Math.round(amountSen / 12);
  return amountSen;
}

export function plansMonthlySen(plans: RecurringPlan[]): number {
  return plans.reduce(
    (a, p) => a + monthlyEquivalentSen(p.amount_sen, p.cadence),
    0
  );
}
