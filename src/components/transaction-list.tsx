"use client";

import { formatSen } from "@/lib/money";
import { useI18n } from "@/lib/i18n-client";
import type { Lang } from "@/lib/i18n";
import type { Category, Transaction } from "@/lib/api/types";
import type { MemberBadge } from "@/lib/member-colors";

const LOCALES: Record<Lang, string> = {
  en: "en-MY",
  zh: "zh-CN",
  ms: "ms-MY",
};

function dayLabel(dateStr: string, lang: Lang): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(LOCALES[lang], {
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
  const { t, lang } = useI18n();
  return (
    <>
      {groups.map(([date, rows]) => (
        <div key={date} className="mb-4">
          <p className="px-1 pb-1 text-xs font-medium text-gray-400">
            {dayLabel(date, lang)}
          </p>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {rows.map((txn) => {
              const cat = txn.category_id ? catById.get(txn.category_id) : null;
              const who = members?.get(txn.user_id);
              return (
                <li
                  key={txn.id}
                  className="flex items-center"
                  style={who ? { borderLeft: `3px solid ${who.color}` } : undefined}
                >
                  <button
                    type="button"
                    onClick={() => onEdit(txn)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left active:bg-gray-50"
                  >
                    <span className="text-xl">{cat?.icon ?? "❓"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-gray-900">
                        {txn.merchant || (cat?.name ?? t("entry.uncategorized"))}
                      </span>
                      <span className="block truncate text-xs text-gray-400">
                        {cat?.name ?? t("entry.uncategorized")}
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
                        txn.type === "income" ? "text-emerald-600" : "text-gray-900"
                      }`}
                    >
                      {txn.type === "income" ? "+" : "−"}
                      {formatSen(txn.amount_sen)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleReviewed(txn)}
                    aria-label={
                      txn.reviewed ? t("txn.markToReview") : t("txn.markReviewed")
                    }
                    aria-pressed={txn.reviewed}
                    className="shrink-0 px-3 py-3"
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                        txn.reviewed
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
