import type { SupabaseClient } from "@supabase/supabase-js";
import type { EstadoIngreso, MetodoPago } from "@/types/database";
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
  total_efectivo: number;
  total_datafono: number;
  total_nequi: number;
  total_sistecredito: number;
  total_otro: number;
  total_registrado: number;
};

export type IngresoDiarioStats = {
  totalEfectivo: number;
  totalDatafono: number;
  totalNequi: number;
  totalSistecredito: number;
  totalOtro: number;
  totalRegistrado: number;
  diasConMovimientos: number;
  promedioPorDia: number;
  mejorDiaFecha: string | null;
  mejorDiaMonto: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────

type RawIngreso = {
  fecha: string;
  monto: number | string;
  estado: EstadoIngreso;
  metodo_pago: MetodoPago;
};

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
    if (r.estado !== "cobrado") continue;
    const m = Number(r.monto || 0);
    const d = byDate.get(r.fecha) ?? {
      id: r.fecha,
      fecha: r.fecha,
      movimientos: 0,
      total_efectivo: 0,
      total_datafono: 0,
      total_nequi: 0,
      total_sistecredito: 0,
      total_otro: 0,
      total_registrado: 0,
    };
    d.movimientos += 1;
    d.total_registrado += m;
    if (r.metodo_pago === "efectivo") d.total_efectivo += m;
    else if (r.metodo_pago === "datafono") d.total_datafono += m;
    else if (r.metodo_pago === "nequi") d.total_nequi += m;
    else if (r.metodo_pago === "sistecredito") d.total_sistecredito += m;
    else d.total_otro += m;
    byDate.set(r.fecha, d);
  }

  const rows = Array.from(byDate.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));

  let totalEfectivo = 0;
  let totalDatafono = 0;
  let totalNequi = 0;
  let totalSistecredito = 0;
  let totalOtro = 0;
  let totalRegistrado = 0;
  let mejorDia: IngresoDiarioRow | null = null;

  for (const r of rows) {
    totalEfectivo += r.total_efectivo;
    totalDatafono += r.total_datafono;
    totalNequi += r.total_nequi;
    totalSistecredito += r.total_sistecredito;
    totalOtro += r.total_otro;
    totalRegistrado += r.total_registrado;
    if (!mejorDia || r.total_registrado > mejorDia.total_registrado) mejorDia = r;
  }

  const stats: IngresoDiarioStats = {
    totalEfectivo,
    totalDatafono,
    totalNequi,
    totalSistecredito,
    totalOtro,
    totalRegistrado,
    diasConMovimientos: rows.length,
    promedioPorDia: rows.length > 0 ? totalRegistrado / rows.length : 0,
    mejorDiaFecha: mejorDia?.fecha ?? null,
    mejorDiaMonto: mejorDia?.total_registrado ?? 0,
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
    const safePattern = `"%${search.replace(/"/g, '\\"')}%"`;
    const matched = await fetchAllSupabaseRows<{ id: string }>((f, t) =>
      supabase
        .from("alumnos")
        .select("id")
        .eq("escuela_id", filters.escuelaId)
        .or(`dni.ilike.${safePattern},nombre.ilike.${safePattern},apellidos.ilike.${safePattern}`)
        .range(f, t)
        .then(({ data, error }) => ({ data: (data as { id: string }[]) ?? [], error }))
    );
    matchedAlumnoIds = matched.map((a) => a.id);
  }

  const raw = await fetchAllSupabaseRows<RawIngreso>((f, t) => {
    let q = supabase
      .from("ingresos")
      .select("fecha, monto, estado, metodo_pago")
      .eq("escuela_id", filters.escuelaId)
      .gte("fecha", from)
      .lt("fecha", to);

    if (filters.alumnoId) q = q.eq("alumno_id", filters.alumnoId);
    if (filters.metodoPago) q = q.eq("metodo_pago", filters.metodoPago);
    if (filters.categoria) q = q.eq("categoria", filters.categoria);
    if (filters.estado) q = q.eq("estado", filters.estado);

    if (search) {
      const safePattern = `"%${search.replace(/"/g, '\\"')}%"`;
      if (matchedAlumnoIds.length > 0) {
        q = q.or(`concepto.ilike.${safePattern},alumno_id.in.(${matchedAlumnoIds.join(",")})`);
      } else {
        q = q.or(`concepto.ilike.${safePattern}`);
      }
    }

    return q
      .order("fecha", { ascending: false })
      .range(f, t)
      .then(({ data, error }) => ({ data: (data as RawIngreso[]) ?? [], error }));
  });

  return aggregate(raw);
}
