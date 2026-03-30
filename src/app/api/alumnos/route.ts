import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags } from "@/lib/server-cache-tags";
import { buildDocumentIdentifierLikePattern } from "@/lib/document-search";
import type { Rol, TipoRegistroAlumno } from "@/types/database";
import { parseInteger, parseStringArray, toNumber } from "@/lib/api-helpers";

const ALLOWED_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede", "administrativo"];
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
  matriculas: unknown;
  categorias_resumen: string[] | null;
  valor_total_resumen: number | string | null;
  total_pagado: number | string | null;
};

function buildAlumnosListQuery({
  whereSql,
  limitRef,
  offsetRef,
}: {
  whereSql: string;
  limitRef: string;
  offsetRef: string;
}) {
  return `
    WITH filtered_alumnos AS (
      SELECT
        a.id,
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
        a.user_id,
        a.created_at,
        a.notas,
        a.numero_contrato,
        a.empresa_convenio,
        a.nota_examen_teorico,
        a.fecha_examen_teorico,
        a.nota_examen_practico,
        a.fecha_examen_practico
      FROM public.alumnos a
      WHERE ${whereSql}
    ),
    total_count AS (
      SELECT count(*)::int AS total FROM filtered_alumnos
    ),
    paged_alumnos AS (
      SELECT *
      FROM filtered_alumnos
      ORDER BY created_at DESC, id DESC
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
          )
          ORDER BY m.fecha_inscripcion DESC NULLS LAST, m.created_at DESC
        ) AS matriculas
      FROM public.matriculas_alumno m
      JOIN paged_alumnos p ON p.id = m.alumno_id
      GROUP BY m.alumno_id
    ),
    categorias_agg AS (
      SELECT
        m.alumno_id,
        array_remove(array_agg(DISTINCT categoria ORDER BY categoria), NULL) AS categorias_resumen
      FROM public.matriculas_alumno m
      JOIN paged_alumnos p ON p.id = m.alumno_id
      LEFT JOIN LATERAL unnest(coalesce(m.categorias, '{}'::text[])) categoria ON true
      GROUP BY m.alumno_id
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
    ORDER BY p.created_at DESC, p.id DESC
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

  const escuelaId = resolveEscuelaIdForRequest(request, perfil, url.searchParams.get("escuela_id"));
  const sedeId = perfil.rol === "admin_sede" ? perfil.sede_id : null;

  if (!escuelaId) {
    return NextResponse.json({
      totalCount: 0,
      rows: [],
    });
  }

  const values: Array<string | string[] | number | null> = [];
  const addValue = (value: string | string[] | number | null) => {
    values.push(value);
    return `$${values.length}`;
  };

  const where: string[] = [];
  const escuelaRef = addValue(escuelaId);
  where.push(`a.escuela_id = ${escuelaRef}`);

  if (sedeId) {
    const sedeRef = addValue(sedeId);
    where.push(`a.sede_id = ${sedeRef}`);
  }

  const tiposRef = addValue(tipos);
  where.push(
    `(cardinality(${tiposRef}::text[]) = 0 OR a.tipo_registro = ANY(${tiposRef}::text[]))`
  );

  const categoriasRef = addValue(categorias);
  where.push(`(
    cardinality(${categoriasRef}::text[]) = 0
    OR coalesce(a.categorias, '{}'::text[]) && ${categoriasRef}::text[]
    OR exists (
      select 1
      from public.matriculas_alumno m
      where m.alumno_id = a.id
        and coalesce(m.categorias, '{}'::text[]) && ${categoriasRef}::text[]
    )
  )`);

  if (mes && (/^\d{4}-\d{2}$/.test(mes) || /^\d{4}$/.test(mes))) {
    const mesRef = addValue(`${mes}%`);
    where.push(`(
      coalesce(a.fecha_inscripcion::text, a.created_at::text) LIKE ${mesRef}
      OR exists (
        select 1
        from public.matriculas_alumno m
        where m.alumno_id = a.id
          and coalesce(m.fecha_inscripcion::text, m.created_at::text) LIKE ${mesRef}
      )
    )`);
  }

  if (search) {
    const searchRef = addValue(`%${search}%`);
    const searchClauses = [
      `a.nombre ILIKE ${searchRef}`,
      `a.apellidos ILIKE ${searchRef}`,
      `concat_ws(' ', a.nombre, a.apellidos) ILIKE ${searchRef}`,
      `a.dni ILIKE ${searchRef}`,
      `coalesce(a.numero_contrato, '') ILIKE ${searchRef}`,
      `coalesce(a.empresa_convenio, '') ILIKE ${searchRef}`,
      `coalesce(a.telefono, '') ILIKE ${searchRef}`,
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
  }

  const whereSql = where.join(" AND ");
  const pool = getServerDbPool();
  const offset = page * pageSize;
  const limitRef = `$${values.length + 1}`;
  const offsetRef = `$${values.length + 2}`;

  const cacheKey = `alumnos-list:${escuelaId}:${sedeId || "all"}:${tipos.join(",")}:${categorias.join(",")}:${mes}:${search}:${page}:${pageSize}`;

  const result = await getServerReadCached<{
    totalCount: number;
    rows: Record<string, unknown>[];
  }>({
    key: cacheKey,
    ttlMs: CACHE_TTL_MS,
    tags: buildDashboardListCacheTags("alumnos", { escuelaId, sedeId }),
    loader: async () => {
      const rowsRes = await pool.query<AlumnoApiRow & { _total_count: number | string | null }>(
        buildAlumnosListQuery({
          whereSql,
          limitRef,
          offsetRef,
        }),
        [...values, pageSize, offset]
      );

      const totalCount = Number(rowsRes.rows[0]?._total_count || 0);

      return {
        totalCount,
        rows: rowsRes.rows.map((row) => {
          const valorTotalResumen = toNumber(row.valor_total_resumen);
          const totalPagado = toNumber(row.total_pagado);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _total_count, ...rest } = row;

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
    const [escuelaRes, sedeRes, tramitadoresRes] = await Promise.all([
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
         order by nombre asc`,
        [escuelaId]
      ),
    ]);

    return NextResponse.json({
      ...result,
      _catalogs: {
        categoriasEscuela: escuelaRes.rows[0]?.categorias || [],
        tramitadorOptions: tramitadoresRes.rows.map((r) => r.nombre || "").filter(Boolean),
        defaultSedeId: sedeRes.rows[0]?.id ?? null,
      },
    });
  }

  return NextResponse.json(result);
}
