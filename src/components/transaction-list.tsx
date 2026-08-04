"use client";

import { formatSen } from "@/lib/money";
import type { Category, Transaction } from "@/lib/api/types";
import type { MemberBadge } from "@/lib/member-colors";

function dayLabel(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Transactions grouped by day, each row tappable to edit, with a reviewed check.
export default function TransactionList({
  groups,
  catById,
  members,
  onEdit,
  onToggleReviewed,
}: {
  groups: [string, Transaction[]][];
  catById: Map<string, Category>;
  members?: Map<string, MemberBadge>;
  onEdit: (t: Transaction) => void;
  onToggleReviewed: (t: Transaction) => void;
}) {
  return (
    <>
      {groups.map(([date, rows]) => (
        <div key={date} className="mb-4">
          <p className="px-1 pb-1 text-xs font-medium text-gray-400">
            {dayLabel(date)}
          </p>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {rows.map((t) => {
              const cat = t.category_id ? catById.get(t.category_id) : null;
              const who = members?.get(t.user_id);
              return (
                <li
                  key={t.id}
                  className="flex items-center"
                  style={who ? { borderLeft: `3px solid ${who.color}` } : undefined}
                >
                  <button
                    type="button"
                    onClick={() => onEdit(t)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left active:bg-gray-50"
                  >
                    <span className="text-xl">{cat?.icon ?? "❓"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-gray-900">
                        {t.merchant || (cat?.name ?? "Uncategorized")}
                      </span>
                      <span className="block truncate text-xs text-gray-400">
                        {cat?.name ?? "Uncategorized"}
                        {who && (
                          <>
                            {" · "}
                            <span style={{ color: who.color }} className="font-medium">
                              {who.label}
                            </span>
                          </>
                        )}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 font-semibold tabular-nums ${
                        t.type === "income" ? "text-emerald-600" : "text-gray-900"
                      }`}
                    >
                      {t.type === "income" ? "+" : "−"}
                      {formatSen(t.amount_sen)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleReviewed(t)}
                    aria-label={t.reviewed ? "Mark to review" : "Mark reviewed"}
                    aria-pressed={t.reviewed}
                    className="shrink-0 px-3 py-3"
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                        t.reviewed
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-gray-300 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}
