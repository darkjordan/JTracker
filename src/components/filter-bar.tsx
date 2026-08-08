"use client";

import type { Category, TxType } from "@/lib/api/types";

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
  showScopeToggle,
  scope,
  onScope,
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
  /** Only show the Myself/Household toggle when in a shared (>1 active member) household. */
  showScopeToggle?: boolean;
  scope?: "self" | "household";
  onScope?: (v: "self" | "household") => void;
}) {
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
        placeholder="Search merchant…"
        aria-label="Search"
        className={`w-full ${field}`}
      />
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => onType(e.target.value as TypeFilter)}
          aria-label="Type filter"
          className={`flex-1 ${field}`}
        >
          <option value="all">All types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>
        <select
          value={category ?? ""}
          onChange={(e) => onCategory(e.target.value || null)}
          aria-label="Category filter"
          className={`flex-1 ${field}`}
        >
          <option value="">All categories</option>
          <option value="uncat">Uncategorized</option>
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
          To review
        </button>
      </div>
      {showScopeToggle && scope && onScope && (
        <div className="flex gap-2" role="group" aria-label="Data scope">
          {(["household", "self"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onScope(s)}
              aria-pressed={scope === s}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                scope === s
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-gray-300 text-gray-500"
              }`}
            >
              {s === "household" ? "Household" : "Myself"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
