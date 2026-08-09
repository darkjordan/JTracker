// Pure net-worth math over PIN-gated personal items (investments, EPF,
// property, etc.) — separate ledger from lib/networth.ts's `accounts`.
// Money stays in sen.

import type { TFn } from "@/lib/i18n";

export type ItemKind = "investment" | "epf" | "property" | "other" | "liability";

export type NetWorthItem = {
  id: string;
  name: string;
  kind: ItemKind;
  balance_sen: number;
  sort_order: number;
};

export function kindLabel(kind: ItemKind, t: TFn): string {
  return t(`kind.${kind}`);
}

export const ITEM_KINDS: ItemKind[] = [
  "investment",
  "epf",
  "property",
  "other",
  "liability",
];

export function isLiability(kind: ItemKind): boolean {
  return kind === "liability";
}

export type NetWorth = {
  assetsSen: number;
  liabilitiesSen: number;
  netSen: number;
};

/** Net worth = Σ asset balances − Σ liability balances. */
export function netWorth(items: NetWorthItem[]): NetWorth {
  let assetsSen = 0;
  let liabilitiesSen = 0;
  for (const it of items) {
    if (isLiability(it.kind)) liabilitiesSen += it.balance_sen;
    else assetsSen += it.balance_sen;
  }
  return { assetsSen, liabilitiesSen, netSen: assetsSen - liabilitiesSen };
}
