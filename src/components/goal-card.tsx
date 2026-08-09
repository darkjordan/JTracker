"use client";

import { useState } from "react";
import { formatRM, formatSen, parseAmountToSen } from "@/lib/money";
import { goalProgress, type Goal } from "@/lib/goals";
import { updateGoal, deleteGoal } from "@/lib/api/goals";
import { useI18n } from "@/lib/i18n-client";

const field =
  "rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-600";

export default function GoalCard({
  goal,
  onChanged,
}: {
  goal: Goal;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const [eName, setEName] = useState(goal.name);
  const [eEmoji, setEEmoji] = useState(goal.emoji);
  const [eTarget, setETarget] = useState(formatSen(goal.target_sen));
  const [eDate, setEDate] = useState(goal.target_date ?? "");
  const [eBase, setEBase] = useState(formatSen(goal.base_sen));
  const { t } = useI18n();

  const pr = goalProgress(goal);

  function startEdit() {
    setEName(goal.name);
    setEEmoji(goal.emoji);
    setETarget(formatSen(goal.target_sen));
    setEDate(goal.target_date ?? "");
    setEBase(formatSen(goal.base_sen));
    setEditing(true);
  }

  async function saveEdit() {
    setBusy(true);
    try {
      await updateGoal(goal.id, {
        name: eName.trim() || goal.name,
        emoji: eEmoji.trim() || goal.emoji,
        target_sen: parseAmountToSen(eTarget) ?? goal.target_sen,
        target_date: eDate || null,
        base_sen: parseAmountToSen(eBase) ?? goal.base_sen,
      });
      setEditing(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(t("goals.deleteConfirm", { name: goal.name }))) return;
    setBusy(true);
    try {
      await deleteGoal(goal.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{goal.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{goal.name}</p>
          <p className="text-xs text-gray-400">
            {pr.done
              ? t("goals.reached")
              : `${formatRM(pr.remainingSen)} ${t("goals.left")}`}
            {pr.daysLeft !== null && !pr.done && (
              <>
                {" "}
                ·{" "}
                {pr.daysLeft >= 0
                  ? t("goals.daysLeft", { n: pr.daysLeft })
                  : t("goals.daysOverdue", { n: -pr.daysLeft })}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="shrink-0 text-gray-300 hover:text-red-500 disabled:opacity-50"
          aria-label={t("goals.deleteGoal")}
        >
          ✕
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="tabular-nums text-gray-500">
          {formatRM(goal.current_sen)} / {formatRM(goal.target_sen)}
        </span>
        <span className="tabular-nums text-gray-400">{pr.pct}%</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${pr.done ? "bg-emerald-500" : "bg-indigo-600"}`}
          style={{ width: `${pr.pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-400">{t("goals.taggedHint")}</p>
        <button
          type="button"
          onClick={editing ? () => setEditing(false) : startEdit}
          className="shrink-0 text-xs font-medium text-indigo-600"
        >
          {editing ? t("close") : t("edit")}
        </button>
      </div>

      {editing && (
        <div className="mt-2 space-y-2 rounded-xl bg-gray-50 p-2">
          <div className="flex gap-2">
            <input
              value={eEmoji}
              onChange={(e) => setEEmoji(e.target.value)}
              placeholder="🎯"
              className={`w-14 text-center ${field}`}
            />
            <input
              value={eName}
              onChange={(e) => setEName(e.target.value)}
              placeholder={t("goals.namePlaceholder")}
              className={`flex-1 ${field}`}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center rounded-lg border border-gray-300 px-2">
              <span className="mr-1 text-xs text-gray-400">RM</span>
              <input
                value={eTarget}
                inputMode="decimal"
                onChange={(e) => setETarget(e.target.value)}
                className="w-full bg-transparent py-1.5 text-sm outline-none"
              />
            </div>
            <label className="flex-1 text-xs text-gray-400">
              {t("goals.targetDateEdit")}
              <input
                type="date"
                value={eDate}
                onChange={(e) => setEDate(e.target.value)}
                className={`mt-0.5 w-full ${field}`}
              />
            </label>
          </div>
          <label className="block text-xs text-gray-400">
            {t("goals.manualTopUp")}
            <div className="mt-0.5 flex items-center rounded-lg border border-gray-300 px-2">
              <span className="mr-1 text-xs text-gray-400">RM</span>
              <input
                value={eBase}
                inputMode="decimal"
                onChange={(e) => setEBase(e.target.value)}
                aria-label={t("goals.manualTopUp")}
                className="w-full bg-transparent py-1.5 text-sm outline-none"
              />
            </div>
          </label>
          <button
            type="button"
            onClick={saveEdit}
            disabled={busy}
            className="w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {t("goals.saveChanges")}
          </button>
        </div>
      )}
    </li>
  );
}
