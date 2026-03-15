import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { parseExpenseSearch } from "@/lib/expense-search";
import {
  EXAMEN_INCOME_CATEGORIES,
  MATRICULA_INCOME_CATEGORIES,
  PRACTICA_INCOME_CATEGORIES,
} from "@/lib/income-view";
import { getServerDbPool } from "@/lib/server-db";
import type { Rol } from "@/types/database";

type AllowedPerfil = {
  id: string;
  rol: Rol;
  escuela_id: string | null;
  sede_id: string | null;
  activo: boolean;
};

type ReportScope = {
  escuelaId: string | null;
  sedeId: string | null;
};

type SchoolOption = {
  id: string;
  nombre: string;
};

type SedeOption = {
  id: string;
  nombre: string;
  escuela_id: string;
};

type QueryParts = {
  values: Array<string>;
  filteredIngresosCte: string;
  filteredGastosCte: string;
  filteredObligationsCte: string;
  allObligationsCte: string;
};

type QueryFilters = {
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

type ReportInclude =
  | "options"
  | "summary"
  | "breakdown"
  | "series"
  | "ledger"
  | "receivables"
  | "payables"
  | "contracts"
  | "students";

type LedgerRow = {
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

type SummaryRow = {
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

type AggregateRow = {
  categoria?: string;
  metodo_pago?: string | null;
  concepto?: string;
  cantidad: number | string | null;
  total: number | string | null;
};

type NamedAggregateRow = {
  nombre: string | null;
  cantidad: number | string | null;
  total: number | string | null;
};

type AgingBucketRow = {
  bucket: string;
  cantidad: number | string | null;
  total: number | string | null;
};

type CounterpartyAggregateRow = {
  nombre: string | null;
  cantidad: number | string | null;
  total: number | string | null;
};

type DailySeriesSqlRow = {
  fecha: string;
  ingresos: number | string | null;
  pendientes: number | string | null;
  gastos: number | string | null;
  balance: number | string | null;
};

type MonthlySeriesSqlRow = {
  periodo: string;
  ingresos: number | string | null;
  gastos: number | string | null;
  balance: number | string | null;
};

type ContractsSummaryRow = {
  total_esperado: number | string | null;
  total_cobrado: number | string | null;
  total_pendiente: number | string | null;
  registros: number | string | null;
};

type ContractsMonthlyRow = {
  periodo: string;
  registros: number | string | null;
  valor_esperado: number | string | null;
  valor_cobrado: number | string | null;
  saldo_pendiente: number | string | null;
};

type ContractOldDebtRow = {
  nombre: string | null;
  documento: string | null;
  referencia: string | null;
  tipo_registro: string | null;
  saldo_pendiente: number | string | null;
  fecha_registro: string | null;
  fecha_referencia: string | null;
  dias_pendiente: number | string | null;
};

type StudentReportSqlRow = {
  id: string;
  nombre: string;
  dni: string;
  tipo_registro: string;
  categorias: string[] | null;
  fecha_inscripcion: string | null;
  created_at: string;
  valor_total: number | string | null;
  pago_total: number | string | null;
};

type StudentsRevenueSqlRow = {
  tipo_registro: string;
  total_ingresos: number | string | null;
  cantidad: number | string | null;
};

type ContractPendingSqlRow = {
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

type LedgerCountRow = {
  total: number | string | null;
};

const ALLOWED_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede", "administrativo"];
const DEFAULT_REPORT_INCLUDES: ReportInclude[] = [
  "options",
  "summary",
  "breakdown",
  "series",
  "ledger",
];
const ALL_REPORT_INCLUDES: ReportInclude[] = [
  "options",
  "summary",
  "breakdown",
  "series",
  "ledger",
  "receivables",
  "payables",
  "contracts",
];
const VEHICULAR_EXPENSE_CATEGORIES = [
  "combustible",
  "mantenimiento_vehiculo",
  "reparaciones",
  "seguros",
];
const ADMINISTRATIVE_EXPENSE_CATEGORIES = [
  "alquiler",
  "servicios",
  "material_didactico",
  "marketing",
  "impuestos",
  "suministros",
  "otros",
];
const PEOPLE_EXPENSE_CATEGORIES = ["nominas", "tramitador"];
const TRAMITADOR_EXPENSE_CATEGORY = "tramitador";

function parseDateInput(value: string | null, fallback: string) {
  if (!value) return fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function parseInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${day}`,
  };
}

function normalizeSearch(value: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : "";
}

function parseReportIncludes(value: string | null) {
  const requested = (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (requested.length === 0) {
    return new Set<ReportInclude>(DEFAULT_REPORT_INCLUDES);
  }

  const validIncludes = requested.filter((item): item is ReportInclude =>
    ALL_REPORT_INCLUDES.includes(item as ReportInclude)
  );

  return new Set<ReportInclude>(validIncludes.length > 0 ? validIncludes : DEFAULT_REPORT_INCLUDES);
}

function resolveScope(
  perfil: AllowedPerfil,
  requestedSchoolId: string | null,
  requestedSedeId: string | null
): ReportScope {
  if (perfil.rol === "super_admin") {
    return {
      escuelaId: requestedSchoolId,
      sedeId: requestedSedeId,
    };
  }

  if (perfil.rol === "admin_sede") {
    return {
      escuelaId: perfil.escuela_id,
      sedeId: perfil.sede_id,
    };
  }

  return {
    escuelaId: perfil.escuela_id,
    sedeId: requestedSedeId,
  };
}

function buildSqlInClause(values: string[], addValue: (value: string) => string) {
  return values.map((value) => addValue(value)).join(", ");
}

function buildQueryParts({
  scope,
  from,
  to,
  search,
  filters,
}: {
  scope: ReportScope;
  from: string;
  to: string;
  search: string;
  filters: QueryFilters;
}): QueryParts {
  const values: string[] = [];
  const ingresosWhere: string[] = [];
  const gastosWhere: string[] = [];
  const matriculasWhere: string[] = [];
  const standaloneWhere: string[] = [];
  const carteraMatriculasWhere: string[] = [];
  const carteraStandaloneWhere: string[] = [];
  const expenseSearch = parseExpenseSearch(search);

  const addValue = (value: string) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (scope.escuelaId) {
    const ref = addValue(scope.escuelaId);
    ingresosWhere.push(`i.escuela_id = ${ref}`);
    gastosWhere.push(`g.escuela_id = ${ref}`);
    matriculasWhere.push(`m.escuela_id = ${ref}`);
    standaloneWhere.push(`a.escuela_id = ${ref}`);
    carteraMatriculasWhere.push(`m.escuela_id = ${ref}`);
    carteraStandaloneWhere.push(`a.escuela_id = ${ref}`);
  }

  if (scope.sedeId) {
    const ref = addValue(scope.sedeId);
    ingresosWhere.push(`i.sede_id = ${ref}`);
    gastosWhere.push(`g.sede_id = ${ref}`);
    matriculasWhere.push(`m.sede_id = ${ref}`);
    standaloneWhere.push(`a.sede_id = ${ref}`);
    carteraMatriculasWhere.push(`m.sede_id = ${ref}`);
    carteraStandaloneWhere.push(`a.sede_id = ${ref}`);
  }

  const fromRef = addValue(from);
  ingresosWhere.push(`i.fecha >= ${fromRef}`);
  gastosWhere.push(`g.fecha >= ${fromRef}`);
  matriculasWhere.push(`m.fecha_inscripcion >= ${fromRef}`);
  standaloneWhere.push(`coalesce(a.fecha_inscripcion, a.created_at::date) >= ${fromRef}`);

  const toRef = addValue(to);
  ingresosWhere.push(`i.fecha <= ${toRef}`);
  gastosWhere.push(`g.fecha <= ${toRef}`);
  matriculasWhere.push(`m.fecha_inscripcion <= ${toRef}`);
  standaloneWhere.push(`coalesce(a.fecha_inscripcion, a.created_at::date) <= ${toRef}`);

  if (filters.alumnoId) {
    const ref = addValue(filters.alumnoId);
    ingresosWhere.push(`i.alumno_id = ${ref}`);
    matriculasWhere.push(`m.alumno_id = ${ref}`);
    standaloneWhere.push(`a.id = ${ref}`);
    carteraMatriculasWhere.push(`m.alumno_id = ${ref}`);
    carteraStandaloneWhere.push(`a.id = ${ref}`);
  }

  if (filters.ingresoCategoria) {
    const ref = addValue(filters.ingresoCategoria);
    ingresosWhere.push(`i.categoria = ${ref}`);
  }

  if (filters.ingresoEstado) {
    const ref = addValue(filters.ingresoEstado);
    ingresosWhere.push(`i.estado = ${ref}`);
  }

  if (filters.ingresoMetodo) {
    const ref = addValue(filters.ingresoMetodo);
    ingresosWhere.push(`i.metodo_pago = ${ref}`);
  }

  switch (filters.ingresoView) {
    case "matriculas":
      ingresosWhere.push(
        `i.categoria IN (${buildSqlInClause(MATRICULA_INCOME_CATEGORIES, addValue)})`
      );
      standaloneWhere.push("1 = 0");
      break;
    case "practicas":
      ingresosWhere.push(
        `i.categoria IN (${buildSqlInClause(PRACTICA_INCOME_CATEGORIES, addValue)})`
      );
      matriculasWhere.push("1 = 0");
      standaloneWhere.push("a.tipo_registro = 'practica_adicional'");
      break;
    case "examenes":
      ingresosWhere.push(
        `i.categoria IN (${buildSqlInClause(EXAMEN_INCOME_CATEGORIES, addValue)})`
      );
      matriculasWhere.push("1 = 0");
      standaloneWhere.push("a.tipo_registro = 'aptitud_conductor'");
      break;
    case "cobrado":
      ingresosWhere.push(`i.estado = ${addValue("cobrado")}`);
      break;
    case "pendiente":
      ingresosWhere.push(`i.estado = ${addValue("pendiente")}`);
      break;
    case "anulado":
      ingresosWhere.push(`i.estado = ${addValue("anulado")}`);
      break;
    case "with_invoice":
      ingresosWhere.push("COALESCE(NULLIF(TRIM(i.numero_factura), ''), NULL) IS NOT NULL");
      break;
    case "without_invoice":
      ingresosWhere.push("COALESCE(NULLIF(TRIM(i.numero_factura), ''), NULL) IS NULL");
      break;
    default:
      break;
  }

  if (filters.ingresoCategoria) {
    if (
      MATRICULA_INCOME_CATEGORIES.includes(
        filters.ingresoCategoria as (typeof MATRICULA_INCOME_CATEGORIES)[number]
      )
    ) {
      standaloneWhere.push("1 = 0");
    } else if (
      PRACTICA_INCOME_CATEGORIES.includes(
        filters.ingresoCategoria as (typeof PRACTICA_INCOME_CATEGORIES)[number]
      )
    ) {
      matriculasWhere.push("1 = 0");
      standaloneWhere.push("a.tipo_registro = 'practica_adicional'");
    } else if (
      EXAMEN_INCOME_CATEGORIES.includes(
        filters.ingresoCategoria as (typeof EXAMEN_INCOME_CATEGORIES)[number]
      )
    ) {
      matriculasWhere.push("1 = 0");
      standaloneWhere.push("a.tipo_registro = 'aptitud_conductor'");
    }
  }

  if (filters.gastoCategoria) {
    const ref = addValue(filters.gastoCategoria);
    gastosWhere.push(`g.categoria = ${ref}`);
  }

  if (filters.gastoContraparte) {
    const ref = addValue(`%${filters.gastoContraparte}%`);
    gastosWhere.push(`COALESCE(g.proveedor, '') ILIKE ${ref}`);
  }

  if (filters.gastoEstado) {
    const ref = addValue(filters.gastoEstado);
    gastosWhere.push(`g.estado_pago = ${ref}`);
  }

  if (filters.gastoMetodo) {
    const ref = addValue(filters.gastoMetodo);
    gastosWhere.push(`g.metodo_pago = ${ref}`);
  }

  if (filters.recurrenteOnly) {
    gastosWhere.push("g.recurrente = true");
  }

  switch (filters.gastoView) {
    case "vehicular":
      gastosWhere.push(
        `g.categoria IN (${buildSqlInClause(VEHICULAR_EXPENSE_CATEGORIES, addValue)})`
      );
      break;
    case "administrativo":
      gastosWhere.push(
        `g.categoria IN (${buildSqlInClause(ADMINISTRATIVE_EXPENSE_CATEGORIES, addValue)})`
      );
      break;
    case "personal":
      gastosWhere.push(`g.categoria IN (${buildSqlInClause(PEOPLE_EXPENSE_CATEGORIES, addValue)})`);
      break;
    case "tramitadores":
      gastosWhere.push(`g.categoria = ${addValue(TRAMITADOR_EXPENSE_CATEGORY)}`);
      break;
    case "with_invoice":
      gastosWhere.push("COALESCE(NULLIF(TRIM(g.numero_factura), ''), NULL) IS NOT NULL");
      break;
    case "without_invoice":
      gastosWhere.push("COALESCE(NULLIF(TRIM(g.numero_factura), ''), NULL) IS NULL");
      break;
    case "recurrente":
      gastosWhere.push("g.recurrente = true");
      break;
    default:
      break;
  }

  if (expenseSearch.freeText) {
    const ref = addValue(`%${expenseSearch.freeText}%`);
    ingresosWhere.push(
      `(
        i.concepto ILIKE ${ref}
        OR COALESCE(i.numero_factura, '') ILIKE ${ref}
        OR COALESCE(i.notas, '') ILIKE ${ref}
        OR COALESCE(TRIM(CONCAT(a.nombre, ' ', a.apellidos)), '') ILIKE ${ref}
        OR COALESCE(a.dni, '') ILIKE ${ref}
        OR COALESCE(m.numero_contrato, '') ILIKE ${ref}
      )`
    );
    gastosWhere.push(
      `(
        g.concepto ILIKE ${ref}
        OR COALESCE(g.proveedor, '') ILIKE ${ref}
        OR COALESCE(g.numero_factura, '') ILIKE ${ref}
        OR COALESCE(g.notas, '') ILIKE ${ref}
        OR g.categoria ILIKE ${ref}
        OR COALESCE(g.metodo_pago, '') ILIKE ${ref}
        OR g.fecha::text ILIKE ${ref}
      )`
    );
    matriculasWhere.push(
      `(
        COALESCE(NULLIF(TRIM(CONCAT(a.nombre, ' ', a.apellidos)), ''), '') ILIKE ${ref}
        OR COALESCE(a.dni, '') ILIKE ${ref}
        OR COALESCE(m.numero_contrato, '') ILIKE ${ref}
      )`
    );
    standaloneWhere.push(
      `(
        COALESCE(NULLIF(TRIM(CONCAT(a.nombre, ' ', a.apellidos)), ''), '') ILIKE ${ref}
        OR COALESCE(a.dni, '') ILIKE ${ref}
        OR COALESCE(a.numero_contrato, '') ILIKE ${ref}
      )`
    );
  }

  if (expenseSearch.fields.concepto) {
    const ref = addValue(`%${expenseSearch.fields.concepto}%`);
    ingresosWhere.push(`i.concepto ILIKE ${ref}`);
    gastosWhere.push(`g.concepto ILIKE ${ref}`);
  }

  if (expenseSearch.fields.factura) {
    const ref = addValue(`%${expenseSearch.fields.factura}%`);
    ingresosWhere.push(`COALESCE(i.numero_factura, '') ILIKE ${ref}`);
    gastosWhere.push(`COALESCE(g.numero_factura, '') ILIKE ${ref}`);
  }

  if (expenseSearch.fields.categoria) {
    const ref = addValue(`%${expenseSearch.fields.categoria}%`);
    ingresosWhere.push(`i.categoria ILIKE ${ref}`);
    gastosWhere.push(`g.categoria ILIKE ${ref}`);
  }

  if (expenseSearch.fields.metodo) {
    const ref = addValue(`%${expenseSearch.fields.metodo}%`);
    ingresosWhere.push(`COALESCE(i.metodo_pago, '') ILIKE ${ref}`);
    gastosWhere.push(`COALESCE(g.metodo_pago, '') ILIKE ${ref}`);
  }

  if (expenseSearch.fields.fecha) {
    const ref = addValue(`%${expenseSearch.fields.fecha}%`);
    ingresosWhere.push(`i.fecha::text ILIKE ${ref}`);
    gastosWhere.push(`g.fecha::text ILIKE ${ref}`);
  }

  if (expenseSearch.fields.notas) {
    const ref = addValue(`%${expenseSearch.fields.notas}%`);
    ingresosWhere.push(`COALESCE(i.notas, '') ILIKE ${ref}`);
    gastosWhere.push(`COALESCE(g.notas, '') ILIKE ${ref}`);
  }

  if (expenseSearch.fields.proveedor) {
    const ref = addValue(`%${expenseSearch.fields.proveedor}%`);
    gastosWhere.push(`COALESCE(g.proveedor, '') ILIKE ${ref}`);
  }

  if (expenseSearch.monto !== null) {
    const ref = addValue(String(expenseSearch.monto));
    ingresosWhere.push(`i.monto = ${ref}::numeric`);
    gastosWhere.push(`g.monto = ${ref}::numeric`);
  }

  if (expenseSearch.recurrente !== null) {
    gastosWhere.push(`g.recurrente = ${expenseSearch.recurrente ? "true" : "false"}`);
  }

  return {
    values,
    filteredIngresosCte: `
    filtered_ingresos AS (
        SELECT
          i.id,
          i.fecha,
          coalesce(i.fecha_vencimiento, i.fecha) as fecha_vencimiento,
          i.categoria,
          i.concepto,
          i.monto::numeric AS monto,
          i.estado,
          i.metodo_pago,
          i.numero_factura,
          i.created_at,
          COALESCE(NULLIF(TRIM(CONCAT(a.nombre, ' ', a.apellidos)), ''), NULL) AS contraparte,
          COALESCE(a.dni, NULL) AS documento,
          COALESCE(m.numero_contrato, NULL) AS contrato
        FROM ingresos i
        LEFT JOIN alumnos a ON a.id = i.alumno_id
        LEFT JOIN matriculas_alumno m ON m.id = i.matricula_id
        WHERE ${ingresosWhere.join(" AND ")}
      )
    `,
    filteredGastosCte: `
    filtered_gastos AS (
        SELECT
          g.id,
          g.fecha,
          coalesce(g.fecha_vencimiento, g.fecha) as fecha_vencimiento,
          g.categoria,
          g.concepto,
          g.monto::numeric AS monto,
          'aplicado'::text AS estado,
          g.estado_pago,
          g.metodo_pago,
          g.numero_factura,
          g.recurrente,
          g.created_at,
          COALESCE(g.proveedor, NULL) AS contraparte,
          NULL::text AS documento,
          NULL::text AS contrato
        FROM gastos g
        WHERE ${gastosWhere.join(" AND ")}
      )
    `,
    filteredObligationsCte: `
    filtered_obligations AS (
        SELECT
          ('matricula:' || m.id::text) AS obligation_id,
          m.alumno_id,
          'regular'::text AS tipo_registro,
          m.fecha_inscripcion::date AS fecha_registro,
          m.numero_contrato AS referencia,
          COALESCE(NULLIF(TRIM(CONCAT(a.nombre, ' ', a.apellidos)), ''), 'Sin alumno asociado') AS nombre,
          a.dni AS documento,
          COALESCE(m.valor_total, 0)::numeric AS valor_esperado,
          COALESCE(pagos.total_cobrado, 0)::numeric AS valor_cobrado,
          GREATEST(COALESCE(m.valor_total, 0) - COALESCE(pagos.total_cobrado, 0), 0)::numeric AS saldo_pendiente,
          COALESCE(pagos.oldest_pending_date, m.fecha_inscripcion)::date AS fecha_referencia,
          COALESCE(m.categorias, '{}'::text[]) AS categorias
        FROM matriculas_alumno m
        JOIN alumnos a ON a.id = m.alumno_id
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(SUM(CASE WHEN i.estado = 'cobrado' THEN i.monto ELSE 0 END), 0) AS total_cobrado,
            MIN(CASE WHEN i.estado = 'pendiente' THEN COALESCE(i.fecha_vencimiento, i.fecha) END) AS oldest_pending_date
          FROM ingresos i
          WHERE i.matricula_id = m.id
        ) pagos ON true
        WHERE ${matriculasWhere.join(" AND ")}

        UNION ALL

        SELECT
          ('alumno:' || a.id::text) AS obligation_id,
          a.id AS alumno_id,
          a.tipo_registro::text AS tipo_registro,
          COALESCE(a.fecha_inscripcion, a.created_at::date) AS fecha_registro,
          a.numero_contrato AS referencia,
          COALESCE(NULLIF(TRIM(CONCAT(a.nombre, ' ', a.apellidos)), ''), 'Sin alumno asociado') AS nombre,
          a.dni AS documento,
          COALESCE(a.valor_total, 0)::numeric AS valor_esperado,
          COALESCE(pagos.total_cobrado, 0)::numeric AS valor_cobrado,
          GREATEST(COALESCE(a.valor_total, 0) - COALESCE(pagos.total_cobrado, 0), 0)::numeric AS saldo_pendiente,
          COALESCE(pagos.oldest_pending_date, COALESCE(a.fecha_inscripcion, a.created_at::date))::date AS fecha_referencia,
          COALESCE(a.categorias, '{}'::text[]) AS categorias
        FROM alumnos a
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(SUM(CASE WHEN i.estado = 'cobrado' THEN i.monto ELSE 0 END), 0) AS total_cobrado,
            MIN(CASE WHEN i.estado = 'pendiente' THEN COALESCE(i.fecha_vencimiento, i.fecha) END) AS oldest_pending_date
          FROM ingresos i
          WHERE i.alumno_id = a.id
            AND i.matricula_id IS NULL
        ) pagos ON true
        WHERE a.tipo_registro IN ('aptitud_conductor', 'practica_adicional')
          AND ${standaloneWhere.join(" AND ")}
      )
    `,
    allObligationsCte: `
    all_obligations AS (
        SELECT
          ('matricula:' || m.id::text) AS obligation_id,
          m.alumno_id,
          'regular'::text AS tipo_registro,
          m.fecha_inscripcion::date AS fecha_registro,
          m.numero_contrato AS referencia,
          COALESCE(NULLIF(TRIM(CONCAT(a.nombre, ' ', a.apellidos)), ''), 'Sin alumno asociado') AS nombre,
          a.dni AS documento,
          COALESCE(m.valor_total, 0)::numeric AS valor_esperado,
          COALESCE(pagos.total_cobrado, 0)::numeric AS valor_cobrado,
          GREATEST(COALESCE(m.valor_total, 0) - COALESCE(pagos.total_cobrado, 0), 0)::numeric AS saldo_pendiente,
          COALESCE(pagos.oldest_pending_date, m.fecha_inscripcion)::date AS fecha_referencia,
          COALESCE(m.categorias, '{}'::text[]) AS categorias
        FROM matriculas_alumno m
        JOIN alumnos a ON a.id = m.alumno_id
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(SUM(CASE WHEN i.estado = 'cobrado' THEN i.monto ELSE 0 END), 0) AS total_cobrado,
            MIN(CASE WHEN i.estado = 'pendiente' THEN COALESCE(i.fecha_vencimiento, i.fecha) END) AS oldest_pending_date
          FROM ingresos i
          WHERE i.matricula_id = m.id
        ) pagos ON true
        WHERE ${carteraMatriculasWhere.length ? carteraMatriculasWhere.join(" AND ") : "1 = 1"}

        UNION ALL

        SELECT
          ('alumno:' || a.id::text) AS obligation_id,
          a.id AS alumno_id,
          a.tipo_registro::text AS tipo_registro,
          COALESCE(a.fecha_inscripcion, a.created_at::date) AS fecha_registro,
          a.numero_contrato AS referencia,
          COALESCE(NULLIF(TRIM(CONCAT(a.nombre, ' ', a.apellidos)), ''), 'Sin alumno asociado') AS nombre,
          a.dni AS documento,
          COALESCE(a.valor_total, 0)::numeric AS valor_esperado,
          COALESCE(pagos.total_cobrado, 0)::numeric AS valor_cobrado,
          GREATEST(COALESCE(a.valor_total, 0) - COALESCE(pagos.total_cobrado, 0), 0)::numeric AS saldo_pendiente,
          COALESCE(pagos.oldest_pending_date, COALESCE(a.fecha_inscripcion, a.created_at::date))::date AS fecha_referencia,
          COALESCE(a.categorias, '{}'::text[]) AS categorias
        FROM alumnos a
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(SUM(CASE WHEN i.estado = 'cobrado' THEN i.monto ELSE 0 END), 0) AS total_cobrado,
            MIN(CASE WHEN i.estado = 'pendiente' THEN COALESCE(i.fecha_vencimiento, i.fecha) END) AS oldest_pending_date
          FROM ingresos i
          WHERE i.alumno_id = a.id
            AND i.matricula_id IS NULL
        ) pagos ON true
        WHERE a.tipo_registro IN ('aptitud_conductor', 'practica_adicional')
          AND ${carteraStandaloneWhere.length ? carteraStandaloneWhere.join(" AND ") : "1 = 1"}
      )
    `,
  };
}

function toNumber(value: unknown) {
  return Number(value || 0);
}

function formatCsvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function normalizeDateOnly(value: unknown) {
  if (!value) return "";

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value);
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;

  return parsed.toISOString().slice(0, 10);
}

function normalizePeriod(value: unknown) {
  if (!value) return "";

  const text = String(value);
  const match = text.match(/^\d{4}-\d{2}/);
  if (match) return match[0];

  const parsed = value instanceof Date ? value : new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;

  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}`;
}

function appendCtes(baseCte: string, ...extraCtes: string[]) {
  const base = baseCte.trim().replace(/^with\s+/i, "");
  const extras = extraCtes.map((cte) => cte.trim().replace(/,$/, "")).filter(Boolean);

  return `with ${[base, ...extras].join(",\n")}`;
}

async function getAccessibleOptions(
  pool: ReturnType<typeof getServerDbPool>,
  perfil: AllowedPerfil,
  scope: ReportScope
) {
  if (perfil.rol === "super_admin") {
    const schoolsRes = await pool.query<SchoolOption>(
      "select id, nombre from escuelas order by nombre asc"
    );

    if (scope.escuelaId) {
      const sedesRes = await pool.query<SedeOption>(
        "select id, nombre, escuela_id from sedes where escuela_id = $1 order by nombre asc",
        [scope.escuelaId]
      );

      return {
        escuelas: schoolsRes.rows,
        sedes: sedesRes.rows,
      };
    }

    const sedesRes = await pool.query<SedeOption>(
      "select id, nombre, escuela_id from sedes order by nombre asc limit 500"
    );

    return {
      escuelas: schoolsRes.rows,
      sedes: sedesRes.rows,
    };
  }

  const schoolId = perfil.escuela_id;
  if (!schoolId) {
    return { escuelas: [], sedes: [] };
  }

  const schoolsRes = await pool.query<SchoolOption>(
    "select id, nombre from escuelas where id = $1",
    [schoolId]
  );

  if (perfil.rol === "admin_sede" && perfil.sede_id) {
    const sedesRes = await pool.query<SedeOption>(
      "select id, nombre, escuela_id from sedes where id = $1",
      [perfil.sede_id]
    );
    return {
      escuelas: schoolsRes.rows,
      sedes: sedesRes.rows,
    };
  }

  const sedesRes = await pool.query<SedeOption>(
    "select id, nombre, escuela_id from sedes where escuela_id = $1 order by nombre asc",
    [schoolId]
  );

  return {
    escuelas: schoolsRes.rows,
    sedes: sedesRes.rows,
  };
}

async function buildJsonResponse({
  pool,
  parts,
  page,
  pageSize,
  perfil,
  scope,
  from,
  to,
  includes,
}: {
  pool: ReturnType<typeof getServerDbPool>;
  parts: QueryParts;
  page: number;
  pageSize: number;
  perfil: AllowedPerfil;
  scope: ReportScope;
  from: string;
  to: string;
  includes: Set<ReportInclude>;
}) {
  const cte = `with ${parts.filteredIngresosCte}, ${parts.filteredGastosCte}, ${parts.filteredObligationsCte}, ${parts.allObligationsCte}`;
  const dailySeriesCte = appendCtes(
    cte,
    `
      daily_ingresos as (
        select
          fecha,
          coalesce(sum(case when estado = 'cobrado' then monto else 0 end), 0) as ingresos,
          coalesce(sum(case when estado = 'pendiente' then monto else 0 end), 0) as pendientes
        from filtered_ingresos
        group by fecha
      )
    `,
    `
      daily_gastos as (
        select fecha, coalesce(sum(monto), 0) as gastos
        from filtered_gastos
        group by fecha
      )
    `
  );
  const monthlySeriesCte = appendCtes(
    cte,
    `
      monthly_ingresos as (
        select
          to_char(date_trunc('month', fecha), 'YYYY-MM') as periodo,
          coalesce(sum(case when estado = 'cobrado' then monto else 0 end), 0) as ingresos
        from filtered_ingresos
        group by 1
      )
    `,
    `
      monthly_gastos as (
        select
          to_char(date_trunc('month', fecha), 'YYYY-MM') as periodo,
          coalesce(sum(monto), 0) as gastos
        from filtered_gastos
        group by 1
      )
    `
  );
  const offset = page * pageSize;
  const limitRef = `$${parts.values.length + 1}`;
  const offsetRef = `$${parts.values.length + 2}`;
  const needsOptions = includes.has("options");
  const needsSummary = includes.has("summary");
  const needsBreakdown = includes.has("breakdown");
  const needsSeries = includes.has("series");
  const needsLedger = includes.has("ledger");
  const needsReceivables = includes.has("receivables");
  const needsPayables = includes.has("payables");
  const needsContracts = includes.has("contracts");
  const needsStudents = includes.has("students");

  const [
    summaryRes,
    ingresosCategoriaRes,
    ingresosLineaRes,
    gastosCategoriaRes,
    metodosRes,
    gastosMetodoRes,
    serieDiariaRes,
    serieMensualRes,
    topIngresosRes,
    topGastosRes,
    topTramitadoresGastoRes,
    topProveedoresGastoRes,
    ledgerCountRes,
    ledgerRes,
    receivablesBucketsRes,
    receivablesTopRes,
    payablesBucketsRes,
    payablesTramitadoresRes,
    payablesTopRes,
    contractsSummaryRes,
    contractsMonthlyRes,
    contractsOldestRes,
    contractsPendingCountRes,
    contractsPendingRowsRes,
    options,
    studentsRevenueRes,
    studentsRowsRes,
  ] = await Promise.all([
    needsSummary
      ? pool.query<SummaryRow>(
          `
            ${cte}
            select
              coalesce(sum(case when estado = 'cobrado' then monto else 0 end), 0) as ingresos_cobrados,
              coalesce(sum(case when estado = 'pendiente' then monto else 0 end), 0) as ingresos_pendientes,
              coalesce(sum(case when estado = 'anulado' then monto else 0 end), 0) as ingresos_anulados,
              coalesce(avg(case when estado = 'cobrado' then monto end), 0) as ticket_promedio,
              (select count(*)::int from filtered_gastos) as total_gastos,
              (select coalesce(avg(monto), 0) from filtered_gastos) as gasto_promedio,
              (select coalesce(sum(monto), 0) from filtered_gastos where recurrente = true) as gastos_recurrentes_total,
              (select count(*)::int from filtered_gastos where recurrente = true) as gastos_recurrentes_count,
              (select count(*)::int from filtered_obligations where tipo_registro = 'regular') as alumnos_regulares,
              (select count(*)::int from filtered_obligations where tipo_registro = 'practica_adicional') as alumnos_practica,
              (select count(*)::int from filtered_obligations where tipo_registro = 'aptitud_conductor') as alumnos_aptitud
            from filtered_ingresos
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as SummaryRow[] }),
    needsBreakdown
      ? pool.query<AggregateRow>(
          `
            ${cte}
            select categoria, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
            from filtered_ingresos
            group by categoria
            order by total desc, categoria asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AggregateRow[] }),
    needsBreakdown
      ? pool.query<NamedAggregateRow>(
          `
            ${cte}
            select
              case
                when categoria in ('matricula', 'mensualidad', 'material', 'tasas_dgt') then 'Cursos'
                when categoria = 'clase_suelta' then 'Practica adicional'
                when categoria in ('examen_teorico', 'examen_practico', 'examen_aptitud') then 'Examenes'
                else 'Otros'
              end as nombre,
              count(*)::int as cantidad,
              coalesce(sum(monto), 0) as total
            from filtered_ingresos
            group by 1
            order by total desc, nombre asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as NamedAggregateRow[] }),
    needsBreakdown
      ? pool.query<AggregateRow>(
          `
            ${cte}
            select categoria, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
            from filtered_gastos
            group by categoria
            order by total desc, categoria asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AggregateRow[] }),
    needsBreakdown
      ? pool.query<AggregateRow>(
          `
            ${cte}
            select metodo_pago, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
            from filtered_ingresos
            group by metodo_pago
            order by total desc, metodo_pago asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AggregateRow[] }),
    needsBreakdown
      ? pool.query<AggregateRow>(
          `
            ${cte}
            select metodo_pago, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
            from filtered_gastos
            group by metodo_pago
            order by total desc, metodo_pago asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AggregateRow[] }),
    needsSeries
      ? pool.query<DailySeriesSqlRow>(
          `
            ${dailySeriesCte}
            select
              coalesce(di.fecha, dg.fecha) as fecha,
              coalesce(di.ingresos, 0) as ingresos,
              coalesce(di.pendientes, 0) as pendientes,
              coalesce(dg.gastos, 0) as gastos,
              coalesce(di.ingresos, 0) - coalesce(dg.gastos, 0) as balance
            from daily_ingresos di
            full outer join daily_gastos dg on dg.fecha = di.fecha
            order by fecha desc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as DailySeriesSqlRow[] }),
    needsSeries
      ? pool.query<MonthlySeriesSqlRow>(
          `
            ${monthlySeriesCte}
            select
              coalesce(mi.periodo, mg.periodo) as periodo,
              coalesce(mi.ingresos, 0) as ingresos,
              coalesce(mg.gastos, 0) as gastos,
              coalesce(mi.ingresos, 0) - coalesce(mg.gastos, 0) as balance
            from monthly_ingresos mi
            full outer join monthly_gastos mg on mg.periodo = mi.periodo
            order by periodo desc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as MonthlySeriesSqlRow[] }),
    needsBreakdown
      ? pool.query<AggregateRow>(
          `
            ${cte}
            select concepto, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
            from filtered_ingresos
            group by concepto
            order by total desc, cantidad desc, concepto asc
            limit 8
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AggregateRow[] }),
    needsBreakdown
      ? pool.query<AggregateRow>(
          `
            ${cte}
            select concepto, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
            from filtered_gastos
            group by concepto
            order by total desc, cantidad desc, concepto asc
            limit 8
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AggregateRow[] }),
    needsBreakdown
      ? pool.query<NamedAggregateRow>(
          `
            ${cte}
            select
              coalesce(contraparte, 'Sin tramitador') as nombre,
              count(*)::int as cantidad,
              coalesce(sum(monto), 0) as total
            from filtered_gastos
            where categoria = 'tramitador'
            group by 1
            order by total desc, cantidad desc, nombre asc
            limit 12
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as NamedAggregateRow[] }),
    needsBreakdown
      ? pool.query<AggregateRow>(
          `
            ${cte}
            select contraparte as concepto, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
            from filtered_gastos
            where contraparte is not null
            group by contraparte
            order by total desc, cantidad desc, contraparte asc
            limit 8
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AggregateRow[] }),
    needsLedger
      ? pool.query<LedgerCountRow>(
          `
            ${cte}
            select
              (
                select count(*) from filtered_ingresos
              ) + (
                select count(*) from filtered_gastos
              ) as total
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as LedgerCountRow[] }),
    needsLedger
      ? pool.query<LedgerRow & { created_at: string }>(
          `
            ${cte}
            select *
            from (
              select
                id::text as id,
                fecha,
                'ingreso'::text as tipo,
                categoria,
                concepto,
                monto,
                estado,
                metodo_pago,
                numero_factura,
                contraparte,
                documento,
                contrato,
                created_at
              from filtered_ingresos
              union all
              select
                id::text as id,
                fecha,
                'gasto'::text as tipo,
                categoria,
                concepto,
                monto,
                estado_pago as estado,
                metodo_pago,
                numero_factura,
                contraparte,
                documento,
                contrato,
                created_at
              from filtered_gastos
            ) ledger
            order by fecha desc, created_at desc
            limit ${limitRef} offset ${offsetRef}
          `,
          [...parts.values, String(pageSize), String(offset)]
        )
      : Promise.resolve({ rows: [] as Array<LedgerRow & { created_at: string }> }),
    needsReceivables
      ? pool.query<AgingBucketRow>(
          `
            ${cte}
            select
              case
                when fecha_vencimiento < current_date then 'Vencido'
                when fecha_vencimiento <= current_date + interval '7 day' then 'Proximo a vencer'
                else 'Al dia'
              end as bucket,
              count(*)::int as cantidad,
              coalesce(sum(monto), 0) as total
            from filtered_ingresos
            where estado = 'pendiente'
            group by 1
            order by min(fecha_vencimiento) asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AgingBucketRow[] }),
    needsReceivables
      ? pool.query<CounterpartyAggregateRow>(
          `
            ${cte}
            select
              coalesce(contraparte, 'Sin alumno asociado') as nombre,
              count(*)::int as cantidad,
              coalesce(sum(monto), 0) as total
            from filtered_ingresos
            where estado = 'pendiente'
            group by 1
            order by total desc, cantidad desc, nombre asc
            limit 8
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as CounterpartyAggregateRow[] }),
    needsPayables
      ? pool.query<AgingBucketRow>(
          `
            ${cte}
            select
              case
                when fecha_vencimiento < current_date then 'Vencido'
                when fecha_vencimiento <= current_date + interval '7 day' then 'Proximo a vencer'
                else 'Al dia'
              end as bucket,
              count(*)::int as cantidad,
              coalesce(sum(monto), 0) as total
            from filtered_gastos
            where estado_pago = 'pendiente'
            group by 1
            order by min(fecha_vencimiento) asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AgingBucketRow[] }),
    needsPayables
      ? pool.query<CounterpartyAggregateRow>(
          `
            ${cte}
            select
              coalesce(contraparte, 'Sin tramitador') as nombre,
              count(*)::int as cantidad,
              coalesce(sum(monto), 0) as total
            from filtered_gastos
            where estado_pago = 'pendiente' and categoria = 'tramitador'
            group by 1
            order by total desc, cantidad desc, nombre asc
            limit 12
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as CounterpartyAggregateRow[] }),
    needsPayables
      ? pool.query<CounterpartyAggregateRow>(
          `
            ${cte}
            select
              coalesce(contraparte, 'Sin proveedor') as nombre,
              count(*)::int as cantidad,
              coalesce(sum(monto), 0) as total
            from filtered_gastos
            where estado_pago = 'pendiente'
            group by 1
            order by total desc, cantidad desc, nombre asc
            limit 8
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as CounterpartyAggregateRow[] }),
    needsContracts
      ? pool.query<ContractsSummaryRow>(
          `
            ${cte}
            select
              count(*)::int as registros,
              coalesce(sum(valor_esperado), 0) as total_esperado,
              coalesce(sum(valor_cobrado), 0) as total_cobrado,
              coalesce(sum(saldo_pendiente), 0) as total_pendiente
            from all_obligations
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as ContractsSummaryRow[] }),
    needsContracts
      ? pool.query<ContractsMonthlyRow>(
          `
            ${cte}
            select
              to_char(date_trunc('month', fecha_registro), 'YYYY-MM') as periodo,
              count(*)::int as registros,
              coalesce(sum(valor_esperado), 0) as valor_esperado,
              coalesce(sum(valor_cobrado), 0) as valor_cobrado,
              coalesce(sum(saldo_pendiente), 0) as saldo_pendiente
            from filtered_obligations
            group by 1
            order by periodo desc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as ContractsMonthlyRow[] }),
    needsContracts
      ? pool.query<ContractOldDebtRow>(
          `
            ${cte}
            select
              nombre,
              documento,
              referencia,
              tipo_registro,
              saldo_pendiente,
              fecha_registro,
              fecha_referencia,
              greatest((current_date - fecha_referencia::date), 0)::int as dias_pendiente
            from all_obligations
            where saldo_pendiente > 0
            order by dias_pendiente desc, saldo_pendiente desc, fecha_referencia asc
            limit 12
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as ContractOldDebtRow[] }),
    needsContracts
      ? pool.query<LedgerCountRow>(
          `
            ${cte}
            select count(*)::int as total
            from all_obligations
            where saldo_pendiente > 0
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as LedgerCountRow[] }),
    needsContracts
      ? pool.query<ContractPendingSqlRow>(
          `
            ${cte}
            select
              obligation_id,
              nombre,
              documento,
              referencia,
              tipo_registro,
              fecha_registro,
              fecha_referencia,
              valor_esperado,
              valor_cobrado,
              saldo_pendiente,
              greatest((current_date - fecha_referencia::date), 0)::int as dias_pendiente
            from all_obligations
            where saldo_pendiente > 0
            order by dias_pendiente desc, saldo_pendiente desc, fecha_referencia asc
            limit ${limitRef} offset ${offsetRef}
          `,
          [...parts.values, String(pageSize), String(offset)]
        )
      : Promise.resolve({ rows: [] as ContractPendingSqlRow[] }),
    needsOptions
      ? getAccessibleOptions(pool, perfil, scope)
      : Promise.resolve({ escuelas: [], sedes: [] }),
    needsStudents
      ? pool.query<StudentsRevenueSqlRow>(
          `
            ${cte}
            select
              tipo_registro,
              count(*)::int as cantidad,
              coalesce(sum(valor_cobrado), 0) as total_ingresos
            from filtered_obligations
            group by 1
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as StudentsRevenueSqlRow[] }),
    needsStudents
      ? pool.query<StudentReportSqlRow>(
          `
            ${cte}
            select
              obligation_id as id,
              nombre,
              documento as dni,
              tipo_registro,
              categorias,
              fecha_registro as fecha_inscripcion,
              valor_esperado as valor_total,
              valor_cobrado as pago_total
            from filtered_obligations
            order by fecha_registro desc, nombre asc
            limit 100
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as StudentReportSqlRow[] }),
  ]);

  const studentsRevenueRows = (studentsRevenueRes as { rows: StudentsRevenueSqlRow[] }).rows;
  const studentsDetailRows = (studentsRowsRes as { rows: StudentReportSqlRow[] }).rows;

  const summaryRow = summaryRes.rows[0] ?? {};
  const ingresosCobrados = toNumber(summaryRow.ingresos_cobrados);
  const gastosTotales = toNumber(summaryRow.gastos_totales);
  const balanceNeto = ingresosCobrados - gastosTotales;
  const contractsSummaryRow =
    (contractsSummaryRes as { rows: ContractsSummaryRow[] }).rows[0] ?? {};

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    filters: {
      from,
      to,
      page,
      pageSize,
      scope,
    },
    options,
    summary: {
      ingresosCobrados,
      ingresosPendientes: toNumber(summaryRow.ingresos_pendientes),
      ingresosAnulados: toNumber(summaryRow.ingresos_anulados),
      gastosTotales,
      balanceNeto,
      margenPorcentaje: ingresosCobrados > 0 ? (balanceNeto / ingresosCobrados) * 100 : 0,
      ticketPromedio: toNumber(summaryRow.ticket_promedio),
      gastoPromedio: toNumber(summaryRow.gasto_promedio),
      gastosRecurrentesTotal: toNumber(summaryRow.gastos_recurrentes_total),
      gastosRecurrentesCount: Number(summaryRow.gastos_recurrentes_count || 0),
      cobranzaPorcentaje:
        ingresosCobrados + toNumber(summaryRow.ingresos_pendientes) > 0
          ? (ingresosCobrados / (ingresosCobrados + toNumber(summaryRow.ingresos_pendientes))) * 100
          : 0,
      totalGastos: Number(summaryRow.total_gastos || 0),
      totalMovimientos:
        Number(summaryRow.total_ingresos || 0) + Number(summaryRow.total_gastos || 0),
      alumnosNuevosRegulares: Number(summaryRow.alumnos_regulares || 0),
      alumnosNuevosPractica: Number(summaryRow.alumnos_practica || 0),
      alumnosNuevosAptitud: Number(summaryRow.alumnos_aptitud || 0),
    },
    breakdown: {
      ingresosPorCategoria: ingresosCategoriaRes.rows.map((row: AggregateRow) => ({
        categoria: row.categoria,
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      ingresosPorLinea: ingresosLineaRes.rows.map((row: NamedAggregateRow) => ({
        nombre: row.nombre || "Otros",
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      gastosPorCategoria: gastosCategoriaRes.rows.map((row: AggregateRow) => ({
        categoria: row.categoria,
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      ingresosPorMetodo: metodosRes.rows.map((row: AggregateRow) => ({
        metodo_pago: row.metodo_pago,
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      gastosPorMetodo: gastosMetodoRes.rows.map((row: AggregateRow) => ({
        metodo_pago: row.metodo_pago,
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      topConceptosIngreso: topIngresosRes.rows.map((row: AggregateRow) => ({
        concepto: row.concepto,
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      topConceptosGasto: topGastosRes.rows.map((row: AggregateRow) => ({
        concepto: row.concepto,
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      topTramitadoresGasto: topTramitadoresGastoRes.rows.map((row: NamedAggregateRow) => ({
        nombre: row.nombre || "Sin tramitador",
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      topProveedoresGasto: topProveedoresGastoRes.rows.map((row: AggregateRow) => ({
        concepto: row.concepto,
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
    },
    series: {
      diaria: serieDiariaRes.rows.map((row: DailySeriesSqlRow) => ({
        fecha: normalizeDateOnly(row.fecha),
        ingresos: toNumber(row.ingresos),
        pendientes: toNumber(row.pendientes),
        gastos: toNumber(row.gastos),
        balance: toNumber(row.balance),
      })),
      mensual: serieMensualRes.rows.map((row: MonthlySeriesSqlRow) => ({
        periodo: normalizePeriod(row.periodo),
        ingresos: toNumber(row.ingresos),
        gastos: toNumber(row.gastos),
        balance: toNumber(row.balance),
      })),
    },
    ledger: {
      totalCount: needsLedger ? Number(ledgerCountRes.rows[0]?.total || 0) : 0,
      rows: needsLedger
        ? (ledgerRes.rows.map((row: LedgerRow & { created_at: string }) => ({
            ...row,
            fecha: normalizeDateOnly(row.fecha),
            monto: toNumber(row.monto),
          })) as LedgerRow[])
        : [],
    },
    receivables: needsReceivables
      ? {
          totalPendiente: toNumber(summaryRow.ingresos_pendientes),
          vencido: receivablesBucketsRes.rows
            .filter((row: AgingBucketRow) => row.bucket === "Vencido")
            .reduce((sum, row) => sum + toNumber(row.total), 0),
          vencePronto: receivablesBucketsRes.rows
            .filter((row: AgingBucketRow) => row.bucket === "Proximo a vencer")
            .reduce((sum, row) => sum + toNumber(row.total), 0),
          alDia: receivablesBucketsRes.rows
            .filter((row: AgingBucketRow) => row.bucket === "Al dia")
            .reduce((sum, row) => sum + toNumber(row.total), 0),
          buckets: receivablesBucketsRes.rows.map((row: AgingBucketRow) => ({
            bucket: row.bucket,
            cantidad: Number(row.cantidad || 0),
            total: toNumber(row.total),
          })),
          topDeudores: receivablesTopRes.rows.map((row: CounterpartyAggregateRow) => ({
            nombre: row.nombre || "Sin alumno asociado",
            cantidad: Number(row.cantidad || 0),
            total: toNumber(row.total),
          })),
        }
      : undefined,
    payables: needsPayables
      ? {
          totalPendiente: payablesBucketsRes.rows.reduce(
            (sum, row) => sum + toNumber(row.total),
            0
          ),
          vencido: payablesBucketsRes.rows
            .filter((row: AgingBucketRow) => row.bucket === "Vencido")
            .reduce((sum, row) => sum + toNumber(row.total), 0),
          vencePronto: payablesBucketsRes.rows
            .filter((row: AgingBucketRow) => row.bucket === "Proximo a vencer")
            .reduce((sum, row) => sum + toNumber(row.total), 0),
          alDia: payablesBucketsRes.rows
            .filter((row: AgingBucketRow) => row.bucket === "Al dia")
            .reduce((sum, row) => sum + toNumber(row.total), 0),
          buckets: payablesBucketsRes.rows.map((row: AgingBucketRow) => ({
            bucket: row.bucket,
            cantidad: Number(row.cantidad || 0),
            total: toNumber(row.total),
          })),
          topProveedores: payablesTopRes.rows.map((row: CounterpartyAggregateRow) => ({
            nombre: row.nombre || "Sin proveedor",
            cantidad: Number(row.cantidad || 0),
            total: toNumber(row.total),
          })),
          topTramitadores: payablesTramitadoresRes.rows.map((row: CounterpartyAggregateRow) => ({
            nombre: row.nombre || "Sin tramitador",
            cantidad: Number(row.cantidad || 0),
            total: toNumber(row.total),
          })),
        }
      : undefined,
    contracts: needsContracts
      ? {
          registros: Number(contractsSummaryRow.registros || 0),
          totalEsperado: toNumber(contractsSummaryRow.total_esperado),
          totalCobrado: toNumber(contractsSummaryRow.total_cobrado),
          totalPendiente: toNumber(contractsSummaryRow.total_pendiente),
          monthly: contractsMonthlyRes.rows.map((row: ContractsMonthlyRow) => ({
            periodo: normalizePeriod(row.periodo),
            registros: Number(row.registros || 0),
            valorEsperado: toNumber(row.valor_esperado),
            valorCobrado: toNumber(row.valor_cobrado),
            saldoPendiente: toNumber(row.saldo_pendiente),
          })),
          oldestPending: contractsOldestRes.rows.map((row: ContractOldDebtRow) => ({
            nombre: row.nombre || "Sin alumno asociado",
            documento: row.documento || null,
            referencia: row.referencia || null,
            tipoRegistro: row.tipo_registro || null,
            saldoPendiente: toNumber(row.saldo_pendiente),
            fechaRegistro: normalizeDateOnly(row.fecha_registro),
            fechaReferencia: normalizeDateOnly(row.fecha_referencia),
            diasPendiente: Number(row.dias_pendiente || 0),
          })),
          pendingCount: Number(contractsPendingCountRes.rows[0]?.total || 0),
          pendingRows: contractsPendingRowsRes.rows.map((row: ContractPendingSqlRow) => ({
            obligationId: row.obligation_id,
            nombre: row.nombre || "Sin alumno asociado",
            documento: row.documento || null,
            referencia: row.referencia || null,
            tipoRegistro: row.tipo_registro || null,
            fechaRegistro: normalizeDateOnly(row.fecha_registro),
            fechaReferencia: normalizeDateOnly(row.fecha_referencia),
            valorEsperado: toNumber(row.valor_esperado),
            valorCobrado: toNumber(row.valor_cobrado),
            saldoPendiente: toNumber(row.saldo_pendiente),
            diasPendiente: Number(row.dias_pendiente || 0),
          })),
        }
      : undefined,
    students: needsStudents
      ? {
          countRegulares: toNumber(
            studentsRevenueRows.find((r) => r.tipo_registro === "regular")?.cantidad
          ),
          totalIngresosRegulares: toNumber(
            studentsRevenueRows.find((r) => r.tipo_registro === "regular")?.total_ingresos
          ),
          countPractica: toNumber(
            studentsRevenueRows.find((r) => r.tipo_registro === "practica_adicional")?.cantidad
          ),
          totalIngresosPractica: toNumber(
            studentsRevenueRows.find((r) => r.tipo_registro === "practica_adicional")
              ?.total_ingresos
          ),
          countAptitud: toNumber(
            studentsRevenueRows.find((r) => r.tipo_registro === "aptitud_conductor")?.cantidad
          ),
          totalIngresosAptitud: toNumber(
            studentsRevenueRows.find((r) => r.tipo_registro === "aptitud_conductor")?.total_ingresos
          ),
          rows: studentsDetailRows.map((row) => ({
            id: row.id,
            nombre: row.nombre,
            dni: row.dni,
            tipo_registro: row.tipo_registro,
            categorias: row.categorias || [],
            fecha_inscripcion: normalizeDateOnly(row.fecha_inscripcion),
            valor_total: toNumber(row.valor_total),
            total_pagado: toNumber(row.pago_total),
            saldo_pendiente: Math.max(0, toNumber(row.valor_total) - toNumber(row.pago_total)),
          })),
        }
      : undefined,
  });
}

async function buildCsvResponse({
  pool,
  parts,
  from,
  to,
}: {
  pool: ReturnType<typeof getServerDbPool>;
  parts: QueryParts;
  from: string;
  to: string;
}) {
  const cte = `with ${parts.filteredIngresosCte}, ${parts.filteredGastosCte}`;
  const ledgerRes = await pool.query<LedgerRow & { created_at: string }>(
    `
      ${cte}
      select *
      from (
        select
          fecha,
          'ingreso'::text as tipo,
          categoria,
          concepto,
          monto,
          estado,
          metodo_pago,
          numero_factura,
          contraparte,
          documento,
          contrato,
          created_at
        from filtered_ingresos
        union all
        select
          fecha,
          'gasto'::text as tipo,
          categoria,
          concepto,
          monto,
          estado,
          metodo_pago,
          numero_factura,
          contraparte,
          documento,
          contrato,
          created_at
        from filtered_gastos
      ) ledger
      order by fecha desc, created_at desc
    `,
    parts.values
  );

  const lines = [
    [
      "Fecha",
      "Tipo",
      "Categoria",
      "Concepto",
      "Monto",
      "Estado",
      "Metodo de pago",
      "Factura",
      "Contraparte",
      "Documento",
      "Contrato",
    ]
      .map(formatCsvCell)
      .join(","),
    ...ledgerRes.rows.map((row: LedgerRow & { created_at: string }) =>
      [
        normalizeDateOnly(row.fecha),
        row.tipo,
        row.categoria,
        row.concepto,
        toNumber(row.monto),
        row.estado,
        row.metodo_pago,
        row.numero_factura,
        row.contraparte,
        row.documento,
        row.contrato,
      ]
        .map((value) => formatCsvCell(value as string | number | null))
        .join(",")
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="informe-contable-${from}-a-${to}.csv"`,
    },
  });
}

export async function GET(request: Request) {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;

  const perfil = authz.perfil as AllowedPerfil;
  const url = new URL(request.url);
  const dateRange = getCurrentMonthRange();
  const from = parseDateInput(url.searchParams.get("from"), dateRange.from);
  const to = parseDateInput(url.searchParams.get("to"), dateRange.to);
  const page = parseInteger(url.searchParams.get("page"), 0, 0, 10_000);
  const pageSize = parseInteger(url.searchParams.get("pageSize"), 20, 10, 100);
  const search = normalizeSearch(url.searchParams.get("q"));
  const requestedSchoolId = url.searchParams.get("escuela_id");
  const requestedSedeId = url.searchParams.get("sede_id");
  const format = url.searchParams.get("format");
  const includes = parseReportIncludes(url.searchParams.get("include"));
  const filters: QueryFilters = {
    alumnoId: url.searchParams.get("alumno_id"),
    ingresoCategoria: url.searchParams.get("ingreso_categoria"),
    ingresoEstado: url.searchParams.get("ingreso_estado"),
    ingresoMetodo: url.searchParams.get("ingreso_metodo"),
    ingresoView: url.searchParams.get("ingreso_view"),
    gastoCategoria: url.searchParams.get("gasto_categoria"),
    gastoContraparte: url.searchParams.get("gasto_contraparte"),
    gastoEstado: url.searchParams.get("gasto_estado"),
    gastoMetodo: url.searchParams.get("gasto_metodo"),
    gastoView: url.searchParams.get("gasto_view"),
    recurrenteOnly: url.searchParams.get("recurrente") === "true",
  };

  try {
    const scope = resolveScope(perfil, requestedSchoolId, requestedSedeId);
    const pool = getServerDbPool();
    const parts = buildQueryParts({
      scope,
      from,
      to,
      search,
      filters,
    });

    if (format === "csv") {
      return await buildCsvResponse({ pool, parts, from, to });
    }

    return await buildJsonResponse({
      pool,
      parts,
      page,
      pageSize,
      perfil,
      scope,
      from,
      to,
      includes,
    });
  } catch (error) {
    console.error("[API REPORTES CONTABLES] Error:", error);
    return NextResponse.json({ error: "No se pudo generar el informe contable." }, { status: 500 });
  }
}
