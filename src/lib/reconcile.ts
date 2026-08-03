// Statement reconciliation: does opening + movements == closing?
// The check exists to catch rows the model misread, so a false alarm is costly
// — it tells the user their correct import is wrong.
//
// The catch is that the two statement types run in opposite directions:
//   deposit account — money in raises the balance:  opening + credit − debit
//   credit card     — a purchase raises what you owe: opening + debit − credit
// A card statement scored with the account formula misses by exactly twice the
// net movement, which is why every card import looked broken. We accept either
// orientation: if one of them lands on the closing balance the rows add up.

/** Cents of slack, for statements that round their printed balances. */
const TOLERANCE_SEN = 10;

export type ReconcileInput = {
  openingSen: number;
  closingSen: number;
  creditSen: number;
  debitSen: number;
};

export type Reconciliation = {
  ok: boolean;
  /** The closer of the two orientations, for the warning text. */
  computedSen: number;
  /** Which convention matched — null when neither did. */
  basis: "account" | "card" | null;
};

export function reconcile(i: ReconcileInput): Reconciliation {
  const account = i.openingSen + i.creditSen - i.debitSen;
  const card = i.openingSen + i.debitSen - i.creditSen;
  const dAccount = Math.abs(account - i.closingSen);
  const dCard = Math.abs(card - i.closingSen);

  if (dAccount <= TOLERANCE_SEN) return { ok: true, computedSen: account, basis: "account" };
  if (dCard <= TOLERANCE_SEN) return { ok: true, computedSen: card, basis: "card" };
  return {
    ok: false,
    computedSen: dAccount <= dCard ? account : card,
    basis: null,
  };
}
