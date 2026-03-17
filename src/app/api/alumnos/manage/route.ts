import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  buildSupabaseAdminClient,
  createAuthUserWithRetryOnCollision,
  ensureNonReservedAuthEmail,
  ensureSchoolScope,
  ensureSedeScope,
  isAuthUserAlreadyRegisteredError,
  normalizeCedula,
  normalizeEmail,
  parseJsonBody,
} from "@/lib/api-auth";
import { normalizeContractNumber } from "@/lib/contract-number";
import { getServerDbPool } from "@/lib/server-db";
import type { MetodoPago, Rol, TipoRegistroAlumno } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "recepcion",
];

const manageAlumnoSchema = z
  .object({
    alumno_id: z.string().uuid().optional(),
    sede_id: z.string().uuid(),
    tipo_registro: z.enum(["regular", "aptitud_conductor", "practica_adicional"]),
    nombre: z.string().trim().min(1).max(200),
    apellidos: z.string().trim().min(1).max(200),
    dni: z.string().trim().min(5).max(30),
    email: z.string().email().optional().nullable(),
    telefono: z.string().trim().min(1).max(80),
    direccion: z.string().trim().max(500).optional().nullable(),
    categorias: z.array(z.string().trim().min(1)).max(20),
    estado: z.enum(["activo", "inactivo", "graduado", "pre_registrado"]),
    empresa_convenio: z.string().trim().max(200).optional().nullable(),
    nota_examen_teorico: z.number().min(0).max(100).optional().nullable(),
    fecha_examen_teorico: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    nota_examen_practico: z.number().min(0).max(100).optional().nullable(),
    fecha_examen_practico: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    notas: z.string().trim().max(10_000).optional().nullable(),
    numero_contrato: z.string().trim().max(120).optional().nullable(),
    fecha_inscripcion: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    valor_total: z.number().min(0).optional().nullable(),
    abono: z.number().min(0).default(0),
    metodo_pago_abono: z
      .enum(["efectivo", "datafono", "nequi", "sistecredito", "otro"])
      .default("efectivo"),
    tiene_tramitador: z.boolean().default(false),
    tramitador_nombre: z.string().trim().max(200).optional().nullable(),
    tramitador_valor: z.number().min(0).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.tiene_tramitador && value.tipo_registro !== "regular") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tiene_tramitador"],
        message: "El tramitador solo aplica a matrículas regulares.",
      });
    }

    if (value.tiene_tramitador && !value.tramitador_nombre?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tramitador_nombre"],
        message: "Debes indicar el nombre del tramitador.",
      });
    }
  });

type ExistingAlumnoRow = {
  id: string;
  user_id: string;
  escuela_id: string;
  sede_id: string;
  numero_contrato: string | null;
  tipo_permiso: string;
  categorias: string[] | null;
  valor_total: number | string | null;
  fecha_inscripcion: string | null;
  estado: string;
  tipo_registro: string;
};

type ExistingMatriculaRow = {
  id: string;
  notas: string | null;
  numero_contrato: string | null;
  tiene_tramitador: boolean | null;
  tramitador_valor: number | string | null;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function mapTipoPermiso(categorias: string[]) {
  const first = categorias[0] ? categorias[0].toUpperCase() : "";
  if (first.startsWith("AM")) return "AM";
  if (first.startsWith("A1")) return "A1";
  if (first.startsWith("A2")) return "A2";
  if (first.startsWith("A")) return "A";
  if (first.startsWith("RC") || first.startsWith("C")) return "C";
  return "B";
}

function buildAptitudReference() {
  return `APT-${Date.now()}`;
}

function buildPracticeReference() {
  return `PRA-${Date.now()}`;
}

function toNumber(value: number | string | null | undefined) {
  return Number(value || 0);
}

async function ensureSedeBelongsToSchool(schoolId: string, sedeId: string) {
  const pool = getServerDbPool();
  const sedeRes = await pool.query<{ id: string }>(
    `
      select id
      from public.sedes
      where id = $1
        and escuela_id = $2
      limit 1
    `,
    [sedeId, schoolId]
  );

  return Boolean(sedeRes.rows[0]);
}

async function provisionAlumnoAuthUser(input: {
  actor: { id: string; rol: Rol; escuela_id: string | null; sede_id: string | null };
  schoolId: string;
  sedeId: string;
  nombreCompleto: string;
  dni: string;
  email: string | null;
}) {
  const reservedEmailError = ensureNonReservedAuthEmail(input.email);
  if (reservedEmailError) {
    throw new Error(reservedEmailError);
  }

  const supabaseAdmin = buildSupabaseAdminClient();
  const { data: perfilConCedula } = await supabaseAdmin
    .from("perfiles")
    .select("id")
    .eq("cedula", input.dni)
    .maybeSingle();

  if (perfilConCedula) {
    throw new Error("La cédula o correo ya tiene una cuenta registrada.");
  }

  const authEmail = input.email || `${input.dni}@alumno.local`;
  const authPassword = input.dni;
  const { data: authData, error: authError } = await createAuthUserWithRetryOnCollision(
    supabaseAdmin,
    {
      email: authEmail,
      password: authPassword,
      email_confirm: true,
      user_metadata: {
        nombre: input.nombreCompleto,
        rol: "alumno",
        debe_cambiar_password: true,
        debe_completar_perfil: true,
      },
    },
    { allowOrphanCleanup: !input.email }
  );

  if (authError || !authData?.user) {
    if (isAuthUserAlreadyRegisteredError(authError?.message)) {
      throw new Error("La cédula o correo ya tiene una cuenta registrada.");
    }

    throw new Error("No se pudo crear el usuario alumno.");
  }

  const userId = authData.user.id;
  const { error: perfilError } = await supabaseAdmin.from("perfiles").upsert(
    {
      id: userId,
      escuela_id: input.schoolId,
      sede_id: input.sedeId,
      nombre: input.nombreCompleto,
      email: authEmail,
      rol: "alumno",
      cedula: input.dni,
      activo: true,
    },
    { onConflict: "id" }
  );

  if (perfilError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new Error("No se pudo guardar el perfil del usuario.");
  }

  return {
    userId,
    cleanup: async () => {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);
    },
  };
}

async function loadExistingAlumno(alumnoId: string) {
  const pool = getServerDbPool();
  const alumnoRes = await pool.query<ExistingAlumnoRow>(
    `
      select id, user_id, escuela_id, sede_id, numero_contrato, tipo_permiso, categorias, valor_total, fecha_inscripcion, estado, tipo_registro
      from public.alumnos
      where id = $1
      limit 1
    `,
    [alumnoId]
  );

  const alumno = alumnoRes.rows[0] ?? null;
  if (!alumno) return null;

  const matriculasRes = await pool.query<ExistingMatriculaRow>(
    `
      select id, notas, numero_contrato, tiene_tramitador, tramitador_valor
      from public.matriculas_alumno
      where alumno_id = $1
      order by created_at desc
    `,
    [alumnoId]
  );

  return {
    alumno,
    matriculas: matriculasRes.rows,
  };
}

async function handleMutation(request: Request, mode: "create" | "update") {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody(request, manageAlumnoSchema);
  if (!parsed.ok) return parsed.response;

  const payload = parsed.data;
  const dni = normalizeCedula(payload.dni);
  const email = normalizeEmail(payload.email ?? null);

  if (!dni) {
    return NextResponse.json({ error: "La cédula del alumno es inválida." }, { status: 400 });
  }

  const isAptitud = payload.tipo_registro === "aptitud_conductor";
  const isPractice = payload.tipo_registro === "practica_adicional";
  if (!isPractice && payload.categorias.length === 0) {
    return NextResponse.json(
      {
        error: isAptitud
          ? "Debes seleccionar la categoría evaluada."
          : "Debes seleccionar al menos una categoría de curso.",
      },
      { status: 400 }
    );
  }

  if (mode === "update" && !payload.alumno_id) {
    return NextResponse.json({ error: "Debes indicar el alumno a actualizar." }, { status: 400 });
  }

  if (mode === "create" && payload.alumno_id) {
    return NextResponse.json(
      { error: "La creación no debe incluir un alumno existente." },
      { status: 400 }
    );
  }

  const existing = payload.alumno_id ? await loadExistingAlumno(payload.alumno_id) : null;
  if (payload.alumno_id && !existing) {
    return NextResponse.json({ error: "El alumno ya no existe." }, { status: 404 });
  }

  const schoolId = existing?.alumno.escuela_id ?? authz.perfil.escuela_id;
  if (!schoolId) {
    return NextResponse.json(
      { error: "Tu usuario no tiene una escuela asignada." },
      { status: 400 }
    );
  }

  const schoolScopeError = ensureSchoolScope(authz.perfil, schoolId);
  if (schoolScopeError) {
    return NextResponse.json({ error: schoolScopeError }, { status: 403 });
  }

  if (existing) {
    const currentSedeScopeError = ensureSedeScope(authz.perfil, existing.alumno.sede_id);
    if (currentSedeScopeError) {
      return NextResponse.json({ error: currentSedeScopeError }, { status: 403 });
    }
  }

  const nextSedeScopeError = ensureSedeScope(authz.perfil, payload.sede_id);
  if (nextSedeScopeError) {
    return NextResponse.json({ error: nextSedeScopeError }, { status: 403 });
  }

  const validSede = await ensureSedeBelongsToSchool(schoolId, payload.sede_id);
  if (!validSede) {
    return NextResponse.json(
      { error: "La sede no pertenece a la escuela del alumno." },
      { status: 400 }
    );
  }

  if (
    mode === "create" &&
    payload.abono > 0 &&
    payload.valor_total &&
    payload.abono > payload.valor_total
  ) {
    return NextResponse.json(
      {
        error: isAptitud
          ? "El pago inicial no puede ser mayor al valor del servicio."
          : "El abono no puede ser mayor al valor total del curso.",
      },
      { status: 400 }
    );
  }

  const gestionaMatricula =
    !isAptitud && !isPractice && (!existing || existing.matriculas.length <= 1);
  const editingMatricula =
    existing && existing.matriculas.length === 1 ? existing.matriculas[0] : null;
  const categoriaPrincipal = isAptitud ? payload.categorias.slice(0, 1) : [];
  const hoy = getToday();

  let createdAuthUser: Awaited<ReturnType<typeof provisionAlumnoAuthUser>> | null = null;
  let alumnoUserId = existing?.alumno.user_id ?? authz.perfil.id;

  try {
    const isPreRegistrado = payload.estado === "pre_registrado";
    const wasPreRegistrado = existing?.alumno.estado === "pre_registrado";
    const needsAuthUser = !isAptitud && !isPractice && !isPreRegistrado;

    // Create auth user on new regular student (not pre_registrado)
    if (mode === "create" && needsAuthUser) {
      createdAuthUser = await provisionAlumnoAuthUser({
        actor: authz.perfil,
        schoolId,
        sedeId: payload.sede_id,
        nombreCompleto: `${payload.nombre} ${payload.apellidos}`.trim(),
        dni,
        email,
      });
      alumnoUserId = createdAuthUser.userId;
    }

    // When activating a pre_registrado student, create auth user now
    if (
      mode === "update" &&
      wasPreRegistrado &&
      needsAuthUser &&
      existing?.alumno.tipo_registro === "regular"
    ) {
      createdAuthUser = await provisionAlumnoAuthUser({
        actor: authz.perfil,
        schoolId,
        sedeId: payload.sede_id,
        nombreCompleto: `${payload.nombre} ${payload.apellidos}`.trim(),
        dni,
        email,
      });
      alumnoUserId = createdAuthUser.userId;
    }

    const numeroContratoRegular =
      !isAptitud && !isPractice
        ? normalizeContractNumber(payload.numero_contrato ?? "", payload.categorias)
        : null;
    const numeroContratoReferencia = isAptitud
      ? payload.numero_contrato?.trim() ||
        existing?.alumno.numero_contrato ||
        buildAptitudReference()
      : isPractice
        ? payload.numero_contrato?.trim() ||
          existing?.alumno.numero_contrato ||
          buildPracticeReference()
        : (existing?.alumno.numero_contrato ?? null);

    const tipoPermiso =
      gestionaMatricula || isAptitud
        ? mapTipoPermiso(payload.categorias)
        : existing?.alumno.tipo_permiso || "B";
    const categoriasAlumno = isAptitud
      ? categoriaPrincipal
      : isPractice
        ? []
        : (existing?.alumno.categorias ?? []);
    const valorTotalAlumno =
      isAptitud || isPractice
        ? (payload.valor_total ?? null)
        : (existing?.alumno.valor_total ?? null);
    const fechaInscripcionAlumno =
      isAptitud || isPractice
        ? payload.fecha_inscripcion || hoy
        : (existing?.alumno.fecha_inscripcion ?? null);
    const tramitadorValor = payload.tiene_tramitador ? (payload.tramitador_valor ?? null) : null;
    const tramitadorNombre = payload.tiene_tramitador
      ? payload.tramitador_nombre?.trim() || null
      : null;

    const pool = getServerDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      let alumnoId = payload.alumno_id ?? null;

      if (mode === "update" && existing) {
        const updateRes = await client.query<{ id: string }>(
          `
            update public.alumnos
            set
              user_id = $2,
              sede_id = $3,
              tipo_registro = $4,
              numero_contrato = $5,
              nombre = $6,
              apellidos = $7,
              dni = $8,
              email = $9,
              telefono = $10,
              direccion = $11,
              tipo_permiso = $12,
              categorias = $13,
              estado = $14,
              notas = $15,
              valor_total = $16,
              fecha_inscripcion = $17,
              empresa_convenio = $18,
              nota_examen_teorico = $19,
              fecha_examen_teorico = $20,
              nota_examen_practico = $21,
              fecha_examen_practico = $22,
              tiene_tramitador = false,
              tramitador_nombre = null,
              tramitador_valor = null
            where id = $1
            returning id
          `,
          [
            existing.alumno.id,
            alumnoUserId,
            payload.sede_id,
            payload.tipo_registro,
            numeroContratoReferencia,
            payload.nombre,
            payload.apellidos,
            dni,
            email,
            payload.telefono.trim(),
            payload.direccion?.trim() || null,
            tipoPermiso,
            categoriasAlumno,
            payload.estado,
            payload.notas?.trim() || null,
            valorTotalAlumno,
            fechaInscripcionAlumno,
            isAptitud
              ? payload.empresa_convenio?.trim() || null
              : isPractice
                ? payload.empresa_convenio?.trim() || "Práctica adicional"
                : null,
            isAptitud ? (payload.nota_examen_teorico ?? null) : null,
            isAptitud ? (payload.fecha_examen_teorico ?? null) : null,
            isAptitud ? (payload.nota_examen_practico ?? null) : null,
            isAptitud ? (payload.fecha_examen_practico ?? null) : null,
          ]
        );
        alumnoId = updateRes.rows[0]?.id ?? null;
      } else {
        const insertRes = await client.query<{ id: string }>(
          `
            insert into public.alumnos (
              user_id,
              escuela_id,
              sede_id,
              tipo_registro,
              numero_contrato,
              nombre,
              apellidos,
              dni,
              email,
              telefono,
              fecha_nacimiento,
              direccion,
              tipo_permiso,
              categorias,
              estado,
              notas,
              valor_total,
              fecha_inscripcion,
              empresa_convenio,
              nota_examen_teorico,
              fecha_examen_teorico,
              nota_examen_practico,
              fecha_examen_practico,
              tiene_tramitador,
              tramitador_nombre,
              tramitador_valor
            )
            values (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              null, $11, $12, $13, $14, $15, $16, $17, $18, $19,
              $20, $21, $22, false, null, null
            )
            returning id
          `,
          [
            alumnoUserId,
            schoolId,
            payload.sede_id,
            payload.tipo_registro,
            numeroContratoReferencia,
            payload.nombre,
            payload.apellidos,
            dni,
            email,
            payload.telefono.trim(),
            payload.direccion?.trim() || null,
            tipoPermiso,
            categoriasAlumno,
            payload.estado,
            payload.notas?.trim() || null,
            valorTotalAlumno,
            fechaInscripcionAlumno,
            isAptitud
              ? payload.empresa_convenio?.trim() || null
              : isPractice
                ? payload.empresa_convenio?.trim() || "Práctica adicional"
                : null,
            isAptitud ? (payload.nota_examen_teorico ?? null) : null,
            isAptitud ? (payload.fecha_examen_teorico ?? null) : null,
            isAptitud ? (payload.nota_examen_practico ?? null) : null,
            isAptitud ? (payload.fecha_examen_practico ?? null) : null,
          ]
        );
        alumnoId = insertRes.rows[0]?.id ?? null;
      }

      if (!alumnoId) {
        throw new Error("No se pudo guardar el alumno.");
      }

      let matriculaId: string | null = null;
      if (gestionaMatricula) {
        if (editingMatricula) {
          await client.query(
            `
              update public.matriculas_alumno
              set
                sede_id = $2,
                numero_contrato = $3,
                categorias = $4,
                valor_total = $5,
                fecha_inscripcion = $6,
                estado = 'activo',
                notas = $7,
                tiene_tramitador = $8,
                tramitador_nombre = $9,
                tramitador_valor = $10
              where id = $1
            `,
            [
              editingMatricula.id,
              payload.sede_id,
              numeroContratoRegular,
              payload.categorias,
              payload.valor_total ?? null,
              payload.fecha_inscripcion || hoy,
              editingMatricula.notas,
              payload.tiene_tramitador,
              tramitadorNombre,
              tramitadorValor,
            ]
          );
          matriculaId = editingMatricula.id;

          if (payload.tiene_tramitador && (payload.tramitador_valor ?? 0) > 0) {
            const originalValor = toNumber(editingMatricula.tramitador_valor);
            const esPrimeraVez = !editingMatricula.tiene_tramitador;
            const montoGasto = esPrimeraVez
              ? (payload.tramitador_valor ?? 0)
              : (payload.tramitador_valor ?? 0) - originalValor;

            if (montoGasto > 0) {
              await client.query(
                `
                  insert into public.gastos (
                    escuela_id, sede_id, user_id, categoria, concepto, monto, metodo_pago, proveedor, fecha, recurrente, notas
                  )
                  values ($1, $2, $3, 'tramitador', $4, $5, 'transferencia', $6, $7, false, $8)
                `,
                [
                  schoolId,
                  payload.sede_id,
                  authz.perfil.id,
                  `Tramitador — ${payload.nombre} ${payload.apellidos}`,
                  montoGasto,
                  tramitadorNombre,
                  hoy,
                  `Tramitador asignado al alumno ${payload.nombre} ${payload.apellidos}`,
                ]
              );
            }
          }
        } else {
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
              schoolId,
              payload.sede_id,
              alumnoId,
              authz.perfil.id,
              numeroContratoRegular,
              payload.categorias,
              payload.valor_total ?? null,
              payload.fecha_inscripcion || hoy,
              null,
              payload.tiene_tramitador,
              tramitadorNombre,
              tramitadorValor,
            ]
          );
          matriculaId = matriculaRes.rows[0]?.id ?? null;

          if (payload.tiene_tramitador && (payload.tramitador_valor ?? 0) > 0) {
            await client.query(
              `
                insert into public.gastos (
                  escuela_id, sede_id, user_id, categoria, concepto, monto, metodo_pago, proveedor, fecha, recurrente, notas
                )
                values ($1, $2, $3, 'tramitador', $4, $5, 'transferencia', $6, $7, false, $8)
              `,
              [
                schoolId,
                payload.sede_id,
                authz.perfil.id,
                `Tramitador — ${payload.nombre} ${payload.apellidos}`,
                payload.tramitador_valor ?? 0,
                tramitadorNombre,
                hoy,
                `Tramitador asignado al alumno ${payload.nombre} ${payload.apellidos}`,
              ]
            );
          }
        }
      }

      if (mode === "create" && payload.abono > 0) {
        const categoriaIngreso: TipoRegistroAlumno = payload.tipo_registro;
        const concepto =
          categoriaIngreso === "aptitud_conductor"
            ? `Examen de aptitud — ${payload.nombre} ${payload.apellidos}`
            : categoriaIngreso === "practica_adicional"
              ? `Práctica adicional — ${payload.nombre} ${payload.apellidos}`
              : `Matrícula — ${payload.nombre} ${payload.apellidos}`;
        const categoria =
          categoriaIngreso === "aptitud_conductor"
            ? "examen_aptitud"
            : categoriaIngreso === "practica_adicional"
              ? "clase_suelta"
              : "matricula";

        await client.query(
          `
            insert into public.ingresos (
              escuela_id, sede_id, user_id, alumno_id, matricula_id, categoria, concepto, monto, metodo_pago, fecha, estado, notas
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'cobrado', null)
          `,
          [
            schoolId,
            payload.sede_id,
            authz.perfil.id,
            alumnoId,
            matriculaId,
            categoria,
            concepto,
            payload.abono,
            payload.metodo_pago_abono as MetodoPago,
            hoy,
          ]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ ok: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (createdAuthUser) {
      await createdAuthUser.cleanup();
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar el alumno." },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  return handleMutation(request, "create");
}

export async function PUT(request: Request) {
  return handleMutation(request, "update");
}
