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
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              width={44}
              domain={[0, "auto"]}
              allowDecimals={false}
              fontSize={10}
              stroke="#9ca3af"
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `${v}`
              }
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
