import { describe, expect, it } from "vitest";
import {
  FALLBACK_PUBLIC_PLAN_PRICES,
  describeAnnualPrice,
  formatCop,
  getAnnualSavingsMonths,
  mergePublicPlanPrices,
} from "@/lib/public-plan-pricing";

describe("public plan pricing", () => {
  it("usa los precios de planes_config y conserva el respaldo para filas faltantes o inválidas", () => {
    const prices = mergePublicPlanPrices([
      { id: "basico", precio_mensual: "159000.00", precio_anual: "1590000.00" },
      { id: "profesional", precio_mensual: null, precio_anual: "0" },
      { id: "gratuito", precio_mensual: "0", precio_anual: "0" },
    ]);

    expect(prices.basico).toEqual({ monthly: 159_000, annual: 1_590_000 });
    expect(prices.profesional).toEqual(FALLBACK_PUBLIC_PLAN_PRICES.profesional);
    expect(prices.enterprise).toEqual(FALLBACK_PUBLIC_PLAN_PRICES.enterprise);
  });

  it("calcula los meses de ahorro del pago anual", () => {
    expect(getAnnualSavingsMonths({ monthly: 149_000, annual: 1_490_000 })).toBe(2);
    expect(getAnnualSavingsMonths({ monthly: 100_000, annual: 1_100_000 })).toBe(1);
    expect(getAnnualSavingsMonths({ monthly: 100_000, annual: 1_200_000 })).toBe(0);
  });

  it("formatea en pesos colombianos sin decimales", () => {
    expect(formatCop(149_000)).toBe("$ 149.000");
    expect(describeAnnualPrice({ monthly: 149_000, annual: 1_490_000 })).toBe(
      "O $ 1.490.000 al año: 2 meses gratis."
    );
  });
});
