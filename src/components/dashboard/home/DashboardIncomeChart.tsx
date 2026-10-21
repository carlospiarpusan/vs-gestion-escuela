"use client";

import { useId, useState } from "react";
import type { AdminDashboardDailyIngresoPoint } from "@/lib/dashboard-admin-summary";
import { formatCop } from "@/lib/intl-formatters";

export default function DashboardIncomeChart({
  data,
  initialDimension,
}: {
  data: AdminDashboardDailyIngresoPoint[];
  initialDimension: { width: number; height: number };
}) {
  const gradientId = useId();
  const [activeDay, setActiveDay] = useState<number | null>(null);
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#86868b]">
        No hay ingresos registrados en este mes.
      </div>
    );
  }
  const width = Math.max(initialDimension.width, 180);
  const height = Math.max(initialDimension.height, 120);
  const left = 62;
  const right = width - 12;
  const top = 12;
  const bottom = height - 28;
  const min = Math.min(0, ...data.map((point) => point.monto));
  const max = Math.max(1, ...data.map((point) => point.monto));
  const firstDay = Math.min(...data.map((point) => point.date));
  const lastDay = Math.max(...data.map((point) => point.date));
  const x = (day: number) =>
    firstDay === lastDay
      ? (left + right) / 2
      : left + ((day - firstDay) / (lastDay - firstDay)) * (right - left);
  const y = (amount: number) => bottom - ((amount - min) / (max - min)) * (bottom - top);
  const points = data.map((point) => `${x(point.date)},${y(point.monto)}`).join(" ");
  const labelInterval = Math.max(
    1,
    Math.ceil((lastDay - firstDay) / Math.max(1, Math.floor((right - left) / 70)))
  );
  const active = data.find((point) => point.date === activeDay);
  const tooltipLabel = active ? `Día ${active.date}: ${formatCop(active.monto)}` : "";
  const tooltipWidth = Math.min(width, Math.max(148, tooltipLabel.length * 7 + 20));
  const tooltipX = active
    ? Math.max(0, Math.min(x(active.date) - tooltipWidth / 2, width - tooltipWidth))
    : 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full overflow-visible"
      role="group"
      aria-label="Ingresos diarios del mes. Selecciona un día para consultar su valor."
      onPointerLeave={() => setActiveDay(null)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#0071e3" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((tick) => {
        const amount = min + ((max - min) * tick) / 4;
        return (
          <g key={tick} aria-hidden="true">
            <line
              x1={left}
              x2={right}
              y1={y(amount)}
              y2={y(amount)}
              stroke="#e5e7eb"
              strokeDasharray="3 3"
            />
            <text x={left - 8} y={y(amount) + 4} textAnchor="end" fontSize={11} fill="#86868b">
              {Math.abs(amount) >= 1000 ? `$${(amount / 1000).toFixed(0)}k` : formatCop(amount)}
            </text>
          </g>
        );
      })}
      <polygon
        points={`${x(firstDay)},${y(0)} ${points} ${x(lastDay)},${y(0)}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points}
        stroke="#0071e3"
        strokeWidth={3}
        fill="none"
        strokeLinejoin="round"
      />
      {data.map((point) => (
        <g key={point.date}>
          {(point.date === firstDay ||
            point.date === lastDay ||
            ((point.date - firstDay) % labelInterval === 0 &&
              lastDay - point.date >= labelInterval)) && (
            <text
              x={x(point.date)}
              y={height - 6}
              textAnchor="middle"
              fontSize={11}
              fill="#86868b"
              aria-hidden="true"
            >
              Día {point.date}
            </text>
          )}
          <circle
            cx={x(point.date)}
            cy={y(point.monto)}
            r={7}
            fill="#0071e3"
            className={`cursor-pointer outline-none hover:opacity-100 focus:opacity-100 ${data.length === 1 ? "opacity-100" : "opacity-0"}`}
            tabIndex={0}
            role="button"
            aria-label={`Día ${point.date}: ${formatCop(point.monto)}`}
            onFocus={() => setActiveDay(point.date)}
            onBlur={() => setActiveDay(null)}
            onPointerEnter={() => setActiveDay(point.date)}
            onClick={() => setActiveDay(point.date)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setActiveDay(point.date);
              }
              if (event.key === "Escape") setActiveDay(null);
            }}
          />
        </g>
      ))}
      {active && (
        <g
          role="tooltip"
          pointerEvents="none"
          transform={`translate(${tooltipX},${Math.max(top, y(active.monto) - 48)})`}
        >
          <rect
            width={tooltipWidth}
            height={38}
            rx={8}
            fill="var(--background, white)"
            stroke="#e5e7eb"
          />
          <text x={10} y={24} fontSize={12} fill="var(--foreground, #1d1d1f)">
            {tooltipLabel}
          </text>
        </g>
      )}
    </svg>
  );
}
