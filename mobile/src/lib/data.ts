import { startTransition } from "react";
import { supabase } from "./supabase";
import { prepareSignIn } from "./local-auth";
import {
  activateProfile,
  assertAuthScope,
  assertOfflineScope,
  captureAuthScope,
  captureOfflineScope,
  clientForScope,
  isOfflineScopeCurrent,
  profileCacheScope,
  SessionChangedError,
  type AuthScope,
  type OfflineScope,
} from "./session-scope";
import {
  countPendingMutations,
  enqueueMutation,
  getSyncState,
  listPendingMutations,
  readCaleQuestions,
  readEntityRows,
  removeEntityRow,
  replaceEntityRows,
  setSyncState,
  updateMutationStatus,
  upsertCaleQuestions,
  upsertEntityRow,
} from "./offline";
import { getModuleById, canUseMobileModule, canEditMobileModule } from "./modules";
import {
  bogotaToday,
  hoursPeriodBounds,
  summarizeWorkHours,
  formatWorkHours,
  type HoursPeriod,
  type WorkHoursRow,
} from "./hours";
import type {
  DashboardSummary,
  MobileModuleId,
  ModuleListState,
  PendingMutation,
  Perfil,
  SchoolSubscriptionAccess,
} from "./types";

type RpcResult = {
  entity_type?: string;
  row?: Record<string, unknown>;
  [key: string]: unknown;
};

const SUMMARY_CACHE_KEY = "dashboard-summary";
const PROFILE_CACHE_KEY = "my-profile";
const SUBSCRIPTION_ACCESS_CACHE_KEY = "subscription-access";
const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const PUBLIC_SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || "https://condusoft.co").replace(
  /\/+$/,
  ""
);

export function createUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function formatCurrency(value: number | string | null | undefined) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(numeric) ? numeric : 0);
}

export async function signInWithIdentifier(identifier: string, password: string) {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized || !password) {
    throw new Error("Completa correo o cédula y la contraseña.");
  }

  await prepareSignIn();

  if (normalized.includes("@")) {
    const { error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (error) throw error;
    return;
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("El servicio de acceso tardó demasiado. Intenta de nuevo."));
    }, 15_000);
  });
  let result;
  try {
    result = await Promise.race([
      (async () => {
        const response = await fetch(`${PUBLIC_SITE_URL}/api/public/mobile-login`, {
          method: "POST",
          redirect: "error",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cedula: normalized, password }),
        });
        return { response, payload: await response.json().catch(() => null) };
      })(),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
  const { response, payload } = result;
  if (!response.ok)
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "No se pudo iniciar sesión. Intenta de nuevo."
    );
  const session = payload?.session;
  if (
    typeof session?.access_token !== "string" ||
    !session.access_token ||
    typeof session?.refresh_token !== "string" ||
    !session.refresh_token
  )
    throw new Error("No se pudo verificar la sesión. Intenta de nuevo.");
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;
}

export async function registerSchoolAccount(input: {
  nombre: string;
  email: string;
  escuela: string;
  password: string;
}) {
  const response = await fetch(`${PUBLIC_SITE_URL}/api/public/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: input.nombre.trim(),
      email: input.email.trim().toLowerCase(),
      escuela: input.escuela.trim(),
      password: input.password,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      (data as { error?: string } | null)?.error || "No se pudo registrar la cuenta."
    );
  }

  return data;
}

function canUseOfflineCache(error: unknown) {
  if (!error || error instanceof SessionChangedError) return false;
  const value = error as { status?: number; code?: string; message?: string };
  if (
    value.status === 401 ||
    value.status === 403 ||
    ["42501", "PGRST301", "PGRST302", "PGRST303"].includes(value.code ?? "")
  )
    return false;
  return (
    error instanceof TypeError ||
    (value.status ?? 0) >= 500 ||
    /network|fetch|offline|connection|timeout|timed out/i.test(value.message ?? "")
  );
}

const profileLoads = new WeakMap<
  AuthScope,
  Promise<{ profile: Perfil | null; fromCache: boolean }>
>();

async function fetchProfile(owner: AuthScope) {
  const scope = profileCacheScope(owner);
  const client = clientForScope(owner);
  let profile: Perfil | null;
  let fromCache = false;
  try {
    const { data, error } = await client
      .from("perfiles")
      .select("id, escuela_id, sede_id, nombre, email, rol, activo, cedula")
      .eq("id", owner.userId)
      .maybeSingle();
    assertAuthScope(owner);
    if (error) throw error;
    profile = data?.id === owner.userId && data.activo ? (data as Perfil) : null;
    if (profile) await upsertEntityRow(PROFILE_CACHE_KEY, profile, owner.userId, scope);
    else await removeEntityRow(PROFILE_CACHE_KEY, owner.userId, scope);
  } catch (error) {
    assertAuthScope(owner);
    if (!canUseOfflineCache(error)) {
      activateProfile(owner, null);
      await removeEntityRow(PROFILE_CACHE_KEY, owner.userId, scope);
      throw error;
    }
    const cached = await readEntityRows<Perfil>(PROFILE_CACHE_KEY, scope);
    profile =
      cached.find(
        (row) =>
          row.entityId === owner.userId && row.payload.id === owner.userId && row.payload.activo
      )?.payload ?? null;
    fromCache = true;
  }
  assertAuthScope(owner);
  activateProfile(owner, profile);
  return { profile, fromCache };
}

export async function loadMyProfile(options: { requireOnline?: boolean } = {}) {
  const owner = captureAuthScope();
  let load = profileLoads.get(owner);
  if (!load) {
    load = fetchProfile(owner).finally(() => profileLoads.delete(owner));
    profileLoads.set(owner, load);
  }
  const result = await load;
  assertAuthScope(owner);
  if (options.requireOnline && result.fromCache)
    throw new Error("No se pudo verificar el perfil en linea.");
  return result.profile;
}

export async function loadMySubscriptionAccess() {
  const scope = captureOfflineScope();
  const client = clientForScope(scope);
  if (!scope.schoolId) return null;
  try {
    const { data, error } = await client.rpc("my_school_subscription_access");
    assertOfflineScope(scope);
    if (error) throw error;

    const access = data?.school_id === scope.schoolId ? (data as SchoolSubscriptionAccess) : null;
    if (access) {
      await upsertEntityRow(
        SUBSCRIPTION_ACCESS_CACHE_KEY,
        { id: scope.schoolId, ...access },
        scope.schoolId,
        scope
      );
    } else await removeEntityRow(SUBSCRIPTION_ACCESS_CACHE_KEY, scope.schoolId, scope);
    return access;
  } catch (error) {
    assertOfflineScope(scope);
    if (!canUseOfflineCache(error)) throw error;
    const cached = await readEntityRows<SchoolSubscriptionAccess>(
      SUBSCRIPTION_ACCESS_CACHE_KEY,
      scope
    );
    return (
      cached.find(
        (row) => row.entityId === scope.schoolId && row.payload.school_id === scope.schoolId
      )?.payload ?? null
    );
  }
}

export async function loadDashboardSummary(profile: Perfil): Promise<DashboardSummary> {
  const scope = captureOfflineScope();
  if (
    profile.id !== scope.auth.userId ||
    profile.escuela_id !== scope.schoolId ||
    profile.sede_id !== scope.branchId ||
    profile.rol !== scope.role
  )
    throw new SessionChangedError();
  const supabase = clientForScope(scope);
  if (profile.rol === "instructor") {
    const result = await loadWorkHours({ mode: "month", date: bogotaToday() });
    assertOfflineScope(scope);
    const total = summarizeWorkHours(result.rows as WorkHoursRow[]);
    return {
      headline: "Mis horas del mes",
      note: result.fromCache
        ? "Sin conexion: ultimo registro disponible del mes."
        : "Horas de trabajo registradas a tu nombre.",
      stats: [
        { id: "hours", label: "Horas", value: formatWorkHours(total.hours) },
        { id: "days", label: "Dias trabajados", value: String(total.days) },
      ],
      highlights: [],
    };
  }
  try {
    const { data, error } = await supabase.rpc("mobile_dashboard_summary");
    assertOfflineScope(scope);
    if (!error && data) {
      const payload = data as DashboardSummary;
      await upsertEntityRow(SUMMARY_CACHE_KEY, { id: profile.id, ...payload }, profile.id, scope);
      return payload;
    }
    if (error && !canUseOfflineCache(error) && error.code !== "PGRST202") throw error;
  } catch (error) {
    assertOfflineScope(scope);
    if (!canUseOfflineCache(error)) throw error;
  }

  const cached = await readEntityRows<DashboardSummary>(SUMMARY_CACHE_KEY, scope);
  const summary = cached.find((row) => row.entityId === profile.id)?.payload;
  if (summary) return summary;

  if (profile.rol === "super_admin") {
    const [schools, users] = await Promise.all([
      supabase.from("escuelas").select("id", { count: "exact", head: true }),
      supabase.from("perfiles").select("id", { count: "exact", head: true }),
    ]);
    assertOfflineScope(scope);

    return {
      headline: "Control central de la red",
      note: "Android muestra el pulso general y deja los reportes profundos para la web.",
      stats: [
        { id: "schools", label: "Escuelas", value: String(schools.count ?? 0) },
        { id: "users", label: "Usuarios", value: String(users.count ?? 0) },
      ],
      highlights: [
        {
          id: "platform",
          title: "Vista móvil simplificada",
          description: "Escuelas, sedes y analíticas quedan disponibles en lectura rápida.",
        },
      ],
    };
  }

  if (profile.rol === "alumno") {
    const [matriculas, attempts] = await Promise.all([
      supabase.from("matriculas_alumno").select("id", { count: "exact", head: true }),
      supabase.from("examenes").select("id", { count: "exact", head: true }),
    ]);
    assertOfflineScope(scope);
    for (const result of [matriculas, attempts]) if (result.error) throw result.error;

    return {
      headline: "Tu avance al alcance de la mano",
      note: "Puedes practicar CALE aun si te quedas sin señal, siempre que el banco ya esté sincronizado.",
      stats: [
        { id: "matriculas", label: "Matrículas", value: String(matriculas.count ?? 0) },
        { id: "attempts", label: "Intentos CALE", value: String(attempts.count ?? 0) },
      ],
      highlights: [
        {
          id: "offline",
          title: "Práctica offline",
          description: "Descarga el banco activo y responde sin depender de la red.",
        },
      ],
    };
  }

  const [students, incomes, expenses] = await Promise.all([
    supabase.from("alumnos").select("id", { count: "exact", head: true }),
    supabase.from("ingresos").select("monto"),
    supabase.from("gastos").select("monto"),
  ]);
  assertOfflineScope(scope);

  for (const result of [students, incomes, expenses]) if (result.error) throw result.error;

  const totalIncome = (incomes.data ?? []).reduce((sum, row) => sum + Number(row.monto ?? 0), 0);
  const totalExpense = (expenses.data ?? []).reduce((sum, row) => sum + Number(row.monto ?? 0), 0);

  return {
    headline: "Operación diaria lista para móvil",
    note: "Las altas y ediciones del día se pueden encolar sin conexión y sincronizar luego.",
    stats: [
      { id: "students", label: "Alumnos", value: String(students.count ?? 0) },
      { id: "income", label: "Ingresos", value: formatCurrency(totalIncome), tone: "success" },
      { id: "expense", label: "Gastos", value: formatCurrency(totalExpense), tone: "warning" },
    ],
    highlights: [
      {
        id: "offline",
        title: "Cola offline activa",
        description: "Clases, ingresos, gastos y CALE pueden esperar sincronización.",
      },
      {
        id: "exports",
        title: "Exportaciones fuera del móvil",
        description: "La app excluye impresión de contratos y descargas pesadas en esta fase.",
      },
    ],
  };
}

const pendingModuleLoads = new WeakMap<
  OfflineScope,
  Map<string, Promise<ModuleListState<unknown>>>
>();

function queryAndCache<T>(
  entityType: string,
  fetcher: () => Promise<T[]>,
  scope: OfflineScope
): Promise<ModuleListState<T>> {
  assertOfflineScope(scope);
  let loads = pendingModuleLoads.get(scope);
  if (!loads) {
    loads = new Map();
    pendingModuleLoads.set(scope, loads);
  }
  const pending = loads.get(entityType);
  if (pending) return pending as Promise<ModuleListState<T>>;
  // Share only in-flight reads of this exact account, role, branch and period.
  const load = fetchAndCache(entityType, fetcher, scope).finally(() => {
    if (loads.get(entityType) === load) loads.delete(entityType);
  });
  loads.set(entityType, load);
  return load;
}

async function fetchAndCache<T>(
  entityType: string,
  fetcher: () => Promise<T[]>,
  scope: OfflineScope
): Promise<ModuleListState<T>> {
  try {
    const rows = await fetcher();
    assertOfflineScope(scope);
    await replaceEntityRows(entityType, rows as Array<{ id?: string | null }>, scope);
    return {
      rows: await overlayPendingRows(entityType, rows, scope),
      fromCache: false,
      online: true,
    };
  } catch (error) {
    assertOfflineScope(scope);
    if (!canUseOfflineCache(error)) throw error;
    const cached = await readEntityRows<T>(entityType, scope);
    const rows = await overlayPendingRows(
      entityType,
      cached.map((row) => row.payload),
      scope
    );
    if (rows.length > 0) {
      return {
        rows,
        fromCache: true,
        online: false,
      };
    }
    throw error;
  }
}

async function overlayPendingRows<T>(
  entityType: string,
  rows: T[],
  scope: OfflineScope
): Promise<T[]> {
  const pending = await listPendingMutations(["pending", "failed", "syncing"], scope);
  const byId = new Map(rows.map((row) => [String((row as { id?: string }).id), row]));
  for (const mutation of pending) {
    if (mutation.type.split(".")[0] !== entityType) continue;
    byId.set(mutation.entityId, {
      ...byId.get(mutation.entityId),
      ...mutation.payload,
      id: mutation.entityId,
      _pending: true,
    } as T);
  }
  return [...byId.values()];
}

export async function loadWorkHours(period: HoursPeriod): Promise<ModuleListState<WorkHoursRow>> {
  const { from, until } = hoursPeriodBounds(period);
  const scope = captureOfflineScope();
  if (
    !["instructor", "admin_escuela", "admin_sede", "administrativo"].includes(scope.role ?? "") ||
    !scope.schoolId
  )
    throw new Error("Tu cuenta no tiene acceso a Horas.");
  if (scope.role !== "admin_escuela" && !scope.branchId)
    throw new Error("Falta la sede de tu cuenta. Contacta a la escuela.");
  const client = clientForScope(scope);
  // Distinct from the obsolete classes snapshot and isolated by account/period.
  return queryAndCache(
    `work-hours:v1:${from}:${until}`,
    async () => {
      let instructorIds: string[] | null = null;
      if (scope.role === "instructor") {
        const { data, error } = await client
          .from("instructores")
          .select("id")
          .eq("user_id", scope.auth.userId)
          .eq("escuela_id", scope.schoolId);
        if (error) throw error;
        assertOfflineScope(scope);
        instructorIds = (data ?? []).map((row) => String(row.id));
        if (!instructorIds.length)
          throw new Error("Tu cuenta no esta vinculada a un instructor. Contacta a la escuela.");
      }
      const rows: WorkHoursRow[] = [];
      const size = 500;
      for (let offset = 0; ; offset += size) {
        let query = client
          .from("horas_trabajo")
          .select("id,fecha,horas,instructor_id,escuela_id,sede_id")
          .eq("escuela_id", scope.schoolId)
          .gte("fecha", from)
          .lt("fecha", until)
          .order("fecha", { ascending: false })
          .order("id", { ascending: true });
        if (scope.role === "instructor") query = query.in("instructor_id", instructorIds!);
        else if (scope.role !== "admin_escuela") query = query.eq("sede_id", scope.branchId);
        const { data, error } = await query.range(offset, offset + size - 1);
        if (error) throw error;
        assertOfflineScope(scope);
        const page = (data ?? []) as WorkHoursRow[];
        rows.push(...page);
        if (page.length < size) break;
      }
      return rows;
    },
    scope
  );
}

export async function loadModuleRows(moduleId: MobileModuleId): Promise<ModuleListState> {
  if (moduleId === "hours") return loadWorkHours({ mode: "month", date: bogotaToday() });
  const scope = captureOfflineScope();
  if (!canUseMobileModule(scope.role as Perfil["rol"], moduleId))
    throw new Error("Este modulo no esta disponible para tu rol en Android.");
  const supabase = clientForScope(scope);
  const query = (entityType: string, fetcher: () => Promise<Record<string, unknown>[]>) =>
    queryAndCache(entityType, fetcher, scope);
  switch (moduleId) {
    case "students":
      return query("students", async () => {
        const { data, error } = await supabase
          .from("alumnos")
          .select("id, nombre, apellidos, dni, telefono, email, estado, fecha_inscripcion, sede_id")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return data ?? [];
      });
    case "classes":
      return query("classes", async () => {
        const { data, error } = await supabase
          .from("clases")
          .select(
            "id, fecha, hora_inicio, hora_fin, estado, tipo, alumno_id, instructor_id, vehiculo_id"
          )
          .order("fecha", { ascending: false })
          .limit(50);
        if (error) throw error;
        return data ?? [];
      });
    case "income":
      return query("income", async () => {
        const { data, error } = await supabase
          .from("ingresos")
          .select("id, concepto, monto, metodo_pago, fecha, estado, categoria, alumno_id")
          .order("fecha", { ascending: false })
          .limit(50);
        if (error) throw error;
        return data ?? [];
      });
    case "expenses":
      return query("expenses", async () => {
        const { data, error } = await supabase
          .from("gastos")
          .select("id, concepto, monto, categoria, metodo_pago, fecha, estado_pago, proveedor")
          .order("fecha", { ascending: false })
          .limit(50);
        if (error) throw error;
        return data ?? [];
      });
    case "cash":
      return query("cash", async () => {
        const today = bogotaToday();
        const { data, error } = await supabase
          .from("ingresos")
          .select("id, concepto, monto, metodo_pago, fecha, estado")
          .eq("fecha", today)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return data ?? [];
      });
    case "vehicles":
      return query("vehicles", async () => {
        const { data, error } = await supabase
          .from("vehiculos")
          .select("id, marca, modelo, matricula, estado, kilometraje, tipo")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return data ?? [];
      });
    case "instructors":
      return query("instructors", async () => {
        const { data, error } = await supabase
          .from("instructores")
          .select("id, nombre, apellidos, dni, telefono, licencia, especialidad, estado")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return data ?? [];
      });
    case "staff":
      return query("staff", async () => {
        const { data, error } = await supabase
          .from("perfiles")
          .select("id, nombre, email, rol, activo, sede_id")
          .in("rol", ["admin_escuela", "admin_sede", "administrativo", "recepcion"])
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return data ?? [];
      });
    case "branches":
      return query("branches", async () => {
        const { data, error } = await supabase
          .from("sedes")
          .select("id, nombre, ciudad, direccion, telefono, email, estado, es_principal")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return data ?? [];
      });
    case "schools":
    case "subscriptions":
      return query(moduleId, async () => {
        const { data, error } = await supabase
          .from("escuelas")
          .select("id, nombre, email, telefono, plan, estado, max_alumnos, max_sedes")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return data ?? [];
      });
    case "logbook":
      return query("logbook", async () => {
        let request = supabase
          .from("actividad_log")
          .select("id, accion, tabla, registro_id, created_at")
          .order("created_at", { ascending: false })
          .limit(50);
        if (scope.role === "instructor") request = request.eq("user_id", scope.auth.userId);
        const { data, error } = await request;
        if (error) throw error;
        return data ?? [];
      });
    case "exams":
      return query("exams", async () => {
        const { data, error } = await supabase
          .from("examenes")
          .select(
            "id, fecha, resultado, porcentaje, total_preguntas, respuestas_correctas, modulo_origen"
          )
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return data ?? [];
      });
    default:
      return { rows: [], fromCache: false, online: true };
  }
}

export async function queueModuleMutation(
  type: PendingMutation["type"],
  payload: Record<string, unknown>
) {
  const scope = captureOfflineScope();
  if (payload.escuela_id && payload.escuela_id !== scope.schoolId)
    throw new Error("La escuela del cambio no coincide con la sesion.");
  const moduleId = type.split(".")[0];
  if (
    moduleId !== "exams" &&
    !canEditMobileModule(scope.role as Perfil["rol"], moduleId as MobileModuleId)
  )
    throw new Error("Este registro no se puede modificar desde tu cuenta en Android.");
  if (moduleId === "exams" && scope.role !== "alumno")
    throw new Error("Solo el alumno puede guardar su practica CALE.");
  const action = type.split(".")[1];
  const requestedId = String(payload.id ?? "").trim();
  if (action === "update" && !requestedId)
    throw new Error("Falta el identificador del registro que se va a editar.");
  const entityId = requestedId || createUuid();
  const mutationId = action === "create" ? entityId : createUuid();
  const ownedPayload = { ...payload, id: entityId } as Record<string, unknown>;
  if (["students", "classes", "income", "expenses"].includes(moduleId)) {
    ownedPayload.escuela_id = scope.schoolId;
    if (action === "create" && !ownedPayload.sede_id) ownedPayload.sede_id = scope.branchId;
  }
  const mutation: PendingMutation = {
    id: mutationId,
    entityId,
    type,
    payload: ownedPayload,
    status: "pending",
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await enqueueMutation(
    {
      id: mutation.id,
      entityId: mutation.entityId,
      type: mutation.type,
      payload: mutation.payload,
      status: mutation.status,
      error: mutation.error,
    },
    scope
  );

  await upsertEntityRow(
    moduleId,
    { ...mutation.payload, id: entityId, _pending: true },
    entityId,
    scope
  );
  return mutation;
}

async function applyRpcMutation(
  supabase: ReturnType<typeof clientForScope>,
  functionName: string,
  mutation: PendingMutation,
  action: string
) {
  const { data, error } = await supabase.rpc(functionName, {
    p_command_id: mutation.id,
    p_action: action,
    p_payload: mutation.payload,
  });

  if (error) throw error;
  return data as RpcResult;
}

async function applyPendingMutation(mutation: PendingMutation, scope: OfflineScope) {
  assertOfflineScope(scope);
  const supabase = clientForScope(scope);
  switch (mutation.type) {
    case "students.create": {
      const { data, error } = await supabase.functions.invoke("mobile-admin-users", {
        body: {
          action: "create_student",
          command_id: mutation.id,
          payload: mutation.payload,
        },
      });
      if (error) throw error;
      return data as RpcResult;
    }
    case "students.update":
      return applyRpcMutation(supabase, "mobile_apply_student_command", mutation, "update");
    case "classes.create":
      return applyRpcMutation(supabase, "mobile_apply_class_command", mutation, "create");
    case "classes.update":
      return applyRpcMutation(supabase, "mobile_apply_class_command", mutation, "update");
    case "income.create":
      return applyRpcMutation(supabase, "mobile_apply_income_command", mutation, "create");
    case "income.update":
      return applyRpcMutation(supabase, "mobile_apply_income_command", mutation, "update");
    case "expenses.create":
      return applyRpcMutation(supabase, "mobile_apply_expense_command", mutation, "create");
    case "expenses.update":
      return applyRpcMutation(supabase, "mobile_apply_expense_command", mutation, "update");
    case "exams.submit": {
      const { data, error } = await supabase.rpc("mobile_submit_cale_attempt", {
        p_command_id: mutation.id,
        p_question_ids: mutation.payload.questionIds,
        p_answers: mutation.payload.answers,
        p_elapsed_seconds: mutation.payload.elapsedSeconds,
      });
      if (error) throw error;
      return data as RpcResult;
    }
    default:
      throw new Error("Tipo de operacion pendiente no soportado.");
  }
}

const drains = new Map<string, { scope: OfflineScope; promise: Promise<number> }>();

export async function drainPendingMutations() {
  const owner = captureAuthScope();
  // Revalidate role/school before replay; an offline profile is never sufficient
  // authority to send a command after access has changed on the server.
  const profile = await loadMyProfile({ requireOnline: true });
  assertAuthScope(owner);
  if (!profile) throw new Error("El perfil ya no tiene acceso.");
  const scope = captureOfflineScope();
  const existing = drains.get(scope.key);
  if (existing) {
    await existing.promise.catch(() => undefined);
    assertOfflineScope(scope);
    if (existing.scope !== scope) return drainPendingMutations();
    return countPendingMutations(scope);
  }
  const drain = drainScope(scope).finally(() => {
    if (drains.get(scope.key)?.promise === drain) drains.delete(scope.key);
  });
  drains.set(scope.key, { scope, promise: drain });
  return drain;
}

async function drainScope(scope: OfflineScope) {
  const pending = await listPendingMutations(["pending", "failed", "syncing"], scope);

  for (const mutation of pending) {
    assertOfflineScope(scope);
    await updateMutationStatus(mutation.id, "syncing", null, scope);
    try {
      const result = await applyPendingMutation(mutation, scope);
      assertOfflineScope(scope);
      if (result?.entity_type && result?.row) {
        await upsertEntityRow(
          result.entity_type,
          result.row,
          String(result.row.id ?? mutation.entityId),
          scope
        );
      }
      if (mutation.type === "exams.submit") {
        await removeEntityRow("exams", mutation.entityId, scope);
      }
      await updateMutationStatus(mutation.id, "applied", null, scope);
    } catch (error) {
      // A possibly committed command remains syncing for idempotent retry by
      // its original owner. Never mark it applied under a replacement session.
      if (!isOfflineScopeCurrent(scope)) throw new SessionChangedError();
      const message = error instanceof Error ? error.message : "No se pudo sincronizar.";
      await updateMutationStatus(mutation.id, "failed", message, scope);
      break;
    }
  }

  return countPendingMutations(scope);
}

export async function getPendingMutationCount() {
  return countPendingMutations();
}

export async function syncCaleBank() {
  const scope = captureOfflineScope();
  const supabase = clientForScope(scope);
  const lastSync = await getSyncState("cale_bank_updated_at", scope);

  const { data, error } = await supabase.rpc("mobile_cale_bank_snapshot", {
    p_since: lastSync,
  });
  assertOfflineScope(scope);

  if (error) {
    const fallback = await supabase
      .from("preguntas_examen")
      .select(
        "id, categoria_id, pregunta, imagen_url, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, explicacion, fundamento_legal, codigo_externo, updated_at"
      )
      .eq("activa", true)
      .order("updated_at", { ascending: false });

    if (fallback.error) throw fallback.error;
    assertOfflineScope(scope);
    await upsertCaleQuestions(fallback.data ?? [], scope);
    if (fallback.data?.[0]?.updated_at) {
      await setSyncState("cale_bank_updated_at", String(fallback.data[0].updated_at), scope);
    }
    return {
      updated: fallback.data?.length ?? 0,
      source: "direct",
    };
  }

  const payload = data as {
    questions?: Array<Record<string, unknown>>;
    updated_at?: string | null;
  };

  const questions = payload.questions ?? [];
  await upsertCaleQuestions(questions, scope);
  if (payload.updated_at) {
    await setSyncState("cale_bank_updated_at", payload.updated_at, scope);
  }

  return {
    updated: questions.length,
    source: "rpc",
  };
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export const CALE_QUESTION_COUNT = 40;

export async function buildOfflinePractice(count = CALE_QUESTION_COUNT) {
  const cached = await readCaleQuestions<Record<string, unknown>>();
  const questions = cached.map((item) => item.payload);
  return shuffle(questions).slice(0, count);
}

// Evaluation and submission are separate awaits in the existing CALE screen.
// Keep the answers attached to their original session across that boundary.
const practiceOwners = new WeakMap<Record<string, string>, OfflineScope>();

export async function evaluateOfflinePractice(
  questionIds: string[],
  answers: Record<string, string>
) {
  const scope = captureOfflineScope();
  const previous = practiceOwners.get(answers);
  if (previous && previous.key !== scope.key) throw new SessionChangedError();
  practiceOwners.set(answers, scope);
  const cached = await readCaleQuestions<Record<string, unknown>>(scope);
  const questionMap = new Map(cached.map((item) => [String(item.payload.id), item.payload]));

  const rows = questionIds
    .map((id) => questionMap.get(id))
    .filter(Boolean)
    .map((question) => {
      const selected = answers[String(question?.id)] ?? "";
      const correct = String(question?.respuesta_correcta ?? "");
      return {
        id: String(question?.id ?? ""),
        selected,
        correct,
        isCorrect: selected === correct,
        pregunta: String(question?.pregunta ?? ""),
      };
    });

  const correctCount = rows.filter((row) => row.isCorrect).length;
  const total = rows.length;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return {
    rows,
    correctCount,
    total,
    percentage,
    approved: percentage >= 80,
  };
}

export async function submitCaleAttempt(input: {
  questionIds: string[];
  answers: Record<string, string>;
  elapsedSeconds: number;
  offline: boolean;
}) {
  const scope = practiceOwners.get(input.answers) ?? captureOfflineScope();
  assertOfflineScope(scope);
  if (
    new Set(input.questionIds).size !== CALE_QUESTION_COUNT ||
    input.questionIds.length !== CALE_QUESTION_COUNT ||
    !input.questionIds.every((id) => ["a", "b", "c", "d"].includes(input.answers[id]))
  ) {
    throw new Error("Responde las 40 preguntas antes de finalizar el simulacro.");
  }
  if (input.offline) {
    const queued = await queueModuleMutation("exams.submit", {
      questionIds: input.questionIds,
      answers: input.answers,
      elapsedSeconds: input.elapsedSeconds,
    });
    return { queued: true, id: queued.id };
  }

  const supabase = clientForScope(scope);
  const commandId = createUuid();
  const { data, error } = await supabase.rpc("mobile_submit_cale_attempt", {
    p_command_id: commandId,
    p_question_ids: input.questionIds,
    p_answers: input.answers,
    p_elapsed_seconds: input.elapsedSeconds,
  });

  assertOfflineScope(scope);
  if (error) throw error;
  return data;
}

export function withTransition(setter: () => void) {
  startTransition(setter);
}

export function moduleIsAvailableOffline(moduleId: MobileModuleId) {
  return Boolean(getModuleById(moduleId)?.offline);
}
