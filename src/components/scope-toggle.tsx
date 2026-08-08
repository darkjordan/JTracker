"use client";

export type Scope = "self" | "household";

// Myself/Household switch — scopes the whole History tab (KPIs, charts,
// list), not just the transaction list, so it sits above them all.
export default function ScopeToggle({
  scope,
  onScope,
  disabled,
}: {
  scope: Scope;
  onScope: (v: Scope) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="mb-3 flex gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-black/5"
      role="group"
      aria-label="Data scope"
    >
      {(["household", "self"] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onScope(s)}
          disabled={disabled}
          aria-pressed={scope === s}
          className={`flex-1 rounded-xl py-1.5 text-sm font-medium disabled:opacity-50 ${
            scope === s
              ? "bg-indigo-50 text-indigo-700"
              : "text-gray-500"
          }`}
        >
          {s === "household" ? "Household" : "Myself"}
        </button>
      ))}
    </div>
  );
}
