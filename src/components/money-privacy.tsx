"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "@/lib/i18n-client";

const KEY = "jtracker:hideAmounts";
const MASK = "••••";

type Ctx = { hidden: boolean; toggle: () => void };
const MoneyPrivacyCtx = createContext<Ctx>({ hidden: false, toggle: () => {} });

export function MoneyPrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // One-time read of the persisted preference from localStorage (an external
    // system). Kept in an effect (not a lazy initializer) to avoid an SSR/
    // hydration mismatch, since the server can't read localStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(localStorage.getItem(KEY) === "1");
  }, []);

  const toggle = () =>
    setHidden((h) => {
      const next = !h;
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        /* ignore storage failures (private mode) */
      }
      return next;
    });

  return (
    <MoneyPrivacyCtx.Provider value={{ hidden, toggle }}>
      {children}
    </MoneyPrivacyCtx.Provider>
  );
}

export function useMoneyPrivacy() {
  return useContext(MoneyPrivacyCtx);
}

/** Mask helper: returns the placeholder when hidden, else the formatted value. */
export function mask(hidden: boolean, formatted: string): string {
  return hidden ? MASK : formatted;
}

/** Eye toggle button for the header. */
export function PrivacyToggle() {
  const { hidden, toggle } = useMoneyPrivacy();
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={hidden ? t("privacy.showAmounts") : t("privacy.hideAmounts")}
      aria-pressed={hidden}
      className="rounded-lg p-1.5 text-gray-500 active:bg-gray-100"
    >
      {hidden ? (
        // eye-off
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A18.5 18.5 0 0 0 2 12s3 8 10 8a9.12 9.12 0 0 0 5.39-1.61" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </svg>
      ) : (
        // eye
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}
