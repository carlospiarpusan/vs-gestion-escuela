import type { SupabaseClient } from "@supabase/supabase-js";
import type { EstadoIngreso } from "@/types/database";
import { applyIncomeViewToSupabaseQuery, type IncomeView } from "@/lib/income-view";
import { fetchAllSupabaseRows } from "@/lib/supabase-pagination";

export interface IngresosDiariosFilters {
  escuelaId: string;
  alumnoId?: string;
  metodoPago?: string;
  categoria?: string;
  estado?: EstadoIngreso;
  view?: IncomeView;
  mes?: string;
  year?: number;
  search?: string;
}

export interface IngresoDiarioRow {
  id: string;
  fecha: string;
  movimientos: number;
  total_cobrado: number;
  total_pendiente: number;
  total_anulado: number;
  total_registrado: number;
}

export interface IngresoDiarioStats {
  totalCobrado: number;
  totalPendiente: number;
  totalAnulado: number;
  diasConMovimientos: number;
  promedioCobradoPorDia: number;
  mejorDiaFecha: string | null;
  mejorDiaMonto: number;
}

export interface IngresosDiariosResult {
  rows: IngresoDiarioRow[];
  stats: IngresoDiarioStats;
}

type IngresoResumenSource = {
  fecha: string;
  monto: number | string;
  estado: EstadoIngreso;
};

function applyDateFilter<T extends { gte: (...args: unknown[]) => T; lt: (...args: unknown[]) => T }>(
  query: T,
  year: number,
  mes?: string
) {
  if (!mes) {
    return query.gte("fecha", `${year}-01-01`).lt("fecha", `${year + 1}-01-01`);
  }

  const startDate = `${year}-${mes}-01`;
  const endMonth = Number(mes);
  const endDate = endMonth === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(endMonth + 1).padStart(2, "0")}-01`;

  return query.gte("fecha", startDate).lt("fecha", endDate);
}

function aggregateRows(rows: IngresoResumenSource[]): IngresosDiariosResult {
  const byDate = new Map<string, IngresoDiarioRow>();

  for (const row of rows) {
    const fecha = row.fecha;
    const monto = Number(row.monto || 0);
    const current = byDate.get(fecha) ?? {
      id: fecha,
      fecha,
      movimientos: 0,
      total_cobrado: 0,
      total_pendiente: 0,
      total_anulado: 0,
      total_registrado: 0,
    };

    current.movimientos += 1;
    current.total_registrado += monto;

    if (row.estado === "cobrado") current.total_cobrado += monto;
    if (row.estado === "pendiente") current.total_pendiente += monto;
    if (row.estado === "anulado") current.total_anulado += monto;

    byDate.set(fecha, current);
  }

  const orderedRows = Array.from(byDate.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const totalCobrado = orderedRows.reduce((sum, row) => sum + row.total_cobrado, 0);
  const totalPendiente = orderedRows.reduce((sum, row) => sum + row.total_pendiente, 0);
  const totalAnulado = orderedRows.reduce((sum, row) => sum + row.total_anulado, 0);
  const mejorDia = orderedRows.reduce<IngresoDiarioRow | null>(
    (best, row) => (!best || row.total_cobrado > best.total_cobrado ? row : best),
    null
  );

  return {
    rows: orderedRows,
    stats: {
      totalCobrado,
      totalPendiente,
      totalAnulado,
      diasConMovimientos: orderedRows.length,
      promedioCobradoPorDia: orderedRows.length > 0 ? totalCobrado / orderedRows.length : 0,
      mejorDiaFecha: mejorDia?.fecha ?? null,
      mejorDiaMonto: mejorDia?.total_cobrado ?? 0,
    },
  };
}

export async function fetchIngresosDiariosCalculados(
  supabase: SupabaseClient,
  filters: IngresosDiariosFilters
): Promise<IngresosDiariosResult> {
  const year = filters.year ?? new Date().getFullYear();
  const search = filters.search?.trim() ?? "";
  let matchedAlumnoIds: string[] = [];

  if (search) {
    const pattern = `%${search}%`;
    const matchedAlumnos = await fetchAllSupabaseRows<{ id: string }>((from, to) =>
      supabase
        .from("alumnos")
        .select("id")
        .eq("escuela_id", filters.escuelaId)
        .ilike("dni", pattern)
        .order("created_at", { ascending: false })
        .range(from, to)
        .then(({ data, error }) => ({ data: (data as { id: string }[]) ?? [], error }))
    );
    matchedAlumnoIds = matchedAlumnos.map((alumno) => alumno.id);
  }

  const rows = await fetchAllSupabaseRows<IngresoResumenSource>((from, to) => {
    let query = supabase
      .from("ingresos")
      .select("fecha, monto, estado")
      .eq("escuela_id", filters.escuelaId);

    if (filters.alumnoId) {
      query = query.eq("alumno_id", filters.alumnoId);
    }

    if (filters.metodoPago) {
      query = query.eq("metodo_pago", filters.metodoPago);
    }

    if (filters.categoria) {
      query = query.eq("categoria", filters.categoria);
    }

    if (filters.estado) {
      query = query.eq("estado", filters.estado);
    }

    query = applyIncomeViewToSupabaseQuery(query, filters.view || "all");

    query = applyDateFilter(query, year, filters.mes);

    if (search) {
      const pattern = `%${search}%`;
      if (matchedAlumnoIds.length > 0) {
        query = query.or(`concepto.ilike.${pattern},alumno_id.in.(${matchedAlumnoIds.join(",")})`);
      } else {
        query = query.or(`concepto.ilike.${pattern}`);
      }
    }

    return query
      .order("fecha", { ascending: false })
      .range(from, to)
      .then(({ data, error }) => ({ data: (data as IngresoResumenSource[]) ?? [], error }));
  });

  return aggregateRows(rows);
}
