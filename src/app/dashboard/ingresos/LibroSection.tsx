"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AccountingBreakdownCard from "@/components/dashboard/AccountingBreakdownCard";
import {
  AccountingChipTabs,
  AccountingMiniList,
  AccountingStatCard,
} from "@/components/dashboard/accounting/AccountingWorkspace";
import DataTable from "@/components/dashboard/DataTable";
import {
  type AccountingBreakdownRow,
  type AccountingReportResponse,
  buildAccountingYears,
  downloadCsv,
  fetchAccountingReport,
  formatAccountingMoney,
  formatCompactDate,
  getCurrentAccountingYear,
  getMonthDateRange,
  MONTH_OPTIONS,
} from "@/lib/accounting-dashboard";
import {
  applyIncomeViewToSupabaseQuery,
  EXAMEN_INCOME_CATEGORIES,
  INCOME_VIEW_ITEMS,
  type IncomeView,
} from "@/lib/income-view";
import { createClient } from "@/lib/supabase";
import { fetchAllSupabaseRows } from "@/lib/supabase-pagination";
import type { EstadoIngreso, Ingreso, MetodoPago } from "@/types/database";
import { BookOpen, Clock3, ReceiptText, Wallet, X } from "lucide-react";
import {
  type AlumnoOption,
  categorias,
  estadoColors,
  estadosIngreso,
  findMatchedAlumnoIds,
  formatMatriculaLabel,
  getShare,
  inputCls,
  type IngresoRow,
  labelCls,
  type LibroSectionProps,
  type MatriculaOption,
  metodos,
  PAGE_SIZE,
} from "./shared";

const currentYear = getCurrentAccountingYear();
const currentMonth = new Date().getMonth() + 1;
const years = buildAccountingYears();

export default function LibroSection({
  escuelaId,
  alumnos,
  matriculas,
  reloadKey,
  onEdit,
  onDelete,
  exportCsvRef,
}: LibroSectionProps) {
  // ─── Filter state ─────────────────────────────────────────────────

  const [activeView, setActiveView] = useState<IncomeView>("all");
  const [filtroAlumno, setFiltroAlumno] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroYear, setFiltroYear] = useState(String(currentYear));
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  // ─── Data state ───────────────────────────────────────────────────

  const [data, setData] = useState<IngresoRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const fetchIdRef = useRef(0);

  const [report, setReport] = useState<AccountingReportResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  // ─── Exam auto-adjustment ────────────────────────────────────────

  const [infoMessage, setInfoMessage] = useState("");
  const [examAvailability, setExamAvailability] = useState<{
    examen_teorico: boolean;
    examen_practico: boolean;
    examen_aptitud: boolean;
  } | null>(null);
  const examYearAdjustedRef = useRef(false);

  // ─── Derived ──────────────────────────────────────────────────────

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
    filtroYear !== String(currentYear) ||
    activeView !== "all";

  const totalFiltrado = useMemo(() => data.reduce((sum, r) => sum + Number(r.monto), 0), [data]);

  const limpiarFiltros = () => {
    setActiveView("all");
    setFiltroAlumno("");
    setFiltroMes("");
    setFiltroMetodo("");
    setFiltroCategoria("");
    setFiltroEstado("");
    setFiltroYear(String(currentYear));
    setSearchTerm("");
    setCurrentPage(0);
  };

  // ─── Exam availability ───────────────────────────────────────────

  useEffect(() => {
    if (activeView !== "examenes") {
      setInfoMessage("");
      setExamAvailability(null);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    const check = async () => {
      try {
        const [t, p, a] = await Promise.all([
          supabase
            .from("ingresos")
            .select("id", { count: "exact", head: true })
            .eq("escuela_id", escuelaId)
            .eq("categoria", "examen_teorico"),
          supabase
            .from("ingresos")
            .select("id", { count: "exact", head: true })
            .eq("escuela_id", escuelaId)
            .eq("categoria", "examen_practico"),
          supabase
            .from("ingresos")
            .select("id", { count: "exact", head: true })
            .eq("escuela_id", escuelaId)
            .eq("categoria", "examen_aptitud"),
        ]);
        if (cancelled) return;
        setExamAvailability({
          examen_teorico: (t.count ?? 0) > 0,
          examen_practico: (p.count ?? 0) > 0,
          examen_aptitud: (a.count ?? 0) > 0,
        });
      } catch {
        if (!cancelled) setExamAvailability(null);
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [escuelaId, activeView]);

  // ─── Exam year auto-adjust ────────────────────────────────────────

  useEffect(() => {
    if (
      activeView !== "examenes" ||
      filtroYear !== String(currentYear) ||
      examYearAdjustedRef.current
    )
      return;

    let cancelled = false;
    const supabase = createClient();

    const align = async () => {
      try {
        const { count, error: countErr } = await supabase
          .from("ingresos")
          .select("id", { count: "exact", head: true })
          .eq("escuela_id", escuelaId)
          .in("categoria", EXAMEN_INCOME_CATEGORIES)
          .gte("fecha", `${currentYear}-01-01`)
          .lt("fecha", `${currentYear + 1}-01-01`);
        if (countErr || cancelled || (count ?? 0) > 0) return;

        const { data: latest, error: latestErr } = await supabase
          .from("ingresos")
          .select("fecha")
          .eq("escuela_id", escuelaId)
          .in("categoria", EXAMEN_INCOME_CATEGORIES)
          .order("fecha", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestErr || cancelled || !latest?.fecha) return;

        const latestYear = String(latest.fecha).slice(0, 4);
        if (latestYear === filtroYear) return;

        examYearAdjustedRef.current = true;
        setFiltroYear(latestYear);
        setFiltroMes("");
        setCurrentPage(0);
        setInfoMessage(
          `No hay ingresos de exámenes en ${currentYear}; se cargó automáticamente ${latestYear}, donde sí existe histórico.`
        );
      } catch {
        /* ignore */
      }
    };

    void align();
    return () => {
      cancelled = true;
    };
  }, [escuelaId, activeView, filtroYear]);

  // ─── Load ledger data ─────────────────────────────────────────────

  useEffect(() => {
    const fetchId = ++fetchIdRef.current;

    const load = async () => {
      setLoading(true);
      const supabase = createClient();

      let countQuery = supabase
        .from("ingresos")
        .select("id", { count: "exact", head: true })
        .eq("escuela_id", escuelaId);
      let dataQuery = supabase
        .from("ingresos")
        .select(
          "id, alumno_id, matricula_id, categoria, concepto, monto, metodo_pago, medio_especifico, numero_factura, fecha, fecha_vencimiento, estado, notas, created_at"
        )
        .eq("escuela_id", escuelaId);

      if (filtroAlumno) {
        countQuery = countQuery.eq("alumno_id", filtroAlumno);
        dataQuery = dataQuery.eq("alumno_id", filtroAlumno);
      }
      if (filtroYear) {
        const selectedYear = Number(filtroYear);
        const startDate = filtroMes ? `${selectedYear}-${filtroMes}-01` : `${selectedYear}-01-01`;
        const endMonth = Number(filtroMes || "12");
        const endDate = filtroMes
          ? endMonth === 12
            ? `${selectedYear + 1}-01-01`
            : `${selectedYear}-${String(endMonth + 1).padStart(2, "0")}-01`
          : `${selectedYear + 1}-01-01`;
        countQuery = countQuery.gte("fecha", startDate).lt("fecha", endDate);
        dataQuery = dataQuery.gte("fecha", startDate).lt("fecha", endDate);
      }

      countQuery = applyIncomeViewToSupabaseQuery(countQuery, activeView);
      dataQuery = applyIncomeViewToSupabaseQuery(dataQuery, activeView);

      if (filtroMetodo) {
        countQuery = countQuery.eq("metodo_pago", filtroMetodo);
        dataQuery = dataQuery.eq("metodo_pago", filtroMetodo);
      }
      if (filtroCategoria) {
        countQuery = countQuery.eq("categoria", filtroCategoria);
        dataQuery = dataQuery.eq("categoria", filtroCategoria);
      }
      if (filtroEstado) {
        countQuery = countQuery.eq("estado", filtroEstado);
        dataQuery = dataQuery.eq("estado", filtroEstado);
      }

      if (searchTerm) {
        const pattern = `%${searchTerm}%`;
        const matchedIds = await findMatchedAlumnoIds(supabase, escuelaId, searchTerm);
        const orFilter =
          matchedIds.length > 0
            ? `concepto.ilike.${pattern},numero_factura.ilike.${pattern},medio_especifico.ilike.${pattern},alumno_id.in.(${matchedIds.join(",")})`
            : `concepto.ilike.${pattern},numero_factura.ilike.${pattern},medio_especifico.ilike.${pattern}`;
        countQuery = countQuery.or(orFilter);
        dataQuery = dataQuery.or(orFilter);
      }

      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const [countRes, ingresosRes] = await Promise.all([
        countQuery,
        dataQuery
          .order("fecha", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to),
      ]);

      if (fetchId !== fetchIdRef.current) return;

      const alumnosMap = new Map(alumnos.map((a) => [a.id, `${a.nombre} ${a.apellidos}`.trim()]));
      const matriculasMap = new Map(matriculas.map((m) => [m.id, formatMatriculaLabel(m)]));

      setTotalCount(countRes.count ?? 0);
      setData(
        ((ingresosRes.data as Ingreso[]) ?? []).map((row) => ({
          ...row,
          alumno_nombre: row.alumno_id ? alumnosMap.get(row.alumno_id) || "—" : "—",
          matricula_label: row.matricula_id
            ? matriculasMap.get(row.matricula_id) || "Sin contrato"
            : "—",
        }))
      );
      setLoading(false);
    };

    void load();
  }, [
    escuelaId,
    reloadKey,
    currentPage,
    searchTerm,
    filtroAlumno,
    filtroMes,
    filtroMetodo,
    filtroCategoria,
    filtroEstado,
    filtroYear,
    activeView,
    alumnos,
    matriculas,
  ]);

  // ─── Load summary ─────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const { from, to } = getMonthDateRange(Number(filtroYear), filtroMes);
      const params = new URLSearchParams({
        from,
        to,
        include: "summary,breakdown,contracts",
      });

      if (filtroAlumno) params.set("alumno_id", filtroAlumno);
      if (filtroMetodo) params.set("ingreso_metodo", filtroMetodo);
      if (filtroCategoria) params.set("ingreso_categoria", filtroCategoria);
      if (filtroEstado) params.set("ingreso_estado", filtroEstado);
      if (activeView !== "all") params.set("ingreso_view", activeView);
      if (searchTerm) params.set("q", searchTerm);

      setSummaryLoading(true);
      setSummaryError("");

      try {
        const payload = await fetchAccountingReport(params);
        setReport(payload);
      } catch (err: unknown) {
        setReport(null);
        setSummaryError(
          err instanceof Error ? err.message : "No se pudo cargar el resumen contable."
        );
      } finally {
        setSummaryLoading(false);
      }
    };

    void load();
  }, [
    filtroAlumno,
    filtroMetodo,
    filtroCategoria,
    filtroEstado,
    filtroMes,
    filtroYear,
    searchTerm,
    activeView,
    reloadKey,
  ]);

  // ─── Export CSV ───────────────────────────────────────────────────

  const handleExportCsv = useCallback(async () => {
    const supabase = createClient();
    const rows: IngresoRow[] = [];
    const pageSize = 1000;
    let offset = 0;

    while (true) {
      let query = supabase
        .from("ingresos")
        .select(
          "id, alumno_id, matricula_id, categoria, concepto, monto, metodo_pago, medio_especifico, numero_factura, fecha, fecha_vencimiento, estado, notas, created_at"
        )
        .eq("escuela_id", escuelaId)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (filtroAlumno) query = query.eq("alumno_id", filtroAlumno);
      if (filtroMetodo) query = query.eq("metodo_pago", filtroMetodo);
      if (filtroCategoria) query = query.eq("categoria", filtroCategoria);
      if (filtroEstado) query = query.eq("estado", filtroEstado);
      if (filtroYear) {
        const range = getMonthDateRange(Number(filtroYear), filtroMes);
        query = query.gte("fecha", range.from).lte("fecha", range.to);
      }
      query = applyIncomeViewToSupabaseQuery(query, activeView);

      if (searchTerm) {
        const pattern = `%${searchTerm}%`;
        const matchedIds = await findMatchedAlumnoIds(supabase, escuelaId, searchTerm);
        query =
          matchedIds.length > 0
            ? query.or(
                `concepto.ilike.${pattern},numero_factura.ilike.${pattern},medio_especifico.ilike.${pattern},alumno_id.in.(${matchedIds.join(",")})`
              )
            : query.or(
                `concepto.ilike.${pattern},numero_factura.ilike.${pattern},medio_especifico.ilike.${pattern}`
              );
      }

      const { data: batch, error: exportError } = await query;
      if (exportError) throw exportError;

      const alumnosMap = new Map(alumnos.map((a) => [a.id, `${a.nombre} ${a.apellidos}`.trim()]));
      const matriculasMap = new Map(matriculas.map((m) => [m.id, formatMatriculaLabel(m)]));

      const normalized = ((batch as Ingreso[]) ?? []).map((row) => ({
        ...row,
        alumno_nombre: row.alumno_id ? alumnosMap.get(row.alumno_id) || "—" : "—",
        matricula_label: row.matricula_id
          ? matriculasMap.get(row.matricula_id) || "Sin contrato"
          : "—",
      }));

      rows.push(...normalized);
      if (normalized.length < pageSize) break;
      offset += pageSize;
    }

    downloadCsv(
      `ingresos-${activeView}-${filtroYear}${filtroMes ? `-${filtroMes}` : ""}.csv`,
      [
        "Fecha",
        "Vencimiento",
        "Categoria",
        "Concepto",
        "Alumno",
        "Matricula",
        "Monto",
        "Metodo",
        "Estado",
        "Factura",
        "Notas",
      ],
      rows.map((r) => [
        r.fecha,
        r.fecha_vencimiento,
        r.categoria,
        r.concepto,
        r.alumno_nombre,
        r.matricula_label,
        Number(r.monto),
        r.metodo_pago,
        r.estado,
        r.numero_factura,
        r.notas,
      ])
    );
  }, [
    escuelaId,
    filtroAlumno,
    filtroMetodo,
    filtroCategoria,
    filtroEstado,
    filtroYear,
    filtroMes,
    activeView,
    searchTerm,
    alumnos,
    matriculas,
  ]);

  useEffect(() => {
    exportCsvRef.current = handleExportCsv;
    return () => {
      exportCsvRef.current = null;
    };
  }, [handleExportCsv, exportCsvRef]);

  // ─── Summary derived data ────────────────────────────────────────

  const lineItems = report?.breakdown.ingresosPorLinea || [];
  const cursosLine = lineItems.find((r) => r.nombre === "Cursos");
  const examenesLine = lineItems.find((r) => r.nombre === "Examenes");
  const practicasLine = lineItems.find((r) => r.nombre === "Practica adicional");

  const topCategoryItems = (report?.breakdown.ingresosPorCategoria || [])
    .slice(0, 5)
    .map((row: AccountingBreakdownRow) => ({
      label: row.categoria || "Sin categoría",
      value: Number(row.total || 0),
      meta: `${row.cantidad} movimiento${row.cantidad === 1 ? "" : "s"} · ${getShare(Number(row.total || 0), report?.summary.ingresosCobrados || 0)} del cobrado`,
    }));

  const topMethodItems = (report?.breakdown.ingresosPorMetodo || [])
    .slice(0, 5)
    .map((row: AccountingBreakdownRow) => ({
      label: row.metodo_pago || "Sin método",
      value: Number(row.total || 0),
      meta: `${row.cantidad} movimiento${row.cantidad === 1 ? "" : "s"} · ${getShare(Number(row.total || 0), report?.summary.ingresosCobrados || 0)} del cobrado`,
    }));

  const topDebtorItems = (report?.contracts?.topDeudores || []).slice(0, 5).map((row) => ({
    label: row.nombre,
    value: Number(row.total || 0),
    meta: `${row.cantidad} obligación${row.cantidad === 1 ? "" : "es"} pendiente${row.cantidad === 1 ? "" : "s"}`,
  }));

  // ─── Columns ──────────────────────────────────────────────────────

  const columns = useMemo(
    () => [
      {
        key: "fecha" as keyof IngresoRow,
        label: "Fecha",
      },
      {
        key: "concepto" as keyof IngresoRow,
        label: "Concepto",
        render: (row: IngresoRow) => {
          let texto = row.concepto;
          if (row.alumno_nombre && row.alumno_nombre !== "—") {
            texto = texto
              .replace(` — ${row.alumno_nombre}`, "")
              .replace(` - ${row.alumno_nombre}`, "");
          }
          return <span className="font-medium">{texto}</span>;
        },
      },
      {
        key: "alumno_nombre" as keyof IngresoRow,
        label: "Alumno",
        render: (row: IngresoRow) => <span>{row.alumno_nombre}</span>,
      },
      {
        key: "matricula_label" as keyof IngresoRow,
        label: "Matrícula",
        render: (row: IngresoRow) => (
          <span className="text-xs text-[#86868b]">{row.matricula_label}</span>
        ),
      },
      {
        key: "monto" as keyof IngresoRow,
        label: "Monto",
        render: (row: IngresoRow) => (
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatAccountingMoney(Number(row.monto))}
          </span>
        ),
      },
      {
        key: "metodo_pago" as keyof IngresoRow,
        label: "Método",
        render: (row: IngresoRow) => (
          <span className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-xs font-medium text-[#0071e3] capitalize">
            {metodos.find((m) => m.value === row.metodo_pago)?.label || row.metodo_pago}
          </span>
        ),
      },
      {
        key: "estado" as keyof IngresoRow,
        label: "Estado",
        render: (row: IngresoRow) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${estadoColors[row.estado]}`}
          >
            {row.estado}
          </span>
        ),
      },
    ],
    []
  );

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <>
      {/* View chips + filters */}
      <div className="mb-4 space-y-3 rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-[#1d1d1f]">
        <AccountingChipTabs
          value={activeView}
          items={INCOME_VIEW_ITEMS}
          onChange={(v) => {
            setActiveView(v);
            setFiltroEstado("");
            setCurrentPage(0);
          }}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className={labelCls}>Alumno</label>
            <select
              value={filtroAlumno}
              onChange={(e) => {
                setFiltroAlumno(e.target.value);
                setCurrentPage(0);
              }}
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
              onChange={(e) => {
                setFiltroMetodo(e.target.value);
                setCurrentPage(0);
              }}
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
              onChange={(e) => {
                setFiltroCategoria(e.target.value);
                setCurrentPage(0);
              }}
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
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setCurrentPage(0);
              }}
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
                setCurrentPage(0);
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
              onChange={(e) => {
                setFiltroMes(e.target.value);
                setCurrentPage(0);
              }}
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

        {hayFiltros && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
            <p className="text-xs text-[#86868b]">
              {totalCount} ingreso{totalCount !== 1 ? "s" : ""} encontrado
              {totalCount !== 1 ? "s" : ""}
            </p>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              Total página: {formatAccountingMoney(totalFiltrado)}
            </p>
          </div>
        )}
      </div>

      {/* Exam info */}
      {activeView === "examenes" && (
        <div className="mb-4 space-y-3">
          {infoMessage && (
            <div className="rounded-2xl border border-[#0071e3]/15 bg-[#0071e3]/6 px-4 py-3 text-sm text-[#0b63c7] dark:border-[#0071e3]/20 dark:bg-[#0071e3]/10 dark:text-[#69a9ff]">
              {infoMessage}
            </div>
          )}
          {examAvailability && (
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-[#4a4a4f] dark:border-gray-800 dark:bg-[#1d1d1f] dark:text-[#c7c7cc]">
              <p className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Cobros de exámenes cargados en base
              </p>
              <p className="mt-1">
                Teórico: {examAvailability.examen_teorico ? "disponible" : "sin ingresos separados"}{" "}
                · Práctico:{" "}
                {examAvailability.examen_practico ? "disponible" : "sin ingresos separados"} ·
                Aptitud: {examAvailability.examen_aptitud ? "disponible" : "sin ingresos cargados"}.
              </p>
            </div>
          )}
        </div>
      )}

      {summaryError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {summaryError}
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AccountingStatCard
            eyebrow="Recaudo"
            label="Cobrado"
            value={
              summaryLoading ? "..." : formatAccountingMoney(report?.summary.ingresosCobrados || 0)
            }
            detail={`${report?.summary.totalIngresos || 0} ingreso${(report?.summary.totalIngresos || 0) === 1 ? "" : "s"} en el periodo.`}
            tone="success"
            icon={<Wallet size={18} />}
          />
          <AccountingStatCard
            eyebrow="Cobranza"
            label="Pendiente"
            value={
              summaryLoading
                ? "..."
                : formatAccountingMoney(report?.summary.ingresosPendientes || 0)
            }
            detail="Saldo abierto todavía sin entrar a caja."
            tone="warning"
            icon={<Clock3 size={18} />}
          />
          <AccountingStatCard
            eyebrow="Línea"
            label="Cursos"
            value={summaryLoading ? "..." : formatAccountingMoney(Number(cursosLine?.total || 0))}
            detail="Matrícula, mensualidad, material y tasas."
            tone="primary"
            icon={<BookOpen size={18} />}
          />
          <AccountingStatCard
            eyebrow="Línea"
            label="Exámenes"
            value={summaryLoading ? "..." : formatAccountingMoney(Number(examenesLine?.total || 0))}
            detail="Teóricos, prácticos y aptitud."
            tone="default"
            icon={<ReceiptText size={18} />}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <AccountingMiniList
            title="Concentración por categoría"
            description="Dónde se está concentrando el recaudo."
            emptyLabel="No hay categorías con ingresos en el periodo."
            items={topCategoryItems.map((i) => ({
              label: i.label,
              value: formatAccountingMoney(i.value),
              meta: i.meta,
            }))}
          />
          <AccountingMiniList
            title="Concentración por método"
            description="Cómo está entrando el dinero."
            emptyLabel="No hay métodos con recaudo en el periodo."
            items={topMethodItems.map((i) => ({
              label: i.label,
              value: formatAccountingMoney(i.value),
              meta: i.meta,
            }))}
          />
          <AccountingMiniList
            title="Conceptos fuertes"
            description="Conceptos con mayor peso económico."
            emptyLabel="No hay conceptos registrados en el periodo."
            items={(report?.breakdown.topConceptosIngreso || []).slice(0, 6).map((row) => ({
              label: row.concepto || "Sin concepto",
              value: formatAccountingMoney(row.total),
              meta: `${row.cantidad} movimiento${row.cantidad === 1 ? "" : "s"}`,
            }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AccountingMiniList
            title="Líneas del recaudo"
            description="Lectura rápida del mix comercial del periodo."
            emptyLabel="No hay líneas de ingreso registradas."
            items={[
              {
                label: "Cursos",
                value: formatAccountingMoney(Number(cursosLine?.total || 0)),
                meta: `${cursosLine?.cantidad || 0} movimiento${(cursosLine?.cantidad || 0) === 1 ? "" : "s"}`,
              },
              {
                label: "Exámenes",
                value: formatAccountingMoney(Number(examenesLine?.total || 0)),
                meta: `${examenesLine?.cantidad || 0} movimiento${(examenesLine?.cantidad || 0) === 1 ? "" : "s"}`,
              },
              {
                label: "Práctica adicional",
                value: formatAccountingMoney(Number(practicasLine?.total || 0)),
                meta: `${practicasLine?.cantidad || 0} movimiento${(practicasLine?.cantidad || 0) === 1 ? "" : "s"}`,
              },
            ]}
          />
          <AccountingMiniList
            title="Top deudores"
            description="Quién tiene el saldo pendiente más alto."
            emptyLabel="No hay deudores pendientes en el periodo."
            items={topDebtorItems.map((i) => ({
              label: i.label,
              value: formatAccountingMoney(i.value),
              meta: i.meta,
            }))}
          />
        </div>
      </div>

      {/* DataTable */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
        {!hayFiltros && !loading && data.length > 0 && (
          <div className="mb-3 flex justify-end">
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              Total página: {formatAccountingMoney(totalFiltrado)}
            </p>
          </div>
        )}
        <DataTable
          key="libro"
          columns={columns}
          data={data}
          loading={loading}
          searchPlaceholder="Buscar por concepto o cédula..."
          searchTerm={searchTerm}
          onEdit={onEdit}
          onDelete={onDelete}
          serverSide
          totalCount={totalCount}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onSearchChange={(term) => {
            setSearchTerm(term);
            setCurrentPage(0);
          }}
          pageSize={PAGE_SIZE}
        />
      </div>
    </>
  );
}
