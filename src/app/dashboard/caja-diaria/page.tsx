"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";
import { fetchAllSupabaseRows } from "@/lib/supabase-pagination";
import {
  downloadCsv,
  formatAccountingMoney,
  MONTH_OPTIONS,
} from "@/lib/accounting-dashboard";
import { fetchDailyCashDashboard } from "@/lib/finance/daily-cash-service";
import { AccountingWorkspaceHeader } from "@/components/dashboard/accounting/AccountingWorkspace";
import ExportFormatActions from "@/components/dashboard/ExportFormatActions";
import type { DailyCashRow, DailyCashStats } from "@/lib/finance/types";
import { downloadSpreadsheetWorkbook } from "@/lib/spreadsheet-export";
import {
  AlumnoOption,
  currentMonth,
  currentYear,
  emptyStats,
  years,
} from "./constants";
import {
  CajaDiariaFiltersSection,
  CajaDiariaLedgerSection,
  CajaDiariaOverviewSection,
} from "./CajaDiariaSections";

// ─── Component ───────────────────────────────────────────────────────

export default function CajaDiariaPage() {
  const { perfil } = useAuth();
  const fmt = (v: number) => formatAccountingMoney(Number(v || 0));
  const defaultMonth = String(currentMonth).padStart(2, "0");

  // ─── Filters ──────────────────────────────────────────────────────

  const [filtroAlumno, setFiltroAlumno] = useState("");
  const [filtroMes, setFiltroMes] = useState(defaultMonth);
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
    filtroMes !== defaultMonth ||
    filtroMetodo ||
    filtroCategoria ||
    filtroEstado ||
    filtroYear !== String(currentYear);

  const limpiarFiltros = () => {
    setFiltroAlumno("");
    setFiltroMes(defaultMonth);
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

  const [rows, setRows] = useState<DailyCashRow[]>([]);
  const [stats, setStats] = useState<DailyCashStats>(emptyStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exportingFormat, setExportingFormat] = useState<"csv" | "xls" | null>(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!perfil?.escuela_id) return;
    const fetchId = ++fetchIdRef.current;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          year: String(Number(filtroYear)),
        });
        if (filtroMes) params.set("month", filtroMes);
        if (filtroAlumno) params.set("alumno_id", filtroAlumno);
        if (filtroMetodo) params.set("metodo", filtroMetodo);
        if (filtroCategoria) params.set("categoria", filtroCategoria);
        if (filtroEstado) params.set("estado", filtroEstado);

        const result = await fetchDailyCashDashboard(params);
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

  // ─── Render ───────────────────────────────────────────────────────

  if (!perfil?.escuela_id) return null;

  const selectedMonthLabel =
    MONTH_OPTIONS.find((item) => item.value === filtroMes)?.label || "Mes actual";

  const handleExport = async (format: "csv" | "xls") => {
    if (rows.length === 0) return;
    setExportingFormat(format);

    const filenameBase = `caja-diaria-${filtroYear}-${filtroMes || "mes"}`;
    const headers = [
      "Fecha",
      "Movimientos",
      "Efectivo",
      "Datafono",
      "Nequi",
      "Sistecredito",
      "Otro",
      "Total registrado",
    ];
    const exportRows = rows.map((row) => [
      row.fecha,
      row.movimientos,
      row.total_efectivo,
      row.total_datafono,
      row.total_nequi,
      row.total_sistecredito,
      row.total_otro,
      row.total_registrado,
    ]);

    try {
      if (format === "csv") {
        downloadCsv(`${filenameBase}.csv`, headers, exportRows);
        return;
      }

      await downloadSpreadsheetWorkbook(`${filenameBase}.xls`, [
        {
          name: "Resumen caja",
          headers: ["Indicador", "Valor"],
          rows: [
            ["Total efectivo", stats.totalEfectivo],
            ["Total datafono", stats.totalDatafono],
            ["Total Nequi", stats.totalNequi],
            ["Total Sistecredito", stats.totalSistecredito],
            ["Total otro", stats.totalOtro],
            ["Total registrado", stats.totalRegistrado],
            ["Dias con movimientos", stats.diasConMovimientos],
            ["Promedio por dia", stats.promedioPorDia],
          ],
        },
        {
          name: "Detalle diario",
          headers,
          rows: exportRows,
        },
      ]);
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div>
      <AccountingWorkspaceHeader
        badge="Control de caja"
        title="Caja diaria"
        description={`Consolidado diario de ingresos cobrados para ${selectedMonthLabel.toLowerCase()}, desglosado por método de pago.`}
        actions={
          <ExportFormatActions
            exportingFormat={exportingFormat}
            disabled={rows.length === 0}
            onExportCsv={() => void handleExport("csv")}
            onExportXls={() => void handleExport("xls")}
          />
        }
      />

      <CajaDiariaFiltersSection
        filtroAlumno={filtroAlumno}
        filtroMetodo={filtroMetodo}
        filtroCategoria={filtroCategoria}
        filtroEstado={filtroEstado}
        filtroYear={filtroYear}
        filtroMes={filtroMes}
        alumnos={alumnos}
        mesesDelAno={mesesDelAno}
        years={years}
        hayFiltros={Boolean(hayFiltros)}
        onAlumnoChange={setFiltroAlumno}
        onMetodoChange={setFiltroMetodo}
        onCategoriaChange={setFiltroCategoria}
        onEstadoChange={setFiltroEstado}
        onYearChange={(value) => {
          setFiltroYear(value);
        }}
        onMesChange={setFiltroMes}
        onClearFilters={limpiarFiltros}
      />

      <CajaDiariaOverviewSection
        loading={loading}
        stats={stats}
        formatMoney={fmt}
        periodLabel={selectedMonthLabel}
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {error}
        </div>
      )}

      <CajaDiariaLedgerSection rows={rows} loading={loading} formatMoney={fmt} />
    </div>
  );
}
