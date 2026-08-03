import type { Category, TxType } from "@/lib/api/types";

// Maps a category name suggested by the model back to one of the user's own
// categories. The model is told to pick from that list, but it still returns
// free text — different case, "and" for "&", a stray plural. Anything that does
// not resolve to a real category stays Uncategorized rather than guessing:
// a wrong category is worse than none, because it looks already-done.

/** Case/punctuation-insensitive form: "Food & Drink" and "food and drink" agree. */
function canonical(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Resolve a suggested name to a category id valid for this row's direction.
 * Returns "" (Uncategorized) when there is no confident match.
 */
export function matchCategoryId(
  suggested: string | null | undefined,
  categories: Category[],
  type: TxType
): string {
  const want = canonical(suggested ?? "");
  if (!want || want === "uncategorized") return "";
  // An expense row must not land in an income-only category.
  const usable = categories.filter((c) => c.type === type || c.type === "both");
  return usable.find((c) => canonical(c.name) === want)?.id ?? "";
}
