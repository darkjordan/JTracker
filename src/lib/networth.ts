// Pure net-worth math over manual account balances. Money stays in sen.

import type { TFn } from "@/lib/i18n";

export type AccountKind =
  | "cash"
  | "bank"
  | "ewallet"
  | "investment"
  | "asset"
  | "liability";

export type AccountRow = {
  id: string;
  name: string;
  kind: AccountKind;
  balance_sen: number;
  sort_order: number;
};

export function kindLabel(kind: AccountKind, t: TFn): string {
  return t(`kind.${kind}`);
}

export const ACCOUNT_KINDS: AccountKind[] = [
  "cash",
  "bank",
  "ewallet",
  "investment",
  "asset",
  "liability",
];

export function isLiability(kind: AccountKind): boolean {
  return kind === "liability";
}

export type NetWorth = {
  assetsSen: number;
  liabilitiesSen: number;
  netSen: number;
};

/** Net worth = Σ asset balances − Σ liability balances. */
export function netWorth(accounts: AccountRow[]): NetWorth {
  let assetsSen = 0;
  let liabilitiesSen = 0;
  for (const a of accounts) {
    if (isLiability(a.kind)) liabilitiesSen += a.balance_sen;
    else assetsSen += a.balance_sen;
  }
  return { assetsSen, liabilitiesSen, netSen: assetsSen - liabilitiesSen };
}
