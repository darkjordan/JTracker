"use client";

export type MainTab = "add" | "history";

const TABS: { id: MainTab; icon: string; label: string }[] = [
  { id: "add", icon: "➕", label: "Add" },
  { id: "history", icon: "📜", label: "History" },
];

// Fixed bottom tab bar switching between data entry and transaction history.
export default function TabBar({
  tab,
  onTab,
}: {
  tab: MainTab;
  onTab: (t: MainTab) => void;
}) {
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
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
              tab === t.id ? "text-indigo-600" : "text-gray-400"
            }`}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
