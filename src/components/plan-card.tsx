"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatSen, formatRM } from "@/lib/money";
import {
  planProgress,
  planSchedule,
  addCadence,
  monthlyEquivalentSen,
  type RecurringPlan,
} from "@/lib/recurring";
import { updatePlan, deletePlan } from "@/lib/api/recurring";

export default function PlanCard({
  plan,
  onChanged,
}: {
  plan: RecurringPlan;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const pr = planProgress(plan);
  const finite = !!plan.occurrences;
  const done = finite && pr.remaining !== null && pr.remaining <= 0;
  const schedule = planSchedule(plan);
  const pct = pr.total ? Math.round((pr.paid / pr.total) * 100) : 0;

  async function markPaid() {
    if (!plan.next_due) return;
    setBusy(true);
    await updatePlan(plan.id, {
      paid_count: (plan.paid_count ?? 0) + 1,
      next_due: addCadence(plan.next_due, plan.cadence, 1),
    });
    onChanged();
  }

  async function remove() {
    if (!confirm(`Delete plan "${plan.name}"?`)) return;
    setBusy(true);
    await deletePlan(plan.id);
    onChanged();
  }

  return (
    <li className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{plan.name}</p>
          <p className="text-xs text-gray-400">
            {plan.cadence}
            {plan.next_due && !done && ` · next ${plan.next_due}`} ·{" "}
            {formatSen(monthlyEquivalentSen(plan.amount_sen, plan.cadence))}/mo
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
          {formatSen(plan.amount_sen)}
        </span>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="shrink-0 text-gray-300 hover:text-red-500 disabled:opacity-50"
          aria-label="Delete plan"
        >
          ✕
        </button>
      </div>

      {finite && (
        <>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Paid {pr.paid} / {pr.total}
              {pr.endDate && (
                <>
                  {" "}· {done ? "completed" : "completes"}{" "}
                  <span className="font-medium text-gray-700">{pr.endDate}</span>
                </>
              )}
            </span>
            <span className="tabular-nums text-gray-400">
              {formatSen(pr.paidSen)} / {formatSen(pr.totalSen ?? 0)}
            </span>
          </div>

          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-indigo-600"}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            {done ? (
              <span className="text-xs font-medium text-emerald-600">✓ Completed</span>
            ) : (
              <button
                type="button"
                onClick={markPaid}
                disabled={busy || !plan.next_due}
                className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                Mark paid
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="text-xs font-medium text-indigo-600"
            >
              {open ? "Hide chart" : "Chart"}
            </button>
          </div>

          {open && schedule.length > 0 && (
            <div className="mt-2">
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={schedule} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                    <XAxis dataKey="index" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v) => `RM ${formatSen(Math.round(Number(v) * 100))}`}
                      labelFormatter={(i) => schedule[Number(i) - 1]?.date ?? ""}
                      contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }}
                    />
                    <Bar dataKey={(d) => d.cumulativeSen / 100} isAnimationActive={false} radius={[2, 2, 0, 0]}>
                      {schedule.map((s) => (
                        <Cell key={s.index} fill={s.paid ? "#4f46e5" : "#c7d2fe"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-[11px] text-gray-400">
                Cumulative paid → {formatRM(pr.totalSen ?? 0)} total by {pr.endDate}
              </p>
            </div>
          )}
        </>
      )}
    </li>
  );
}
