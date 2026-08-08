"use client";

import type { KeyboardEvent } from "react";
import { formatSen } from "@/lib/money";

// Cash-register style amount entry: every digit typed shifts in from the
// right, so "1005" reads as RM10.05 with no decimal point to type. `sen`
// is the source of truth (0 = empty field).
export default function AmountInput({
  sen,
  onChangeSen,
  onKeyDown,
  autoFocus,
  className,
  ariaLabel = "Amount",
}: {
  sen: number;
  onChangeSen: (sen: number) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  function handleChange(v: string) {
    const digits = v.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    onChangeSen(digits ? parseInt(digits, 10) : 0);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={sen > 0 ? formatSen(sen) : ""}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder="0.00"
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      className={className}
    />
  );
}
