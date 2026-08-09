"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";

const DISMISS_KEY = "jtracker:ssoNudgeDismissed";

// Anonymous data is deleted by the purge_stale_anon job after 30 days idle
// (or 1 day if empty) — this nudge exists because that's a real data-loss
// risk, not just a growth prompt. One-time dismiss, not a recurring nag.
export default function SsoNudge() {
  const [dismissed, setDismissed] = useState(true); // hidden until checked
  const { t } = useI18n();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore storage failures (private mode) */
    }
  }

  if (dismissed) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-200">
      <span className="text-lg">💾</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-indigo-900">{t("nudge.title")}</p>
        <p className="mt-0.5 text-xs text-indigo-700">{t("nudge.body")}</p>
        <Link
          href="/login"
          className="mt-2 inline-block text-xs font-semibold text-indigo-700 underline"
        >
          {t("settings.signInGoogle")}
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("nudge.dismiss")}
        className="shrink-0 text-indigo-400"
      >
        ✕
      </button>
    </div>
  );
}
