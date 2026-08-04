"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatSen, formatRM } from "@/lib/money";
import { todayLocal } from "@/lib/api/transactions";
import { projectPayments, type RecurringPlan } from "@/lib/recurring";

const HORIZONS = [3, 6, 12, 18, 24];

function label(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const mon = new Date(y, m - 1, 1).toLocaleDateString("en-MY", { month: "short" });
  return m === 1 ? `${mon} '${String(y).slice(2)}` : mon;
}

const rmAxis = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `${v}`;

// recharts v3 doesn't render default tick <text> reliably here, so draw ticks
// ourselves as plain SVG text.
type TickProps = {
  x?: number;
  y?: number;
  payload?: { value: number | string };
};
function YTick({ x, y, payload }: TickProps) {
  return (
    <text x={x} y={y} dy={3} textAnchor="end" fontSize={10} fill="#9ca3af">
      {payload ? rmAxis(Number(payload.value)) : ""}
    </text>
  );
}
function XTick({ x, y, payload }: TickProps) {
  return (
    <text x={x} y={(y ?? 0) + 12} textAnchor="middle" fontSize={10} fill="#9ca3af">
      {payload ? String(payload.value) : ""}
    </text>
  );
}

// One combined chart of all planned recurring payments over a chosen horizon.
export default function InstallmentsChart({ plans }: { plans: RecurringPlan[] }) {
  const [horizon, setHorizon] = useState(12);
  const fromISO = `${todayLocal().slice(0, 7)}-01`;

  const data = useMemo(
    () =>
      projectPayments(plans, horizon, fromISO).map((m) => ({
        label: label(m.month),
        rm: m.sen / 100,
        sen: m.sen,
      })),
    [plans, horizon, fromISO]
  );
  const total = useMemo(() => data.reduce((a, d) => a + d.sen, 0), [data]);

  // Scale the Y-axis to the visible range (not forced to 0), so a tight band of
  // similar amounts fills the chart instead of leaving empty space below.
  const domain = useMemo<[number, number]>(() => {
    const vals = data.map((d) => d.rm);
    const hi = Math.max(...vals, 0);
    const lo = Math.min(...vals, hi);
    if (lo === hi) return [Math.max(0, lo - (lo || 1) * 0.2), hi + (hi || 1) * 0.2];
    const pad = (hi - lo) * 0.1;
    return [Math.max(0, lo - pad), hi + pad];
  }, [data]);

  if (!plans.some((p) => p.next_due) || total === 0) return null;

  return (
    <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">Upcoming payments</p>
        <div className="flex gap-1">
          {HORIZONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHorizon(h)}
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                horizon === h
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {h}m
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#f1f1f4" />
            <XAxis
              dataKey="label"
              tick={<XTick />}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              height={22}
            />
            <YAxis
              width={40}
              domain={domain}
              allowDecimals={false}
              tick={<YTick />}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v) => `RM ${formatSen(Math.round(Number(v) * 100))}`}
              contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="rm"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={{ r: 2, fill: "#4f46e5" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-[11px] text-gray-400">
        {formatRM(total)} total over the next {horizon} months
      </p>
    </section>
  );
}
