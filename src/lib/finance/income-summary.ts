import { toNumber } from "@/lib/finance/server/normalizers";

type IncomeMovementSummaryInput = {
  ingresos_cobrados?: number | string | null;
  ingresos_anulados?: number | string | null;
  ticket_promedio?: number | string | null;
  total_ingresos?: number | string | null;
  movimientos_cobrados?: number | string | null;
};

type IncomeReceivablesSummaryInput = {
  total_pendiente?: number | string | null;
  registros_pendientes?: number | string | null;
};

export function buildIncomeSummary(
  movementSummary?: IncomeMovementSummaryInput | null,
  receivablesSummary?: IncomeReceivablesSummaryInput | null
) {
  const ingresosCobrados = toNumber(movementSummary?.ingresos_cobrados);
  const ingresosPendientes = toNumber(receivablesSummary?.total_pendiente);

  return {
    ingresosCobrados,
    ingresosPendientes,
    ingresosAnulados: toNumber(movementSummary?.ingresos_anulados),
    ticketPromedio: toNumber(movementSummary?.ticket_promedio),
    cobranzaPorcentaje:
      ingresosCobrados + ingresosPendientes > 0
        ? (ingresosCobrados / (ingresosCobrados + ingresosPendientes)) * 100
        : 0,
    totalIngresos: Number(movementSummary?.total_ingresos || 0),
    movimientosCobrados: Number(movementSummary?.movimientos_cobrados || 0),
    movimientosPendientes: Number(receivablesSummary?.registros_pendientes || 0),
  };
}
