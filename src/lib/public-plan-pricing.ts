import type { PlanEscuelaPago } from "@/types/database";
import { isCommercialSchoolPlan, isConfiguredSchoolPlanPrice } from "@/lib/school-plans";

export type PublicPlanPrice = {
  monthly: number;
  annual: number;
};

export type PublicPlanPrices = Partial<Record<PlanEscuelaPago, PublicPlanPrice>>;

/** Planes que se muestran como "Desde" porque se ajustan por cotización. */
export const QUOTED_PUBLIC_PLANS: ReadonlySet<PlanEscuelaPago> = new Set(["enterprise"]);

type PlanPriceRow = {
  id: string;
  activo: boolean;
  precio_mensual: number | string | null;
  precio_anual: number | string | null;
};

export function selectPublicPlanPrices(rows: PlanPriceRow[]): PublicPlanPrices {
  const prices: PublicPlanPrices = {};

  for (const row of rows) {
    if (!row.activo || !isCommercialSchoolPlan(row.id)) continue;
    const monthlyPrice = Number(row.precio_mensual);
    const annualPrice = Number(row.precio_anual);
    const monthly = isConfiguredSchoolPlanPrice(monthlyPrice) ? monthlyPrice : 0;
    const annual = isConfiguredSchoolPlanPrice(annualPrice) ? annualPrice : 0;
    if (monthly > 0 || annual > 0) prices[row.id] = { monthly, annual };
  }

  return prices;
}

/** Meses que se ahorran al pagar el año completo frente a 12 pagos mensuales. */
export function getAnnualSavingsMonths({ monthly, annual }: PublicPlanPrice) {
  if (monthly <= 0 || annual <= 0) return 0;
  return Math.max(0, Math.floor((monthly * 12 - annual) / monthly + 1e-9));
}

export function describeAnnualPrice(price: PublicPlanPrice) {
  const months = getAnnualSavingsMonths(price);
  const base = `O ${formatCop(price.annual)} al año`;
  if (months <= 0) return `${base}.`;
  return `${base}: ${months} ${months === 1 ? "mes gratis" : "meses gratis"}.`;
}

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCop(value: number) {
  return copFormatter.format(value).replace(/\u00a0/g, " ");
}
