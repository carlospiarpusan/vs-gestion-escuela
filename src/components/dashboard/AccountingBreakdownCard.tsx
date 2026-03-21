"use client";

import { formatAccountingMoney, type AccountingBreakdownRow } from "@/lib/accounting-dashboard";

export default function AccountingBreakdownCard({
  title,
  subtitle,
  rows,
  labelKey,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  rows: AccountingBreakdownRow[];
  labelKey: "categoria" | "metodo_pago" | "concepto";
  emptyLabel: string;
}) {
  const maxValue = Math.max(...rows.map((row) => row.total), 0);

  return (
    <div className="apple-panel rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-[var(--gray-500)]">{subtitle}</p>
      </div>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--gray-500)]">{emptyLabel}</p>
        ) : (
          rows.map((row) => {
            const label = String(row[labelKey] || "Sin clasificar");
            const pct = maxValue > 0 ? (row.total / maxValue) * 100 : 0;

            return (
              <div key={`${labelKey}:${label}`} className="space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-[var(--gray-500)]">
                      {row.cantidad} movimiento{row.cantidad !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatAccountingMoney(row.total)}
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--blue-apple)]"
                    style={{ width: `${Math.max(8, pct)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
