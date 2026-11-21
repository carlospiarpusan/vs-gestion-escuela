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
