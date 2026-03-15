"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDraftForm } from "@/hooks/useDraftForm";
import {
  AccountingWorkspaceHeader,
  AccountingStatCard,
} from "@/components/dashboard/accounting/AccountingWorkspace";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import DataTable from "@/components/dashboard/DataTable";
import { runSupabaseMutationWithRetry } from "@/lib/retry";
import { fetchAllSupabaseRows } from "@/lib/supabase-pagination";
import {
  type AccountingLedgerRow,
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
import type {
  Alumno,
  CategoriaIngreso,
  EstadoIngreso,
  MatriculaAlumno,
  MetodoPago,
} from "@/types/database";
import { ArrowDownCircle, ArrowUpCircle, Download, Plus, Scale, X, Layers } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

type AlumnoOption = Pick<Alumno, "id" | "nombre" | "apellidos">;
type MatriculaOption = Pick<
  MatriculaAlumno,
  "id" | "alumno_id" | "numero_contrato" | "categorias" | "valor_total" | "fecha_inscripcion"
>;

type IngresoFormData = {
  alumno_id: string;
  matricula_id: string;
  categoria: CategoriaIngreso;
  concepto: string;
  monto: string;
  metodo_pago: MetodoPago;
  medio_especifico: string;
  numero_factura: string;
  fecha: string;
  fecha_vencimiento: string;
  estado: EstadoIngreso;
  notas: string;
};

type TipoFiltro = "" | "ingreso" | "gasto";

// ─── Constants ───────────────────────────────────────────────────────

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

const inputCls = "apple-input";
const labelCls = "apple-label";
const PAGE_SIZE = 15;

const currentYear = getCurrentAccountingYear();
const currentMonth = new Date().getMonth() + 1;
const years = buildAccountingYears();

const emptyForm: IngresoFormData = {
  alumno_id: "",
  matricula_id: "",
  categoria: "mensualidad",
  concepto: "",
  monto: "",
  metodo_pago: "efectivo",
  medio_especifico: "",
  numero_factura: "",
  fecha: new Date().toISOString().split("T")[0],
  fecha_vencimiento: new Date().toISOString().split("T")[0],
  estado: "cobrado",
  notas: "",
};

function formatMatriculaLabel(matricula: MatriculaOption) {
  if (matricula.numero_contrato) return `Contrato ${matricula.numero_contrato}`;
  if ((matricula.categorias ?? []).length > 0) return (matricula.categorias ?? []).join(", ");
  return "Sin contrato";
}

// ─── Component ───────────────────────────────────────────────────────

export default function IngresosPage() {
  const { perfil } = useAuth();

  // ─── Filters ──────────────────────────────────────────────────────

  const [filtroYear, setFiltroYear] = useState(String(currentYear));
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  const mesesDelAno =
    Number(filtroYear) === currentYear
      ? MONTH_OPTIONS.filter((m) => !m.value || Number(m.value) <= currentMonth)
      : MONTH_OPTIONS;

  const hayFiltros = filtroTipo || filtroYear !== String(currentYear) || filtroMes;

  const limpiarFiltros = () => {
    setFiltroYear(String(currentYear));
    setFiltroMes("");
    setFiltroTipo("");
    setSearchTerm("");
    setCurrentPage(0);
  };

  // ─── Catalogs ─────────────────────────────────────────────────────

  const [alumnos, setAlumnos] = useState<AlumnoOption[]>([]);
  const [matriculas, setMatriculas] = useState<MatriculaOption[]>([]);
  const catalogFetchIdRef = useRef(0);

  useEffect(() => {
    if (!perfil?.escuela_id) return;
    const escuelaId = perfil.escuela_id;
    const fetchId = ++catalogFetchIdRef.current;
    const supabase = createClient();

    const load = async () => {
      try {
        const [a, m] = await Promise.all([
          fetchAllSupabaseRows<AlumnoOption>((from, to) =>
            supabase
              .from("alumnos")
              .select("id, nombre, apellidos")
              .eq("escuela_id", escuelaId)
              .order("nombre", { ascending: true })
              .order("apellidos", { ascending: true })
              .range(from, to)
              .then(({ data, error }) => ({ data: (data as AlumnoOption[]) ?? [], error }))
          ),
          fetchAllSupabaseRows<MatriculaOption>((from, to) =>
            supabase
              .from("matriculas_alumno")
              .select("id, alumno_id, numero_contrato, categorias, valor_total, fecha_inscripcion")
              .eq("escuela_id", escuelaId)
              .order("fecha_inscripcion", { ascending: false })
              .order("created_at", { ascending: false })
              .range(from, to)
              .then(({ data, error }) => ({ data: (data as MatriculaOption[]) ?? [], error }))
          ),
        ]);
        if (fetchId !== catalogFetchIdRef.current) return;
        setAlumnos(a);
        setMatriculas(m);
      } catch (err) {
        console.error("[IngresosPage] Error cargando catálogos:", err);
      }
    };

    void load();
  }, [perfil?.escuela_id]);

  // ─── Ledger data ──────────────────────────────────────────────────

  const [report, setReport] = useState<AccountingReportResponse | null>(null);
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
        include: "summary,ledger",
        page: String(currentPage),
        pageSize: String(PAGE_SIZE),
      });

      if (searchTerm) params.set("q", searchTerm);

      try {
        const payload = await fetchAccountingReport(params);
        if (fetchId !== fetchIdRef.current) return;
        setReport(payload);
      } catch (err: unknown) {
        if (fetchId !== fetchIdRef.current) return;
        setReport(null);
        setFetchError(err instanceof Error ? err.message : "No se pudo cargar el libro contable.");
      } finally {
        if (fetchId === fetchIdRef.current) setLoading(false);
      }
    };

    void load();
  }, [perfil?.escuela_id, filtroYear, filtroMes, searchTerm, currentPage, reloadKey]);

  // ─── Derived data ─────────────────────────────────────────────────

  const summary = report?.summary;
  const ledger = report?.ledger;

  const filteredRows = useMemo(() => {
    const rows = ledger?.rows || [];
    if (!filtroTipo) return rows;
    return rows.filter((r) => r.tipo === filtroTipo);
  }, [ledger?.rows, filtroTipo]);

  const totalCount = filtroTipo ? filteredRows.length : ledger?.totalCount || 0;

  // ─── CRUD state ───────────────────────────────────────────────────

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<AccountingLedgerRow | null>(null);
  const [deleting, setDeleting] = useState<AccountingLedgerRow | null>(null);
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

  const matriculasDisponibles = useMemo(
    () => (form.alumno_id ? matriculas.filter((m) => m.alumno_id === form.alumno_id) : []),
    [form.alumno_id, matriculas]
  );

  // ─── Export CSV ───────────────────────────────────────────────────

  const handleExportCsv = useCallback(async () => {
    if (!perfil?.escuela_id) return;
    const { from, to } = getMonthDateRange(Number(filtroYear), filtroMes);
    const params = new URLSearchParams({
      from,
      to,
      include: "ledger",
      page: "0",
      pageSize: "10000",
    });
    if (searchTerm) params.set("q", searchTerm);

    try {
      const payload = await fetchAccountingReport(params);
      let rows = payload.ledger?.rows || [];
      if (filtroTipo) rows = rows.filter((r) => r.tipo === filtroTipo);
      if (rows.length === 0) return;

      downloadCsv(
        `libro-contable-${filtroYear}${filtroMes ? `-${filtroMes}` : ""}.csv`,
        [
          "Fecha",
          "Tipo",
          "Categoría",
          "Concepto",
          "Monto",
          "Estado",
          "Método",
          "Factura",
          "Contraparte",
          "Documento",
        ],
        rows.map((r) => [
          r.fecha,
          r.tipo === "ingreso" ? "Ingreso" : "Gasto",
          r.categoria.replace(/_/g, " "),
          r.concepto,
          r.monto,
          r.estado,
          r.metodo_pago || "",
          r.numero_factura || "",
          r.contraparte || "",
          r.documento || "",
        ])
      );
    } catch {
      // silent
    }
  }, [perfil?.escuela_id, filtroYear, filtroMes, searchTerm, filtroTipo]);

  // ─── Handlers ───────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    restoreDraft(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (row: AccountingLedgerRow) => {
    if (row.tipo !== "ingreso") return;
    setEditing(row);
    setForm({
      alumno_id: "",
      matricula_id: "",
      categoria: row.categoria as CategoriaIngreso,
      concepto: row.concepto,
      monto: String(row.monto),
      metodo_pago: (row.metodo_pago || "efectivo") as MetodoPago,
      medio_especifico: "",
      numero_factura: row.numero_factura || "",
      fecha: row.fecha,
      fecha_vencimiento: row.fecha,
      estado: row.estado as EstadoIngreso,
      notas: "",
    });
    setError("");
    setModalOpen(true);
  };

  const openDelete = (row: AccountingLedgerRow) => {
    if (row.tipo !== "ingreso") return;
    setDeleting(row);
    setDeleteOpen(true);
  };

  const handleAlumnoChange = (alumnoId: string) => {
    const opciones = matriculas.filter((m) => m.alumno_id === alumnoId);
    setForm((prev) => ({
      ...prev,
      alumno_id: alumnoId,
      matricula_id: opciones.length === 1 ? opciones[0].id : "",
    }));
  };

  const handleSave = async () => {
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
      setReloadKey((v) => v + 1);
    } catch (networkErr: unknown) {
      setError(networkErr instanceof Error ? networkErr.message : "Error de red al guardar.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
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
      setReloadKey((v) => v + 1);
    } catch (networkErr: unknown) {
      setError(networkErr instanceof Error ? networkErr.message : "Error de red al eliminar.");
      setSaving(false);
    }
  };

  // ─── Table columns ────────────────────────────────────────────────

  const columns = useMemo(
    () => [
      {
        key: "fecha" as keyof AccountingLedgerRow,
        label: "Fecha",
        render: (row: AccountingLedgerRow) => (
          <span className="font-medium">{formatCompactDate(row.fecha)}</span>
        ),
      },
      {
        key: "tipo" as keyof AccountingLedgerRow,
        label: "Tipo",
        render: (row: AccountingLedgerRow) => (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              row.tipo === "ingreso"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {row.tipo === "ingreso" ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
            {row.tipo === "ingreso" ? "Ingreso" : "Gasto"}
          </span>
        ),
      },
      {
        key: "categoria" as keyof AccountingLedgerRow,
        label: "Categoría",
        render: (row: AccountingLedgerRow) => (
          <span className="text-sm capitalize">{row.categoria.replace(/_/g, " ")}</span>
        ),
      },
      {
        key: "concepto" as keyof AccountingLedgerRow,
        label: "Concepto",
        render: (row: AccountingLedgerRow) => (
          <div className="max-w-[200px]">
            <p className="truncate font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              {row.concepto}
            </p>
            {row.contraparte && (
              <p className="truncate text-xs text-[#86868b]">{row.contraparte}</p>
            )}
          </div>
        ),
      },
      {
        key: "monto" as keyof AccountingLedgerRow,
        label: "Monto",
        render: (row: AccountingLedgerRow) => (
          <span
            className={`font-semibold ${
              row.tipo === "ingreso"
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {row.tipo === "gasto" ? "- " : ""}
            {formatAccountingMoney(row.monto)}
          </span>
        ),
      },
      {
        key: "estado" as keyof AccountingLedgerRow,
        label: "Estado",
        render: (row: AccountingLedgerRow) => {
          const colors: Record<string, string> = {
            cobrado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            pagado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
            anulado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
          };
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[row.estado] || "bg-gray-100 text-gray-600"}`}
            >
              {row.estado}
            </span>
          );
        },
      },
      {
        key: "metodo_pago" as keyof AccountingLedgerRow,
        label: "Método",
        render: (row: AccountingLedgerRow) => (
          <span className="text-sm text-[#86868b] capitalize">
            {(row.metodo_pago || "—").replace(/_/g, " ")}
          </span>
        ),
      },
      {
        key: "numero_factura" as keyof AccountingLedgerRow,
        label: "Factura",
        render: (row: AccountingLedgerRow) => (
          <span className="text-sm text-[#86868b]">{row.numero_factura || "—"}</span>
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
        badge="Contabilidad"
        title="Libro contable"
        description="Registro unificado de ingresos y gastos."
        actions={
          <>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0071e3] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED]"
            >
              <Plus size={16} />
              Nuevo ingreso
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/5 px-4 py-2.5 text-sm font-semibold text-[#0071e3] transition-colors hover:bg-[#0071e3]/10 dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10 dark:text-[#69a9ff]"
            >
              <Download size={16} />
              Exportar CSV
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="mb-4 space-y-3 rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-[#1d1d1f]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <label className={labelCls}>Mes</label>
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
          <div>
            <label className={labelCls}>Tipo</label>
            <select
              value={filtroTipo}
              onChange={(e) => {
                setFiltroTipo(e.target.value as TipoFiltro);
                setCurrentPage(0);
              }}
              className={inputCls}
            >
              <option value="">Todos</option>
              <option value="ingreso">Solo ingresos</option>
              <option value="gasto">Solo gastos</option>
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

      {fetchError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {fetchError}
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AccountingStatCard
          eyebrow="Periodo"
          label="Ingresos cobrados"
          value={loading ? "..." : formatAccountingMoney(summary?.ingresosCobrados || 0)}
          detail={`${summary?.totalIngresos || 0} movimiento${(summary?.totalIngresos || 0) === 1 ? "" : "s"} de ingreso.`}
          tone="success"
          icon={<ArrowDownCircle size={18} />}
        />
        <AccountingStatCard
          eyebrow="Periodo"
          label="Gastos"
          value={loading ? "..." : formatAccountingMoney(summary?.gastosTotales || 0)}
          detail={`${summary?.totalGastos || 0} movimiento${(summary?.totalGastos || 0) === 1 ? "" : "s"} de gasto.`}
          tone="danger"
          icon={<ArrowUpCircle size={18} />}
        />
        <AccountingStatCard
          eyebrow="Periodo"
          label="Balance neto"
          value={loading ? "..." : formatAccountingMoney(summary?.balanceNeto || 0)}
          detail={`Margen ${summary?.margenPorcentaje || 0}%.`}
          tone={(summary?.balanceNeto || 0) >= 0 ? "primary" : "danger"}
          icon={<Scale size={18} />}
        />
        <AccountingStatCard
          eyebrow="Periodo"
          label="Movimientos"
          value={loading ? "..." : String(summary?.totalMovimientos || 0)}
          detail={`Pendiente: ${formatAccountingMoney(summary?.ingresosPendientes || 0)}`}
          tone="default"
          icon={<Layers size={18} />}
        />
      </div>

      {/* Ledger table */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
        <DataTable
          key="libro-contable"
          columns={columns}
          data={filteredRows}
          loading={loading}
          searchPlaceholder="Buscar por concepto, contraparte, factura..."
          searchTerm={searchTerm}
          serverSide={!filtroTipo}
          totalCount={totalCount}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onSearchChange={(term) => {
            setSearchTerm(term);
            setCurrentPage(0);
          }}
          pageSize={PAGE_SIZE}
          onEdit={(row) => row.tipo === "ingreso" && openEdit(row)}
          onDelete={(row) => row.tipo === "ingreso" && openDelete(row)}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Ingreso" : "Nuevo Ingreso"}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Categoría</label>
              <select
                value={form.categoria}
                onChange={(e) =>
                  setForm({ ...form, categoria: e.target.value as CategoriaIngreso })
                }
                className={inputCls}
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Alumno</label>
              <select
                value={form.alumno_id}
                onChange={(e) => handleAlumnoChange(e.target.value)}
                className={inputCls}
              >
                <option value="">Sin alumno</option>
                {alumnos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} {a.apellidos}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Matrícula</label>
            <select
              value={form.matricula_id}
              onChange={(e) => setForm({ ...form, matricula_id: e.target.value })}
              className={inputCls}
              disabled={!form.alumno_id || matriculasDisponibles.length === 0}
            >
              <option value="">
                {!form.alumno_id
                  ? "Selecciona primero un alumno"
                  : matriculasDisponibles.length === 0
                    ? "El alumno no tiene matrículas"
                    : "Selecciona una matrícula"}
              </option>
              {matriculasDisponibles.map((m) => (
                <option key={m.id} value={m.id}>
                  {formatMatriculaLabel(m)}
                </option>
              ))}
            </select>
            {form.alumno_id && matriculasDisponibles.length > 1 && (
              <p className="mt-1 text-[11px] text-[#86868b]">
                El alumno tiene varios cursos; registra el ingreso en la matrícula correcta.
              </p>
            )}
          </div>

          <div>
            <label className={labelCls}>Concepto *</label>
            <input
              type="text"
              value={form.concepto}
              onChange={(e) => setForm({ ...form, concepto: e.target.value })}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className={labelCls}>Monto *</label>
              <input
                type="number"
                step="0.01"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Método de pago</label>
              <select
                value={form.metodo_pago}
                onChange={(e) => setForm({ ...form, metodo_pago: e.target.value as MetodoPago })}
                className={inputCls}
              >
                {metodos.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    fecha: e.target.value,
                    fecha_vencimiento:
                      !prev.fecha_vencimiento || prev.fecha_vencimiento === prev.fecha
                        ? e.target.value
                        : prev.fecha_vencimiento,
                  }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Vencimiento</label>
              <input
                type="date"
                value={form.fecha_vencimiento}
                onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoIngreso })}
                className={inputCls}
              >
                {estadosIngreso.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Medio específico</label>
              <input
                type="text"
                value={form.medio_especifico}
                onChange={(e) => setForm({ ...form, medio_especifico: e.target.value })}
                className={inputCls}
                placeholder="Ej: Nequi 300..."
              />
            </div>
            <div>
              <label className={labelCls}>N° Factura</label>
              <input
                type="text"
                value={form.numero_factura}
                onChange={(e) => setForm({ ...form, numero_factura: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
            >
              {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Ingreso"}
            </button>
          </div>
        </div>
      </Modal>

      <DeleteConfirm
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={saving}
        message="¿Eliminar este ingreso? Esta acción no se puede deshacer."
      />
    </div>
  );
}
