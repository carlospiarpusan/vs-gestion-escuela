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
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1d1d1f] p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{title}</h3>
        <p className="text-sm text-[#86868b]">{subtitle}</p>
      </div>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-[#86868b]">{emptyLabel}</p>
        ) : (
          rows.map((row) => {
            const label = String(row[labelKey] || "Sin clasificar");
            const pct = maxValue > 0 ? (row.total / maxValue) * 100 : 0;

            return (
              <div key={`${labelKey}:${label}`} className="space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{label}</p>
                    <p className="text-xs text-[#86868b]">
                      {row.cantidad} movimiento{row.cantidad !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {formatAccountingMoney(row.total)}
                  </p>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0071e3]"
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
