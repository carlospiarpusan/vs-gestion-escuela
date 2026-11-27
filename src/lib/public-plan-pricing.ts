import type { PlanEscuelaPago } from "@/types/database";
import { isCommercialSchoolPlan } from "@/lib/school-plans";

export type PublicPlanPrice = {
  monthly: number;
  annual: number;
};

export type PublicPlanPrices = Record<PlanEscuelaPago, PublicPlanPrice>;

/**
 * Valores de respaldo para la página pública cuando la base no responde
 * (por ejemplo, durante el build). Deben coincidir con planes_config.
 */
export const FALLBACK_PUBLIC_PLAN_PRICES: PublicPlanPrices = {
  basico: { monthly: 149_000, annual: 1_490_000 },
  profesional: { monthly: 299_000, annual: 2_990_000 },
  enterprise: { monthly: 590_000, annual: 5_900_000 },
};

/** Planes que se muestran como "Desde" porque se ajustan por cotización. */
export const QUOTED_PUBLIC_PLANS: ReadonlySet<PlanEscuelaPago> = new Set(["enterprise"]);

type PlanPriceRow = {
  id: string;
  precio_mensual: number | string | null;
  precio_anual: number | string | null;
};

export function mergePublicPlanPrices(rows: PlanPriceRow[]): PublicPlanPrices {
  const prices: PublicPlanPrices = {
    basico: { ...FALLBACK_PUBLIC_PLAN_PRICES.basico },
    profesional: { ...FALLBACK_PUBLIC_PLAN_PRICES.profesional },
    enterprise: { ...FALLBACK_PUBLIC_PLAN_PRICES.enterprise },
  };

  for (const row of rows) {
    if (!isCommercialSchoolPlan(row.id)) continue;
    const monthly = Number(row.precio_mensual);
    const annual = Number(row.precio_anual);
    if (Number.isFinite(monthly) && monthly > 0) prices[row.id].monthly = monthly;
    if (Number.isFinite(annual) && annual > 0) prices[row.id].annual = annual;
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
