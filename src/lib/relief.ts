// Pure tax-relief aggregation (client-side, zero AI). Money stays in sen.

export type ReliefRow = {
  code: string;
  name: string;
  capSen: number | null; // effective cap (user override or LHDN default)
  notes?: string | null;
};

export type ReliefProgress = ReliefRow & {
  spentSen: number;
  pct: number | null; // null when there's no cap
};

type ReliefTxn = {
  tax_relief_code: string | null;
  amount_sen: number;
  type: string;
};

/** Sum expense amounts per relief code (income and untagged rows ignored). */
export function spendByReliefCode(txns: ReliefTxn[]): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const t of txns) {
    if (t.type !== "expense" || !t.tax_relief_code) continue;
    acc[t.tax_relief_code] = (acc[t.tax_relief_code] ?? 0) + t.amount_sen;
  }
  return acc;
}

/** Merge reliefs with spend into progress rows, most-spent first. */
export function reliefProgress(
  reliefs: ReliefRow[],
  spend: Record<string, number>
): ReliefProgress[] {
  return reliefs
    .map((r) => {
      const spentSen = spend[r.code] ?? 0;
      const pct =
        r.capSen && r.capSen > 0
          ? Math.min(100, Math.round((spentSen / r.capSen) * 100))
          : null;
      return { ...r, spentSen, pct };
    })
    .sort((a, b) => b.spentSen - a.spentSen);
}

/** Total claimed across all relief codes. */
export function totalReliefSen(spend: Record<string, number>): number {
  return Object.values(spend).reduce((a, b) => a + b, 0);
}
