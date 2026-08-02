"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatSen } from "@/lib/money";
import type { MonthPoint } from "@/lib/stats";

// 6-month income vs expense bars with a net line.
export default function TrendChart({ points }: { points: MonthPoint[] }) {
  const data = points.map((p) => ({
    label: p.label,
    Income: p.incomeSen / 100,
    Expense: p.expenseSen / 100,
    Net: p.netSen / 100,
  }));
  const hasData = points.some((p) => p.incomeSen || p.expenseSen);
  if (!hasData) return null;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-sm font-medium text-gray-900">Last 6 months</p>
      <div className="mt-2 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) =>
                `RM ${formatSen(Math.round(Number(value) * 100))}`
              }
              contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }}
            />
            <Bar dataKey="Income" fill="#10b981" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="Expense" fill="#6366f1" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Line dataKey="Net" stroke="#111827" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Income
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
          Expense
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-full bg-gray-900" />
          Net
        </span>
      </div>
    </div>
  );
}
