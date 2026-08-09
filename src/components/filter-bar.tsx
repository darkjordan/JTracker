"use client";

import type { Category, TxType } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n-client";

export type TypeFilter = "all" | TxType;

// Search + type/category/reviewed filters for the transaction list.
export default function FilterBar({
  search,
  onSearch,
  type,
  onType,
  category,
  onCategory,
  categories,
  reviewedOnly,
  onReviewedOnly,
}: {
  search: string;
  onSearch: (v: string) => void;
  type: TypeFilter;
  onType: (v: TypeFilter) => void;
  category: string | null; // "" / null = all, "uncat", or category id
  onCategory: (v: string | null) => void;
  categories: Category[];
  reviewedOnly: boolean;
  onReviewedOnly: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const field =
    "rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-600 bg-white";
  const opts = categories.filter(
    (c) => type === "all" || c.type === type || c.type === "both"
  );

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={t("filter.search")}
        aria-label={t("filter.searchLabel")}
        className={`w-full ${field}`}
      />
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => onType(e.target.value as TypeFilter)}
          aria-label={t("filter.typeLabel")}
          className={`flex-1 ${field}`}
        >
          <option value="all">{t("filter.allTypes")}</option>
          <option value="expense">{t("filter.expenses")}</option>
          <option value="income">{t("filter.income")}</option>
        </select>
        <select
          value={category ?? ""}
          onChange={(e) => onCategory(e.target.value || null)}
          aria-label={t("filter.categoryLabel")}
          className={`flex-1 ${field}`}
        >
          <option value="">{t("filter.allCategories")}</option>
          <option value="uncat">{t("entry.uncategorized")}</option>
          {opts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ""}
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onReviewedOnly(!reviewedOnly)}
          aria-pressed={reviewedOnly}
          className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-medium ${
            reviewedOnly
              ? "border-indigo-600 bg-indigo-50 text-indigo-700"
              : "border-gray-300 text-gray-500"
          }`}
        >
          {t("filter.toReview")}
        </button>
      </div>
    </div>
  );
}
