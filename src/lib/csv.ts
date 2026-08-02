import type { Transaction, Category } from "./api/types";
import { formatSen } from "./money";

function cell(v: string | null | undefined): string {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Full transaction export — the data-safety escape hatch (SPEC §7). */
export function transactionsToCsv(
  txns: Transaction[],
  categories: Category[]
): string {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const header = [
    "Date",
    "Type",
    "Amount (RM)",
    "Merchant",
    "Category",
    "Tax relief",
    "Source",
    "Note",
  ];
  const rows = txns.map((t) => [
    t.occurred_at,
    t.type,
    formatSen(t.amount_sen),
    t.merchant,
    t.category_id ? catName.get(t.category_id) ?? "" : "",
    t.tax_relief_code ?? "",
    t.source,
    t.note ?? "",
  ]);
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
