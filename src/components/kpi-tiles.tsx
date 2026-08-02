import { formatRM } from "@/lib/money";
import { useMoneyPrivacy, mask } from "@/components/money-privacy";
import type { Kpis } from "@/lib/stats";

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-0.5 truncate text-lg font-bold tabular-nums ${tone}`}>
        {value}
      </p>
    </div>
  );
}

// The four Reports KPI tiles: Income · Expenses · Net · Savings rate.
export default function KpiTiles({ kpis }: { kpis: Kpis }) {
  const { hidden } = useMoneyPrivacy();
  const netTone = kpis.netSen >= 0 ? "text-emerald-600" : "text-red-600";
  const rate = kpis.savingsRatePct === null ? "—" : `${kpis.savingsRatePct}%`;
  const rateTone =
    kpis.savingsRatePct === null || kpis.savingsRatePct >= 0
      ? "text-emerald-600"
      : "text-red-600";

  return (
    <div className="grid grid-cols-2 gap-2">
      <Tile label="Income" value={mask(hidden, formatRM(kpis.incomeSen))} tone="text-emerald-600" />
      <Tile label="Expenses" value={mask(hidden, formatRM(kpis.expenseSen))} tone="text-gray-900" />
      <Tile label="Net" value={mask(hidden, formatRM(kpis.netSen))} tone={netTone} />
      <Tile label="Savings rate" value={rate} tone={rateTone} />
    </div>
  );
}
