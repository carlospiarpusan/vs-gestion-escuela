import { describe, expect, it } from "vitest";
import {
  describeAnnualPrice,
  formatCop,
  getAnnualSavingsMonths,
  selectPublicPlanPrices,
} from "@/lib/public-plan-pricing";

describe("public plan pricing", () => {
  it("excluye planes inactivos, ausentes y no comerciales", () => {
    const prices = selectPublicPlanPrices([
      { id: "basico", activo: true, precio_mensual: "159000.00", precio_anual: "1590000.00" },
      { id: "profesional", activo: false, precio_mensual: "299000", precio_anual: "2990000" },
      { id: "gratuito", activo: true, precio_mensual: "1000", precio_anual: "10000" },
    ]);

    expect(prices).toEqual({ basico: { monthly: 159_000, annual: 1_590_000 } });
  });

  it("publica solo los periodos configurados y omite planes sin ningún precio válido", () => {
    const prices = selectPublicPlanPrices([
      { id: "basico", activo: true, precio_mensual: 149_000, precio_anual: "NaN" },
      { id: "profesional", activo: true, precio_mensual: null, precio_anual: "2990000" },
      { id: "enterprise", activo: true, precio_mensual: "-1", precio_anual: "0" },
    ]);

    expect(prices).toEqual({
      basico: { monthly: 149_000, annual: 0 },
      profesional: { monthly: 0, annual: 2_990_000 },
    });
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
