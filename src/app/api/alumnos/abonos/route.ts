import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import {
  authorizeApiRequest,
  ensureSchoolScope,
  ensureSedeScope,
  parseJsonBody,
} from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { isValidDateOnly } from "@/lib/date-utils";
import { revalidateServerReadCache } from "@/lib/server-read-cache";
import { buildIncomeMutationInvalidationTags } from "@/lib/server-cache-tags";
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "recepcion",
];

const createAbonoSchema = z.object({
  operacion_id: z.string().uuid().optional(),
  alumno_id: z.string().uuid(),
  matricula_id: z.string().uuid().nullable().optional(),
  monto: z.number().positive("El monto debe ser mayor a 0."),
  metodo_pago: z
    .enum(["efectivo", "datafono", "nequi", "sistecredito", "otro"])
    .default("efectivo"),
  concepto: z.string().trim().max(500).optional().nullable(),
  fecha: z.string().refine(isValidDateOnly, "Fecha inválida."),
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
  const client = await getServerDbPool().connect();
  let committed = false;
  const reject = async (error: string, status = 400) => {
    await client.query("ROLLBACK");
    return NextResponse.json({ error }, { status });
  };
  try {
    await client.query("BEGIN");
    // Serialize balance checks and writes for this student on the same connection.
    const alumnoRes = await client.query<AlumnoTarget>(
      "select id,escuela_id,sede_id,tipo_registro,nombre,apellidos,valor_total from public.alumnos where id=$1 for update",
      [payload.alumno_id]
    );
    const alumno = alumnoRes.rows[0];
    if (!alumno) return await reject("El alumno ya no existe.", 404);
    const scopeError =
      ensureSchoolScope(authz.perfil, alumno.escuela_id) ||
      ensureSedeScope(authz.perfil, alumno.sede_id);
    if (scopeError) return await reject(scopeError, 403);
    const sedeId = authz.perfil.sede_id || alumno.sede_id;
    const { operacion_id: operationId, ...payment } = payload;
    const requestHash = createHash("sha256").update(JSON.stringify(payment)).digest("hex");
    if (operationId) {
      const previous = await client.query<{
        actor_id: string;
        request_hash: string;
        ingreso_id: string | null;
      }>("select actor_id,request_hash,ingreso_id from public.web_payment_operations where id=$1", [
        operationId,
      ]);
      if (previous.rows[0]) {
        const operation = previous.rows[0];
        if (
          operation.actor_id !== authz.perfil.id ||
          operation.request_hash !== requestHash ||
          !operation.ingreso_id
        ) {
          return await reject(
            "Esta operación ya se utilizó con otros datos o su ingreso fue eliminado.",
            409
          );
        }
        await client.query("COMMIT");
        committed = true;
        return NextResponse.json({ ok: true, ingreso_id: operation.ingreso_id, repetida: true });
      }
    }
    const matriculaId = payload.matricula_id ?? null;
    let valorTotal = Number(alumno.valor_total || 0);
    if (matriculaId) {
      const matRes = await client.query<{ id: string; valor_total: number | null }>(
        "select id,valor_total from public.matriculas_alumno where id=$1 and alumno_id=$2 for update",
        [matriculaId, alumno.id]
      );
      if (!matRes.rows[0]) return await reject("La matrícula no pertenece a este alumno.");
      valorTotal = Number(matRes.rows[0].valor_total || 0);
    } else if (alumno.tipo_registro === "regular") {
      return await reject("Selecciona la matrícula a la que corresponde este abono.");
    }
    if (valorTotal > 0) {
      const paid = await client.query<{ total: string }>(
        "select coalesce(sum(monto),0) as total from public.ingresos where alumno_id=$1 and ($2::uuid is null or matricula_id=$2) and estado='cobrado'",
        [alumno.id, matriculaId]
      );
      const saldo = valorTotal - Number(paid.rows[0]?.total || 0);
      if (payload.monto > saldo + 0.01) {
        return await reject(
          `El abono ($${payload.monto.toLocaleString("es-CO")}) supera el saldo pendiente ($${saldo.toLocaleString("es-CO")}).`
        );
      }
    }
    const categoria =
      alumno.tipo_registro === "aptitud_conductor"
        ? "examen_aptitud"
        : alumno.tipo_registro === "practica_adicional"
          ? "clase_suelta"
          : "matricula";
    const label =
      alumno.tipo_registro === "aptitud_conductor"
        ? "Pago aptitud"
        : alumno.tipo_registro === "practica_adicional"
          ? "Práctica adicional"
          : "Abono";
    const concepto = payload.concepto?.trim() || `${label} — ${alumno.nombre} ${alumno.apellidos}`;
    const created = await client.query<{ id: string }>(
      `insert into public.ingresos(
      escuela_id,sede_id,user_id,alumno_id,matricula_id,categoria,concepto,monto,metodo_pago,fecha,estado,notas)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'cobrado',null) returning id`,
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
    if (operationId)
      await client.query(
        "insert into public.web_payment_operations(id,actor_id,escuela_id,request_hash,ingreso_id) values($1,$2,$3,$4,$5)",
        [operationId, authz.perfil.id, alumno.escuela_id, requestHash, created.rows[0].id]
      );
    await client.query("COMMIT");
    committed = true;
    const scope = { escuelaId: alumno.escuela_id, sedeId };
    revalidateServerReadCache(buildIncomeMutationInvalidationTags(scope));
    return NextResponse.json({ ok: true, ingreso_id: created.rows[0].id });
  } catch {
    if (committed) {
      console.error("alumnos.abonos.cache.failed");
      return NextResponse.json({ ok: true });
    }
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: "No se pudo registrar el abono. No se aplicaron cambios." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
