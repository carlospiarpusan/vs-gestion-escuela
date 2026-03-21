export type FinanceModuleDescriptor = {
  id: "income" | "portfolio" | "cash" | "expenses" | "reports";
  title: string;
  description: string;
  primaryActionLabel?: string;
};

export type FinancePeriodFilters = {
  year: string;
  month: string;
  schoolId?: string;
  branchId?: string;
};

export type FinanceListQueryState = {
  page: number;
  search: string;
};

export type FinanceBreakdownRow = {
  categoria?: string;
  metodo_pago?: string | null;
  concepto?: string;
  cantidad: number;
  total: number;
};

export type FinanceNamedBreakdownRow = {
  nombre: string;
  cantidad: number;
  total: number;
};

export type FinanceAgingBucketRow = {
  bucket: string;
  cantidad: number;
  total: number;
};

export type FinanceCounterpartyRow = {
  nombre: string;
  cantidad: number;
  total: number;
};

export type FinanceTramitadorPortfolioRow = {
  nombre: string;
  movimientos: number;
  pagado: number;
  pendiente: number;
  vencido: number;
  porVencer: number;
  ticketPromedio: number;
  ultimaFecha: string;
};

export type IncomeSummary = {
  ingresosCobrados: number;
  ingresosPendientes: number;
  ingresosAnulados: number;
  ticketPromedio: number;
  cobranzaPorcentaje: number;
  totalIngresos: number;
  movimientosCobrados: number;
  movimientosPendientes: number;
};

export type IncomeLedgerRow = {
  id: string;
  fecha: string;
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

export type IncomeDashboardResponse = {
  generatedAt: string;
  filters: {
    from: string;
    to: string;
    page: number;
    pageSize: number;
  };
  summary: IncomeSummary;
  breakdown: {
    ingresosPorCategoria: FinanceBreakdownRow[];
    ingresosPorLinea: FinanceNamedBreakdownRow[];
    ingresosPorMetodo: FinanceBreakdownRow[];
    topConceptosIngreso: FinanceBreakdownRow[];
  };
  ledger: {
    totalCount: number;
    rows: IncomeLedgerRow[];
  };
};

export type ExpenseSummary = {
  gastosTotales: number;
  gastoPromedio: number;
  totalGastos: number;
  gastosRecurrentesTotal: number;
  gastosRecurrentesCount: number;
};

export type ExpensePayablesSummary = {
  totalPendiente: number;
  vencido: number;
  vencePronto: number;
  alDia: number;
  buckets: FinanceAgingBucketRow[];
  topProveedores: FinanceCounterpartyRow[];
  topTramitadores: FinanceCounterpartyRow[];
};

export type ExpenseDashboardResponse = {
  generatedAt: string;
  filters: {
    from: string;
    to: string;
  };
  summary: ExpenseSummary;
  breakdown: {
    gastosPorCategoria: FinanceBreakdownRow[];
    gastosPorMetodo: FinanceBreakdownRow[];
    topConceptosGasto: FinanceBreakdownRow[];
    topProveedoresGasto: FinanceBreakdownRow[];
    topTramitadoresGasto: FinanceNamedBreakdownRow[];
    tramitadorPortfolio: FinanceTramitadorPortfolioRow[];
  };
  payables: ExpensePayablesSummary;
};

export type PortfolioMonthlyRow = {
  periodo: string;
  registros: number;
  valorEsperado: number;
  valorCobrado: number;
  saldoPendiente: number;
};

export type PortfolioOldDebtRow = {
  nombre: string;
  documento: string | null;
  referencia: string | null;
  tipoRegistro: string | null;
  saldoPendiente: number;
  fechaRegistro: string;
  fechaReferencia: string;
  diasPendiente: number;
};

export type PortfolioPendingRow = {
  obligationId: string;
  alumnoId: string | null;
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

export type PortfolioDashboardResponse = {
  generatedAt: string;
  filters: {
    from: string;
    to: string;
    page: number;
    pageSize: number;
  };
  summary: {
    registros: number;
    totalEsperado: number;
    totalCobrado: number;
    totalPendiente: number;
  };
  buckets: FinanceAgingBucketRow[];
  topDeudores: FinanceCounterpartyRow[];
  monthly: PortfolioMonthlyRow[];
  oldestPending: PortfolioOldDebtRow[];
  pendingCount: number;
  pendingRows: PortfolioPendingRow[];
};

export type DailyCashRow = {
  id: string;
  fecha: string;
  movimientos: number;
  total_efectivo: number;
  total_datafono: number;
  total_nequi: number;
  total_sistecredito: number;
  total_otro: number;
  total_registrado: number;
};

export type DailyCashStats = {
  totalEfectivo: number;
  totalDatafono: number;
  totalNequi: number;
  totalSistecredito: number;
  totalOtro: number;
  totalRegistrado: number;
  diasConMovimientos: number;
  promedioPorDia: number;
  mejorDiaFecha: string | null;
  mejorDiaMonto: number;
};

export type DailyCashResponse = {
  generatedAt: string;
  filters: {
    year: number;
    month: string;
    alumnoId: string | null;
    categoria: string | null;
    metodo: string | null;
    estado: string | null;
  };
  stats: DailyCashStats;
  rows: DailyCashRow[];
};
