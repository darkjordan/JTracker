"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";

export type MainTab = "add" | "history";

const tabClass = (active: boolean) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
    active ? "text-indigo-600" : "text-gray-400"
  }`;

// Fixed bottom tab bar: Add/History switch local state on the dashboard;
// Net Worth is a real route (its own PIN-gated state machine), so it's a
// plain link rather than a controlled tab.
export default function TabBar({
  tab,
  onTab,
}: {
  tab: MainTab;
  onTab: (t: MainTab) => void;
}) {
  const { t } = useI18n();
  const TABS: { id: MainTab; icon: string; label: string }[] = [
    { id: "add", icon: "➕", label: t("tab.add") },
    { id: "history", icon: "📜", label: t("tab.history") },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={tabClass(tab === t.id)}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
        <Link href="/networth" className={tabClass(false)}>
          <span className="text-lg leading-none">📈</span>
          {t("tab.netWorth")}
        </Link>
      </div>
    </nav>
  );
}
