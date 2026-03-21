"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobileVariant } from "@/hooks/useDeviceVariant";
import { AccountingWorkspaceHeader } from "@/components/dashboard/accounting/AccountingWorkspace";
import ExportFormatActions from "@/components/dashboard/ExportFormatActions";
import {
  buildAccountingYears,
  getCurrentAccountingYear,
  MONTH_OPTIONS,
  type AccountingReportResponse,
} from "@/lib/accounting-dashboard";
import { fetchFinanceReportsDashboard } from "@/lib/finance/reports-service";
import { downloadSpreadsheetWorkbook, type SpreadsheetSheet } from "@/lib/spreadsheet-export";
import {
  buildParams,
  createDefaultFilters,
  parseSection,
  REPORT_SECTIONS,
  type FilterState,
  type ReportSection,
} from "./constants";
import {
  InformesFiltersPanel,
  InformesStatusBanner,
  InformesStudentsSection,
  InformesSummarySection,
  InformesTabs,
} from "./InformesSections";

export default function InformesPage() {
  const { perfil } = useAuth();
  const isMobile = useIsMobileVariant();
  const searchParams = useSearchParams();
  const autoAlignedYearRef = useRef(false);
  const freshRetryKeyRef = useRef<string | null>(null);
  const [activeSection, setActiveSection] = useState<ReportSection>(
    parseSection(searchParams.get("section"))
  );
  const [draftFilters, setDraftFilters] = useState<FilterState>(createDefaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(createDefaultFilters);
  const [report, setReport] = useState<AccountingReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<"csv" | "xls" | null>(null);

  useEffect(() => {
    setActiveSection(parseSection(searchParams.get("section")));
  }, [searchParams]);
  const loadReport = useCallback(
    async (
      filters: FilterState,
      section: ReportSection,
      options?: {
        forceFresh?: boolean;
        useCache?: boolean;
      }
    ) => {
    setLoading(true);
    setLoadError(null);
    try {
      const nextReport = await fetchFinanceReportsDashboard(buildParams(filters, section), options);
      setReport(nextReport);
    } catch (reportError: unknown) {
      const message =
        reportError instanceof Error
          ? reportError.message
          : "No se pudo generar el informe contable.";
      setLoadError(message);
      setReport(null);
      toast.error(
        message
      );
    } finally {
      setLoading(false);
    }
    },
    []
  );

  useEffect(() => {
    void loadReport(appliedFilters, activeSection);
  }, [appliedFilters, activeSection, loadReport]);

  useEffect(() => {
    if (!report?.options) return;
    const validSchool =
      !draftFilters.escuelaId ||
      report.options.escuelas.some((item) => item.id === draftFilters.escuelaId);
    const nextSchoolId = validSchool ? draftFilters.escuelaId : "";
    const sedes = report.options.sedes.filter(
      (item) => !nextSchoolId || item.escuela_id === nextSchoolId
    );
    const validSede = !draftFilters.sedeId || sedes.some((item) => item.id === draftFilters.sedeId);

    if (!validSchool || !validSede) {
      setDraftFilters((current) => ({
        ...current,
        escuelaId: nextSchoolId,
        sedeId: validSede ? current.sedeId : "",
      }));
    }
  }, [draftFilters.escuelaId, draftFilters.sedeId, report?.options]);

  const handleGenerate = () => {
    setAppliedFilters(draftFilters);
  };

  const handleReset = () => {
    const next = createDefaultFilters();
    const preferredYear = report?.options?.availableYears?.[0];
    if (preferredYear) {
      next.year = String(preferredYear);
    }
    setDraftFilters(next);
    setAppliedFilters(next);
  };

  const buildReportSheets = useCallback(
    (nextReport: AccountingReportResponse, section: ReportSection): SpreadsheetSheet[] => {
      const sheets: SpreadsheetSheet[] = [
        {
          name: "Resumen",
          headers: ["Indicador", "Valor"],
          rows: [
            ["Ingresos cobrados", nextReport.summary?.ingresosCobrados || 0],
            ["Pendiente por cobrar", nextReport.summary?.ingresosPendientes || 0],
            ["Gastos totales", nextReport.summary?.gastosTotales || 0],
            ["Balance neto", nextReport.summary?.balanceNeto || 0],
            ["Margen (%)", Number((nextReport.summary?.margenPorcentaje || 0).toFixed(2))],
          ],
        },
      ];

      if (section !== "estudiantes") {
        sheets.push(
          {
            name: "Ingresos por linea",
            headers: ["Linea", "Cantidad", "Total"],
            rows: (nextReport.breakdown?.ingresosPorLinea || []).map((row) => [
              row.nombre || "Sin clasificar",
              row.cantidad,
              row.total,
            ]),
          },
          {
            name: "Gastos por categoria",
            headers: ["Categoria", "Cantidad", "Total"],
            rows: (nextReport.breakdown?.gastosPorCategoria || []).map((row) => [
              row.categoria || "Sin clasificar",
              row.cantidad,
              row.total,
            ]),
          },
          {
            name: "Serie diaria",
            headers: ["Fecha", "Ingresos", "Pendientes", "Gastos", "Balance"],
            rows: (nextReport.series?.diaria || []).map((row) => [
              row.fecha,
              row.ingresos,
              row.pendientes,
              row.gastos,
              row.balance,
            ]),
          },
          {
            name: "Cartera critica",
            headers: ["Alumno", "Referencia", "Saldo pendiente", "Dias pendiente"],
            rows: (nextReport.contracts?.oldestPending || []).map((row) => [
              row.nombre,
              row.referencia || "",
              row.saldoPendiente,
              row.diasPendiente,
            ]),
          },
          {
            name: "Cuentas por pagar",
            headers: ["Contraparte", "Cantidad", "Total pendiente"],
            rows: (nextReport.payables?.topProveedores || []).map((row) => [
              row.nombre,
              row.cantidad,
              row.total,
            ]),
          }
        );
      }

      if (section === "estudiantes") {
        sheets.push({
          name: "Estudiantes",
          headers: [
            "Nombre",
            "Documento",
            "Tipo registro",
            "Categorias",
            "Fecha inscripcion",
            "Valor total",
            "Total pagado",
            "Saldo pendiente",
          ],
          rows: (nextReport.students?.rows || []).map((row) => [
            row.nombre,
            row.dni,
            row.tipo_registro,
            row.categorias.join(", "),
            row.fecha_inscripcion,
            row.valor_total,
            row.total_pagado,
            row.saldo_pendiente,
          ]),
        });
      }

      return sheets.filter((sheet) => sheet.rows.length > 0);
    },
    []
  );

  const handleExport = async (format: "csv" | "xls") => {
    setExportingFormat(format);
    try {
      const params = buildParams(appliedFilters, activeSection);
      if (format === "csv") {
        params.set("format", "csv");
        const response = await fetch(`/api/reportes/contables?${params.toString()}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || "No se pudo exportar el informe.");
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `informe-contable-${appliedFilters.year}${appliedFilters.month && appliedFilters.month !== "all" ? `-${appliedFilters.month}` : ""}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const nextReport = await fetchFinanceReportsDashboard(buildParams(appliedFilters, activeSection), {
        useCache: false,
      });
      await downloadSpreadsheetWorkbook(
        `informe-contable-${appliedFilters.year}${appliedFilters.month && appliedFilters.month !== "all" ? `-${appliedFilters.month}` : ""}.xls`,
        buildReportSheets(nextReport, activeSection)
      );
    } catch (exportError: unknown) {
      toast.error(
        exportError instanceof Error ? exportError.message : "No se pudo exportar el informe."
      );
    } finally {
      setExportingFormat(null);
    }
  };

  const years = useMemo(() => {
    const availableYears = report?.options?.availableYears || [];
    return availableYears.length > 0 ? availableYears : buildAccountingYears();
  }, [report?.options?.availableYears]);
  const availableSedes = useMemo(() => {
    const schoolId = draftFilters.escuelaId;
    return (report?.options?.sedes || []).filter(
      (item) => !schoolId || item.escuela_id === schoolId
    );
  }, [draftFilters.escuelaId, report?.options?.sedes]);

  const reportHasVisibleData = useMemo(() => {
    if (!report) return false;

    if (activeSection === "estudiantes") {
      return Boolean(
        report.students?.rows.length ||
          report.students?.countRegulares ||
          report.students?.countPractica ||
          report.students?.countAptitud ||
          report.students?.totalIngresosRegulares ||
          report.students?.totalIngresosPractica ||
          report.students?.totalIngresosAptitud
      );
    }

    return Boolean(
      report.summary?.totalMovimientos ||
        report.contracts?.registros ||
        report.contracts?.totalPendiente ||
        report.payables?.totalPendiente ||
        report.breakdown?.ingresosPorLinea.length ||
        report.breakdown?.gastosPorCategoria.length
    );
  }, [activeSection, report]);

  const reportRequestKey = useMemo(
    () => `${activeSection}:${buildParams(appliedFilters, activeSection).toString()}`,
    [activeSection, appliedFilters]
  );

  useEffect(() => {
    if (loading || loadError || !report || reportHasVisibleData) return;
    if (freshRetryKeyRef.current === reportRequestKey) return;

    freshRetryKeyRef.current = reportRequestKey;
    void loadReport(appliedFilters, activeSection, {
      forceFresh: true,
      useCache: false,
    });
  }, [
    activeSection,
    appliedFilters,
    loadError,
    loadReport,
    loading,
    report,
    reportHasVisibleData,
    reportRequestKey,
  ]);

  useEffect(() => {
    if (autoAlignedYearRef.current) return;

    const availableYears = report?.options?.availableYears || [];
    if (availableYears.length === 0) return;

    const preferredYear = String(availableYears[0]);
    const selectedYearAvailable = availableYears.includes(Number(appliedFilters.year));
    const usingDefaultWindow =
      appliedFilters.year === String(getCurrentAccountingYear()) &&
      appliedFilters.month === "all" &&
      !appliedFilters.escuelaId &&
      !appliedFilters.sedeId &&
      !appliedFilters.ingresoView &&
      !appliedFilters.ingresoCategoria &&
      !appliedFilters.ingresoMetodo &&
      !appliedFilters.gastoView &&
      !appliedFilters.gastoCategoria &&
      !appliedFilters.gastoMetodo &&
      !appliedFilters.gastoContraparte.trim();

    if (
      usingDefaultWindow &&
      (!selectedYearAvailable || !reportHasVisibleData) &&
      appliedFilters.year !== preferredYear
    ) {
      autoAlignedYearRef.current = true;
      const nextFilters = {
        ...appliedFilters,
        year: preferredYear,
      };
      setDraftFilters(nextFilters);
      setAppliedFilters(nextFilters);
    }
  }, [appliedFilters, report?.options?.availableYears, reportHasVisibleData]);

  const periodLabel = `${appliedFilters.year}${appliedFilters.month && appliedFilters.month !== "all" ? ` · ${MONTH_OPTIONS.find((item) => item.value === appliedFilters.month)?.label || appliedFilters.month}` : " · Todo el año"}`;

  return (
    <div>
      <AccountingWorkspaceHeader
        badge="Lectura ejecutiva"
        title="Informes"
        description="Una sola vista para saber si el corte está dejando resultado, dónde se está quedando el dinero y qué foco requiere atención inmediata. Todo lo secundario sale del primer plano."
        actions={
          <>
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0071e3] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED]"
            >
              <BarChart3 size={16} />
              Actualizar informe
            </button>
            <ExportFormatActions
              exportingFormat={exportingFormat}
              disabled={loading || !report}
              onExportCsv={() => void handleExport("csv")}
              onExportXls={() => void handleExport("xls")}
            />
          </>
        }
      />

      <InformesTabs activeSection={activeSection} items={REPORT_SECTIONS} onChange={setActiveSection} />

      <InformesFiltersPanel
        perfilRol={perfil?.rol}
        draftFilters={draftFilters}
        setDraftFilters={setDraftFilters}
        years={years}
        availableSedes={availableSedes}
        options={report?.options}
        onReset={handleReset}
      />

      <InformesStatusBanner loading={loading} periodLabel={periodLabel} error={loadError} />

      {loadError && !loading ? (
        <div className="apple-panel mb-4 rounded-[28px] border border-rose-200/70 bg-rose-50/80 px-5 py-5 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          <p className="text-sm font-semibold">No pudimos cargar el informe.</p>
          <p className="mt-2 text-sm leading-6 opacity-80">
            {loadError}. Revisa los filtros o vuelve a actualizar el corte.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGenerate}
              className="apple-button-secondary min-h-[42px] px-4 text-sm font-semibold"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      ) : activeSection === "resumen" ? (
        <InformesSummarySection loading={loading} report={report} />
      ) : (
        <InformesStudentsSection loading={loading} isMobile={isMobile} report={report} />
      )}
    </div>
  );
}
