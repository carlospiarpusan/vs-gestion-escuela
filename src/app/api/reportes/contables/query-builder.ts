import { NextResponse } from "next/server";
import { parseExpenseSearch } from "@/lib/expense-search";
import { normalizeUuid } from "@/lib/dashboard-scope";
import {
  EXAMEN_INCOME_CATEGORIES,
  MATRICULA_INCOME_CATEGORIES,
  PRACTICA_INCOME_CATEGORIES,
} from "@/lib/income-view";
import { getServerDbPool } from "@/lib/server-db";
import type { Rol } from "@/types/database";
import type {
  AllowedPerfil,
  ReportScope,
  QueryParts,
  QueryFilters,
  ReportInclude,
  LedgerRow,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const ALLOWED_ROLES: Rol[] = ["admin_escuela", "admin_sede", "administrativo"];
export const DEFAULT_REPORT_INCLUDES: ReportInclude[] = [
  "options",
  "summary",
  "breakdown",
  "series",
  "ledger",
];
export const ALL_REPORT_INCLUDES: ReportInclude[] = [
  "options",
  "summary",
  "breakdown",
  "series",
  "ledger",
  "receivables",
  "payables",
  "contracts",
  "students",
];
export const VEHICULAR_EXPENSE_CATEGORIES = [
  "combustible",
  "mantenimiento_vehiculo",
  "reparaciones",
  "seguros",
];
export const ADMINISTRATIVE_EXPENSE_CATEGORIES = [
  "alquiler",
  "servicios",
  "material_didactico",
  "marketing",
  "impuestos",
  "suministros",
  "otros",
];
export const PEOPLE_EXPENSE_CATEGORIES = ["nominas", "tramitador"];
export const TRAMITADOR_EXPENSE_CATEGORY = "tramitador";

/* ------------------------------------------------------------------ */
/*  Helper functions                                                   */
/* ------------------------------------------------------------------ */

export function parseDateInput(value: string | null, fallback: string) {
  if (!value) return fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

export function parseInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

export function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${day}`,
  };
}

export function normalizeSearch(value: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : "";
}

export function parseReportIncludes(value: string | null) {
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

export function resolveScope(
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

export function buildSqlInClause(values: string[], addValue: (value: string) => string) {
  return values.map((value) => addValue(value)).join(", ");
}

/* ------------------------------------------------------------------ */
/*  buildQueryParts                                                    */
/* ------------------------------------------------------------------ */

export function buildQueryParts({
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
  const escuelaId = normalizeUuid(scope.escuelaId);
  const sedeId = normalizeUuid(scope.sedeId);
  const alumnoId = normalizeUuid(filters.alumnoId);
  const values: string[] = [];
  const ingresosWhere: string[] = [];
  const gastosWhere: string[] = [];
  const matriculasWhere: string[] = [];
  const standaloneWhere: string[] = [];
  const expenseSearch = parseExpenseSearch(search);
  let escuelaRef: string | null = null;
  let sedeRef: string | null = null;

  const addValue = (value: string) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (escuelaId) {
    escuelaRef = addValue(escuelaId);
    ingresosWhere.push(`i.escuela_id = ${escuelaRef}`);
    gastosWhere.push(`g.escuela_id = ${escuelaRef}`);
    matriculasWhere.push(`m.escuela_id = ${escuelaRef}`);
    standaloneWhere.push(`a.escuela_id = ${escuelaRef}`);
  }

  if (sedeId) {
    sedeRef = addValue(sedeId);
    ingresosWhere.push(`i.sede_id = ${sedeRef}`);
    gastosWhere.push(`g.sede_id = ${sedeRef}`);
    matriculasWhere.push(`m.sede_id = ${sedeRef}`);
    standaloneWhere.push(`a.sede_id = ${sedeRef}`);
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

  if (alumnoId) {
    const ref = addValue(alumnoId);
    ingresosWhere.push(`i.alumno_id = ${ref}`);
    matriculasWhere.push(`m.alumno_id = ${ref}`);
    standaloneWhere.push(`a.id = ${ref}`);
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
    matriculasWhere.push(
      `EXISTS (SELECT 1 FROM ingresos i2 WHERE i2.matricula_id = m.id AND i2.metodo_pago = ${ref})`
    );
    standaloneWhere.push(
      `EXISTS (SELECT 1 FROM ingresos i2 WHERE i2.alumno_id = a.id AND i2.matricula_id IS NULL AND i2.metodo_pago = ${ref})`
    );
  }

  const buildStandaloneIncomeExists = (predicate: string) =>
    `EXISTS (
      SELECT 1
      FROM ingresos i2
      WHERE i2.alumno_id = a.id
        AND i2.matricula_id IS NULL
        AND ${predicate}
    )`;

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
      standaloneWhere.push(
        `(a.tipo_registro = 'practica_adicional' OR ${buildStandaloneIncomeExists(
          `i2.categoria IN (${buildSqlInClause(PRACTICA_INCOME_CATEGORIES, addValue)})`
        )})`
      );
      break;
    case "examenes":
      ingresosWhere.push(
        `i.categoria IN (${buildSqlInClause(EXAMEN_INCOME_CATEGORIES, addValue)})`
      );
      matriculasWhere.push("1 = 0");
      standaloneWhere.push(
        `(a.tipo_registro = 'aptitud_conductor' OR ${buildStandaloneIncomeExists(
          `i2.categoria IN (${buildSqlInClause(EXAMEN_INCOME_CATEGORIES, addValue)})`
        )})`
      );
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
      const ref = addValue(filters.ingresoCategoria);
      matriculasWhere.push("1 = 0");
      standaloneWhere.push(
        `(a.tipo_registro = 'practica_adicional' OR ${buildStandaloneIncomeExists(
          `i2.categoria = ${ref}`
        )})`
      );
    } else if (
      EXAMEN_INCOME_CATEGORIES.includes(
        filters.ingresoCategoria as (typeof EXAMEN_INCOME_CATEGORIES)[number]
      )
    ) {
      const ref = addValue(filters.ingresoCategoria);
      matriculasWhere.push("1 = 0");
      standaloneWhere.push(
        `(a.tipo_registro = 'aptitud_conductor' OR ${buildStandaloneIncomeExists(
          `i2.categoria = ${ref}`
        )})`
      );
    }
  }

  if (filters.gastoCategoria) {
    const ref = addValue(filters.gastoCategoria);
    gastosWhere.push(`g.categoria = ${ref}`);
  }

  if (filters.gastoContraparte) {
    const ref = addValue(filters.gastoContraparte.trim().toLowerCase());
    gastosWhere.push(`LOWER(COALESCE(g.proveedor, '')) = ${ref}`);
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

  // Reuse the base scope/date placeholders so every query can share the same values array.
  const matriculaScopeWhere: string[] = [];
  const standaloneScopeWhere: string[] = [];
  if (escuelaRef) {
    matriculaScopeWhere.push(`m.escuela_id = ${escuelaRef}`);
    standaloneScopeWhere.push(`a.escuela_id = ${escuelaRef}`);
  }
  if (sedeRef) {
    matriculaScopeWhere.push(`m.sede_id = ${sedeRef}`);
    standaloneScopeWhere.push(`a.sede_id = ${sedeRef}`);
  }
  matriculaScopeWhere.push(`m.fecha_inscripcion >= ${fromRef}`);
  matriculaScopeWhere.push(`m.fecha_inscripcion <= ${toRef}`);
  standaloneScopeWhere.push(`coalesce(a.fecha_inscripcion, a.created_at::date) >= ${fromRef}`);
  standaloneScopeWhere.push(`coalesce(a.fecha_inscripcion, a.created_at::date) <= ${toRef}`);

  const matWhere = matriculaScopeWhere.join(" AND ");
  const staWhere = standaloneScopeWhere.join(" AND ");

  const studentCountsSql = {
    regulares: `(select count(*)::int from matriculas_alumno m where ${matWhere})`,
    practica: `(select count(*)::int from alumnos a where a.tipo_registro = 'practica_adicional' AND ${staWhere})`,
    aptitud: `(select count(*)::int from alumnos a where a.tipo_registro = 'aptitud_conductor' AND ${staWhere})`,
  };

  return {
    values,
    studentCountsSql,
    filteredIngresosCte: `
    filtered_ingresos AS (
        SELECT
          i.id,
          i.alumno_id,
          i.matricula_id,
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
          g.estado_pago AS estado,
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

        UNION ALL

        SELECT
          ('ingreso:' || fi.id::text) AS obligation_id,
          NULL::uuid AS alumno_id,
          CASE
            WHEN fi.categoria IN (${buildSqlInClause(PRACTICA_INCOME_CATEGORIES, addValue)}) THEN 'practica_adicional'
            WHEN fi.categoria IN (${buildSqlInClause(EXAMEN_INCOME_CATEGORIES, addValue)}) THEN 'aptitud_conductor'
            ELSE 'regular'
          END AS tipo_registro,
          fi.fecha::date AS fecha_registro,
          COALESCE(NULLIF(TRIM(fi.numero_factura), ''), NULLIF(TRIM(fi.concepto), ''), 'Ingreso directo') AS referencia,
          COALESCE(NULLIF(TRIM(fi.concepto), ''), 'Ingreso directo') AS nombre,
          fi.documento,
          CASE
            WHEN fi.estado = 'anulado' THEN 0::numeric
            ELSE COALESCE(fi.monto, 0)::numeric
          END AS valor_esperado,
          CASE
            WHEN fi.estado = 'cobrado' THEN COALESCE(fi.monto, 0)::numeric
            ELSE 0::numeric
          END AS valor_cobrado,
          CASE
            WHEN fi.estado = 'pendiente' THEN COALESCE(fi.monto, 0)::numeric
            ELSE 0::numeric
          END AS saldo_pendiente,
          COALESCE(fi.fecha_vencimiento, fi.fecha)::date AS fecha_referencia,
          '{}'::text[] AS categorias
        FROM filtered_ingresos fi
        WHERE fi.alumno_id IS NULL
          AND fi.matricula_id IS NULL
          AND fi.categoria IN (
            ${buildSqlInClause([...PRACTICA_INCOME_CATEGORIES, ...EXAMEN_INCOME_CATEGORIES], addValue)}
          )
      )
    `,
  };
}

/* ------------------------------------------------------------------ */
/*  CSV helpers & builder                                              */
/* ------------------------------------------------------------------ */

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

function toNumber(value: unknown) {
  return Number(value || 0);
}

export async function buildCsvResponse({
  pool,
  parts,
  from,
  to,
  ledgerTipo,
}: {
  pool: ReturnType<typeof getServerDbPool>;
  parts: QueryParts;
  from: string;
  to: string;
  ledgerTipo: "ingreso" | "gasto" | null;
}) {
  const cte = `with ${parts.filteredIngresosCte}, ${parts.filteredGastosCte}, ${parts.filteredObligationsCte}`;
  const ledgerRes = await pool.query<LedgerRow & { created_at: string }>(
    `
      ${cte}
      select *
      from (
        ${
          ledgerTipo !== "gasto"
            ? `
        select
          fecha, 'ingreso'::text as tipo, categoria, concepto, monto, estado,
          metodo_pago, numero_factura, contraparte, documento, contrato, created_at
        from filtered_ingresos
        `
            : ""
        }
        ${!ledgerTipo ? "union all" : ""}
        ${
          ledgerTipo !== "ingreso"
            ? `
        select
          fecha, 'gasto'::text as tipo, categoria, concepto, monto, estado,
          metodo_pago, numero_factura, contraparte, documento, contrato, created_at
        from filtered_gastos
        `
            : ""
        }
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
