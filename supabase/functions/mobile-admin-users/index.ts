import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error("Faltan variables de entorno de Supabase para mobile-admin-users.");
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type ActorProfile = {
  id: string;
  rol: string;
  escuela_id: string | null;
  sede_id: string | null;
  nombre: string;
  email: string;
  activo: boolean | null;
  cedula?: string | null;
};

type BodyPayload = {
  action?: string;
  command_id?: string;
  payload?: Record<string, unknown>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function fail(message: string, status = 400) {
  return json({ error: message }, status);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value: unknown) {
  const normalized = asString(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeEmail(value: unknown) {
  const normalized = asString(value).toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCedula(value: unknown) {
  return asString(value).replace(/\s+/g, "");
}

function validatePassword(password: string) {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (!/[A-Z]/.test(password)) {
    return "La contraseña debe incluir al menos una mayúscula.";
  }
  if (!/[0-9]/.test(password)) {
    return "La contraseña debe incluir al menos un número.";
  }
  return null;
}

function authAlreadyRegistered(message: string | undefined) {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("user already registered") ||
    normalized.includes("already exists")
  );
}

function ensureRole(actor: ActorProfile | null, allowedRoles: string[]) {
  if (!actor) {
    throw new Error("Debes iniciar sesión para ejecutar esta acción.");
  }
  if (!actor.activo) {
    throw new Error("Tu usuario está inactivo.");
  }
  if (!allowedRoles.includes(actor.rol)) {
    throw new Error("No tienes permisos para ejecutar esta acción.");
  }
}

async function ensureScope(actor: ActorProfile, schoolId: string | null, sedeId?: string | null) {
  if (!schoolId) {
    throw new Error("Debes indicar una escuela valida.");
  }
  if (actor.rol !== "super_admin" && actor.escuela_id !== schoolId) {
    throw new Error("No puedes operar sobre otra escuela.");
  }
  if (
    !["super_admin", "admin_escuela"].includes(actor.rol) &&
    (!sedeId || actor.sede_id !== sedeId)
  ) {
    throw new Error("No puedes operar sobre otra sede.");
  }

  const { data: school, error: schoolError } = await adminClient
    .from("escuelas")
    .select("id")
    .eq("id", schoolId)
    .maybeSingle();
  if (schoolError || !school) throw new Error("No se pudo validar la escuela.");
  if (sedeId) {
    const { data: branch, error: branchError } = await adminClient
      .from("sedes")
      .select("id, escuela_id")
      .eq("id", sedeId)
      .maybeSingle();
    if (branchError || !branch || branch.escuela_id !== schoolId) {
      throw new Error("La sede no pertenece a la escuela.");
    }
  }
}

async function getActor(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return null;
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    throw new Error("No se pudo validar la sesión móvil.");
  }

  if (user.app_metadata?.debe_cambiar_password === true) {
    throw new Error("Cambia tu contraseña en ConduSoft web antes de continuar.");
  }

  const { data: profile, error: profileError } = await adminClient
    .from("perfiles")
    .select("id, rol, escuela_id, sede_id, nombre, email, activo, cedula")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("No se encontró el perfil del usuario autenticado.");
  }

  return profile as ActorProfile;
}

const studentRoles = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "secretaria",
  "recepcion",
];
const instructorRoles = studentRoles.filter((role) => role !== "recepcion");
const staffRoles = ["super_admin", "admin_escuela", "admin_sede"];
const studentColumns =
  "id, escuela_id, sede_id, user_id, nombre, apellidos, dni, telefono, email, estado, fecha_inscripcion";
const instructorColumns =
  "id, escuela_id, sede_id, user_id, nombre, apellidos, dni, telefono, email, licencia, especialidad, estado";
const staffColumns = "id, rol, escuela_id, sede_id, nombre, email, activo, cedula";
const pendingResult = { _mobile_status: "processing" };

type CreatedResult = { entity_type: string; row: Record<string, unknown> };
type CreateSpec = { type: string; entity: string; table: string; columns: string; roles: string[] };
const createSpecs: Record<string, CreateSpec> = {
  create_student: {
    type: "students.create",
    entity: "students",
    table: "alumnos",
    columns: studentColumns,
    roles: studentRoles,
  },
  create_instructor: {
    type: "instructors.create",
    entity: "instructors",
    table: "instructores",
    columns: instructorColumns,
    roles: instructorRoles,
  },
  create_staff_user: {
    type: "staff.create",
    entity: "staff",
    table: "perfiles",
    columns: staffColumns,
    roles: staffRoles,
  },
  create_admin_escuela: {
    type: "admin_escuela.create",
    entity: "staff",
    table: "perfiles",
    columns: staffColumns,
    roles: ["super_admin"],
  },
};

class PendingCommandError extends Error {}
class CleanupError extends Error {}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

async function payloadFingerprint(payload: unknown): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(serviceRoleKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(canonicalJson(payload))
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function matchesLegacyPayload(stored: unknown, payload: unknown): Promise<boolean> {
  // Read compatibility only: older SHA-256/raw records are upgraded to HMAC after validation.
  if (
    stored &&
    typeof stored === "object" &&
    Object.keys(stored).length === 1 &&
    "_mobile_payload_sha256" in stored &&
    typeof stored._mobile_payload_sha256 === "string"
  ) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(canonicalJson(payload))
    );
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
    return stored._mobile_payload_sha256 === hash;
  }
  return canonicalJson(stored) === canonicalJson(payload);
}

async function validateExistingRow(
  actor: ActorProfile,
  row: Record<string, unknown>,
  escuelaId: string,
  sedeId: string | null,
  identity?: { key: string; value: string; role?: string }
) {
  await ensureScope(actor, asString(row.escuela_id), normalizeText(row.sede_id));
  if (row.escuela_id !== escuelaId || normalizeText(row.sede_id) !== sedeId) {
    throw new Error("El registro existente pertenece a otra escuela o sede.");
  }
  if (
    identity &&
    (row[identity.key] !== identity.value ||
      (identity.role && (row.rol !== identity.role || row.activo !== true)))
  ) {
    throw new Error("El registro existente no corresponde a la identidad solicitada.");
  }
}

async function validateCommandRow(
  actor: ActorProfile,
  spec: CreateSpec,
  payload: Record<string, unknown>,
  row: Record<string, unknown>
) {
  const schoolId = asString(payload.escuela_id) || actor.escuela_id || "";
  const branchId =
    spec.type === "admin_escuela.create"
      ? normalizeText(row.sede_id)
      : asString(payload.sede_id) || actor.sede_id;
  const identity =
    spec.table === "perfiles"
      ? spec.type === "admin_escuela.create"
        ? { key: "email", value: normalizeEmail(payload.email) || "", role: "admin_escuela" }
        : { key: "cedula", value: normalizeCedula(payload.cedula), role: asString(payload.rol) }
      : { key: "dni", value: normalizeCedula(payload.dni) };
  await validateExistingRow(actor, row, schoolId, branchId, identity);
}

async function runCreateCommand(
  actor: ActorProfile,
  commandId: string | undefined,
  spec: CreateSpec,
  payload: Record<string, unknown>,
  work: () => Promise<CreatedResult>
): Promise<CreatedResult> {
  ensureRole(actor, spec.roles);
  if (!commandId) return work();

  // Keyed fingerprint for idempotency only; never persist the payload or the private key.
  const fingerprint = await payloadFingerprint(payload);
  const logPayload = { _mobile_payload_hmac_sha256: fingerprint };

  // A unique insert reserves the command before Auth or domain writes, across isolates.
  const { error: claimError } = await adminClient.from("mobile_command_log").insert({
    command_id: commandId,
    command_type: spec.type,
    actor_id: actor.id,
    entity_id: spec.table === "perfiles" ? null : asString(payload.id) || commandId,
    payload: logPayload,
    result: pendingResult,
  });
  if (claimError && claimError.code !== "23505") throw new Error("No se pudo reservar el comando.");

  async function readCommand() {
    const { data, error } = await adminClient
      .from("mobile_command_log")
      .select("actor_id, command_type, entity_id, payload, result")
      .eq("command_id", commandId)
      .maybeSingle();
    if (error || !data) throw new Error("No se pudo consultar el comando.");
    const hasFingerprint = canonicalJson(data.payload) === canonicalJson(logPayload);
    if (
      data.actor_id !== actor.id ||
      data.command_type !== spec.type ||
      (!hasFingerprint && !(await matchesLegacyPayload(data.payload, payload)))
    ) {
      throw new Error("El identificador del comando ya esta en uso.");
    }
    // Replace legacy payloads/digests only after ownership and content match.
    if (!hasFingerprint) {
      const { data: updated, error: updateError } = await adminClient
        .from("mobile_command_log")
        .update({ payload: logPayload })
        .eq("command_id", commandId)
        .eq("actor_id", actor.id)
        .eq("command_type", spec.type)
        .select("command_id")
        .maybeSingle();
      if (updateError || !updated) throw new Error("No se pudo actualizar la huella del comando.");
    }
    return data;
  }

  async function finish(result: CreatedResult): Promise<CreatedResult> {
    const { data, error } = await adminClient
      .from("mobile_command_log")
      .update({ entity_id: result.row.id, result })
      .eq("command_id", commandId)
      .eq("actor_id", actor.id)
      .eq("command_type", spec.type)
      .eq("result", JSON.stringify(pendingResult))
      .select("command_id")
      .maybeSingle();
    if (error)
      throw new PendingCommandError("El alta esta guardada; reintenta para confirmar el comando.");
    if (!data) {
      const command = await readCommand();
      if (canonicalJson(command.result) !== canonicalJson(result)) {
        throw new PendingCommandError("El comando sigue en proceso. Reintenta en unos instantes.");
      }
    }
    return result;
  }

  if (claimError) {
    const command = await readCommand();
    if (!command.entity_id)
      throw new PendingCommandError("El comando sigue en proceso. Reintenta en unos instantes.");
    const { data: row, error } = await adminClient
      .from(spec.table)
      .select(spec.columns)
      .eq("id", command.entity_id)
      .maybeSingle()
      .overrideTypes<Record<string, unknown>, { merge: false }>();
    if (error) throw new Error("No se pudo validar el registro del comando.");
    if (!row)
      throw new PendingCommandError(
        "El registro del comando no esta disponible. Reintenta o solicita revision."
      );
    await validateCommandRow(actor, spec, payload, row);
    if (canonicalJson(command.result) === canonicalJson(pendingResult)) {
      // Recover a committed domain row when only the final log write failed.
      return finish({ entity_type: spec.entity, row });
    }
    const result = command.result as CreatedResult;
    if (result.entity_type !== spec.entity || !result.row || result.row.id !== command.entity_id) {
      throw new Error("El resultado del comando no es valido.");
    }
    await validateCommandRow(actor, spec, payload, result.row);
    return result;
  }

  let result: CreatedResult;
  try {
    result = await work();
  } catch (error) {
    if (!(error instanceof CleanupError)) {
      const { error: releaseError } = await adminClient
        .from("mobile_command_log")
        .delete()
        .eq("command_id", commandId)
        .eq("actor_id", actor.id)
        .eq("command_type", spec.type)
        .eq("result", JSON.stringify(pendingResult));
      if (releaseError)
        throw new PendingCommandError("No se pudo liberar el comando fallido. Solicita revision.");
    }
    throw error;
  }
  // Keep the created account/row if confirming the log fails. Never delete a successful high-level operation.
  return finish(result);
}

async function trackProfileCommand(commandId: string | undefined, userId: string) {
  if (!commandId) return;
  const { data, error } = await adminClient
    .from("mobile_command_log")
    .update({ entity_id: userId })
    .eq("command_id", commandId)
    .eq("result", JSON.stringify(pendingResult))
    .select("command_id")
    .maybeSingle();
  if (error || !data) throw new Error("No se pudo vincular el usuario al comando.");
}

async function cleanupCreatedUser(userId: string) {
  try {
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (!error) return;
  } catch {
    /* Preserve the command reservation when cleanup cannot be confirmed. */
  }
  throw new CleanupError(
    "No se pudo revertir el usuario incompleto. Solicita revision del comando."
  );
}

async function validateReusableProfile(
  actor: ActorProfile,
  profile: Record<string, unknown>,
  role: string,
  escuelaId: string,
  sedeId: string,
  providedEmail: string | null,
  table?: string
) {
  await validateExistingRow(actor, profile, escuelaId, sedeId);
  if (profile.rol !== role || profile.activo !== true) {
    throw new Error("La cuenta existente tiene otro rol o esta inactiva.");
  }
  if (providedEmail && normalizeEmail(profile.email) !== providedEmail) {
    throw new Error("El correo no coincide con la cuenta existente.");
  }
  if (table) {
    const { data, error } = await adminClient
      .from(table)
      .select("id")
      .eq("user_id", profile.id)
      .limit(1);
    if (error) throw new Error("No se pudo validar la vinculacion de la cuenta.");
    if (data?.length) throw new Error("La cuenta ya esta vinculada a otro registro.");
  }
}

async function createAuthUser(input: {
  email: string;
  password: string;
  nombre: string;
  rol: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      nombre: input.nombre,
      rol: input.rol,
      ...input.metadata,
    },
  });

  if (error || !data.user?.id) {
    if (authAlreadyRegistered(error?.message)) {
      throw new Error("La cédula o correo ya tiene una cuenta registrada.");
    }
    throw new Error("No se pudo crear el usuario de acceso.");
  }

  return data.user.id;
}

async function createStudent(
  actor: ActorProfile,
  commandId: string | undefined,
  payload: Record<string, unknown>
) {
  ensureRole(actor, studentRoles);

  const nombre = asString(payload.nombre);
  const apellidos = asString(payload.apellidos);
  const dni = normalizeCedula(payload.dni);
  const telefono = asString(payload.telefono);
  const providedEmail = normalizeEmail(payload.email);
  // Legacy offline registrations are pre-registrations; the web creates the validated enrollment.
  const estado = "pre_registrado";
  const escuelaId = asString(payload.escuela_id) || actor.escuela_id || "";
  const sedeId = asString(payload.sede_id) || actor.sede_id || "";
  const entityId = asString(payload.id) || commandId || crypto.randomUUID();

  if (!nombre || !apellidos || !dni || !telefono || !escuelaId || !sedeId) {
    throw new Error("Nombre, apellidos, cédula, teléfono, escuela y sede son obligatorios.");
  }

  await ensureScope(actor, escuelaId, sedeId);

  const { data: existingStudent, error: existingStudentError } = await adminClient
    .from("alumnos")
    .select(
      "id, escuela_id, sede_id, user_id, nombre, apellidos, dni, telefono, email, estado, fecha_inscripcion"
    )
    .eq("id", entityId)
    .maybeSingle();

  if (existingStudentError) throw new Error("No se pudo consultar el alumno existente.");
  if (existingStudent) {
    await validateExistingRow(actor, existingStudent, escuelaId, sedeId, {
      key: "dni",
      value: dni,
    });
    const result = {
      entity_type: "students",
      row: existingStudent,
    };
    return result;
  }

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from("perfiles")
    .select(staffColumns)
    .eq("cedula", dni)
    .maybeSingle();

  if (existingProfileError) throw new Error("No se pudo consultar la cuenta existente.");
  if (existingProfile) {
    await validateReusableProfile(
      actor,
      existingProfile,
      "alumno",
      escuelaId,
      sedeId,
      providedEmail,
      "alumnos"
    );
  }

  let userId = existingProfile?.id ?? null;
  let createdUserId: string | null = null;

  try {
    if (!userId) {
      const authEmail = providedEmail ?? `${dni}@alumno.local`;
      userId = await createAuthUser({
        email: authEmail,
        password: dni,
        nombre: `${nombre} ${apellidos}`.trim(),
        rol: "alumno",
        metadata: {
          debe_cambiar_password: true,
          debe_completar_perfil: true,
        },
      });
      createdUserId = userId;
    }

    const authEmail = providedEmail ?? existingProfile?.email ?? `${dni}@alumno.local`;

    if (!existingProfile) {
      const { error: profileError } = await adminClient.from("perfiles").insert({
        id: userId,
        escuela_id: escuelaId,
        sede_id: sedeId,
        nombre: `${nombre} ${apellidos}`.trim(),
        email: authEmail,
        rol: "alumno",
        cedula: dni,
        activo: true,
      });

      if (profileError) {
        throw new Error("No se pudo guardar el perfil del alumno.");
      }
    }

    const { data: row, error: studentError } = await adminClient
      .from("alumnos")
      .insert({
        id: entityId,
        escuela_id: escuelaId,
        sede_id: sedeId,
        user_id: userId,
        tipo_registro: "regular",
        nombre,
        apellidos,
        dni,
        email: providedEmail,
        telefono,
        tipo_permiso: asString(payload.tipo_permiso) || "B",
        categorias: Array.isArray(payload.categorias) ? payload.categorias : [],
        estado,
        notas: normalizeText(payload.notas),
      })
      .select(
        "id, escuela_id, sede_id, user_id, nombre, apellidos, dni, telefono, email, estado, fecha_inscripcion"
      )
      .single();

    if (studentError || !row) {
      throw new Error("No se pudo crear el alumno.");
    }

    const result = {
      entity_type: "students",
      row,
    };

    return result;
  } catch (error) {
    if (createdUserId) {
      await cleanupCreatedUser(createdUserId);
    }
    throw error;
  }
}

async function createInstructor(
  actor: ActorProfile,
  commandId: string | undefined,
  payload: Record<string, unknown>
) {
  ensureRole(actor, instructorRoles);

  const nombre = asString(payload.nombre);
  const apellidos = asString(payload.apellidos);
  const dni = normalizeCedula(payload.dni);
  const telefono = asString(payload.telefono);
  const providedEmail = normalizeEmail(payload.email);
  const licencia = asString(payload.licencia);
  const especialidad = asString(payload.especialidad) || "B";
  const estado = asString(payload.estado) || "activo";
  const escuelaId = asString(payload.escuela_id) || actor.escuela_id || "";
  const sedeId = asString(payload.sede_id) || actor.sede_id || "";
  const entityId = asString(payload.id) || commandId || crypto.randomUUID();

  if (!nombre || !apellidos || !dni || !telefono || !licencia || !escuelaId || !sedeId) {
    throw new Error("Faltan datos obligatorios para crear el instructor.");
  }

  await ensureScope(actor, escuelaId, sedeId);

  const { data: existingRow, error: existingRowError } = await adminClient
    .from("instructores")
    .select(
      "id, escuela_id, sede_id, user_id, nombre, apellidos, dni, telefono, email, licencia, especialidad, estado"
    )
    .eq("id", entityId)
    .maybeSingle();

  if (existingRowError) throw new Error("No se pudo consultar el instructor existente.");
  if (existingRow) {
    await validateExistingRow(actor, existingRow, escuelaId, sedeId, { key: "dni", value: dni });
    const result = { entity_type: "instructors", row: existingRow };
    return result;
  }

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from("perfiles")
    .select(staffColumns)
    .eq("cedula", dni)
    .maybeSingle();

  if (existingProfileError) throw new Error("No se pudo consultar la cuenta existente.");
  if (existingProfile) {
    await validateReusableProfile(
      actor,
      existingProfile,
      "instructor",
      escuelaId,
      sedeId,
      providedEmail,
      "instructores"
    );
  }

  let userId = existingProfile?.id ?? null;
  let createdUserId: string | null = null;

  try {
    if (!userId) {
      const authEmail = providedEmail ?? `${dni}@instructor.local`;
      userId = await createAuthUser({
        email: authEmail,
        password: dni,
        nombre: `${nombre} ${apellidos}`.trim(),
        rol: "instructor",
        metadata: {
          debe_cambiar_password: true,
        },
      });
      createdUserId = userId;
    }

    const authEmail = providedEmail ?? existingProfile?.email ?? `${dni}@instructor.local`;

    if (!existingProfile) {
      const { error: profileError } = await adminClient.from("perfiles").insert({
        id: userId,
        escuela_id: escuelaId,
        sede_id: sedeId,
        nombre: `${nombre} ${apellidos}`.trim(),
        email: authEmail,
        rol: "instructor",
        cedula: dni,
        activo: true,
      });

      if (profileError) {
        throw new Error("No se pudo guardar el perfil del instructor.");
      }
    }

    const { data: row, error: instructorError } = await adminClient
      .from("instructores")
      .insert({
        id: entityId,
        escuela_id: escuelaId,
        sede_id: sedeId,
        user_id: userId,
        nombre,
        apellidos,
        dni,
        email: providedEmail,
        telefono,
        licencia,
        especialidad,
        estado,
      })
      .select(
        "id, escuela_id, sede_id, user_id, nombre, apellidos, dni, telefono, email, licencia, especialidad, estado"
      )
      .single();

    if (instructorError || !row) {
      throw new Error("No se pudo crear el instructor.");
    }

    const result = { entity_type: "instructors", row };
    return result;
  } catch (error) {
    if (createdUserId) {
      await cleanupCreatedUser(createdUserId);
    }
    throw error;
  }
}

async function createStaffUser(
  actor: ActorProfile,
  commandId: string | undefined,
  payload: Record<string, unknown>
) {
  ensureRole(actor, staffRoles);

  const rol = asString(payload.rol);
  if (!["administrativo", "recepcion", "admin_sede"].includes(rol)) {
    throw new Error("Rol no soportado para la creación móvil de personal.");
  }

  const nombre = asString(payload.nombre);
  const cedula = normalizeCedula(payload.cedula);
  const providedEmail = normalizeEmail(payload.email);
  const escuelaId = asString(payload.escuela_id) || actor.escuela_id || "";
  const sedeId = asString(payload.sede_id) || actor.sede_id || "";
  const entityId = asString(payload.id) || commandId || crypto.randomUUID();
  const password = asString(payload.password) || cedula;

  if (!nombre || !cedula || !escuelaId || !sedeId) {
    throw new Error("Nombre, cédula, escuela y sede son obligatorios.");
  }

  await ensureScope(actor, escuelaId, sedeId);

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from("perfiles")
    .select(staffColumns)
    .eq("id", entityId)
    .maybeSingle();

  if (existingProfileError) throw new Error("No se pudo consultar el personal existente.");
  if (existingProfile) {
    await validateExistingRow(actor, existingProfile, escuelaId, sedeId, {
      key: "cedula",
      value: cedula,
      role: rol,
    });
    await validateReusableProfile(actor, existingProfile, rol, escuelaId, sedeId, providedEmail);
    await trackProfileCommand(commandId, existingProfile.id);
    const result = { entity_type: "staff", row: existingProfile };
    return result;
  }

  const { data: cedulaProfile, error: cedulaProfileError } = await adminClient
    .from("perfiles")
    .select(staffColumns)
    .eq("cedula", cedula)
    .maybeSingle();

  if (cedulaProfileError) throw new Error("No se pudo consultar la cuenta del personal.");
  if (cedulaProfile) {
    await validateReusableProfile(actor, cedulaProfile, rol, escuelaId, sedeId, providedEmail);
    await trackProfileCommand(commandId, cedulaProfile.id);
    return { entity_type: "staff", row: cedulaProfile };
  }

  let createdUserId: string | null = null;

  try {
    const authEmail = providedEmail ?? `${cedula}@${rol}.local`;
    const userId = await createAuthUser({
      email: authEmail,
      password,
      nombre,
      rol,
      metadata: { debe_cambiar_password: true },
    });
    createdUserId = userId;

    const row = {
      id: userId,
      escuela_id: escuelaId,
      sede_id: sedeId,
      nombre,
      email: authEmail,
      rol,
      cedula,
      activo: true,
    };

    await trackProfileCommand(commandId, userId);
    const { error } = await adminClient.from("perfiles").insert(row);
    if (error) {
      throw new Error("No se pudo guardar el perfil del personal.");
    }

    const result = { entity_type: "staff", row };
    return result;
  } catch (error) {
    if (createdUserId) {
      await cleanupCreatedUser(createdUserId);
    }
    throw error;
  }
}

async function createSchoolAdmin(
  actor: ActorProfile,
  commandId: string | undefined,
  payload: Record<string, unknown>
) {
  ensureRole(actor, ["super_admin"]);

  const escuelaId = asString(payload.escuela_id);
  const nombre = asString(payload.nombre);
  const email = normalizeEmail(payload.email);
  const password = asString(payload.password);

  if (!escuelaId || !nombre || !email || !password) {
    throw new Error("Faltan datos para crear el administrador de la escuela.");
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new Error(passwordError);
  }

  await ensureScope(actor, escuelaId);
  const { data: sedePrincipal, error: sedeError } = await adminClient
    .from("sedes")
    .select("id")
    .eq("escuela_id", escuelaId)
    .order("es_principal", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sedeError) throw new Error("No se pudo consultar la sede principal.");
  let createdUserId: string | null = null;

  try {
    createdUserId = await createAuthUser({
      email,
      password,
      nombre,
      rol: "admin_escuela",
    });

    const row = {
      id: createdUserId,
      escuela_id: escuelaId,
      sede_id: sedePrincipal?.id ?? null,
      nombre,
      email,
      rol: "admin_escuela",
      activo: true,
    };

    await trackProfileCommand(commandId, createdUserId);
    const { error } = await adminClient.from("perfiles").insert(row);
    if (error) {
      throw new Error("No se pudo guardar el administrador de la escuela.");
    }

    const result = { entity_type: "staff", row };
    return result;
  } catch (error) {
    if (createdUserId) {
      await cleanupCreatedUser(createdUserId);
    }
    throw error;
  }
}

async function deleteUser(actor: ActorProfile, payload: Record<string, unknown>) {
  ensureRole(actor, ["super_admin", "admin_escuela", "admin_sede"]);

  const userId = asString(payload.user_id);
  if (!userId) {
    throw new Error("Debes indicar el usuario a eliminar.");
  }

  if (userId.toLowerCase() === actor.id.toLowerCase()) {
    throw new Error("No puedes eliminar tu propia cuenta desde el móvil.");
  }

  const { data: target, error: targetError } = await adminClient
    .from("perfiles")
    .select("id, rol, escuela_id, sede_id")
    .eq("id", userId)
    .maybeSingle();

  if (targetError || !target) {
    throw new Error("El usuario ya no existe.");
  }

  if (target.rol === "super_admin" && actor.rol !== "super_admin") {
    throw new Error("No puedes eliminar un super administrador.");
  }

  if (actor.rol === "admin_sede" && target.rol === "admin_escuela") {
    throw new Error("No puedes eliminar un administrador de escuela.");
  }
  if (target.rol !== "super_admin" || actor.rol !== "super_admin") {
    await ensureScope(actor, target.escuela_id, target.sede_id);
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error("No se pudo eliminar el usuario.");
  }

  return { success: true, user_id: userId };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return fail("Método no permitido.", 405);
  }

  try {
    const body = (await request.json()) as BodyPayload;
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      (body.payload !== undefined &&
        (!body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)))
    ) {
      return fail("El cuerpo y el payload deben ser objetos JSON.");
    }
    const action = asString(body.action);
    const payload = body.payload ?? {};
    if (
      body.command_id !== undefined &&
      (typeof body.command_id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.command_id))
    ) {
      return fail("El identificador del comando no es valido.");
    }

    if (!action) {
      return fail("Debes indicar una acción.");
    }

    if (action === "register_school") {
      return fail("El registro público móvil ahora se realiza por /api/public/register.", 410);
    }

    const actor = await getActor(request);
    if (!actor) return fail("Debes iniciar sesion para ejecutar esta accion.", 401);
    if (action === "delete_user") return json(await deleteUser(actor, payload));
    const spec = Object.hasOwn(createSpecs, action) ? createSpecs[action] : null;
    if (!spec) return fail("Acción no soportada.", 404);
    return json(
      await runCreateCommand(actor, body.command_id, spec, payload, async () => {
        switch (action) {
          case "create_student":
            return createStudent(actor, body.command_id, payload);
          case "create_instructor":
            return createInstructor(actor, body.command_id, payload);
          case "create_staff_user":
            return createStaffUser(actor, body.command_id, payload);
          case "create_admin_escuela":
            return createSchoolAdmin(actor, body.command_id, payload);
          default:
            throw new Error("Accion no soportada.");
        }
      })
    );
  } catch (error) {
    console.error("mobile-admin-users error", error);
    return fail(
      error instanceof Error ? error.message : "Error interno del servidor.",
      error instanceof PendingCommandError ? 409 : 400
    );
  }
});
