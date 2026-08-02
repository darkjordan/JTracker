export type TxType = "income" | "expense";
export type TxSource = "manual" | "text" | "screenshot" | "pdf";

export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  type: "income" | "expense" | "both";
  sort_order: number;
};

export type Transaction = {
  id: string;
  type: TxType;
  amount_sen: number;
  currency: string;
  merchant: string;
  merchant_norm: string;
  category_id: string | null;
  tax_relief_code: string | null;
  occurred_at: string; // YYYY-MM-DD
  note: string | null;
  source: TxSource;
  reviewed: boolean;
  created_at: string;
};

export type NewTransaction = {
  type: TxType;
  amount_sen: number;
  merchant: string;
  merchant_norm?: string;
  category_id?: string | null;
  tax_relief_code?: string | null;
  occurred_at?: string;
  note?: string | null;
  source?: TxSource;
};
