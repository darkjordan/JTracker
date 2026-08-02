"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";

// Tiny daily-spending trace for the current month.
export default function Sparkline({
  daily,
}: {
  daily: { day: number; sen: number }[];
}) {
  const total = daily.reduce((a, d) => a + d.sen, 0);
  if (total === 0) return null;
  const data = daily.map((d) => ({ day: d.day, v: d.sen / 100 }));

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-sm font-medium text-gray-900">Daily spending</p>
      <div className="mt-2 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Area
              dataKey="v"
              stroke="#6366f1"
              fill="#e0e7ff"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
