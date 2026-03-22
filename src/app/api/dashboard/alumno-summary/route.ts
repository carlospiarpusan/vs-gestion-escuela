import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import {
  DASHBOARD_SUMMARY_CACHE_TTL_MS,
  createEmptyAlumnoDashboardSummary,
  type AlumnoDashboardResponse,
} from "@/lib/dashboard-admin-summary";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardCacheTags } from "@/lib/server-cache-tags";
import { toNumber } from "@/lib/api-helpers";

type AlumnoRow = {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  email: string | null;
  estado: string;
  valor_total: number | string | null;
};

type MatriculaRow = {
  id: string;
  numero_contrato: string | null;
  categorias: string[] | null;
  valor_total: number | string | null;
  fecha_inscripcion: string | null;
  estado: "activo" | "cerrado" | "cancelado";
};

type IngresoRow = {
  id: string;
  matricula_id: string | null;
  concepto: string;
  monto: number | string | null;
  metodo_pago: string;
  fecha: string;
  estado: string;
  categoria: string;
};

type ExamenRow = {
  id: string;
  tipo: "teorico" | "practico";
  fecha: string;
  hora: string | null;
  resultado: "pendiente" | "aprobado" | "suspendido";
  intentos: number | string | null;
  notas: string | null;
  total_respuestas: number | string | null;
  respuestas_correctas: number | string | null;
};

export async function GET() {
  const authorization = await authorizeApiRequest(["alumno"]);
  if (!authorization.ok) return authorization.response;

  const pool = getServerDbPool();
  const userId = authorization.perfil.id;

  try {
    const response = await getServerReadCached<AlumnoDashboardResponse>({
      key: `dashboard:alumno:${userId}`,
      ttlMs: DASHBOARD_SUMMARY_CACHE_TTL_MS,
      tags: buildDashboardCacheTags("alumno", { userId }),
      loader: async () => {
        const nextResponse = createEmptyAlumnoDashboardSummary();
        const alumnoRes = await pool.query<AlumnoRow>(
          `
            select id, nombre, apellidos, dni, email, estado, valor_total
            from public.alumnos
            where user_id = $1
            limit 1
          `,
          [userId]
        );

        const alumno = alumnoRes.rows[0];
        if (!alumno) {
          return nextResponse;
        }

        const [matriculasRes, ingresosRes, examenesRes] = await Promise.all([
          pool.query<MatriculaRow>(
            `
              select
                id,
                numero_contrato,
                categorias,
                valor_total,
                fecha_inscripcion,
                estado
              from public.matriculas_alumno
              where alumno_id = $1
              order by fecha_inscripcion desc nulls last, created_at desc
            `,
            [alumno.id]
          ),
          pool.query<IngresoRow>(
            `
              select
                id,
                matricula_id,
                concepto,
                monto,
                metodo_pago,
                fecha,
                estado,
                categoria
              from public.ingresos
              where alumno_id = $1
              order by fecha desc, created_at desc
            `,
            [alumno.id]
          ),
          pool.query<ExamenRow>(
            `
              with respuestas as (
                select
                  examen_id,
                  count(*)::int as total_respuestas,
                  count(*) filter (where es_correcta)::int as respuestas_correctas
                from public.respuestas_examen
                where alumno_id = $1
                group by examen_id
              )
              select
                e.id,
                e.tipo,
                e.fecha,
                e.hora,
                e.resultado,
                e.intentos,
                e.notas,
                coalesce(r.total_respuestas, 0)::int as total_respuestas,
                coalesce(r.respuestas_correctas, 0)::int as respuestas_correctas
              from public.examenes e
              left join respuestas r on r.examen_id = e.id
              where e.alumno_id = $2
              order by e.fecha desc, e.created_at desc
            `,
            [alumno.id, alumno.id]
          ),
        ]);

        nextResponse.alumno = {
          ...alumno,
          valor_total: toNumber(alumno.valor_total),
        };
        nextResponse.matriculas = matriculasRes.rows.map((row) => ({
          ...row,
          categorias: row.categorias ?? [],
          valor_total: row.valor_total == null ? null : toNumber(row.valor_total),
        }));
        nextResponse.ingresos = ingresosRes.rows.map((row) => ({
          ...row,
          monto: toNumber(row.monto),
        }));
        nextResponse.examenes = examenesRes.rows.map((row) => ({
          ...row,
          intentos: toNumber(row.intentos),
          total_respuestas: toNumber(row.total_respuestas),
          respuestas_correctas: toNumber(row.respuestas_correctas),
        }));

        return nextResponse;
      },
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": `private, max-age=${Math.floor(DASHBOARD_SUMMARY_CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`,
      },
    });
  } catch (error) {
    console.error("Error al construir el dashboard del alumno:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el resumen del alumno." },
      { status: 500 }
    );
  }
}
