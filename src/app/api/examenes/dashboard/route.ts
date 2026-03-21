import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import {
  buildDashboardListServerCacheKey,
  isFreshDashboardDataRequested,
} from "@/lib/dashboard-server-cache";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags } from "@/lib/server-cache-tags";
import { getServerDbPool } from "@/lib/server-db";
import { CALE_BANK_SOURCE, CALE_EXAM_NOTES_PREFIX } from "@/lib/cale";
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = ["alumno"];
const CACHE_TTL_MS = 120 * 1000;

type CategoryRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo_permiso: string;
  orden: number;
  fuente: string;
  created_at: string;
  question_count: number | string | null;
};

type HistoryRow = {
  id: string;
  escuela_id: string;
  sede_id: string;
  user_id: string;
  alumno_id: string;
  tipo: string;
  fecha: string;
  hora: string | null;
  resultado: string;
  intentos: number;
  modulo_origen: string | null;
  fuente_banco: string | null;
  total_preguntas: number | null;
  respuestas_correctas: number | null;
  porcentaje: number | null;
  tiempo_segundos: number | null;
  notas: string | null;
  created_at: string;
};

type ExamRow = HistoryRow;

type ReviewRow = {
  pregunta_id: string;
  orden_pregunta: number | null;
  respuesta_alumno: string | null;
  respuesta_omitida: boolean;
  es_correcta: boolean;
  categoria_nombre: string | null;
  pregunta_texto: string | null;
  imagen_url: string | null;
  opcion_a: string | null;
  opcion_b: string | null;
  opcion_c: string | null;
  opcion_d: string | null;
  respuesta_correcta: string | null;
  explicacion: string | null;
  fundamento_legal: string | null;
};

export async function GET(request: Request) {
  const auth = await authorizeApiRequest(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  const { perfil } = auth;
  const url = new URL(request.url);
  const examId = (url.searchParams.get("examId") ?? "").trim();
  const pool = getServerDbPool();

  const alumnoRes = await pool.query<{ id: string; escuela_id: string; sede_id: string }>(
    `
      select id, escuela_id, sede_id
      from public.alumnos
      where user_id = $1
      limit 1
    `,
    [perfil.id]
  );
  const alumno = alumnoRes.rows[0];

  if (!alumno) {
    return NextResponse.json(
      {
        categories: [],
        history: [],
        review: null,
      },
      {
        headers: {
          "Cache-Control": `private, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`,
        },
      }
    );
  }

  const scope = {
    escuelaId: alumno.escuela_id,
    sedeId: alumno.sede_id,
  };

  const payload = await getServerReadCached({
    key: buildDashboardListServerCacheKey("examenes-dashboard", perfil.id, scope, url.searchParams),
    ttlMs: CACHE_TTL_MS,
    tags: buildDashboardListCacheTags("examenes-dashboard", scope),
    bypass: isFreshDashboardDataRequested(url.searchParams),
    loader: async () => {
      const [categoriesRes, historyRes, reviewExamRes, reviewRowsRes] = await Promise.all([
        pool.query<CategoryRow>(
          `
            select
              c.id,
              c.nombre,
              c.descripcion,
              c.tipo_permiso,
              c.orden,
              c.fuente,
              c.created_at,
              count(p.id)::int as question_count
            from public.categorias_examen c
            left join public.preguntas_examen p
              on p.categoria_id = c.id
             and p.fuente = $1
             and p.activa = true
            where c.fuente = $1
            group by c.id
            order by c.orden asc, c.nombre asc
          `,
          [CALE_BANK_SOURCE]
        ),
        pool.query<HistoryRow>(
          `
            select
              id,
              escuela_id,
              sede_id,
              user_id,
              alumno_id,
              tipo,
              fecha,
              hora,
              resultado,
              intentos,
              modulo_origen,
              fuente_banco,
              total_preguntas,
              respuestas_correctas,
              porcentaje,
              tiempo_segundos,
              notas,
              created_at
            from public.examenes
            where alumno_id = $1
              and notas like $2
            order by created_at desc
          `,
          [alumno.id, `${CALE_EXAM_NOTES_PREFIX}%`]
        ),
        examId
          ? pool.query<ExamRow>(
              `
                select
                  id,
                  escuela_id,
                  sede_id,
                  user_id,
                  alumno_id,
                  tipo,
                  fecha,
                  hora,
                  resultado,
                  intentos,
                  modulo_origen,
                  fuente_banco,
                  total_preguntas,
                  respuestas_correctas,
                  porcentaje,
                  tiempo_segundos,
                  notas,
                  created_at
                from public.examenes
                where id = $1
                  and alumno_id = $2
                limit 1
              `,
              [examId, alumno.id]
            )
          : Promise.resolve({ rows: [] as ExamRow[] }),
        examId
          ? pool.query<ReviewRow>(
              `
                select
                  pregunta_id,
                  orden_pregunta,
                  respuesta_alumno,
                  respuesta_omitida,
                  es_correcta,
                  categoria_nombre,
                  pregunta_texto,
                  imagen_url,
                  opcion_a,
                  opcion_b,
                  opcion_c,
                  opcion_d,
                  respuesta_correcta,
                  explicacion,
                  fundamento_legal
                from public.respuestas_examen
                where examen_id = $1
                  and alumno_id = $2
                order by orden_pregunta asc nulls last, created_at asc
              `,
              [examId, alumno.id]
            )
          : Promise.resolve({ rows: [] as ReviewRow[] }),
      ]);

      return {
        categories: categoriesRes.rows.map((row) => ({
          ...row,
          questionCount: Number(row.question_count || 0),
        })),
        history: historyRes.rows,
        review: reviewExamRes.rows[0]
          ? {
              exam: reviewExamRes.rows[0],
              rows: reviewRowsRes.rows,
            }
          : null,
      };
    },
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": `private, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`,
    },
  });
}
