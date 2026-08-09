"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { parseAmountToSen } from "@/lib/money";
import type { Goal } from "@/lib/goals";
import { listGoals, createGoal } from "@/lib/api/goals";
import GoalCard from "@/components/goal-card";
import { useI18n } from "@/lib/i18n-client";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [emoji, setEmoji] = useState("🎯");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const { t } = useI18n();

  const load = useCallback(async () => {
    setLoading(true);
    setGoals(await listGoals());
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  async function add() {
    const sen = parseAmountToSen(target) ?? 0;
    if (!name.trim() || sen <= 0) return;
    await createGoal({
      name: name.trim(),
      emoji: emoji.trim() || "🎯",
      target_sen: sen,
      target_date: date || null,
    });
    setName("");
    setTarget("");
    setDate("");
    setEmoji("🎯");
    await load();
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">{t("goals.title")}</h1>
        <Link href="/" className="text-sm font-medium text-indigo-600">{t("done")}</Link>
      </header>

      {/* Add goal */}
      <section className="mb-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="🎯"
            aria-label={t("goals.emojiLabel")}
            className="w-14 rounded-xl border border-gray-300 px-2 py-2.5 text-center text-lg outline-none focus:border-indigo-600"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("goals.addName")}
            className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <div className="flex flex-1 items-center rounded-xl border border-gray-300 px-2 focus-within:border-indigo-600">
            <span className="mr-1 text-sm text-gray-400">RM</span>
            <input
              type="text"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={t("goals.targetAmount")}
              className="w-full bg-transparent py-2.5 text-base tabular-nums outline-none"
            />
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label={t("goals.targetDateLabel")}
            className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-600"
          />
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!name.trim() || !target.trim()}
          className="mt-2 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("goals.addGoal")}
        </button>
      </section>

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">{t("loading")}</p>
      ) : goals.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">{t("goals.noGoals")}</p>
      ) : (
        <ul className="space-y-2">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onChanged={load} />
          ))}
        </ul>
      )}
    </main>
  );
}
