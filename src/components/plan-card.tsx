"use client";

import { useState } from "react";
import { formatSen, parseAmountToSen } from "@/lib/money";
import { todayLocal } from "@/lib/api/transactions";
import {
  planProgress,
  addCadence,
  monthlyEquivalentSen,
  type RecurringPlan,
  type Cadence,
} from "@/lib/recurring";
import { updatePlan, deletePlan } from "@/lib/api/recurring";

const CADENCES: Cadence[] = ["weekly", "monthly", "yearly"];
const field =
  "rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-600";

export default function PlanCard({
  plan,
  onChanged,
}: {
  plan: RecurringPlan;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  // edit fields
  const [eName, setEName] = useState(plan.name);
  const [eAmount, setEAmount] = useState(formatSen(plan.amount_sen));
  const [eCadence, setECadence] = useState<Cadence>(plan.cadence);
  const [eDue, setEDue] = useState(plan.next_due ?? "");
  const [eTimes, setETimes] = useState(plan.occurrences ? String(plan.occurrences) : "");
  const [ePaid, setEPaid] = useState(String(plan.paid_count ?? 0));

  const pr = planProgress(plan);
  const finite = !!plan.occurrences;
  const done = finite && (pr.remaining ?? 1) <= 0;
  const pct = pr.total ? Math.round((pr.paid / pr.total) * 100) : 0;
  // Only allow marking the CURRENT due payment (next_due today or overdue).
  const due = !!plan.next_due && plan.next_due <= todayLocal();
  const canPay = !done && due;

  async function markPaid() {
    if (!canPay || !plan.next_due) return;
    setBusy(true);
    try {
      await updatePlan(plan.id, {
        paid_count: (plan.paid_count ?? 0) + 1,
        next_due: addCadence(plan.next_due, plan.cadence, 1),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    setEName(plan.name);
    setEAmount(formatSen(plan.amount_sen));
    setECadence(plan.cadence);
    setEDue(plan.next_due ?? "");
    setETimes(plan.occurrences ? String(plan.occurrences) : "");
    setEPaid(String(plan.paid_count ?? 0));
    setEditing(true);
  }

  async function saveEdit() {
    setBusy(true);
    try {
      const times = parseInt(eTimes, 10);
      await updatePlan(plan.id, {
        name: eName.trim() || plan.name,
        amount_sen: parseAmountToSen(eAmount) ?? plan.amount_sen,
        cadence: eCadence,
        next_due: eDue || null,
        occurrences: Number.isFinite(times) && times > 0 ? times : null,
        paid_count: Math.max(0, parseInt(ePaid, 10) || 0),
      });
      setEditing(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete plan "${plan.name}"?`)) return;
    setBusy(true);
    try {
      await deletePlan(plan.id);
      onChanged();
    } finally {
      setBusy(false);
    }
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
            {!finite && " · ongoing"}
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
        </>
      )}

      <div className="mt-2 flex items-center gap-3">
        {done ? (
          <span className="text-xs font-medium text-emerald-600">✓ Completed</span>
        ) : canPay ? (
          <button
            type="button"
            onClick={markPaid}
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            Mark paid
          </button>
        ) : plan.next_due ? (
          <span className="text-xs text-gray-400">
            Next payment due {plan.next_due}
          </span>
        ) : null}
        <button
          type="button"
          onClick={editing ? () => setEditing(false) : startEdit}
          className="text-xs font-medium text-indigo-600"
        >
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      {editing && (
        <div className="mt-2 space-y-2 rounded-xl bg-gray-50 p-2">
          <input value={eName} onChange={(e) => setEName(e.target.value)} placeholder="Name" className={`w-full ${field}`} />
          <div className="flex gap-2">
            <div className="flex flex-1 items-center rounded-lg border border-gray-300 px-2">
              <span className="mr-1 text-xs text-gray-400">RM</span>
              <input value={eAmount} inputMode="decimal" onChange={(e) => setEAmount(e.target.value)} className="w-full bg-transparent py-1.5 text-sm outline-none" />
            </div>
            <select value={eCadence} onChange={(e) => setECadence(e.target.value as Cadence)} className={`bg-white ${field}`}>
              {CADENCES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-gray-400">
              Next due
              <input type="date" value={eDue} onChange={(e) => setEDue(e.target.value)} className={`mt-0.5 w-full ${field}`} />
            </label>
            <label className="w-16 text-xs text-gray-400">
              × times
              <input value={eTimes} inputMode="numeric" onChange={(e) => setETimes(e.target.value.replace(/[^0-9]/g, ""))} className={`mt-0.5 w-full ${field}`} />
            </label>
            <label className="w-16 text-xs text-gray-400">
              Paid
              <input value={ePaid} inputMode="numeric" onChange={(e) => setEPaid(e.target.value.replace(/[^0-9]/g, ""))} className={`mt-0.5 w-full ${field}`} />
            </label>
          </div>
          <button type="button" onClick={saveEdit} disabled={busy} className="w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            Save changes
          </button>
        </div>
      )}
    </li>
  );
}
