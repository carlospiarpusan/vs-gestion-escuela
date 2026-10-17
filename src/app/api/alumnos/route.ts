import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags } from "@/lib/server-cache-tags";
import { buildDocumentIdentifierLikePattern } from "@/lib/document-search";
import { APP_TIME_ZONE, buildDateRangeFromPeriodFilter, isValidDateOnly } from "@/lib/date-utils";
import { normalizeStoredCourseCategories } from "@/lib/course-categories";
import { VS_BILLING_SCHOOL } from "@/lib/vs-billing/scope";
import type { Rol, TipoRegistroAlumno } from "@/types/database";
import { parseInteger, parseStringArray, toNumber } from "@/lib/api-helpers";
import { getStaffReadSedeScope } from "@/lib/api-auth";
import { STAFF_SCOPE_CACHE_VERSION } from "@/lib/dashboard-client-cache";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "recepcion",
];
const ALLOWED_TYPES: TipoRegistroAlumno[] = ["regular", "aptitud_conductor", "practica_adicional"];
const CACHE_TTL_MS = 120 * 1000;

type AlumnoApiRow = {
  id: string;
  tipo_registro: TipoRegistroAlumno;
  nombre: string;
  apellidos: string;
  dni: string;
  tipo_documento: string | null;
  telefono: string;
  email: string | null;
  lugar_expedicion_documento: string | null;
  fecha_nacimiento: string | null;
  tipo_permiso: string;
  categorias: string[] | null;
  estado: string;
  valor_total: number | null;
  fecha_inscripcion: string | null;
  ciudad: string | null;
  departamento: string | null;
  datos_facturacion: unknown;
  direccion: string | null;
  tiene_tramitador: boolean;
  tramitador_nombre: string | null;
  tramitador_valor: number | null;
  sede_id: string;
  user_id: string;
  created_at: string;
  notas: string | null;
  numero_contrato: string | null;
  empresa_convenio: string | null;
  nota_examen_teorico: number | null;
  fecha_examen_teorico: string | null;
  nota_examen_practico: number | null;
  fecha_examen_practico: string | null;
  consentimiento_datos: boolean;
  consentimiento_fecha: string | null;
  facturado: boolean;
  numero_factura_electronica: string | null;
  fecha_factura: string | null;
  matriculas: unknown;
  categorias_resumen: string[] | null;
  valor_total_resumen: number | string | null;
  total_pagado: number | string | null;
  _sort_date?: string | null;
};

function buildCategorySummarySql(arrayExpr: string) {
  return `
    case
      when cardinality(coalesce(${arrayExpr}, '{}'::text[])) = 0 then null
      when cardinality(coalesce(${arrayExpr}, '{}'::text[])) = 1 then nullif(trim((${arrayExpr})[1]), '')
      when cardinality(coalesce(${arrayExpr}, '{}'::text[])) = 2 then concat_ws(
        ' y ',
        nullif(trim((${arrayExpr})[1]), ''),
        nullif(trim((${arrayExpr})[2]), '')
      )
      else array_to_string(${arrayExpr}, ' + ')
    end
  `;
}

function buildCategoryMatchClause(arrayExpr: string, labelRef: string) {
  return `(
    coalesce(${arrayExpr}, '{}'::text[]) @> array[${labelRef}]::text[]
    or array(
      select distinct trim(part)
      from regexp_split_to_table(
        regexp_replace(upper(${labelRef}), '\\s*Y\\s*|[+/]', ',', 'g'),
        ','
      ) part
      where trim(part) <> ''
    ) <@ array(
      select distinct trim(part)
      from unnest(coalesce(${arrayExpr}, '{}'::text[])) categoria
      cross join lateral regexp_split_to_table(
        regexp_replace(upper(categoria), '\\s*Y\\s*|[+/]', ',', 'g'),
        ','
      ) part
      where trim(part) <> ''
    )
  )`;
}

function buildEffectiveDateSql(alias: string) {
  return `coalesce(${alias}.fecha_inscripcion, ((${alias}.created_at AT TIME ZONE '${APP_TIME_ZONE}')::date))`;
}

function buildAlumnosListQuery({
  whereSql,
  limitRef,
  offsetRef,
  includeFacturax = false,
}: {
  whereSql: string;
  limitRef: string;
  offsetRef: string;
  includeFacturax?: boolean;
}) {
  return `
    WITH filtered_alumnos AS (
      SELECT
        a.id,
        a.escuela_id,
        a.tipo_registro,
        a.nombre,
        a.apellidos,
        a.dni,
        a.tipo_documento,
        a.telefono,
        a.email,
        a.lugar_expedicion_documento,
        a.fecha_nacimiento,
        a.tipo_permiso,
        a.categorias,
        a.estado,
        a.valor_total,
        a.fecha_inscripcion,
        a.ciudad,
        a.departamento,
        a.direccion,
        a.tiene_tramitador,
        a.tramitador_nombre,
        a.tramitador_valor,
        a.sede_id,
        a.datos_facturacion,
        a.user_id,
        a.created_at,
        a.notas,
        a.numero_contrato,
        a.empresa_convenio,
        a.nota_examen_teorico,
        a.fecha_examen_teorico,
        a.nota_examen_practico,
        a.fecha_examen_practico,
        a.consentimiento_datos,
        a.consentimiento_fecha,
        a.facturado,
        a.numero_factura_electronica,
        a.fecha_factura,
        greatest(
          ${buildEffectiveDateSql("a")},
          coalesce(lm.latest_matricula_date, date '0001-01-01')
        ) AS _sort_date
      FROM public.alumnos a
      LEFT JOIN LATERAL (
        SELECT
          max(
            ${buildEffectiveDateSql("m")}
          ) AS latest_matricula_date
        FROM public.matriculas_alumno m
        WHERE m.alumno_id = a.id
      ) lm ON true
      WHERE ${whereSql}
    ),
    total_count AS (
      SELECT count(*)::int AS total FROM filtered_alumnos
    ),
    paged_alumnos AS (
      SELECT *
      FROM filtered_alumnos
      ORDER BY _sort_date DESC, created_at DESC, id DESC
      LIMIT ${limitRef} OFFSET ${offsetRef}
    ),
    matriculas_agg AS (
      SELECT
        m.alumno_id,
        count(*)::int AS matriculas_count,
        coalesce(
          sum(
            CASE WHEN m.estado <> 'cancelado' THEN coalesce(m.valor_total, 0) ELSE 0 END
          ),
          0
        )::numeric AS valor_total_resumen,
        json_agg(
          json_build_object(
            'id', m.id,
            'alumno_id', m.alumno_id,
            'numero_contrato', m.numero_contrato,
            'prefijo_contrato', m.prefijo_contrato,
            'consecutivo_contrato', m.consecutivo_contrato,
            'categorias', m.categorias,
            'valor_total', m.valor_total,
            'fecha_inscripcion', m.fecha_inscripcion,
            'estado', m.estado,
            'notas', m.notas,
            'tiene_tramitador', m.tiene_tramitador,
            'tramitador_nombre', m.tramitador_nombre,
            'tramitador_valor', m.tramitador_valor,
            'created_at', m.created_at
            ${
              includeFacturax
                ? `, 'facturax_invoice', (
              select json_build_object('number', f.last_status->>'number', 'state', coalesce(f.last_status->>'state','unknown'))
              from public.facturax_contract_invoices f
              where f.contrato_id=m.id and f.alumno_id=m.alumno_id and f.escuela_id=m.escuela_id
            )`
                : ""
            }
          )
          ORDER BY m.fecha_inscripcion DESC NULLS LAST, m.created_at DESC
        ) AS matriculas
      FROM public.matriculas_alumno m
      JOIN paged_alumnos p ON p.id = m.alumno_id
      GROUP BY m.alumno_id
    ),
    categorias_agg AS (
      SELECT
        resumenes.alumno_id,
        array_remove(
          array_agg(DISTINCT resumenes.categoria_resumen ORDER BY resumenes.categoria_resumen),
          NULL
        ) AS categorias_resumen
      FROM (
        SELECT
          m.alumno_id,
          ${buildCategorySummarySql("m.categorias")} AS categoria_resumen
        FROM public.matriculas_alumno m
        JOIN paged_alumnos p ON p.id = m.alumno_id
      ) resumenes
      GROUP BY resumenes.alumno_id
    ),
    pagos_agg AS (
      SELECT
        i.alumno_id,
        coalesce(sum(i.monto) FILTER (WHERE i.estado = 'cobrado'), 0)::numeric AS total_pagado
      FROM public.ingresos i
      JOIN paged_alumnos p ON p.id = i.alumno_id
      GROUP BY i.alumno_id
    )
    SELECT
      p.*,
      (SELECT total FROM total_count) AS _total_count,
      coalesce(ma.matriculas, '[]'::json) AS matriculas,
      CASE
        WHEN coalesce(ma.matriculas_count, 0) > 0 THEN coalesce(ca.categorias_resumen, '{}'::text[])
        ELSE coalesce(p.categorias, '{}'::text[])
      END AS categorias_resumen,
      CASE
        WHEN coalesce(ma.matriculas_count, 0) > 0 THEN coalesce(ma.valor_total_resumen, 0)
        ELSE coalesce(p.valor_total, 0)::numeric
      END AS valor_total_resumen,
      coalesce(pa.total_pagado, 0)::numeric AS total_pagado
    FROM paged_alumnos p
    LEFT JOIN matriculas_agg ma ON ma.alumno_id = p.id
    LEFT JOIN categorias_agg ca ON ca.alumno_id = p.id
    LEFT JOIN pagos_agg pa ON pa.alumno_id = p.id
    ORDER BY p._sort_date DESC, p.created_at DESC, p.id DESC
  `;
}

function buildAlumnosTotalsQuery(whereSql: string) {
  return `
    select
      count(*)::int as total,
      count(*) filter (where a.tipo_registro = 'regular')::int as regular_total,
      count(*) filter (where a.tipo_registro <> 'regular')::int as special_total
    from public.alumnos a
    where ${whereSql}
  `;
}

function buildPeriodStudentCountQuery({
  whereSql,
  periodClauseSql,
}: {
  whereSql: string;
  periodClauseSql: string;
}) {
  return `
    select count(*)::int as period_student_total
    from public.alumnos a
    where ${whereSql}
      and a.tipo_registro = 'regular'
      and ${periodClauseSql}
  `;
}

export async function GET(request: Request) {
  const auth = await authorizeApiRequest(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  const { perfil } = auth;
  const url = new URL(request.url);
  const page = parseInteger(url.searchParams.get("page"), 0, 0, 100_000);
  const pageSize = parseInteger(url.searchParams.get("pageSize"), 10, 1, 50);
  const search = (url.searchParams.get("q") ?? "").trim();
  const RAW_TIPOS = parseStringArray(url.searchParams.get("tipos"));
  const tipos = RAW_TIPOS.filter((tipo): tipo is TipoRegistroAlumno =>
    ALLOWED_TYPES.includes(tipo as TipoRegistroAlumno)
  );
  const categorias = parseStringArray(url.searchParams.get("categorias"));
  const mes = (url.searchParams.get("mes") ?? "").trim();
  const fecha = (url.searchParams.get("fecha") ?? "").trim();
  const facturaFilter = (url.searchParams.get("factura") ?? "").trim();
  const periodRange = buildDateRangeFromPeriodFilter(mes);
  if ((mes && !periodRange) || (fecha && !isValidDateOnly(fecha)))
    return NextResponse.json(
      { error: "El periodo o la fecha del filtro no es valido." },
      { status: 400 }
    );

  const escuelaId = resolveEscuelaIdForRequest(request, perfil, url.searchParams.get("escuela_id"));
  const { sedeId, error: scopeError } = getStaffReadSedeScope(perfil);
  if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });

  if (!escuelaId) {
    return NextResponse.json({
      totalCount: 0,
      summary: {
        regularCount: 0,
        specialCount: 0,
        periodStudentCount: 0,
      },
      rows: [],
    });
  }

  const values: Array<string | string[] | number | null> = [];
  const addValue = (value: string | string[] | number | null) => {
    values.push(value);
    return `$${values.length}`;
  };

  const where: string[] = [];
  const summaryWhere: string[] = [];
  const escuelaRef = addValue(escuelaId);
  where.push(`a.escuela_id = ${escuelaRef}`);
  summaryWhere.push(`a.escuela_id = ${escuelaRef}`);

  if (sedeId) {
    const sedeRef = addValue(sedeId);
    where.push(`a.sede_id = ${sedeRef}`);
    summaryWhere.push(`a.sede_id = ${sedeRef}`);
  }

  const tiposRef = addValue(tipos);
  where.push(
    `(cardinality(${tiposRef}::text[]) = 0 OR a.tipo_registro = ANY(${tiposRef}::text[]))`
  );
  summaryWhere.push(
    `(cardinality(${tiposRef}::text[]) = 0 OR a.tipo_registro = ANY(${tiposRef}::text[]))`
  );

  if (categorias.length > 0) {
    const categoryClauses = categorias.map((categoria) => {
      const labelRef = addValue(categoria);
      return `(
        ${buildCategoryMatchClause("a.categorias", labelRef)}
        or exists (
          select 1
          from public.matriculas_alumno m
          where m.alumno_id = a.id
            and ${buildCategoryMatchClause("m.categorias", labelRef)}
        )
      )`;
    });

    where.push(`(${categoryClauses.join(" OR ")})`);
    summaryWhere.push(`(${categoryClauses.join(" OR ")})`);
  }

  let periodStudentClauseSql: string | null = null;
  if (periodRange) {
    const periodStartRef = addValue(periodRange.start);
    const periodEndRef = addValue(periodRange.end);
    const alumnoPeriodSql = `(
      ${buildEffectiveDateSql("a")} >= ${periodStartRef}::date
      AND ${buildEffectiveDateSql("a")} < ${periodEndRef}::date
    )`;
    const matriculaPeriodSql = `exists (
      select 1
      from public.matriculas_alumno m
      where m.alumno_id = a.id
        and ${buildEffectiveDateSql("m")} >= ${periodStartRef}::date
        and ${buildEffectiveDateSql("m")} < ${periodEndRef}::date
    )`;

    where.push(`(
      ${alumnoPeriodSql}
      OR ${matriculaPeriodSql}
    )`);
    periodStudentClauseSql = `(
      ${alumnoPeriodSql}
      OR ${matriculaPeriodSql}
    )`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const exactDateRef = addValue(fecha);
    const alumnoExactDateSql = `${buildEffectiveDateSql("a")} = ${exactDateRef}::date`;
    const matriculaExactDateSql = `exists (
      select 1
      from public.matriculas_alumno m
      where m.alumno_id = a.id
        and ${buildEffectiveDateSql("m")} = ${exactDateRef}::date
    )`;

    where.push(`(
      ${alumnoExactDateSql}
      OR ${matriculaExactDateSql}
    )`);
    periodStudentClauseSql = `(
      ${alumnoExactDateSql}
      OR ${matriculaExactDateSql}
    )`;
  }

  if (search) {
    const searchRef = addValue(`%${search}%`);
    const searchClauses = [
      `a.nombre ILIKE ${searchRef}`,
      `a.apellidos ILIKE ${searchRef}`,
      `concat_ws(' ', a.nombre, a.apellidos) ILIKE ${searchRef}`,
      `a.dni ILIKE ${searchRef}`,
      `coalesce(a.numero_contrato, '') ILIKE ${searchRef}`,
      `array_to_string(coalesce(a.categorias, '{}'::text[]), ' ') ILIKE ${searchRef}`,
      `coalesce(a.empresa_convenio, '') ILIKE ${searchRef}`,
      `coalesce(a.telefono, '') ILIKE ${searchRef}`,
      `exists (
        select 1
        from public.matriculas_alumno m
        where m.alumno_id = a.id
          and (
            coalesce(m.numero_contrato, '') ILIKE ${searchRef}
            or array_to_string(coalesce(m.categorias, '{}'::text[]), ' ') ILIKE ${searchRef}
          )
      )`,
    ];

    const normalizedDocumentPattern = buildDocumentIdentifierLikePattern(search);
    if (normalizedDocumentPattern) {
      const normalizedDocumentRef = addValue(normalizedDocumentPattern);
      searchClauses.push(
        `regexp_replace(lower(coalesce(a.dni, '')), '[^a-z0-9]+', '', 'g') LIKE ${normalizedDocumentRef}`
      );
    }

    where.push(`(
      ${searchClauses.join("\n      OR ")}
    )`);
    summaryWhere.push(`(
      ${searchClauses.join("\n      OR ")}
    )`);
  }

  const includeFacturax =
    process.env.FACTURAX_INVOICING_ENABLED === "true" && escuelaId === VS_BILLING_SCHOOL.id;
  const invoicedSql = includeFacturax
    ? `(a.facturado = true or exists (
    select 1 from public.facturax_contract_invoices f
    where f.escuela_id=a.escuela_id and f.alumno_id=a.id and f.last_status->>'state'='accepted'
  ))`
    : `a.facturado = true`;
  if (facturaFilter === "sin_factura") {
    where.push(`not (${invoicedSql})`);
    summaryWhere.push(`not (${invoicedSql})`);
  } else if (facturaFilter === "facturado") {
    where.push(invoicedSql);
    summaryWhere.push(invoicedSql);
  }

  const whereSql = where.join(" AND ");
  const summaryWhereSql = summaryWhere.join(" AND ");
  const pool = getServerDbPool();
  const offset = page * pageSize;
  const limitRef = `$${values.length + 1}`;
  const offsetRef = `$${values.length + 2}`;

  const cacheKey = `alumnos-list:${STAFF_SCOPE_CACHE_VERSION}:${escuelaId}:${sedeId || "all"}:${tipos.join(",")}:${categorias.join(",")}:${mes}:${fecha}:${facturaFilter}:${search}:${page}:${pageSize}:facturax:${includeFacturax}`;

  const resultPromise = getServerReadCached<{
    totalCount: number;
    summary: {
      regularCount: number;
      specialCount: number;
      periodStudentCount: number;
    };
    rows: Record<string, unknown>[];
  }>({
    key: cacheKey,
    ttlMs: CACHE_TTL_MS,
    bypass: url.searchParams.get("fresh") === "1",
    tags: buildDashboardListCacheTags("alumnos", { escuelaId, sedeId }),
    loader: async () => {
      const totalsPromise = pool.query<{
        total: number | string | null;
        regular_total: number | string | null;
        special_total: number | string | null;
      }>(buildAlumnosTotalsQuery(whereSql), values);
      const periodSummaryPromise = periodStudentClauseSql
        ? pool.query<{ period_student_total: number | string | null }>(
            buildPeriodStudentCountQuery({
              whereSql: summaryWhereSql,
              periodClauseSql: periodStudentClauseSql,
            }),
            values
          )
        : Promise.resolve({ rows: [{ period_student_total: null }] });

      const [rowsRes, totalsRes, periodSummaryRes] = await Promise.all([
        pool.query<AlumnoApiRow & { _total_count: number | string | null }>(
          buildAlumnosListQuery({
            whereSql,
            limitRef,
            offsetRef,
            includeFacturax,
          }),
          [...values, pageSize, offset]
        ),
        totalsPromise,
        periodSummaryPromise,
      ]);

      const totals = totalsRes.rows[0];
      const periodSummary = periodSummaryRes.rows[0];
      const totalCount = Number(totals?.total || 0);

      return {
        totalCount,
        summary: {
          regularCount: Number(totals?.regular_total || 0),
          specialCount: Number(totals?.special_total || 0),
          periodStudentCount: Number(periodSummary?.period_student_total || 0),
        },
        rows: rowsRes.rows.map((row) => {
          const valorTotalResumen = toNumber(row.valor_total_resumen);
          const totalPagado = toNumber(row.total_pagado);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _total_count, _sort_date, ...rest } = row;

          return {
            ...rest,
            matriculas: Array.isArray(row.matriculas) ? row.matriculas : [],
            categorias_resumen: row.categorias_resumen ?? [],
            valor_total_resumen: valorTotalResumen,
            total_pagado: totalPagado,
            saldo_pendiente: Math.max(valorTotalResumen - totalPagado, 0),
          };
        }),
      };
    },
  });

  // ── Opcional: incluir catálogos en la misma respuesta (ahorra 1 HTTP request) ──
  const includeCatalogs = url.searchParams.get("include_catalogs") === "1";

  if (includeCatalogs) {
    const [result, escuelaRes, sedeRes, tramitadoresRes] = await Promise.all([
      resultPromise,
      pool.query<{ categorias: string[] | null }>(
        `select categorias from public.escuelas where id = $1 limit 1`,
        [escuelaId]
      ),
      perfil.sede_id
        ? Promise.resolve({ rows: [{ id: perfil.sede_id }] })
        : pool.query<{ id: string }>(
            `select id from public.sedes where escuela_id = $1 order by es_principal desc, created_at asc limit 1`,
            [escuelaId]
          ),
      pool.query<{ nombre: string | null }>(
        `select distinct nullif(trim(proveedor), '') as nombre
         from public.gastos
         where escuela_id = $1 and categoria = 'tramitador' and nullif(trim(proveedor), '') is not null
         ${sedeId ? "and sede_id = $2" : ""}
         order by nombre asc`,
        sedeId ? [escuelaId, sedeId] : [escuelaId]
      ),
    ]);

    const categoriasEscuela = normalizeStoredCourseCategories(escuelaRes.rows[0]?.categorias || []);

    return NextResponse.json({
      ...result,
      _catalogs: {
        categoriasEscuela,
        tramitadorOptions: tramitadoresRes.rows.map((r) => r.nombre || "").filter(Boolean),
        defaultSedeId: sedeRes.rows[0]?.id ?? null,
      },
    });
  }

  return NextResponse.json(await resultPromise);
}
