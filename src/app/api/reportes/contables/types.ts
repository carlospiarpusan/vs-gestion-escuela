import type { Rol } from "@/types/database";

export type AllowedPerfil = {
  id: string;
  rol: Rol;
  escuela_id: string | null;
  sede_id: string | null;
  activo: boolean;
};

export type ReportScope = {
  escuelaId: string | null;
  sedeId: string | null;
};

export type SchoolOption = {
  id: string;
  nombre: string;
};

export type SedeOption = {
  id: string;
  nombre: string;
  escuela_id: string;
};

export type QueryParts = {
  values: Array<string>;
  filteredIngresosCte: string;
  filteredGastosCte: string;
  filteredObligationsCte: string;
  /** Inline SQL for unfiltered student counts (not affected by ingreso_view) */
  studentCountsSql: {
    regulares: string;
    practica: string;
    aptitud: string;
  };
};

export type QueryFilters = {
  alumnoId: string | null;
  ingresoCategoria: string | null;
  ingresoEstado: string | null;
  ingresoMetodo: string | null;
  ingresoView: string | null;
  gastoCategoria: string | null;
  gastoContraparte: string | null;
  gastoEstado: string | null;
  gastoMetodo: string | null;
  gastoView: string | null;
  recurrenteOnly: boolean;
};

export type ReportInclude =
  | "options"
  | "summary"
  | "breakdown"
  | "series"
  | "ledger"
  | "receivables"
  | "payables"
  | "contracts"
  | "students";

export type LedgerRow = {
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

export type SummaryRow = {
  ingresos_cobrados: number | string | null;
  ingresos_pendientes: number | string | null;
  ingresos_anulados: number | string | null;
  ticket_promedio: number | string | null;
  total_ingresos: number | string | null;
  gastos_totales: number | string | null;
  total_gastos: number | string | null;
  gasto_promedio: number | string | null;
  gastos_recurrentes_total: number | string | null;
  gastos_recurrentes_count: number | string | null;
  alumnos_regulares: number | string | null;
  alumnos_practica: number | string | null;
  alumnos_aptitud: number | string | null;
};

export type AggregateRow = {
  categoria?: string;
  metodo_pago?: string | null;
  concepto?: string;
  cantidad: number | string | null;
  total: number | string | null;
};

export type NamedAggregateRow = {
  nombre: string | null;
  cantidad: number | string | null;
  total: number | string | null;
};

export type TramitadorPortfolioRow = {
  nombre: string | null;
  movimientos: number | string | null;
  pagado: number | string | null;
  pendiente: number | string | null;
  vencido: number | string | null;
  por_vencer: number | string | null;
  ticket_promedio: number | string | null;
  ultima_fecha: string | null;
};

export type AgingBucketRow = {
  bucket: string;
  cantidad: number | string | null;
  total: number | string | null;
};

export type CounterpartyAggregateRow = {
  nombre: string | null;
  cantidad: number | string | null;
  total: number | string | null;
};

export type DailySeriesSqlRow = {
  fecha: string;
  ingresos: number | string | null;
  pendientes: number | string | null;
  gastos: number | string | null;
  balance: number | string | null;
};

export type MonthlySeriesSqlRow = {
  periodo: string;
  ingresos: number | string | null;
  gastos: number | string | null;
  balance: number | string | null;
};

export type ContractsSummaryRow = {
  total_esperado: number | string | null;
  total_cobrado: number | string | null;
  total_pendiente: number | string | null;
  registros: number | string | null;
};

export type ContractsMonthlyRow = {
  periodo: string;
  registros: number | string | null;
  valor_esperado: number | string | null;
  valor_cobrado: number | string | null;
  saldo_pendiente: number | string | null;
};

export type ContractOldDebtRow = {
  nombre: string | null;
  documento: string | null;
  referencia: string | null;
  tipo_registro: string | null;
  saldo_pendiente: number | string | null;
  fecha_registro: string | null;
  fecha_referencia: string | null;
  dias_pendiente: number | string | null;
};

export type StudentReportSqlRow = {
  id: string;
  nombre: string;
  dni: string;
  tipo_registro: string;
  categorias: string[] | null;
  fecha_inscripcion: string | null;
  valor_total: number | string | null;
  pago_total: number | string | null;
};

export type StudentsRevenueSqlRow = {
  tipo_registro: string;
  total_ingresos: number | string | null;
  cantidad: number | string | null;
};

export type ContractPendingSqlRow = {
  obligation_id: string;
  nombre: string | null;
  documento: string | null;
  referencia: string | null;
  tipo_registro: string | null;
  fecha_registro: string | null;
  fecha_referencia: string | null;
  valor_esperado: number | string | null;
  valor_cobrado: number | string | null;
  saldo_pendiente: number | string | null;
  dias_pendiente: number | string | null;
};

export type LedgerCountRow = {
  total: number | string | null;
};
