import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  ensureSchoolScope,
  ensureSedeScope,
  parseJsonBody,
} from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { revalidateServerReadCache } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags, buildFinanceCacheTags } from "@/lib/server-cache-tags";
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "recepcion",
];

const createAbonoSchema = z.object({
  alumno_id: z.string().uuid(),
  matricula_id: z.string().uuid().nullable().optional(),
  monto: z.number().positive("El monto debe ser mayor a 0."),
  metodo_pago: z
    .enum(["efectivo", "datafono", "nequi", "sistecredito", "otro"])
    .default("efectivo"),
  concepto: z.string().trim().max(500).optional().nullable(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
});

type AlumnoTarget = {
  id: string;
  escuela_id: string;
  sede_id: string;
  tipo_registro: string;
  nombre: string;
  apellidos: string;
  valor_total: number | null;
};

export async function POST(request: Request) {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody(request, createAbonoSchema);
  if (!parsed.ok) return parsed.response;

  const payload = parsed.data;
  const pool = getServerDbPool();

  // Load the student
  const alumnoRes = await pool.query<AlumnoTarget>(
    `
      select id, escuela_id, sede_id, tipo_registro, nombre, apellidos, valor_total
      from public.alumnos
      where id = $1
      limit 1
    `,
    [payload.alumno_id]
  );

  const alumno = alumnoRes.rows[0] ?? null;
  if (!alumno) {
    return NextResponse.json({ error: "El alumno ya no existe." }, { status: 404 });
  }

  // Scope checks
  const schoolScopeError = ensureSchoolScope(authz.perfil, alumno.escuela_id);
  if (schoolScopeError) {
    return NextResponse.json({ error: schoolScopeError }, { status: 403 });
  }

  const sedeScopeError = ensureSedeScope(authz.perfil, alumno.sede_id);
  if (sedeScopeError) {
    return NextResponse.json({ error: sedeScopeError }, { status: 403 });
  }

  // Resolve the sede for the ingreso (use actor's sede if available, otherwise alumno's sede)
  const sedeId = authz.perfil.sede_id || alumno.sede_id;

  // Validate matricula belongs to this alumno if provided
  const matriculaId: string | null = payload.matricula_id ?? null;
  let valorTotal = Number(alumno.valor_total || 0);

  if (matriculaId) {
    const matRes = await pool.query<{ id: string; valor_total: number | null }>(
      `
        select id, valor_total
        from public.matriculas_alumno
        where id = $1 and alumno_id = $2
        limit 1
      `,
      [matriculaId, alumno.id]
    );

    const mat = matRes.rows[0] ?? null;
    if (!mat) {
      return NextResponse.json(
        { error: "La matrícula no pertenece a este alumno." },
        { status: 400 }
      );
    }
    valorTotal = Number(mat.valor_total || 0);
  }

  // Validate abono doesn't exceed saldo pendiente
  if (valorTotal > 0) {
    const pagadoRes = await pool.query<{ total: string }>(
      `
        select coalesce(sum(monto), 0) as total
        from public.ingresos
        where alumno_id = $1
          and ($2::uuid is null or matricula_id = $2)
          and estado = 'cobrado'
      `,
      [alumno.id, matriculaId]
    );

    const totalPagado = Number(pagadoRes.rows[0]?.total || 0);
    const saldo = valorTotal - totalPagado;

    if (payload.monto > saldo + 0.01) {
      return NextResponse.json(
        {
          error: `El abono ($${payload.monto.toLocaleString("es-CO")}) supera el saldo pendiente ($${saldo.toLocaleString("es-CO")}).`,
        },
        { status: 400 }
      );
    }
  }

  // Build concepto and categoria
  const categoria =
    alumno.tipo_registro === "aptitud_conductor"
      ? "examen_aptitud"
      : alumno.tipo_registro === "practica_adicional"
        ? "clase_suelta"
        : "matricula";

  const concepto =
    payload.concepto?.trim() ||
    (alumno.tipo_registro === "aptitud_conductor"
      ? `Pago aptitud — ${alumno.nombre} ${alumno.apellidos}`
      : alumno.tipo_registro === "practica_adicional"
        ? `Práctica adicional — ${alumno.nombre} ${alumno.apellidos}`
        : `Abono — ${alumno.nombre} ${alumno.apellidos}`);

  // Insert the ingreso record
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        insert into public.ingresos (
          escuela_id, sede_id, user_id, alumno_id, matricula_id,
          categoria, concepto, monto, metodo_pago, fecha, estado, notas
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'cobrado', null)
      `,
      [
        alumno.escuela_id,
        sedeId,
        authz.perfil.id,
        alumno.id,
        matriculaId,
        categoria,
        concepto,
        payload.monto,
        payload.metodo_pago,
        payload.fecha,
      ]
    );

    await client.query("COMMIT");

    const scope = { escuelaId: alumno.escuela_id, sedeId };
    revalidateServerReadCache([
      ...buildDashboardListCacheTags("alumnos", scope),
      ...buildFinanceCacheTags("income", scope),
      ...buildFinanceCacheTags("portfolio", scope),
      ...buildFinanceCacheTags("cash", scope),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo registrar el abono." },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
