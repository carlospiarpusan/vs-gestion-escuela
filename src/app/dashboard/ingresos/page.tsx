"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDraftForm } from "@/hooks/useDraftForm";
import { AccountingWorkspaceHeader } from "@/components/dashboard/accounting/AccountingWorkspace";
import { runSupabaseMutationWithRetry } from "@/lib/retry";
import { fetchJsonWithRetry } from "@/lib/retry";
import type { StudentOptionsResponse } from "@/lib/student-options";
import {
  downloadCsv,
  formatAccountingMoney,
  getMonthDateRange,
  MONTH_OPTIONS,
} from "@/lib/accounting-dashboard";
import ExportFormatActions from "@/components/dashboard/ExportFormatActions";
import {
  getDashboardCatalogCached,
  invalidateDashboardClientCaches,
} from "@/lib/dashboard-client-cache";
import { revalidateTaggedServerCaches } from "@/lib/server-cache-client";
import { buildIncomeMutationInvalidationTags } from "@/lib/server-cache-tags";
import { canAuditedRolePerformAction, isAuditedRole } from "@/lib/role-capabilities";
import { fetchIncomeDashboard } from "@/lib/finance/income-service";
import type { IncomeDashboardResponse, IncomeLedgerRow } from "@/lib/finance/types";
import { type IncomeView, INCOME_VIEW_ITEMS } from "@/lib/income-view";
import { useIsMobileVariant } from "@/hooks/useDeviceVariant";
import { downloadSpreadsheetWorkbook } from "@/lib/spreadsheet-export";
import type { CategoriaIngreso, EstadoIngreso, MetodoPago } from "@/types/database";
import { Plus } from "lucide-react";
import {
  AlumnoOption,
  currentMonth,
  currentYear,
  emptyForm,
  MatriculaOption,
  PAGE_SIZE,
  years,
} from "./constants";
import {
  IncomeFiltersSection,
  IncomeLedgerSection,
  IncomeOverviewSection,
  IncomeViewSection,
} from "./IncomeSections";

const DeleteConfirm = dynamic(() => import("@/components/dashboard/DeleteConfirm"), {
  loading: () => null,
});

const IngresoModal = dynamic(() => import("./IngresoModal"), {
  loading: () => null,
});

type EditableIncomeRecord = {
  id: string;
  alumno_id: string | null;
  matricula_id: string | null;
  categoria: CategoriaIngreso;
  concepto: string;
  monto: number;
  metodo_pago: MetodoPago | null;
  medio_especifico: string | null;
  numero_factura: string | null;
  fecha: string;
  fecha_vencimiento: string | null;
  estado: EstadoIngreso;
  notas: string | null;
};

// ─── Component ───────────────────────────────────────────────────────

export default function IngresosPage() {
  const { perfil } = useAuth();
  const isMobile = useIsMobileVariant();
  const auditedRole = isAuditedRole(perfil?.rol) ? perfil.rol : null;
  const canCreateIncome = auditedRole
    ? canAuditedRolePerformAction(auditedRole, "income", "create")
    : true;
  const canEditIncome = auditedRole
    ? canAuditedRolePerformAction(auditedRole, "income", "edit")
    : true;
  const canDeleteIncome = auditedRole
    ? canAuditedRolePerformAction(auditedRole, "income", "delete")
    : true;
  const fmt = (v: number) => formatAccountingMoney(Number(v || 0));
  const defaultMonth = String(currentMonth).padStart(2, "0");

  // ─── Filters ──────────────────────────────────────────────────────

  const [filtroYear, setFiltroYear] = useState(String(currentYear));
  const [filtroMes, setFiltroMes] = useState(defaultMonth);
  const [filtroAlumno, setFiltroAlumno] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroView, setFiltroView] = useState<IncomeView>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [showAdvancedFiltersMobile, setShowAdvancedFiltersMobile] = useState(false);

  const mesesDelAno =
    Number(filtroYear) === currentYear
      ? MONTH_OPTIONS.filter((m) => !m.value || Number(m.value) <= currentMonth)
      : MONTH_OPTIONS;

  const hasAdvancedFilters = Boolean(filtroMetodo || filtroCategoria || filtroEstado);
  const hayFiltros = Boolean(
    filtroAlumno ||
    filtroMetodo ||
    filtroCategoria ||
    filtroEstado ||
    filtroView !== "all" ||
    filtroYear !== String(currentYear) ||
    filtroMes !== defaultMonth ||
    searchTerm
  );

  useEffect(() => {
    if (isMobile && hasAdvancedFilters) {
      setShowAdvancedFiltersMobile(true);
    }
  }, [isMobile, hasAdvancedFilters]);

  const limpiarFiltros = () => {
    setFiltroYear(String(currentYear));
    setFiltroMes(defaultMonth);
    setFiltroAlumno("");
    setFiltroMetodo("");
    setFiltroCategoria("");
    setFiltroEstado("");
    setFiltroView("all");
    setSearchTerm("");
    setCurrentPage(0);
  };

  // ─── Catalogs ─────────────────────────────────────────────────────

  const [alumnos, setAlumnos] = useState<AlumnoOption[]>([]);
  const [matriculas, setMatriculas] = useState<MatriculaOption[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  // ─── Ledger data ──────────────────────────────────────────────────

  const [report, setReport] = useState<IncomeDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!perfil?.escuela_id) return;
    const fetchId = ++fetchIdRef.current;

    const load = async () => {
      setLoading(true);
      setFetchError("");

      const { from, to } = getMonthDateRange(Number(filtroYear), filtroMes);
      const params = new URLSearchParams({
        from,
        to,
        page: String(currentPage),
        pageSize: String(PAGE_SIZE),
      });

      if (searchTerm) params.set("q", searchTerm);
      if (filtroAlumno) params.set("alumno_id", filtroAlumno);
      if (filtroMetodo) params.set("metodo", filtroMetodo);
      if (filtroCategoria) params.set("categoria", filtroCategoria);
      if (filtroEstado) params.set("estado", filtroEstado);
      if (filtroView !== "all") params.set("view", filtroView);

      try {
        const payload = await fetchIncomeDashboard(params);
        if (fetchId !== fetchIdRef.current) return;
        setReport(payload);
      } catch (err: unknown) {
        if (fetchId !== fetchIdRef.current) return;
        setReport(null);
        setFetchError(
          err instanceof Error ? err.message : "No se pudo cargar el libro de ingresos."
        );
      } finally {
        if (fetchId === fetchIdRef.current) setLoading(false);
      }
    };

    void load();
  }, [
    perfil?.escuela_id,
    filtroYear,
    filtroMes,
    filtroAlumno,
    filtroMetodo,
    filtroCategoria,
    filtroEstado,
    filtroView,
    searchTerm,
    currentPage,
    reloadKey,
  ]);

  // ─── Derived data ─────────────────────────────────────────────────

  const summary = report?.summary;
  const ledger = report?.ledger;
  const totalCount = ledger?.totalCount || 0;

  // ─── CRUD state ───────────────────────────────────────────────────

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeLedgerRow | null>(null);
  const [deleting, setDeleting] = useState<IncomeLedgerRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const {
    value: form,
    setValue: setForm,
    restoreDraft,
    clearDraft,
  } = useDraftForm("dashboard:ingresos:form", emptyForm, {
    persist: modalOpen && !editing,
  });

  useEffect(() => {
    let active = true;
    setAlumnos([]);
    setMatriculas([]);
    if (!modalOpen || !form.alumno_id || !perfil?.escuela_id) {
      setCatalogsLoading(false);
      return;
    }
    setCatalogsLoading(true);
    const alumnoId = form.alumno_id;
    const params = new URLSearchParams({
      id: alumnoId,
      matriculas: "1",
      escuela_id: perfil.escuela_id,
    });
    void getDashboardCatalogCached<StudentOptionsResponse>({
      name: "student-options",
      scope: {
        id: perfil.id,
        rol: perfil.rol,
        escuelaId: perfil.escuela_id,
        sedeId: perfil.sede_id,
      },
      params,
      loader: () => fetchJsonWithRetry(`/api/alumnos/opciones?${params}`),
    })
      .then((payload) => {
        if (!active) return;
        if (!payload.rows.some((row) => row.id === alumnoId))
          throw new Error("El alumno no está disponible en tu escuela o sede.");
        setAlumnos(payload.rows);
        setMatriculas(payload.matriculas || []);
        setForm((prev) =>
          prev.alumno_id === alumnoId && !prev.matricula_id && payload.matriculas?.length === 1
            ? { ...prev, matricula_id: payload.matriculas[0].id }
            : prev
        );
      })
      .catch((error) => {
        if (active)
          setError(error instanceof Error ? error.message : "No se pudo cargar el alumno.");
      })
      .finally(() => {
        if (active) setCatalogsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    modalOpen,
    form.alumno_id,
    perfil?.id,
    perfil?.rol,
    perfil?.escuela_id,
    perfil?.sede_id,
    setForm,
  ]);

  const matriculasDisponibles = useMemo(
    () => (form.alumno_id ? matriculas.filter((m) => m.alumno_id === form.alumno_id) : []),
    [form.alumno_id, matriculas]
  );

  // ─── Export CSV ───────────────────────────────────────────────────

  const [exportingFormat, setExportingFormat] = useState<"csv" | "xls" | null>(null);

  const handleExport = useCallback(
    async (format: "csv" | "xls") => {
      if (!perfil?.escuela_id) return;
      setExportingFormat(format);

      const { from, to } = getMonthDateRange(Number(filtroYear), filtroMes);
      const params = new URLSearchParams({
        from,
        to,
        page: "0",
        pageSize: "10000",
      });
      if (searchTerm) params.set("q", searchTerm);
      if (filtroAlumno) params.set("alumno_id", filtroAlumno);
      if (filtroMetodo) params.set("metodo", filtroMetodo);
      if (filtroCategoria) params.set("categoria", filtroCategoria);
      if (filtroEstado) params.set("estado", filtroEstado);
      if (filtroView !== "all") params.set("view", filtroView);

      try {
        const payload = await fetchIncomeDashboard(params, { useCache: false });
        const rows = payload.ledger?.rows || [];
        if (rows.length === 0) return;
        const filenameBase = `libro-ingresos-${filtroYear}${filtroMes ? `-${filtroMes}` : ""}`;
        const ledgerHeaders = [
          "Fecha",
          "Categoría",
          "Concepto",
          "Monto",
          "Estado",
          "Método",
          "Factura",
          "Contraparte",
          "Documento",
        ];
        const ledgerRows = rows.map((r) => [
          r.fecha,
          r.categoria.replace(/_/g, " "),
          r.concepto,
          r.monto,
          r.estado,
          r.metodo_pago || "",
          r.numero_factura || "",
          r.contraparte || "",
          r.documento || "",
        ]);

        if (format === "csv") {
          downloadCsv(`${filenameBase}.csv`, ledgerHeaders, ledgerRows);
          return;
        }

        await downloadSpreadsheetWorkbook(`${filenameBase}.xls`, [
          {
            name: "Resumen",
            headers: ["Indicador", "Valor"],
            rows: [
              ["Ingresos cobrados", payload.summary?.ingresosCobrados || 0],
              ["Pendiente por cobrar", payload.summary?.ingresosPendientes || 0],
              ["Ingresos anulados", payload.summary?.ingresosAnulados || 0],
              ["Ticket promedio", payload.summary?.ticketPromedio || 0],
              [
                "Cobranza efectiva (%)",
                Number((payload.summary?.cobranzaPorcentaje || 0).toFixed(2)),
              ],
              ["Movimientos cobrados", payload.summary?.movimientosCobrados || 0],
              ["Registros con saldo pendiente", payload.summary?.movimientosPendientes || 0],
            ],
          },
          {
            name: "Libro de ingresos",
            headers: ledgerHeaders,
            rows: ledgerRows,
          },
        ]);
      } catch {
        // silent
      } finally {
        setExportingFormat(null);
      }
    },
    [
      perfil?.escuela_id,
      filtroYear,
      filtroMes,
      searchTerm,
      filtroAlumno,
      filtroMetodo,
      filtroCategoria,
      filtroEstado,
      filtroView,
    ]
  );

  // ─── Handlers ───────────────────────────────────────────────────

  const openCreate = () => {
    if (!canCreateIncome) return;
    setEditing(null);
    restoreDraft(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = async (row: IncomeLedgerRow) => {
    if (!canEditIncome) return;
    setError("");
    setSaving(true);
    try {
      const supabase = createClient();
      const detailResult = await supabase
        .from("ingresos")
        .select(
          "id, alumno_id, matricula_id, categoria, concepto, monto, metodo_pago, medio_especifico, numero_factura, fecha, fecha_vencimiento, estado, notas"
        )
        .eq("id", row.id)
        .single<EditableIncomeRecord>();

      if (detailResult.error || !detailResult.data) {
        throw detailResult.error ?? new Error("No se pudo cargar el ingreso para editar.");
      }

      const detail = detailResult.data;
      setEditing(row);
      setForm({
        alumno_id: detail.alumno_id || "",
        matricula_id: detail.matricula_id || "",
        categoria: detail.categoria,
        concepto: detail.concepto,
        monto: String(detail.monto),
        metodo_pago: detail.metodo_pago || "efectivo",
        medio_especifico: detail.medio_especifico || "",
        numero_factura: detail.numero_factura || "",
        fecha: detail.fecha,
        fecha_vencimiento: detail.fecha_vencimiento || detail.fecha,
        estado: detail.estado,
        notas: detail.notas || "",
      });
      setModalOpen(true);
    } catch (err) {
      console.error("[IngresosPage] Error cargando ingreso para editar:", err);
      setEditing(null);
      setError(err instanceof Error ? err.message : "No se pudo cargar el ingreso a editar.");
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (row: IncomeLedgerRow) => {
    if (!canDeleteIncome) return;
    setDeleting(row);
    setDeleteOpen(true);
  };

  const handleAlumnoChange = useCallback(
    (alumnoId: string) => {
      setCatalogsLoading(Boolean(alumnoId));
      setAlumnos([]);
      setMatriculas([]);
      setForm((prev) => ({ ...prev, alumno_id: alumnoId, matricula_id: "" }));
    },
    [setForm]
  );

  const handleSave = async () => {
    if (form.alumno_id && (catalogsLoading || !alumnos.some((a) => a.id === form.alumno_id))) {
      setError("Espera a que se cargue el alumno y sus matrículas antes de guardar.");
      return;
    }
    if (editing ? !canEditIncome : !canCreateIncome) return;
    if (!form.concepto || !form.monto) {
      setError("Concepto y monto son obligatorios.");
      return;
    }

    const montoNum = parseFloat(form.monto);
    if (Number.isNaN(montoNum)) {
      setError("El monto debe ser un valor numérico válido.");
      return;
    }

    const matriculasDelAlumno = form.alumno_id
      ? matriculas.filter((m) => m.alumno_id === form.alumno_id)
      : [];
    if (form.alumno_id && matriculasDelAlumno.length > 0 && !form.matricula_id) {
      setError("Selecciona la matrícula a la que corresponde este ingreso.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const supabase = createClient();
      const payload = {
        alumno_id: form.alumno_id || null,
        matricula_id: form.matricula_id || null,
        categoria: form.categoria,
        concepto: form.concepto,
        monto: montoNum,
        metodo_pago: form.metodo_pago,
        medio_especifico: form.medio_especifico || null,
        numero_factura: form.numero_factura || null,
        fecha: form.fecha,
        fecha_vencimiento: form.fecha_vencimiento || form.fecha,
        estado: form.estado,
        notas: form.notas || null,
      };

      if (editing) {
        await runSupabaseMutationWithRetry(() =>
          supabase.from("ingresos").update(payload).eq("id", editing.id)
        );
      } else {
        if (!perfil) {
          setError("No se encontró el perfil activo para guardar.");
          setSaving(false);
          return;
        }

        let sedeId = perfil.sede_id;
        if (!sedeId && perfil.escuela_id) {
          const { data: sedeData } = await supabase
            .from("sedes")
            .select("id")
            .eq("escuela_id", perfil.escuela_id)
            .order("es_principal", { ascending: false })
            .limit(1)
            .single();
          sedeId = sedeData?.id || null;
        }

        await runSupabaseMutationWithRetry(() =>
          supabase.from("ingresos").insert({
            ...payload,
            escuela_id: perfil.escuela_id,
            sede_id: sedeId,
            user_id: perfil.id,
          })
        );
      }

      clearDraft(emptyForm);
      setSaving(false);
      setModalOpen(false);
      invalidateDashboardClientCaches([
        "dashboard-summary:",
        "dashboard-list:alumnos-table:",
        "dashboard-catalog:ingresos-form:",
        "finance-income:",
        "finance-portfolio:",
        "finance-cash:",
        "finance-reports:",
      ]);
      await revalidateTaggedServerCaches(
        buildIncomeMutationInvalidationTags({
          escuelaId: perfil?.escuela_id,
          sedeId: perfil?.sede_id,
        })
      );
      setReloadKey((v) => v + 1);
    } catch (networkErr: unknown) {
      setError(networkErr instanceof Error ? networkErr.message : "Error de red al guardar.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDeleteIncome) return;
    if (!deleting) return;
    setSaving(true);
    try {
      const { error: deleteError } = await createClient()
        .from("ingresos")
        .delete()
        .eq("id", deleting.id);
      if (deleteError) {
        setError(deleteError.message);
        setSaving(false);
        return;
      }
      setSaving(false);
      setDeleteOpen(false);
      setDeleting(null);
      invalidateDashboardClientCaches([
        "dashboard-summary:",
        "dashboard-list:alumnos-table:",
        "finance-income:",
        "finance-portfolio:",
        "finance-cash:",
        "finance-reports:",
      ]);
      await revalidateTaggedServerCaches(
        buildIncomeMutationInvalidationTags({
          escuelaId: perfil?.escuela_id,
          sedeId: perfil?.sede_id,
        })
      );
      setReloadKey((v) => v + 1);
    } catch (networkErr: unknown) {
      setError(networkErr instanceof Error ? networkErr.message : "Error de red al eliminar.");
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────

  if (!perfil?.escuela_id) return null;

  return (
    <div>
      <AccountingWorkspaceHeader
        badge="Finanzas · Recaudo"
        title="Ingresos"
        description="Supervisa el recaudo del periodo, entiende de dónde entra el dinero y baja al libro operativo solo cuando necesites editar o exportar movimientos."
        actions={
          <>
            {canCreateIncome ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0071e3] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED]"
              >
                <Plus size={16} />
                Registrar ingreso
              </button>
            ) : null}
            <ExportFormatActions
              exportingFormat={exportingFormat}
              disabled={loading || totalCount === 0}
              onExportCsv={() => void handleExport("csv")}
              onExportXls={() => void handleExport("xls")}
            />
          </>
        }
      />

      <IncomeOverviewSection loading={loading} summary={summary} formatMoney={fmt} />

      <IncomeViewSection
        value={filtroView}
        items={INCOME_VIEW_ITEMS}
        onChange={(value) => {
          setFiltroView(value);
          setCurrentPage(0);
        }}
      />

      <IncomeFiltersSection
        filtroYear={filtroYear}
        years={years}
        filtroMes={filtroMes}
        mesesDelAno={mesesDelAno}
        filtroAlumno={filtroAlumno}
        filtroMetodo={filtroMetodo}
        filtroCategoria={filtroCategoria}
        filtroEstado={filtroEstado}
        isMobile={isMobile}
        showAdvancedFiltersMobile={showAdvancedFiltersMobile}
        hayFiltros={hayFiltros}
        onYearChange={(value) => {
          setFiltroYear(value);
          setFiltroMes("");
          setCurrentPage(0);
        }}
        onMesChange={(value) => {
          setFiltroMes(value);
          setCurrentPage(0);
        }}
        onAlumnoChange={(value) => {
          setFiltroAlumno(value);
          setCurrentPage(0);
        }}
        onMetodoChange={(value) => {
          setFiltroMetodo(value);
          setCurrentPage(0);
        }}
        onCategoriaChange={(value) => {
          setFiltroCategoria(value);
          setCurrentPage(0);
        }}
        onEstadoChange={(value) => {
          setFiltroEstado(value);
          setCurrentPage(0);
        }}
        onToggleAdvancedFilters={() => setShowAdvancedFiltersMobile((current) => !current)}
        onClearFilters={limpiarFiltros}
      />

      {fetchError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {fetchError}
        </div>
      )}

      <IncomeLedgerSection
        loading={loading}
        rows={ledger?.rows || []}
        totalCount={totalCount}
        currentPage={currentPage}
        searchTerm={searchTerm}
        pageSize={PAGE_SIZE}
        formatMoney={fmt}
        onPageChange={setCurrentPage}
        onSearchChange={(term) => {
          setSearchTerm(term);
          setCurrentPage(0);
        }}
        onEdit={canEditIncome ? openEdit : undefined}
        onDelete={canDeleteIncome ? openDelete : undefined}
      />

      {modalOpen && (
        <IngresoModal
          open={modalOpen}
          editing={editing}
          error={error}
          form={form}
          alumnos={alumnos}
          matriculasDisponibles={matriculasDisponibles}
          catalogsLoading={catalogsLoading}
          saving={saving}
          setForm={setForm}
          onAlumnoChange={handleAlumnoChange}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}

      {deleteOpen && (
        <DeleteConfirm
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          loading={saving}
          message="¿Eliminar este ingreso? Esta acción no se puede deshacer."
        />
      )}
    </div>
  );
}
