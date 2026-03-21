export { downloadCsv } from "@/lib/spreadsheet-export";

export type AccountingSummary = {
  ingresosCobrados: number;
  ingresosPendientes: number;
  ingresosAnulados: number;
  gastosTotales: number;
  balanceNeto: number;
  margenPorcentaje: number;
  ticketPromedio: number;
  gastoPromedio: number;
  gastosRecurrentesTotal: number;
  gastosRecurrentesCount: number;
  cobranzaPorcentaje: number;
  totalIngresos: number;
  totalGastos: number;
  totalMovimientos: number;
  alumnosNuevosRegulares?: number;
  alumnosNuevosPractica?: number;
  alumnosNuevosAptitud?: number;
};

export type AccountingBreakdownRow = {
  categoria?: string;
  metodo_pago?: string | null;
  concepto?: string;
  cantidad: number;
  total: number;
};

export type AccountingNamedBreakdownRow = {
  nombre: string;
  cantidad: number;
  total: number;
};

export type AccountingTramitadorPortfolioRow = {
  nombre: string;
  movimientos: number;
  pagado: number;
  pendiente: number;
  vencido: number;
  porVencer: number;
  ticketPromedio: number;
  ultimaFecha: string;
};

export type AccountingDailySeriesRow = {
  fecha: string;
  ingresos: number;
  pendientes: number;
  gastos: number;
  balance: number;
};

export type AccountingMonthlySeriesRow = {
  periodo: string;
  ingresos: number;
  gastos: number;
  balance: number;
};

export type AccountingAgingBucketRow = {
  bucket: string;
  cantidad: number;
  total: number;
};

export type AccountingCounterpartyRow = {
  nombre: string;
  cantidad: number;
  total: number;
};

export type AccountingReceivablesSummary = {
  totalPendiente: number;
  vencido: number;
  vencePronto: number;
  alDia: number;
  buckets: AccountingAgingBucketRow[];
  topDeudores: AccountingCounterpartyRow[];
};

export type AccountingPayablesSummary = {
  totalPendiente: number;
  vencido: number;
  vencePronto: number;
  alDia: number;
  buckets: AccountingAgingBucketRow[];
  topProveedores: AccountingCounterpartyRow[];
  topTramitadores: AccountingCounterpartyRow[];
};

export type AccountingContractMonthlyRow = {
  periodo: string;
  registros: number;
  valorEsperado: number;
  valorCobrado: number;
  saldoPendiente: number;
};

export type AccountingContractOldDebtRow = {
  nombre: string;
  documento: string | null;
  referencia: string | null;
  tipoRegistro: string | null;
  saldoPendiente: number;
  fechaRegistro: string;
  fechaReferencia: string;
  diasPendiente: number;
};

export type AccountingContractPendingRow = {
  obligationId: string;
  nombre: string;
  documento: string | null;
  referencia: string | null;
  tipoRegistro: string | null;
  fechaRegistro: string;
  fechaReferencia: string;
  valorEsperado: number;
  valorCobrado: number;
  saldoPendiente: number;
  diasPendiente: number;
};

export type AccountingContractsSummary = {
  registros: number;
  totalEsperado: number;
  totalCobrado: number;
  totalPendiente: number;
  buckets: AccountingAgingBucketRow[];
  topDeudores: AccountingCounterpartyRow[];
  monthly: AccountingContractMonthlyRow[];
  oldestPending: AccountingContractOldDebtRow[];
  pendingCount: number;
  pendingRows: AccountingContractPendingRow[];
};

export type AccountingOptionSchool = {
  id: string;
  nombre: string;
};

export type AccountingOptionSede = {
  id: string;
  nombre: string;
  escuela_id: string;
};

export type AccountingStudentReportRow = {
  id: string;
  nombre: string;
  dni: string;
  tipo_registro: string;
  categorias: string[];
  fecha_inscripcion: string;
  valor_total: number;
  total_pagado: number;
  saldo_pendiente: number;
};

export type AccountingStudentsSummary = {
  countRegulares: number;
  countPractica: number;
  countAptitud: number;
  totalIngresosRegulares: number;
  totalIngresosPractica: number;
  totalIngresosAptitud: number;
  rows: AccountingStudentReportRow[];
};

export type AccountingLedgerRow = {
  id: string;
  fecha: string;
  tipo: "ingreso" | "gasto";
  categoria: string;
  concepto: string;
  monto: number;
  estado: string;
  metodo_pago: string | null;
  numero_factura: string | null;
  contraparte: string | null;
  documento: string | null;
  contrato: string | null;
};

export type AccountingReportResponse = {
  options: {
    escuelas: AccountingOptionSchool[];
    sedes: AccountingOptionSede[];
    availableYears: number[];
  };
  summary: AccountingSummary;
  breakdown: {
    ingresosPorCategoria: AccountingBreakdownRow[];
    ingresosPorLinea: AccountingNamedBreakdownRow[];
    gastosPorCategoria: AccountingBreakdownRow[];
    ingresosPorMetodo: AccountingBreakdownRow[];
    gastosPorMetodo: AccountingBreakdownRow[];
    topConceptosIngreso: AccountingBreakdownRow[];
    topConceptosGasto: AccountingBreakdownRow[];
    topProveedoresGasto: AccountingBreakdownRow[];
    topTramitadoresGasto: AccountingNamedBreakdownRow[];
    tramitadorPortfolio: AccountingTramitadorPortfolioRow[];
  };
  series: {
    diaria: AccountingDailySeriesRow[];
    mensual: AccountingMonthlySeriesRow[];
  };
  ledger: {
    totalCount: number;
    rows: AccountingLedgerRow[];
  };
  receivables?: AccountingReceivablesSummary;
  payables?: AccountingPayablesSummary;
  contracts?: AccountingContractsSummary;
  students?: AccountingStudentsSummary;
};

export const HISTORICAL_START_YEAR = 2023;
export const MONTH_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

export function formatAccountingMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatCompactDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getCurrentAccountingYear() {
  return new Date().getFullYear();
}

export function getMonthDateRange(year: number, month: string) {
  const normalizedMonth = month.trim();
  if (!normalizedMonth) {
    return {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
    };
  }

  const lastDay = new Date(year, Number(normalizedMonth), 0).getDate();
  return {
    from: `${year}-${normalizedMonth}-01`,
    to: `${year}-${normalizedMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function buildAccountingYears(startYear = HISTORICAL_START_YEAR) {
  const currentYear = getCurrentAccountingYear();
  return Array.from({ length: currentYear - startYear + 1 }, (_, index) =>
    String(currentYear - index)
  );
}
