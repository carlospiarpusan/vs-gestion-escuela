import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  ensureSchoolScope,
  ensureSedeScope,
  parseJsonBody,
} from "@/lib/api-auth";
import { normalizeContractNumber } from "@/lib/contract-number";
import { getServerDbPool } from "@/lib/server-db";
import { revalidateServerReadCache } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags, buildFinanceCacheTags } from "@/lib/server-cache-tags";
import type { MetodoPago, Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "recepcion",
];

const createMatriculaSchema = z
  .object({
    alumno_id: z.string().uuid(),
    sede_id: z.string().uuid(),
    numero_contrato: z.string().trim().max(120).optional().nullable(),
    fecha_inscripcion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    categorias: z.array(z.string().trim().min(1)).min(1).max(20),
    valor_total: z.number().min(0).nullable().optional(),
    notas: z.string().trim().max(10_000).optional().nullable(),
    abono: z.number().min(0).default(0),
    metodo_pago_abono: z
      .enum(["efectivo", "datafono", "nequi", "sistecredito", "otro"])
      .default("efectivo"),
    tiene_tramitador: z.boolean().default(false),
    tramitador_nombre: z.string().trim().max(200).optional().nullable(),
    tramitador_valor: z.number().min(0).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.tiene_tramitador && !value.tramitador_nombre?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tramitador_nombre"],
        message: "Debes indicar el nombre del tramitador.",
      });
    }
  });

type AlumnoTarget = {
  id: string;
  escuela_id: string;
  sede_id: string;
  tipo_registro: string;
  nombre: string;
  apellidos: string;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

async function ensureSedeBelongsToSchool(escuelaId: string, sedeId: string) {
  const pool = getServerDbPool();
  const result = await pool.query<{ id: string }>(
    `
      select id
      from public.sedes
      where id = $1
        and escuela_id = $2
      limit 1
    `,
    [sedeId, escuelaId]
  );

  return Boolean(result.rows[0]);
}

export async function POST(request: Request) {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody(request, createMatriculaSchema);
  if (!parsed.ok) return parsed.response;

  const payload = parsed.data;
  const pool = getServerDbPool();

  const alumnoRes = await pool.query<AlumnoTarget>(
    `
      select id, escuela_id, sede_id, tipo_registro, nombre, apellidos
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

  if (alumno.tipo_registro !== "regular") {
    return NextResponse.json(
      { error: "Solo los alumnos regulares pueden tener matrículas." },
      { status: 400 }
    );
  }

  const schoolScopeError = ensureSchoolScope(authz.perfil, alumno.escuela_id);
  if (schoolScopeError) {
    return NextResponse.json({ error: schoolScopeError }, { status: 403 });
  }

  const currentSedeScopeError = ensureSedeScope(authz.perfil, alumno.sede_id);
  if (currentSedeScopeError) {
    return NextResponse.json({ error: currentSedeScopeError }, { status: 403 });
  }

  const nextSedeScopeError = ensureSedeScope(authz.perfil, payload.sede_id);
  if (nextSedeScopeError) {
    return NextResponse.json({ error: nextSedeScopeError }, { status: 403 });
  }

  const validSede = await ensureSedeBelongsToSchool(alumno.escuela_id, payload.sede_id);
  if (!validSede) {
    return NextResponse.json(
      { error: "La sede no pertenece a la escuela del alumno." },
      { status: 400 }
    );
  }

  if (payload.abono > 0 && payload.valor_total && payload.abono > payload.valor_total) {
    return NextResponse.json(
      { error: "El abono no puede ser mayor al valor total del curso." },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  const hoy = getToday();
  const tramitadorNombre = payload.tiene_tramitador
    ? payload.tramitador_nombre?.trim() || null
    : null;
  const tramitadorValor = payload.tiene_tramitador ? (payload.tramitador_valor ?? null) : null;

  try {
    await client.query("BEGIN");

    const matriculaRes = await client.query<{ id: string }>(
      `
        insert into public.matriculas_alumno (
          escuela_id, sede_id, alumno_id, created_by, numero_contrato, categorias,
          valor_total, fecha_inscripcion, estado, notas, tiene_tramitador, tramitador_nombre, tramitador_valor
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, 'activo', $9, $10, $11, $12)
        returning id
      `,
      [
        alumno.escuela_id,
        payload.sede_id,
        alumno.id,
        authz.perfil.id,
        normalizeContractNumber(payload.numero_contrato ?? "", payload.categorias),
        payload.categorias,
        payload.valor_total ?? null,
        payload.fecha_inscripcion,
        payload.notas?.trim() || null,
        payload.tiene_tramitador,
        tramitadorNombre,
        tramitadorValor,
      ]
    );

    const matriculaId = matriculaRes.rows[0]?.id;
    if (!matriculaId) {
      throw new Error("No se pudo crear la matrícula.");
    }

    if (payload.abono > 0) {
      await client.query(
        `
          insert into public.ingresos (
            escuela_id, sede_id, user_id, alumno_id, matricula_id, categoria, concepto, monto, metodo_pago, fecha, estado, notas
          )
          values ($1, $2, $3, $4, $5, 'matricula', $6, $7, $8, $9, 'cobrado', null)
        `,
        [
          alumno.escuela_id,
          payload.sede_id,
          authz.perfil.id,
          alumno.id,
          matriculaId,
          `Matrícula — ${alumno.nombre} ${alumno.apellidos}`,
          payload.abono,
          payload.metodo_pago_abono as MetodoPago,
          hoy,
        ]
      );
    }

    if (payload.tiene_tramitador && (payload.tramitador_valor ?? 0) > 0) {
      await client.query(
        `
          insert into public.gastos (
            escuela_id, sede_id, user_id, categoria, concepto, monto, metodo_pago, proveedor, fecha, recurrente, notas
          )
          values ($1, $2, $3, 'tramitador', $4, $5, 'transferencia', $6, $7, false, $8)
        `,
        [
          alumno.escuela_id,
          payload.sede_id,
          authz.perfil.id,
          `Tramitador — ${alumno.nombre} ${alumno.apellidos}`,
          payload.tramitador_valor ?? 0,
          tramitadorNombre,
          hoy,
          `Tramitador asignado al alumno ${alumno.nombre} ${alumno.apellidos}`,
        ]
      );
    }

    await client.query("COMMIT");

    const scope = { escuelaId: alumno.escuela_id, sedeId: payload.sede_id };
    revalidateServerReadCache([
      ...buildDashboardListCacheTags("alumnos", scope),
      ...buildFinanceCacheTags("income", scope),
    ]);

    return NextResponse.json({ ok: true, matricula_id: matriculaId });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear la matrícula." },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
