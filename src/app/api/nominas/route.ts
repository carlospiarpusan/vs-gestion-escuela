import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  buildSupabaseAdminClient,
  ensureSchoolScope,
  ensureSedeScope,
  parseJsonBody,
} from "@/lib/api-auth";
import {
  getAuditedRolesForCapabilityAction,
  getAuditedRolesForCapabilityModule,
} from "@/lib/role-capabilities";
import type { Rol } from "@/types/database";

// ── Roles con acceso al módulo de nóminas ────────────────────────────
const VIEW_ROLES: Rol[] = getAuditedRolesForCapabilityModule("payroll");
const CREATE_ROLES: Rol[] = getAuditedRolesForCapabilityAction("payroll", "create");
const EDIT_ROLES: Rol[] = getAuditedRolesForCapabilityAction("payroll", "edit");
const DELETE_ROLES: Rol[] = getAuditedRolesForCapabilityAction("payroll", "delete");

type LegacyPayrollExpenseRow = {
  id: string;
  sede_id: string;
  concepto: string;
  monto: number | string | null;
  fecha: string;
  estado_pago: "pendiente" | "pagado" | "anulado";
  proveedor: string | null;
  notas: string | null;
};

function inferLegacyPayrollEmployeeType(row: Pick<LegacyPayrollExpenseRow, "concepto" | "notas">) {
  const haystack = `${row.concepto} ${row.notas ?? ""}`.toLowerCase();
  if (
    haystack.includes("cierre_horas_instructor") ||
    haystack.includes("horas instructor") ||
    haystack.includes("instructor")
  ) {
    return "instructor" as const;
  }

  return "administrativo" as const;
}

// ── GET: listar nóminas de un periodo ────────────────────────────────
export async function GET(request: Request) {
  const authz = await authorizeApiRequest(VIEW_ROLES);
  if (!authz.ok) return authz.response;

  const perfil = authz.perfil;
  const url = new URL(request.url);
  const escuelaId = perfil.escuela_id ?? url.searchParams.get("escuela_id");
  const sedeId = url.searchParams.get("sede_id") ?? perfil.sede_id;
  const anio = Number(url.searchParams.get("anio")) || new Date().getFullYear();
  const mes = Number(url.searchParams.get("mes")) || new Date().getMonth() + 1;
  const empleadoTipo = url.searchParams.get("tipo"); // "instructor" | "administrativo" | null

  if (!escuelaId) {
    return NextResponse.json({ error: "Selecciona una escuela activa." }, { status: 400 });
  }

  const scopeErr = ensureSchoolScope(perfil, escuelaId);
  if (scopeErr) {
    return NextResponse.json({ error: scopeErr }, { status: 403 });
  }

  const supabase = buildSupabaseAdminClient();
  let query = supabase
    .from("nominas")
    .select("*, nomina_conceptos(*)")
    .eq("escuela_id", escuelaId)
    .eq("periodo_anio", anio)
    .eq("periodo_mes", mes)
    .order("empleado_nombre", { ascending: true });

  if (sedeId && perfil.rol !== "admin_escuela" && perfil.rol !== "super_admin") {
    query = query.eq("sede_id", sedeId);
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
  const [instructoresRes, administrativosRes, sedesRes] = await Promise.all([
    supabase
      .from("instructores")
      .select("id, nombre, apellidos, sede_id")
      .eq("escuela_id", escuelaId)
      .eq("estado", "activo")
      .order("nombre"),
    supabase
      .from("perfiles")
      .select("id, nombre, sede_id")
      .eq("escuela_id", escuelaId)
      .eq("activo", true)
      .in("rol", ["administrativo", "admin_sede", "recepcion"])
      .order("nombre"),
    supabase
      .from("sedes")
      .select("id, nombre, es_principal")
      .eq("escuela_id", escuelaId)
      .eq("estado", "activa")
      .order("es_principal", { ascending: false }),
  ]);

  // Cargar cierres de horas del periodo para instructores
  let cierres: Array<{
    id: string;
    instructor_id: string;
    total_horas: number;
    valor_hora: number;
    monto_total: number;
    fecha_cierre: string;
  }> = [];

  try {
    const { data: cierresData } = await supabase
      .from("cierres_horas_instructores")
      .select("id, instructor_id, total_horas, valor_hora, monto_total, fecha_cierre")
      .eq("escuela_id", escuelaId)
      .eq("periodo_anio", anio)
      .eq("periodo_mes", mes);

    cierres = (cierresData ?? []).map((c) => ({
      id: c.id,
      instructor_id: c.instructor_id,
      total_horas: Number(c.total_horas),
      valor_hora: Number(c.valor_hora),
      monto_total: Number(c.monto_total),
      fecha_cierre: c.fecha_cierre,
    }));
  } catch {
    // cierres vacío si no existe la tabla o falla
  }

  let nominas = (data ?? []).map((row) => ({
    ...row,
    origen: "nomina" as const,
  }));

  if (nominas.length === 0) {
    const periodStart = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const periodEnd = new Date(anio, mes, 0).toISOString().slice(0, 10);

    const { data: legacyExpenses } = await supabase
      .from("gastos")
      .select("id, sede_id, concepto, monto, fecha, estado_pago, proveedor, notas")
      .eq("escuela_id", escuelaId)
      .eq("categoria", "nominas")
      .gte("fecha", periodStart)
      .lte("fecha", periodEnd)
      .order("fecha", { ascending: false });

    const legacyRows = ((legacyExpenses ?? []) as LegacyPayrollExpenseRow[])
      .filter((row) => {
        if (sedeId && perfil.rol !== "admin_escuela" && perfil.rol !== "super_admin") {
          return row.sede_id === sedeId;
        }

        return true;
      })
      .filter((row) => inferLegacyPayrollEmployeeType(row) === (empleadoTipo ?? "instructor"))
      .map((row) => {
        const legacyType = inferLegacyPayrollEmployeeType(row);
        const amount = Number(row.monto ?? 0);
        const employeeName = row.proveedor?.trim() || row.concepto;

        return {
          id: row.id,
          escuela_id: escuelaId,
          sede_id: row.sede_id,
          empleado_tipo: legacyType,
          empleado_id: `legacy-${row.id}`,
          empleado_nombre: employeeName,
          periodo_anio: anio,
          periodo_mes: mes,
          tipo_contrato:
            legacyType === "instructor"
              ? ("prestacion_servicios" as const)
              : ("contrato_laboral" as const),
          salario_base: amount,
          total_devengado: amount,
          total_deducciones: 0,
          neto_pagar: amount,
          estado:
            row.estado_pago === "pagado"
              ? ("pagada" as const)
              : row.estado_pago === "anulado"
                ? ("anulada" as const)
                : ("aprobada" as const),
          fecha_pago: row.estado_pago === "pagado" ? row.fecha : null,
          notas: row.notas
            ? `Histórico desde gastos. ${row.notas}`
            : "Histórico desde gastos. Este registro viene del módulo anterior de nómina.",
          nomina_conceptos: [
            {
              id: `legacy-concept-${row.id}`,
              tipo: "devengo" as const,
              concepto: row.concepto,
              descripcion: "Registro histórico migrado desde gastos",
              valor: amount,
            },
          ],
          origen: "gasto_legacy" as const,
        };
      });

    nominas = legacyRows;
  }

  return NextResponse.json({
    nominas,
    instructores: (instructoresRes.data ?? []).map((i) => ({
      id: i.id,
      nombre: `${i.nombre} ${i.apellidos}`,
      sede_id: i.sede_id,
    })),
    administrativos: (administrativosRes.data ?? []).map((a) => ({
      id: a.id,
      nombre: a.nombre,
      sede_id: a.sede_id,
    })),
    sedes: sedesRes.data ?? [],
    cierres,
    periodo: { anio, mes },
  });
}

// ── Schema de validación para crear/editar nómina ────────────────────
const conceptoSchema = z.object({
  tipo: z.enum(["devengo", "deduccion"]),
  concepto: z.string().min(1).max(100),
  descripcion: z.string().max(500).nullable().optional(),
  valor: z.number().min(0),
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
  salario_base: z.number().min(0),
  conceptos: z.array(conceptoSchema).default([]),
  notas: z.string().max(500).nullable().optional(),
});

// ── POST: crear una nómina nueva ─────────────────────────────────────
export async function POST(request: Request) {
  const authz = await authorizeApiRequest(CREATE_ROLES);
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody(request, nominaCreateSchema);
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;
  const perfil = authz.perfil;

  const scopeErr = ensureSchoolScope(perfil, body.escuela_id);
  if (scopeErr) {
    return NextResponse.json({ error: scopeErr }, { status: 403 });
  }

  const sedeErr = ensureSedeScope(perfil, body.sede_id);
  if (sedeErr) {
    return NextResponse.json({ error: sedeErr }, { status: 403 });
  }

  // Calcular totales
  const totalDevengado =
    body.salario_base +
    body.conceptos.filter((c) => c.tipo === "devengo").reduce((sum, c) => sum + c.valor, 0);
  const totalDeducciones = body.conceptos
    .filter((c) => c.tipo === "deduccion")
    .reduce((sum, c) => sum + c.valor, 0);
  const netoPagar = totalDevengado - totalDeducciones;

  const supabase = buildSupabaseAdminClient();

  // Verificar que no exista una nómina duplicada
  const { data: existing } = await supabase
    .from("nominas")
    .select("id")
    .eq("escuela_id", body.escuela_id)
    .eq("empleado_tipo", body.empleado_tipo)
    .eq("empleado_id", body.empleado_id)
    .eq("periodo_anio", body.periodo_anio)
    .eq("periodo_mes", body.periodo_mes)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una nómina para este empleado en el periodo seleccionado." },
      { status: 409 }
    );
  }

  const { data: nomina, error: insertError } = await supabase
    .from("nominas")
    .insert({
      escuela_id: body.escuela_id,
      sede_id: body.sede_id,
      empleado_tipo: body.empleado_tipo,
      empleado_id: body.empleado_id,
      empleado_nombre: body.empleado_nombre,
      periodo_anio: body.periodo_anio,
      periodo_mes: body.periodo_mes,
      tipo_contrato: body.tipo_contrato,
      salario_base: body.salario_base,
      total_devengado: totalDevengado,
      total_deducciones: totalDeducciones,
      neto_pagar: netoPagar,
      estado: "borrador",
      notas: body.notas ?? null,
      created_by: perfil.id,
    })
    .select()
    .single();

  if (insertError || !nomina) {
    console.error("[API NOMINAS POST]", insertError);
    return NextResponse.json({ error: "No se pudo crear la nómina." }, { status: 500 });
  }

  // Insertar salario base como concepto de devengo
  const conceptos = [
    {
      nomina_id: nomina.id,
      tipo: "devengo" as const,
      concepto: body.empleado_tipo === "instructor" ? "Honorarios" : "Salario base",
      descripcion: null,
      valor: body.salario_base,
    },
    ...body.conceptos.map((c) => ({
      nomina_id: nomina.id,
      tipo: c.tipo,
      concepto: c.concepto,
      descripcion: c.descripcion ?? null,
      valor: c.valor,
    })),
  ];

  if (conceptos.length > 0) {
    const { error: conceptosError } = await supabase.from("nomina_conceptos").insert(conceptos);

    if (conceptosError) {
      console.error("[API NOMINAS POST conceptos]", conceptosError);
    }
  }

  return NextResponse.json({ nomina }, { status: 201 });
}

// ── Schema para actualizar estado ────────────────────────────────────
const nominaUpdateSchema = z.object({
  nomina_id: z.string().uuid(),
  estado: z.enum(["borrador", "aprobada", "pagada", "anulada"]).optional(),
  fecha_pago: z.string().nullable().optional(),
  salario_base: z.number().min(0).optional(),
  conceptos: z.array(conceptoSchema).optional(),
  notas: z.string().max(500).nullable().optional(),
});

// ── PATCH: actualizar nómina (estado, pago, conceptos) ───────────────
export async function PATCH(request: Request) {
  const authz = await authorizeApiRequest(EDIT_ROLES);
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody(request, nominaUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;
  const perfil = authz.perfil;
  const supabase = buildSupabaseAdminClient();

  // Cargar nómina actual
  const { data: nomina } = await supabase
    .from("nominas")
    .select("*")
    .eq("id", body.nomina_id)
    .single();

  if (!nomina) {
    return NextResponse.json({ error: "Nómina no encontrada." }, { status: 404 });
  }

  const scopeErr = ensureSchoolScope(perfil, nomina.escuela_id);
  if (scopeErr) {
    return NextResponse.json({ error: scopeErr }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};

  if (body.estado !== undefined) {
    updates.estado = body.estado;
  }
  if (body.fecha_pago !== undefined) {
    updates.fecha_pago = body.fecha_pago;
  }
  if (body.notas !== undefined) {
    updates.notas = body.notas;
  }

  // Si se actualizan conceptos, recalcular totales
  if (body.conceptos !== undefined || body.salario_base !== undefined) {
    const salarioBase = body.salario_base ?? nomina.salario_base;
    updates.salario_base = salarioBase;

    if (body.conceptos) {
      // Reemplazar conceptos
      await supabase.from("nomina_conceptos").delete().eq("nomina_id", body.nomina_id);

      const tipoEmpleado = nomina.empleado_tipo;
      const nuevosConceptos = [
        {
          nomina_id: body.nomina_id,
          tipo: "devengo" as const,
          concepto: tipoEmpleado === "instructor" ? "Honorarios" : "Salario base",
          descripcion: null,
          valor: salarioBase,
        },
        ...body.conceptos.map((c) => ({
          nomina_id: body.nomina_id,
          tipo: c.tipo,
          concepto: c.concepto,
          descripcion: c.descripcion ?? null,
          valor: c.valor,
        })),
      ];

      await supabase.from("nomina_conceptos").insert(nuevosConceptos);

      const totalDevengado =
        salarioBase +
        body.conceptos.filter((c) => c.tipo === "devengo").reduce((sum, c) => sum + c.valor, 0);
      const totalDeducciones = body.conceptos
        .filter((c) => c.tipo === "deduccion")
        .reduce((sum, c) => sum + c.valor, 0);

      updates.total_devengado = totalDevengado;
      updates.total_deducciones = totalDeducciones;
      updates.neto_pagar = totalDevengado - totalDeducciones;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No se enviaron cambios." }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("nominas")
    .update(updates)
    .eq("id", body.nomina_id)
    .select("*, nomina_conceptos(*)")
    .single();

  if (updateError) {
    console.error("[API NOMINAS PATCH]", updateError);
    return NextResponse.json({ error: "No se pudo actualizar la nómina." }, { status: 500 });
  }

  return NextResponse.json({ nomina: updated });
}

// ── DELETE: eliminar nómina en borrador ──────────────────────────────
export async function DELETE(request: Request) {
  const authz = await authorizeApiRequest(DELETE_ROLES);
  if (!authz.ok) return authz.response;

  const url = new URL(request.url);
  const nominaId = url.searchParams.get("id");

  if (!nominaId) {
    return NextResponse.json({ error: "ID de nómina requerido." }, { status: 400 });
  }

  const perfil = authz.perfil;
  const supabase = buildSupabaseAdminClient();

  const { data: nomina } = await supabase
    .from("nominas")
    .select("id, escuela_id, estado")
    .eq("id", nominaId)
    .single();

  if (!nomina) {
    return NextResponse.json({ error: "Nómina no encontrada." }, { status: 404 });
  }

  const scopeErr = ensureSchoolScope(perfil, nomina.escuela_id);
  if (scopeErr) {
    return NextResponse.json({ error: scopeErr }, { status: 403 });
  }

  if (nomina.estado !== "borrador") {
    return NextResponse.json(
      { error: "Solo se pueden eliminar nóminas en estado borrador." },
      { status: 400 }
    );
  }

  const { error: deleteError } = await supabase.from("nominas").delete().eq("id", nominaId);

  if (deleteError) {
    console.error("[API NOMINAS DELETE]", deleteError);
    return NextResponse.json({ error: "No se pudo eliminar la nómina." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
