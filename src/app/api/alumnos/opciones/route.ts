import { NextResponse } from "next/server";
import {
  authorizeApiRequest,
  getStaffReadSedeScope,
  resolveEscuelaIdForRequest,
} from "@/lib/api-auth";
import { normalizeUuid } from "@/lib/dashboard-scope";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardListServerCacheKey } from "@/lib/dashboard-server-cache";
import { buildDashboardListCacheTags } from "@/lib/server-cache-tags";
import { ALLOWED_FINANCE_ROLES } from "@/lib/finance/server/request";
import type {
  StudentOption,
  StudentEnrollmentOption,
  StudentOptionsResponse,
} from "@/lib/student-options";

const PAGE_SIZE = 20;
export async function GET(request: Request) {
  const auth = await authorizeApiRequest(ALLOWED_FINANCE_ROLES);
  if (!auth.ok) return auth.response;
  const { perfil } = auth;
  const { sedeId, error } = getStaffReadSedeScope(perfil);
  if (error) return NextResponse.json({ error }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const escuelaId = resolveEscuelaIdForRequest(request, perfil, params.get("escuela_id"));
  if (!escuelaId) return NextResponse.json({ error: "Selecciona una escuela." }, { status: 400 });
  const id = normalizeUuid(params.get("id"));
  if (params.has("id") && !id)
    return NextResponse.json({ error: "Alumno inválido." }, { status: 400 });
  const search = (params.get("q") || "").trim().slice(0, 120);
  const page = Math.min(10000, Math.max(0, Number.parseInt(params.get("page") || "0", 10) || 0));
  const enrollments = Boolean(id && params.get("matriculas") === "1");
  if (!id && search.length < 2) return NextResponse.json({ rows: [], hasMore: false });
  const scope = { escuelaId, sedeId };
  const keyParams = new URLSearchParams({
    q: search,
    page: String(page),
    ...(id ? { id } : {}),
    matriculas: enrollments ? "1" : "0",
  });
  try {
    const payload = await getServerReadCached<StudentOptionsResponse>({
      key: buildDashboardListServerCacheKey("student-options-v1", perfil.rol, scope, keyParams),
      ttlMs: 300_000,
      tags: buildDashboardListCacheTags("student-options", scope),
      loader: async () => {
        const pool = getServerDbPool();
        const values: unknown[] = [escuelaId];
        const where = ["a.escuela_id = $1"];
        if (sedeId) {
          values.push(sedeId);
          where.push(`a.sede_id = $${values.length}`);
        }
        if (id) {
          values.push(id);
          where.push(`a.id = $${values.length}`);
        } else {
          values.push(`%${search.replace(/[\\%_]/g, "\\$&")}%`);
          const ref = `$${values.length}`;
          where.push(`(concat_ws(' ', a.nombre, a.apellidos) ilike ${ref} or a.dni ilike ${ref}
            or exists(select 1 from public.matriculas_alumno m where m.alumno_id=a.id
              and m.escuela_id=a.escuela_id ${sedeId ? "and m.sede_id=a.sede_id" : ""} and m.numero_contrato ilike ${ref}))`);
        }
        values.push(id ? 1 : PAGE_SIZE + 1, id ? 0 : page * PAGE_SIZE);
        const { rows } = await pool.query<StudentOption>(
          `select a.id,a.nombre,a.apellidos,a.dni
          from public.alumnos a where ${where.join(" and ")}
          order by a.nombre,a.apellidos,a.id limit $${values.length - 1} offset $${values.length}`,
          values
        );
        const result: StudentOptionsResponse = {
          rows: rows.slice(0, PAGE_SIZE),
          hasMore: rows.length > PAGE_SIZE,
        };
        if (enrollments && rows.length) {
          const { rows: matriculas } = await pool.query<StudentEnrollmentOption>(
            `select id,alumno_id,numero_contrato,categorias,valor_total,fecha_inscripcion::text
            from public.matriculas_alumno where escuela_id=$1 and alumno_id=$2 ${sedeId ? "and sede_id=$3" : ""}
            order by fecha_inscripcion desc nulls last,created_at desc,id limit 201`,
            sedeId ? [escuelaId, id, sedeId] : [escuelaId, id]
          );
          if (matriculas.length > 200)
            throw new Error("El alumno excede el límite de matrículas consultables.");
          result.matriculas = matriculas.map((matricula) => ({
            ...matricula,
            valor_total: matricula.valor_total == null ? null : Number(matricula.valor_total),
          }));
        }
        return result;
      },
    });
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[student-options]", error);
    return NextResponse.json({ error: "No se pudieron consultar los alumnos." }, { status: 500 });
  }
}
