"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";
import { fetchAllSupabaseRows } from "@/lib/supabase-pagination";
import {
  AccountingStatCard,
  AccountingWorkspaceHeader,
} from "@/components/dashboard/accounting/AccountingWorkspace";
import DataTable from "@/components/dashboard/DataTable";
import {
  buildAccountingYears,
  formatAccountingMoney,
  formatCompactDate,
  getCurrentAccountingYear,
  MONTH_OPTIONS,
} from "@/lib/accounting-dashboard";
import {
  fetchIngresosDiariosCalculados,
  type IngresoDiarioRow,
  type IngresoDiarioStats,
} from "@/lib/ingresos-diarios";
import type { Alumno, CategoriaIngreso, EstadoIngreso, MetodoPago } from "@/types/database";
import { Banknote, Calendar, Star, TrendingUp, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

type AlumnoOption = Pick<Alumno, "id" | "nombre" | "apellidos">;

// ─── Constants ───────────────────────────────────────────────────────

const inputCls = "apple-input";
const labelCls = "apple-label";

const currentYear = getCurrentAccountingYear();
const currentMonth = new Date().getMonth() + 1;
const years = buildAccountingYears();

const categorias: CategoriaIngreso[] = [
  "matricula",
  "mensualidad",
  "clase_suelta",
  "examen_teorico",
  "examen_practico",
  "examen_aptitud",
  "material",
  "tasas_dgt",
  "otros",
];

const metodos: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "datafono", label: "Datáfono" },
  { value: "nequi", label: "Nequi" },
  { value: "sistecredito", label: "Sistecrédito" },
  { value: "otro", label: "Otro" },
];

const estadosIngreso: EstadoIngreso[] = ["cobrado", "pendiente", "anulado"];

const emptyStats: IngresoDiarioStats = {
  totalCobrado: 0,
  totalPendiente: 0,
  totalAnulado: 0,
  diasConMovimientos: 0,
  promedioCobradoPorDia: 0,
  mejorDiaFecha: null,
  mejorDiaMonto: 0,
};

// ─── Component ───────────────────────────────────────────────────────

export default function CajaDiariaPage() {
  const { perfil } = useAuth();
  const fmt = (v: number) => formatAccountingMoney(Number(v || 0));

  // ─── Filters ──────────────────────────────────────────────────────

  const [filtroAlumno, setFiltroAlumno] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroYear, setFiltroYear] = useState(String(currentYear));

  const mesesDelAno =
    Number(filtroYear) === currentYear
      ? MONTH_OPTIONS.filter((m) => !m.value || Number(m.value) <= currentMonth)
      : MONTH_OPTIONS;

  const hayFiltros =
    filtroAlumno ||
    filtroMes ||
    filtroMetodo ||
    filtroCategoria ||
    filtroEstado ||
    filtroYear !== String(currentYear);

  const limpiarFiltros = () => {
    setFiltroAlumno("");
    setFiltroMes("");
    setFiltroMetodo("");
    setFiltroCategoria("");
    setFiltroEstado("");
    setFiltroYear(String(currentYear));
  };

  // ─── Catalogs ─────────────────────────────────────────────────────

  const [alumnos, setAlumnos] = useState<AlumnoOption[]>([]);
  const catalogFetchIdRef = useRef(0);

  useEffect(() => {
    if (!perfil?.escuela_id) return;
    const escuelaId = perfil.escuela_id;
    const fetchId = ++catalogFetchIdRef.current;
    const supabase = createClient();

    const load = async () => {
      try {
        const a = await fetchAllSupabaseRows<AlumnoOption>((from, to) =>
          supabase
            .from("alumnos")
            .select("id, nombre, apellidos")
            .eq("escuela_id", escuelaId)
            .order("nombre", { ascending: true })
            .order("apellidos", { ascending: true })
            .range(from, to)
            .then(({ data, error }) => ({ data: (data as AlumnoOption[]) ?? [], error }))
        );
        if (fetchId !== catalogFetchIdRef.current) return;
        setAlumnos(a);
      } catch (err) {
        console.error("[CajaDiariaPage] Error cargando alumnos:", err);
      }
    };

    void load();
  }, [perfil?.escuela_id]);

  // ─── Data ─────────────────────────────────────────────────────────

  const [rows, setRows] = useState<IngresoDiarioRow[]>([]);
  const [stats, setStats] = useState<IngresoDiarioStats>(emptyStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!perfil?.escuela_id) return;
    const fetchId = ++fetchIdRef.current;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const supabase = createClient();
        const result = await fetchIngresosDiariosCalculados(supabase, {
          escuelaId: perfil.escuela_id!,
          alumnoId: filtroAlumno || undefined,
          metodoPago: filtroMetodo || undefined,
          categoria: filtroCategoria || undefined,
          estado: (filtroEstado || undefined) as EstadoIngreso | undefined,
          mes: filtroMes || undefined,
          year: Number(filtroYear),
          search: undefined,
        });
        if (fetchId !== fetchIdRef.current) return;
        setRows(result.rows);
        setStats(result.stats);
      } catch (err: unknown) {
        if (fetchId !== fetchIdRef.current) return;
        setRows([]);
        setStats(emptyStats);
        setError(err instanceof Error ? err.message : "No se pudo calcular el resumen diario.");
      } finally {
        if (fetchId === fetchIdRef.current) setLoading(false);
      }
    };

    void load();
  }, [
    perfil?.escuela_id,
    filtroAlumno,
    filtroMes,
    filtroMetodo,
    filtroCategoria,
    filtroEstado,
    filtroYear,
  ]);

  // ─── Table columns ────────────────────────────────────────────────

  const columns = useMemo(
    () => [
      {
        key: "fecha" as keyof IngresoDiarioRow,
        label: "Fecha",
        render: (row: IngresoDiarioRow) => (
          <span className="font-medium">{formatCompactDate(row.fecha)}</span>
        ),
      },
      {
        key: "movimientos" as keyof IngresoDiarioRow,
        label: "Movimientos",
        render: (row: IngresoDiarioRow) => <span>{row.movimientos}</span>,
      },
      {
        key: "total_cobrado" as keyof IngresoDiarioRow,
        label: "Cobrado",
        render: (row: IngresoDiarioRow) => (
          <span className="font-semibold text-green-600 dark:text-green-400">
            {fmt(row.total_cobrado)}
          </span>
        ),
      },
      {
        key: "total_pendiente" as keyof IngresoDiarioRow,
        label: "Pendiente",
        render: (row: IngresoDiarioRow) => (
          <span className="font-semibold text-yellow-600 dark:text-yellow-400">
            {fmt(row.total_pendiente)}
          </span>
        ),
      },
      {
        key: "total_anulado" as keyof IngresoDiarioRow,
        label: "Anulado",
        render: (row: IngresoDiarioRow) => (
          <span className="font-semibold text-red-500 dark:text-red-400">
            {fmt(row.total_anulado)}
          </span>
        ),
      },
      {
        key: "total_registrado" as keyof IngresoDiarioRow,
        label: "Total del día",
        render: (row: IngresoDiarioRow) => (
          <span className="font-semibold">{fmt(row.total_registrado)}</span>
        ),
      },
    ],
    []
  );

  // ─── Render ───────────────────────────────────────────────────────

  if (!perfil?.escuela_id) return null;

  return (
    <div>
      <AccountingWorkspaceHeader
        badge="Control de caja"
        title="Caja diaria"
        description="Consolidado diario de ingresos cobrados, pendientes y anulados."
      />

      {/* Filters */}
      <div className="mb-4 space-y-3 rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-[#1d1d1f]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className={labelCls}>Alumno</label>
            <select
              value={filtroAlumno}
              onChange={(e) => setFiltroAlumno(e.target.value)}
              className={inputCls}
            >
              <option value="">Todos</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} {a.apellidos}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Método de pago</label>
            <select
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
              className={inputCls}
            >
              <option value="">Todos</option>
              {metodos.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className={inputCls}
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className={inputCls}
            >
              <option value="">Todos</option>
              {estadosIngreso.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Año</label>
            <select
              value={filtroYear}
              onChange={(e) => {
                setFiltroYear(e.target.value);
                setFiltroMes("");
              }}
              className={inputCls}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Mes de {filtroYear}</label>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className={inputCls}
            >
              {mesesDelAno.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hayFiltros && (
          <div className="flex">
            <button
              onClick={limpiarFiltros}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs text-[#86868b] transition-colors hover:bg-red-50 hover:text-red-500 dark:border-gray-700 dark:hover:bg-red-900/20"
            >
              <X size={12} />
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AccountingStatCard
          eyebrow="Periodo"
          label="Cobrado"
          value={loading ? "..." : fmt(stats.totalCobrado)}
          detail={`Pendiente: ${fmt(stats.totalPendiente)} · Anulado: ${fmt(stats.totalAnulado)}`}
          tone="success"
          icon={<Banknote size={18} />}
        />
        <AccountingStatCard
          eyebrow="Periodo"
          label="Promedio diario"
          value={loading ? "..." : fmt(stats.promedioCobradoPorDia)}
          detail={`${stats.diasConMovimientos} día${stats.diasConMovimientos === 1 ? "" : "s"} con movimiento.`}
          tone="primary"
          icon={<TrendingUp size={18} />}
        />
        <AccountingStatCard
          eyebrow="Periodo"
          label="Mejor día"
          value={loading ? "..." : stats.mejorDiaFecha ? fmt(stats.mejorDiaMonto) : "—"}
          detail={stats.mejorDiaFecha ? formatCompactDate(stats.mejorDiaFecha) : "Sin movimientos"}
          tone="default"
          icon={<Star size={18} />}
        />
        <AccountingStatCard
          eyebrow="Periodo"
          label="Días con movimiento"
          value={loading ? "..." : String(stats.diasConMovimientos)}
          detail={`Total registrado: ${fmt(stats.totalCobrado + stats.totalPendiente + stats.totalAnulado)}`}
          tone="default"
          icon={<Calendar size={18} />}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          searchPlaceholder="Buscar fecha..."
          searchKeys={["fecha"]}
          pageSize={12}
        />
      </div>
    </div>
  );
}
