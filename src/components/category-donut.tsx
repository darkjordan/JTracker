"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatSen } from "@/lib/money";
import type { CategorySlice } from "@/lib/stats";

// Spending-by-category donut with a tappable legend that filters the list.
export default function CategoryDonut({
  slices,
  totalSen,
  activeId,
  onSelect,
}: {
  slices: CategorySlice[];
  totalSen: number;
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (slices.length === 0) return null;
  const toggle = (id: string) => onSelect(id === activeId ? null : id);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-sm font-medium text-gray-900">Spending by category</p>

      <div className="relative mt-2 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="valueSen"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={1}
              stroke="none"
              isAnimationActive={false}
              onClick={(_, i) => toggle(slices[i].id)}
            >
              {slices.map((s) => (
                <Cell
                  key={s.id}
                  fill={s.color}
                  cursor="pointer"
                  opacity={activeId && activeId !== s.id ? 0.3 : 1}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-gray-400">Spent</span>
          <span className="text-xl font-bold tabular-nums text-gray-900">
            {formatSen(totalSen)}
          </span>
        </div>
      </div>

      <ul className="mt-3 space-y-0.5">
        {slices.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => toggle(s.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm ${
                activeId === s.id ? "bg-gray-100" : ""
              }`}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <span className="min-w-0 flex-1 truncate text-left">
                {s.icon} {s.name}
              </span>
              <span className="shrink-0 tabular-nums text-gray-600">
                {formatSen(s.valueSen)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
