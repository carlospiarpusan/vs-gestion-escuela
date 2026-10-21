import { NextResponse } from "next/server";
import { StudentRecordError, invalidateStudentRecordCaches } from "@/lib/student-records-server";
import { z } from "zod";
import {
  authorizeApiRequest,
  ensureSchoolScope,
  ensureSedeScope,
  parseJsonBody,
} from "@/lib/api-auth";
import { getContractSchemaCapabilities, reserveNextContractNumber } from "@/lib/contracts-server";
import { normalizeStoredCourseCategories } from "@/lib/course-categories";
import { extractDateOnly, getTodayDateString, isValidDateOnly } from "@/lib/date-utils";
import { getServerDbPool } from "@/lib/server-db";
import { saveContractAnsv } from "@/lib/ansv-server";
import { readAnsvSnapshot } from "@/lib/ansv";
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
    fecha_inscripcion: z.string().refine(isValidDateOnly, "Fecha inválida."),
    categorias: z.array(z.string().trim().min(1)).min(1).max(20),
    ansv_categoria: z.string().trim().max(10).optional().nullable(),
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
  return getTodayDateString();
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

  const payload = {
    ...parsed.data,
    categorias: normalizeStoredCourseCategories(parsed.data.categorias),
  };
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
    await client.query("select id from public.alumnos where id=$1 for update", [alumno.id]);
    const contractCapabilities = await getContractSchemaCapabilities(client);
    const nextContract = await reserveNextContractNumber(client, {
      escuelaId: alumno.escuela_id,
      categorias: payload.categorias,
    });

    const matriculaRes = await client.query<{ id: string }>(
      contractCapabilities.matriculaConsecutive && contractCapabilities.matriculaPrefix
        ? `
            insert into public.matriculas_alumno (
              escuela_id, sede_id, alumno_id, created_by, numero_contrato, prefijo_contrato,
              consecutivo_contrato, categorias, valor_total, fecha_inscripcion, estado, notas, tiene_tramitador,
              tramitador_nombre, tramitador_valor
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'activo', $11, $12, $13, $14)
            returning id
          `
        : contractCapabilities.matriculaConsecutive
          ? `
              insert into public.matriculas_alumno (
                escuela_id, sede_id, alumno_id, created_by, numero_contrato, consecutivo_contrato,
                categorias, valor_total, fecha_inscripcion, estado, notas, tiene_tramitador,
                tramitador_nombre, tramitador_valor
              )
              values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'activo', $10, $11, $12, $13)
              returning id
            `
          : contractCapabilities.matriculaPrefix
            ? `
                insert into public.matriculas_alumno (
                  escuela_id, sede_id, alumno_id, created_by, numero_contrato, prefijo_contrato,
                  categorias, valor_total, fecha_inscripcion, estado, notas, tiene_tramitador,
                  tramitador_nombre, tramitador_valor
                )
                values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'activo', $10, $11, $12, $13)
                returning id
              `
            : `
            insert into public.matriculas_alumno (
              escuela_id, sede_id, alumno_id, created_by, numero_contrato,
              categorias, valor_total, fecha_inscripcion, estado, notas, tiene_tramitador,
              tramitador_nombre, tramitador_valor
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, 'activo', $9, $10, $11, $12)
            returning id
          `,
      contractCapabilities.matriculaConsecutive && contractCapabilities.matriculaPrefix
        ? [
            alumno.escuela_id,
            payload.sede_id,
            alumno.id,
            authz.perfil.id,
            nextContract.nextNumber,
            nextContract.prefix,
            nextContract.nextSequence,
            payload.categorias,
            payload.valor_total ?? null,
            payload.fecha_inscripcion,
            payload.notas?.trim() || null,
            payload.tiene_tramitador,
            tramitadorNombre,
            tramitadorValor,
          ]
        : contractCapabilities.matriculaConsecutive
          ? [
              alumno.escuela_id,
              payload.sede_id,
              alumno.id,
              authz.perfil.id,
              nextContract.nextNumber,
              nextContract.nextSequence,
              payload.categorias,
              payload.valor_total ?? null,
              payload.fecha_inscripcion,
              payload.notas?.trim() || null,
              payload.tiene_tramitador,
              tramitadorNombre,
              tramitadorValor,
            ]
          : contractCapabilities.matriculaPrefix
            ? [
                alumno.escuela_id,
                payload.sede_id,
                alumno.id,
                authz.perfil.id,
                nextContract.nextNumber,
                nextContract.prefix,
                payload.categorias,
                payload.valor_total ?? null,
                payload.fecha_inscripcion,
                payload.notas?.trim() || null,
                payload.tiene_tramitador,
                tramitadorNombre,
                tramitadorValor,
              ]
            : [
                alumno.escuela_id,
                payload.sede_id,
                alumno.id,
                authz.perfil.id,
                nextContract.nextNumber,
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

    await client.query(
      `
        update public.alumnos
        set numero_contrato = $2, estado = case when estado = 'pre_registrado' then 'activo' else estado end
        where id = $1
      `,
      [alumno.id, nextContract.nextNumber]
    );

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

    if (!matriculaRes.rows[0]?.id) throw new Error("No se pudo guardar el contrato ANSV.");
    await saveContractAnsv(client, {
      alumnoId: alumno.id,
      escuelaId: alumno.escuela_id,
      contratoId: matriculaRes.rows[0].id,
      categorias: payload.categorias,
      fechaMatricula: payload.fecha_inscripcion,
      categoria: payload.ansv_categoria,
    });
    await client.query("COMMIT");

    invalidateStudentRecordCaches(alumno.escuela_id, payload.sede_id);

    return NextResponse.json({
      ok: true,
      matricula_id: matriculaId,
      numero_contrato: nextContract.nextNumber,
      prefijo_contrato: contractCapabilities.matriculaPrefix ? nextContract.prefix : null,
      consecutivo_contrato: contractCapabilities.matriculaConsecutive
        ? nextContract.nextSequence
        : null,
    });
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

const editMatriculaSchema = createMatriculaSchema.safeExtend({
  matricula_id: z.string().uuid(),
  estado: z.enum(["activo", "cerrado", "cancelado"]),
  abono: z.literal(0).default(0),
});

export async function PUT(request: Request) {
  const authz = await authorizeApiRequest(ALLOWED_ROLES, request);
  if (!authz.ok) return authz.response;
  const parsed = await parseJsonBody(request, editMatriculaSchema);
  if (!parsed.ok) return parsed.response;
  const payload = {
    ...parsed.data,
    categorias: normalizeStoredCourseCategories(parsed.data.categorias),
  };
  if (!payload.categorias.length)
    return NextResponse.json({ error: "Selecciona al menos una categoría." }, { status: 400 });
  const client = await getServerDbPool().connect();
  try {
    await client.query("BEGIN");
    const alumno = (
      await client.query<
        AlumnoTarget & { facturado: boolean; numero_factura_electronica: string | null }
      >(
        "select id,escuela_id,sede_id,tipo_registro,nombre,apellidos,facturado,numero_factura_electronica from public.alumnos where id=$1 for update",
        [payload.alumno_id]
      )
    ).rows[0];
    if (!alumno) throw new StudentRecordError("El alumno ya no existe.", 404);
    if (alumno.tipo_registro !== "regular")
      throw new StudentRecordError("Solo los alumnos regulares pueden tener matrículas.", 400);
    const error =
      ensureSchoolScope(authz.perfil, alumno.escuela_id) ||
      ensureSedeScope(authz.perfil, alumno.sede_id) ||
      ensureSedeScope(authz.perfil, payload.sede_id);
    if (error) throw new StudentRecordError(error, 403);
    const matricula = (
      await client.query<{
        id: string;
        sede_id: string;
        numero_contrato: string | null;
        tiene_tramitador: boolean;
        tramitador_nombre: string | null;
        tramitador_valor: string | number | null;
        estado: string;
        categorias: string[];
        valor_total: string | number | null;
        fecha_inscripcion: string | Date | null;
        ansv: unknown;
      }>(
        "select id,sede_id,numero_contrato,tiene_tramitador,tramitador_nombre,tramitador_valor,estado,categorias,valor_total,fecha_inscripcion,ansv from public.matriculas_alumno where id=$1 and alumno_id=$2 and escuela_id=$3 for update",
        [payload.matricula_id, alumno.id, alumno.escuela_id]
      )
    ).rows[0];
    if (!matricula) throw new StudentRecordError("La matrícula no pertenece a este alumno.", 404);
    const branchError = ensureSedeScope(authz.perfil, matricula.sede_id);
    if (branchError) throw new StudentRecordError(branchError, 403);
    if (payload.sede_id !== matricula.sede_id)
      throw new StudentRecordError("La sede de la matrícula se conserva al editar.", 400);
    const invoiced = (
      await client.query<{ invoiced: boolean }>(
        "select exists(select 1 from public.facturax_contract_invoices where contrato_id=$1) as invoiced",
        [matricula.id]
      )
    ).rows[0]?.invoiced;
    const changesInvoiceData =
      Number(payload.valor_total ?? 0) !== Number(matricula.valor_total ?? 0) ||
      payload.fecha_inscripcion !== extractDateOnly(matricula.fecha_inscripcion) ||
      JSON.stringify([...payload.categorias].sort()) !==
        JSON.stringify(normalizeStoredCourseCategories(matricula.categorias).sort());
    const savedAnsv = readAnsvSnapshot(matricula.ansv);
    const changesAnsv =
      payload.fecha_inscripcion !== extractDateOnly(matricula.fecha_inscripcion) ||
      JSON.stringify([...payload.categorias].sort()) !==
        JSON.stringify(normalizeStoredCourseCategories(matricula.categorias).sort()) ||
      Boolean(payload.ansv_categoria && payload.ansv_categoria !== savedAnsv?.categoria);
    if (
      (invoiced || alumno.facturado || alumno.numero_factura_electronica) &&
      (changesInvoiceData || changesAnsv)
    )
      throw new StudentRecordError(
        "La matrícula tiene facturación asociada. Puedes cambiar sus notas y estado, conservando el valor, las categorías y la fecha originales."
      );
    const paid = Number(
      (
        await client.query<{ paid: string | number }>(
          "select coalesce(sum(monto),0) as paid from public.ingresos where matricula_id=$1 and estado='cobrado'",
          [matricula.id]
        )
      ).rows[0]?.paid || 0
    );
    if ((payload.valor_total ?? 0) < paid)
      throw new StudentRecordError(
        "El valor de la matrícula no puede ser menor que los abonos cobrados.",
        400
      );
    const oldTramitadorValue = Number(matricula.tramitador_valor || 0);
    const nextTramitadorValue = payload.tiene_tramitador
      ? Number(payload.tramitador_valor || 0)
      : 0;
    const nextTramitadorName = payload.tiene_tramitador
      ? payload.tramitador_nombre?.trim() || null
      : null;
    if (
      oldTramitadorValue > 0 &&
      (nextTramitadorValue !== oldTramitadorValue ||
        nextTramitadorName !== matricula.tramitador_nombre ||
        payload.tiene_tramitador !== matricula.tiene_tramitador)
    )
      throw new StudentRecordError(
        "El tramitador ya tiene un gasto registrado. Su importe y proveedor se conservan; los demás datos de la matrícula sí pueden editarse."
      );
    await client.query(
      `update public.matriculas_alumno set categorias=$2,valor_total=$3,fecha_inscripcion=$4,
      estado=$5,notas=$6,tiene_tramitador=$7,tramitador_nombre=$8,tramitador_valor=$9,updated_by=$10,updated_at=now()
      where id=$1`,
      [
        matricula.id,
        payload.categorias,
        payload.valor_total ?? null,
        payload.fecha_inscripcion,
        payload.estado,
        payload.notas || null,
        payload.tiene_tramitador,
        nextTramitadorName,
        payload.tiene_tramitador ? (payload.tramitador_valor ?? null) : null,
        authz.perfil.id,
      ]
    );
    if (changesAnsv) {
      try {
        await saveContractAnsv(client, {
          alumnoId: alumno.id,
          escuelaId: alumno.escuela_id,
          contratoId: matricula.id,
          categorias: payload.categorias,
          fechaMatricula: payload.fecha_inscripcion,
          categoria:
            payload.ansv_categoria ||
            (payload.categorias.includes(savedAnsv?.categoria || "") ? savedAnsv?.categoria : null),
        });
      } catch (error) {
        throw new StudentRecordError((error as Error).message, 400);
      }
    }
    if (oldTramitadorValue <= 0 && nextTramitadorValue > 0) {
      await client.query(
        `insert into public.gastos (escuela_id,sede_id,user_id,categoria,concepto,monto,metodo_pago,proveedor,fecha,recurrente,notas)
        values($1,$2,$3,'tramitador',$4,$5,'transferencia',$6,$7,false,$8)`,
        [
          alumno.escuela_id,
          matricula.sede_id,
          authz.perfil.id,
          `Tramitador — ${alumno.nombre} ${alumno.apellidos}`,
          nextTramitadorValue,
          nextTramitadorName,
          getToday(),
          `Matrícula ${matricula.id}`,
        ]
      );
    }
    await client.query("COMMIT");
    invalidateStudentRecordCaches(alumno.escuela_id, matricula.sede_id);
    return NextResponse.json({
      ok: true,
      matricula_id: matricula.id,
      numero_contrato: matricula.numero_contrato,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    return NextResponse.json(
      {
        error:
          error instanceof StudentRecordError
            ? error.message
            : "No se pudo guardar la matrícula. Intenta nuevamente.",
      },
      { status: error instanceof StudentRecordError ? error.status : 400 }
    );
  } finally {
    client.release();
  }
}
