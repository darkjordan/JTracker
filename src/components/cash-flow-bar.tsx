import { formatSen } from "@/lib/money";
import type { CashFlow } from "@/lib/stats";

// Where the month's income went: a proportional bar of expense categories +
// what was saved (SPEC §5 "cash-flow breakdown").
export default function CashFlowBar({ cf }: { cf: CashFlow }) {
  if (cf.incomeSen === 0 && cf.expenseSen === 0) return null;
  const base = Math.max(cf.incomeSen, cf.expenseSen, 1);
  const overspent = cf.expenseSen > cf.incomeSen;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">Cash flow</p>
        <p className="text-xs text-gray-500">Income RM {formatSen(cf.incomeSen)}</p>
      </div>

      <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-gray-100">
        {cf.segments.map((s) => (
          <div
            key={s.id}
            style={{ width: `${(s.valueSen / base) * 100}%`, background: s.color }}
            title={`${s.name} ${formatSen(s.valueSen)}`}
          />
        ))}
        {cf.savedSen > 0 && (
          <div
            style={{ width: `${(cf.savedSen / base) * 100}%`, background: "#10b981" }}
            title={`Saved ${formatSen(cf.savedSen)}`}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {cf.segments.slice(0, 6).map((s) => (
          <span key={s.id} className="flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name} {formatSen(s.valueSen)}
          </span>
        ))}
        {cf.savedSen > 0 && (
          <span className="flex items-center gap-1 font-medium text-emerald-700">
            <i className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Saved {formatSen(cf.savedSen)}
          </span>
        )}
        {overspent && (
          <span className="font-medium text-red-600">
            Overspent by {formatSen(cf.expenseSen - cf.incomeSen)}
          </span>
        )}
      </div>
    </div>
  );
}
