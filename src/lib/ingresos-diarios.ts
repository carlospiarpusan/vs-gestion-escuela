import type { SupabaseClient } from "@supabase/supabase-js";
import type { EstadoIngreso } from "@/types/database";
import { fetchAllSupabaseRows } from "@/lib/supabase-pagination";

// ─── Types ───────────────────────────────────────────────────────────

export type IngresosDiariosFilters = {
  escuelaId: string;
  alumnoId?: string;
  metodoPago?: string;
  categoria?: string;
  estado?: EstadoIngreso;
  mes?: string;
  year: number;
  search?: string;
};

export type IngresoDiarioRow = {
  id: string;
  fecha: string;
  movimientos: number;
  total_cobrado: number;
  total_pendiente: number;
  total_anulado: number;
  total_registrado: number;
};

export type IngresoDiarioStats = {
  totalCobrado: number;
  totalPendiente: number;
  totalAnulado: number;
  diasConMovimientos: number;
  promedioCobradoPorDia: number;
  mejorDiaFecha: string | null;
  mejorDiaMonto: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────

type RawIngreso = { fecha: string; monto: number | string; estado: EstadoIngreso };

function buildDateRange(year: number, mes?: string) {
  if (!mes) return { from: `${year}-01-01`, to: `${year + 1}-01-01` };
  const m = Number(mes);
  const from = `${year}-${mes}-01`;
  const to = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, "0")}-01`;
  return { from, to };
}

function aggregate(raw: RawIngreso[]) {
  const byDate = new Map<string, IngresoDiarioRow>();

  for (const r of raw) {
    const m = Number(r.monto || 0);
    const d = byDate.get(r.fecha) ?? {
      id: r.fecha,
      fecha: r.fecha,
      movimientos: 0,
      total_cobrado: 0,
      total_pendiente: 0,
      total_anulado: 0,
      total_registrado: 0,
    };
    d.movimientos += 1;
    d.total_registrado += m;
    if (r.estado === "cobrado") d.total_cobrado += m;
    else if (r.estado === "pendiente") d.total_pendiente += m;
    else if (r.estado === "anulado") d.total_anulado += m;
    byDate.set(r.fecha, d);
  }

  const rows = Array.from(byDate.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));

  let totalCobrado = 0;
  let totalPendiente = 0;
  let totalAnulado = 0;
  let mejorDia: IngresoDiarioRow | null = null;

  for (const r of rows) {
    totalCobrado += r.total_cobrado;
    totalPendiente += r.total_pendiente;
    totalAnulado += r.total_anulado;
    if (!mejorDia || r.total_cobrado > mejorDia.total_cobrado) mejorDia = r;
  }

  const stats: IngresoDiarioStats = {
    totalCobrado,
    totalPendiente,
    totalAnulado,
    diasConMovimientos: rows.length,
    promedioCobradoPorDia: rows.length > 0 ? totalCobrado / rows.length : 0,
    mejorDiaFecha: mejorDia?.fecha ?? null,
    mejorDiaMonto: mejorDia?.total_cobrado ?? 0,
  };

  return { rows, stats };
}

// ─── Main ────────────────────────────────────────────────────────────

export async function fetchIngresosDiariosCalculados(
  supabase: SupabaseClient,
  filters: IngresosDiariosFilters
) {
  const { from, to } = buildDateRange(filters.year, filters.mes);
  const search = filters.search?.trim() ?? "";

  let matchedAlumnoIds: string[] = [];
  if (search) {
    const pattern = `%${search}%`;
    const matched = await fetchAllSupabaseRows<{ id: string }>((f, t) =>
      supabase
        .from("alumnos")
        .select("id")
        .eq("escuela_id", filters.escuelaId)
        .or(`dni.ilike.${pattern},nombre.ilike.${pattern},apellidos.ilike.${pattern}`)
        .range(f, t)
        .then(({ data, error }) => ({ data: (data as { id: string }[]) ?? [], error }))
    );
    matchedAlumnoIds = matched.map((a) => a.id);
  }

  const raw = await fetchAllSupabaseRows<RawIngreso>((f, t) => {
    let q = supabase
      .from("ingresos")
      .select("fecha, monto, estado")
      .eq("escuela_id", filters.escuelaId)
      .gte("fecha", from)
      .lt("fecha", to);

    if (filters.alumnoId) q = q.eq("alumno_id", filters.alumnoId);
    if (filters.metodoPago) q = q.eq("metodo_pago", filters.metodoPago);
    if (filters.categoria) q = q.eq("categoria", filters.categoria);
    if (filters.estado) q = q.eq("estado", filters.estado);

    if (search) {
      const pattern = `%${search}%`;
      if (matchedAlumnoIds.length > 0) {
        q = q.or(`concepto.ilike.${pattern},alumno_id.in.(${matchedAlumnoIds.join(",")})`);
      } else {
        q = q.or(`concepto.ilike.${pattern}`);
      }
    }

    return q
      .order("fecha", { ascending: false })
      .range(f, t)
      .then(({ data, error }) => ({ data: (data as RawIngreso[]) ?? [], error }));
  });

  return aggregate(raw);
}
