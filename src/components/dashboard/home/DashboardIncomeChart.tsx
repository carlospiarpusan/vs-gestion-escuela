"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminDashboardDailyIngresoPoint } from "@/lib/dashboard-admin-summary";

export default function DashboardIncomeChart({
  data,
  initialDimension,
}: {
  data: AdminDashboardDailyIngresoPoint[];
  initialDimension: { width: number; height: number };
}) {
  return (
    <ResponsiveContainer width="100%" height="100%" initialDimension={initialDimension}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0071e3" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#86868b" }}
          tickFormatter={(val) => `Día ${val}`}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#86868b" }}
          tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Ingreso"]}
          labelFormatter={(val) => `Día ${val} del mes`}
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
        />
        <Area
          type="monotone"
          dataKey="monto"
          stroke="#0071e3"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorMonto)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
