import { describe, expect, it } from "vitest";
import { buildIncomeSummary } from "@/lib/finance/income-summary";

describe("finance income summary", () => {
  it("usa saldo pendiente de obligaciones para el KPI por cobrar", () => {
    const summary = buildIncomeSummary(
      {
        ingresos_cobrados: 900000,
        ingresos_anulados: 50000,
        ticket_promedio: 150000,
        total_ingresos: 8,
        movimientos_cobrados: 6,
      },
      {
        total_pendiente: 350000,
        registros_pendientes: 3,
      }
    );

    expect(summary.ingresosPendientes).toBe(350000);
    expect(summary.movimientosPendientes).toBe(3);
    expect(summary.cobranzaPorcentaje).toBeCloseTo(72, 0);
  });

  it("cae en cero si no hay cartera pendiente", () => {
    const summary = buildIncomeSummary(
      {
        ingresos_cobrados: 250000,
        ingresos_anulados: 0,
        ticket_promedio: 125000,
        total_ingresos: 2,
        movimientos_cobrados: 2,
      },
      null
    );

    expect(summary.ingresosPendientes).toBe(0);
    expect(summary.movimientosPendientes).toBe(0);
    expect(summary.cobranzaPorcentaje).toBe(100);
  });
});
