import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  buildSupabaseAdminClient,
  ensureSchoolScope,
  ensureSedeScope,
  parseJsonBody,
} from "@/lib/api-auth";
import { getCurrentMonthNumber, getCurrentYear, isValidDateOnly } from "@/lib/date-utils";
import {
  createPayroll,
  updatePayroll,
  deletePayroll,
  PayrollMutationError,
} from "@/lib/payroll-mutations";
import { buildLegacyInstructorPayrollRows } from "@/lib/payroll";
import type { InstructorPayrollClosure } from "@/lib/payroll";
import { revalidateServerReadCache } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags } from "@/lib/server-cache-tags";
import type { EstadoPagoGasto, Rol } from "@/types/database";

// ── Roles con acceso al módulo de nóminas ────────────────────────────
const ALLOWED_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede", "administrativo"];

// ── Tipo para updates de nómina ──────────────────────────────────────
type GastoLegacyRow = {
  id: string;
  proveedor: string | null;
  fecha: string;
  estado_pago: EstadoPagoGasto;
  notas: string | null;
};

// ── Helper: invalidar cache de nóminas ───────────────────────────────
function revalidateNominasCache(escuelaId: string, sedeId?: string | null) {
  const scope = { escuelaId, sedeId };
  try {
    revalidateServerReadCache(buildDashboardListCacheTags("nominas", scope));
  } catch {
    console.error("nominas.cache.failed");
  }
}

// ── GET: listar nóminas de un periodo ────────────────────────────────
export async function GET(request: Request) {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;

  const perfil = authz.perfil;
  const url = new URL(request.url);
  const escuelaId = perfil.escuela_id ?? url.searchParams.get("escuela_id");
  const selectedSedeId = url.searchParams.get("sede_id") || perfil.sede_id;
  const anio = Number(url.searchParams.get("anio")) || getCurrentYear();
  const mes = Number(url.searchParams.get("mes")) || getCurrentMonthNumber();
  const empleadoTipo = url.searchParams.get("tipo"); // "instructor" | "administrativo" | null

  if (
    !Number.isInteger(anio) ||
    anio < 2020 ||
    anio > 2100 ||
    !Number.isInteger(mes) ||
    mes < 1 ||
    mes > 12
  ) {
    return NextResponse.json({ error: "Periodo de nómina inválido." }, { status: 400 });
  }

  if (!escuelaId) {
    return NextResponse.json({ error: "Selecciona una escuela activa." }, { status: 400 });
  }

  const scopeErr = ensureSchoolScope(perfil, escuelaId);
  if (scopeErr) {
    return NextResponse.json({ error: scopeErr }, { status: 403 });
  }

  if (selectedSedeId || (perfil.rol !== "super_admin" && perfil.rol !== "admin_escuela")) {
    const sedeErr = ensureSedeScope(perfil, selectedSedeId || "");
    if (sedeErr) {
      return NextResponse.json({ error: sedeErr }, { status: 403 });
    }
  }

  const supabase = buildSupabaseAdminClient();
  let query = supabase
    .from("nominas")
    .select("*, nomina_conceptos(*)")
    .eq("escuela_id", escuelaId)
    .eq("periodo_anio", anio)
    .eq("periodo_mes", mes)
    .order("empleado_nombre", { ascending: true });

  if (selectedSedeId) {
    query = query.eq("sede_id", selectedSedeId);
  }

  if (empleadoTipo === "instructor" || empleadoTipo === "administrativo") {
    query = query.eq("empleado_tipo", empleadoTipo);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[API NOMINAS GET]", error);
    return NextResponse.json({ error: "No se pudieron cargar las nóminas." }, { status: 500 });
  }

  // Cargar instructores y administrativos para el selector
  let instructores: Array<{ id: string; nombre: string; sede_id: string | null }> = [];
  let administrativos: Array<{ id: string; nombre: string; sede_id: string | null }> = [];
  let sedes: Array<{ id: string; nombre: string; es_principal: boolean }> = [];
  let cierres: InstructorPayrollClosure[] = [];
  let legacyInstructorExpenses = new Map<string, GastoLegacyRow>();

  try {
    let instructoresQuery = supabase
      .from("instructores")
      .select("id, nombre, apellidos, sede_id")
      .eq("escuela_id", escuelaId)
      .eq("estado", "activo")
      .order("nombre");
    let administrativosQuery = supabase
      .from("perfiles")
      .select("id, nombre, sede_id")
      .eq("escuela_id", escuelaId)
      .eq("activo", true)
      .in("rol", ["administrativo", "admin_sede", "recepcion"])
      .order("nombre");
    let sedesQuery = supabase
      .from("sedes")
      .select("id, nombre, es_principal")
      .eq("escuela_id", escuelaId)
      .eq("estado", "activa")
      .order("es_principal", { ascending: false });
    let cierresQuery = supabase
      .from("cierres_horas_instructores")
      .select(
        "id, instructor_id, sede_id, gasto_id, periodo_anio, periodo_mes, fecha_cierre, total_horas, valor_hora, monto_total"
      )
      .eq("escuela_id", escuelaId)
      .eq("periodo_anio", anio)
      .eq("periodo_mes", mes);

    if (selectedSedeId) {
      instructoresQuery = instructoresQuery.eq("sede_id", selectedSedeId);
      administrativosQuery = administrativosQuery.eq("sede_id", selectedSedeId);
      sedesQuery = sedesQuery.eq("id", selectedSedeId);
      cierresQuery = cierresQuery.eq("sede_id", selectedSedeId);
    }

    const [instructoresRes, administrativosRes, sedesRes, cierresRes] = await Promise.all([
      instructoresQuery,
      administrativosQuery,
      sedesQuery,
      cierresQuery,
    ]);

    instructores = (instructoresRes.data ?? []).map((i) => ({
      id: i.id,
      nombre: `${i.nombre} ${i.apellidos}`,
      sede_id: i.sede_id,
    }));
    administrativos = (administrativosRes.data ?? []).map((a) => ({
      id: a.id,
      nombre: a.nombre,
      sede_id: a.sede_id,
    }));
    sedes = sedesRes.data ?? [];
    cierres = (cierresRes.data ?? []).map((closure) => ({
      ...closure,
      periodo_anio: Number(closure.periodo_anio || 0),
      periodo_mes: Number(closure.periodo_mes || 0),
      total_horas: Number(closure.total_horas || 0),
      valor_hora: Number(closure.valor_hora || 0),
      monto_total: Number(closure.monto_total || 0),
    }));

    const expenseIds = Array.from(
      new Set(cierres.map((closure) => closure.gasto_id).filter((id): id is string => Boolean(id)))
    );

    if (expenseIds.length > 0) {
      let gastosQuery = supabase
        .from("gastos")
        .select("id, proveedor, fecha, estado_pago, notas")
        .eq("escuela_id", escuelaId)
        .eq("categoria", "nominas")
        .in("id", expenseIds);

      if (selectedSedeId) {
        gastosQuery = gastosQuery.eq("sede_id", selectedSedeId);
      }

      const { data: gastosData } = await gastosQuery;
      legacyInstructorExpenses = new Map(
        ((gastosData ?? []) as GastoLegacyRow[]).map((expense) => [expense.id, expense])
      );
    }
  } catch (err) {
    console.error("[API NOMINAS GET selectors]", err);
  }

  const normalizedNominas = (data ?? []).map((row) => ({
    ...row,
    origen: "nomina" as const,
  }));
  const instructorNames = new Map(instructores.map((row) => [row.id, row.nombre]));
  const legacyInstructorRows = buildLegacyInstructorPayrollRows({
    closures: cierres,
    expensesById: legacyInstructorExpenses,
    instructorNames,
    existingInstructorIds: new Set(
      normalizedNominas
        .filter((row) => row.empleado_tipo === "instructor")
        .map((row) => row.empleado_id)
    ),
  });
  const nominas = [...normalizedNominas, ...legacyInstructorRows].sort((a, b) =>
    String(a.empleado_nombre || "").localeCompare(String(b.empleado_nombre || ""), "es-CO")
  );

  return NextResponse.json({
    nominas,
    instructores,
    administrativos,
    sedes,
    cierres,
    periodo: { anio, mes },
  });
}

// ── Schema de validación para crear/editar nómina ────────────────────
const payrollAmountSchema = z.number().min(0).max(9_999_999_999.99).multipleOf(0.01);
const conceptoSchema = z.object({
  tipo: z.enum(["devengo", "deduccion"]),
  concepto: z.string().trim().min(1).max(100),
  descripcion: z.string().max(500).nullable().optional(),
  valor: payrollAmountSchema,
});

const nominaCreateSchema = z.object({
  escuela_id: z.string().uuid(),
  sede_id: z.string().uuid(),
  empleado_tipo: z.enum(["instructor", "administrativo"]),
  empleado_id: z.string().uuid(),
  empleado_nombre: z.string().min(1).max(200),
  periodo_anio: z.number().int().min(2020).max(2100),
  periodo_mes: z.number().int().min(1).max(12),
  tipo_contrato: z.enum(["prestacion_servicios", "contrato_laboral"]),
  salario_base: payrollAmountSchema,
  conceptos: z.array(conceptoSchema).max(100).default([]),
  notas: z.string().max(500).nullable().optional(),
});

function mutationError(error: unknown) {
  if (error instanceof PayrollMutationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const code = (error as { code?: unknown } | null)?.code;
  console.error("nominas.mutation.failed", {
    code: typeof code === "string" && /^[A-Za-z0-9_]{1,64}$/.test(code) ? code : "unknown",
  });
  return NextResponse.json(
    { error: "No se pudo guardar la nómina. No se aplicaron cambios." },
    { status: 500 }
  );
}

export async function POST(request: Request) {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;
  const parsed = await parseJsonBody(request, nominaCreateSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const nomina = await createPayroll(parsed.data, authz.perfil);
    revalidateNominasCache(nomina.escuela_id, nomina.sede_id);
    return NextResponse.json({ nomina }, { status: 201 });
  } catch (error) {
    return mutationError(error);
  }
}

const nominaUpdateSchema = z.object({
  nomina_id: z.string().uuid(),
  estado: z.enum(["borrador", "aprobada", "pagada", "anulada"]).optional(),
  fecha_pago: z.string().refine(isValidDateOnly, "Fecha de pago inválida.").nullable().optional(),
  salario_base: payrollAmountSchema.optional(),
  conceptos: z.array(conceptoSchema).max(100).optional(),
  notas: z.string().max(500).nullable().optional(),
});

export async function PATCH(request: Request) {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;
  const parsed = await parseJsonBody(request, nominaUpdateSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const nomina = await updatePayroll(parsed.data, authz.perfil);
    revalidateNominasCache(nomina.escuela_id, nomina.sede_id);
    return NextResponse.json({ nomina });
  } catch (error) {
    return mutationError(error);
  }
}

export async function DELETE(request: Request) {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;
  const parsed = z.string().uuid().safeParse(new URL(request.url).searchParams.get("id"));
  if (!parsed.success) {
    return NextResponse.json({ error: "ID de nómina inválido." }, { status: 400 });
  }
  try {
    const nomina = await deletePayroll(parsed.data, authz.perfil);
    revalidateNominasCache(nomina.escuela_id, nomina.sede_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return mutationError(error);
  }
}
