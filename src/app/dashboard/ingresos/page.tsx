"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDraftForm } from "@/hooks/useDraftForm";
import DataTable from "@/components/dashboard/DataTable";
import AccountingBreakdownCard from "@/components/dashboard/AccountingBreakdownCard";
import {
  AccountingChipTabs,
  AccountingMiniList,
  AccountingPanel,
  AccountingStatCard,
  AccountingWorkspaceHeader,
} from "@/components/dashboard/accounting/AccountingWorkspace";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { runSupabaseMutationWithRetry } from "@/lib/retry";
import {
  type AccountingContractPendingRow,
  type AccountingBreakdownRow,
  buildAccountingYears,
  downloadCsv,
  fetchAccountingReport,
  formatAccountingMoney,
  formatCompactDate,
  getCurrentAccountingYear,
  getMonthDateRange,
  MONTH_OPTIONS,
  type AccountingReportResponse,
} from "@/lib/accounting-dashboard";
import {
  fetchIngresosDiariosCalculados,
  type IngresoDiarioRow,
  type IngresoDiarioStats,
} from "@/lib/ingresos-diarios";
import {
  applyIncomeViewToSupabaseQuery,
  EXAMEN_INCOME_CATEGORIES,
  INCOME_SECTION_ITEMS,
  INCOME_VIEW_ITEMS,
  resolveIncomeViewStateFilter,
  type IncomeSection,
  type IncomeView,
} from "@/lib/income-view";
import { fetchAllSupabaseRows } from "@/lib/supabase-pagination";
import type {
  Alumno,
  CategoriaIngreso,
  EstadoIngreso,
  Ingreso,
  MatriculaAlumno,
  MetodoPago,
} from "@/types/database";
import {
  AlertTriangle,
  BookOpen,
  Clock3,
  Download,
  Plus,
  ReceiptText,
  Wallet,
  X,
} from "lucide-react";

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
const currentYear = getCurrentAccountingYear();
const currentMonth = new Date().getMonth() + 1;

type AlumnoOption = Pick<Alumno, "id" | "nombre" | "apellidos">;
type MatriculaOption = Pick<
  MatriculaAlumno,
  "id" | "alumno_id" | "numero_contrato" | "categorias" | "valor_total" | "fecha_inscripcion"
>;
type IngresoRow = Ingreso & { alumno_nombre: string; matricula_label: string };
type ExamIncomeAvailability = {
  examen_teorico: boolean;
  examen_practico: boolean;
  examen_aptitud: boolean;
};
type IncomeSectionState = {
  currentPage: number;
  searchTerm: string;
  activeView: IncomeView;
  filtroAlumno: string;
  filtroMes: string;
  filtroMetodo: string;
  filtroCategoria: string;
  filtroEstado: string;
  filtroYear: string;
};

type CarteraTableRow = AccountingContractPendingRow & {
  id: string;
};

const emptyDailyStats: IngresoDiarioStats = {
  totalCobrado: 0,
  totalPendiente: 0,
  totalAnulado: 0,
  diasConMovimientos: 0,
  promedioCobradoPorDia: 0,
  mejorDiaFecha: null,
  mejorDiaMonto: 0,
};

const emptyForm = {
  alumno_id: "",
  matricula_id: "",
  categoria: "mensualidad" as CategoriaIngreso,
  concepto: "",
  monto: "",
  metodo_pago: "efectivo" as MetodoPago,
  medio_especifico: "",
  numero_factura: "",
  fecha: new Date().toISOString().split("T")[0],
  fecha_vencimiento: new Date().toISOString().split("T")[0],
  estado: "cobrado" as EstadoIngreso,
  notas: "",
};

const PAGE_SIZE = 10;
const inputCls = "apple-input";
const labelCls = "apple-label";
const estadoColors: Record<string, string> = {
  cobrado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  anulado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function createIncomeSectionState(section: IncomeSection): IncomeSectionState {
  return {
    currentPage: 0,
    searchTerm: "",
    activeView: "all",
    filtroAlumno: "",
    filtroMes: "",
    filtroMetodo: "",
    filtroCategoria: "",
    filtroEstado: section === "cartera" ? "pendiente" : "",
    filtroYear: String(currentYear),
  };
}

function parseIncomeSection(value: string | null): IncomeSection {
  if (value === "panel" || value === "libro") return "libro";
  if (value === "cartera" || value === "caja") return value;
  return "libro";
}

function formatMatriculaLabel(matricula: MatriculaOption) {
  if (matricula.numero_contrato) return `Contrato ${matricula.numero_contrato}`;
  if ((matricula.categorias ?? []).length > 0) return (matricula.categorias ?? []).join(", ");
  return "Sin contrato";
}

function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

function getDaysUntil(dateValue: string | null) {
  if (!dateValue) return null;
  const target = new Date(`${dateValue}T00:00:00`);
  const today = new Date(`${getTodayDateString()}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function getDueMeta(dateValue: string | null) {
  const daysUntil = getDaysUntil(dateValue);

  if (daysUntil === null) {
    return {
      label: "Sin vencimiento",
      detail: "Sin fecha definida",
      className: "bg-gray-100 text-[#86868b] dark:bg-gray-800 dark:text-gray-300",
    };
  }

  if (daysUntil < 0) {
    const overdueDays = Math.abs(daysUntil);
    return {
      label: "Vencido",
      detail: `${overdueDays} día${overdueDays === 1 ? "" : "s"} vencido`,
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };
  }

  if (daysUntil <= 7) {
    return {
      label: "Próximo",
      detail:
        daysUntil === 0 ? "Vence hoy" : `Vence en ${daysUntil} día${daysUntil === 1 ? "" : "s"}`,
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    };
  }

  return {
    label: "Al día",
    detail: `Vence en ${daysUntil} días`,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
}

function getShare(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

async function findMatchedAlumnoIds(
  supabase: ReturnType<typeof createClient>,
  escuelaId: string,
  search: string
) {
  const pattern = `%${search}%`;
  const { data } = await supabase
    .from("alumnos")
    .select("id")
    .eq("escuela_id", escuelaId)
    .or(`dni.ilike.${pattern},nombre.ilike.${pattern},apellidos.ilike.${pattern}`);

  return (data ?? []).map((alumno) => alumno.id);
}

async function fetchAllAlumnoOptions(supabase: ReturnType<typeof createClient>, escuelaId: string) {
  return fetchAllSupabaseRows<AlumnoOption>((from, to) =>
    supabase
      .from("alumnos")
      .select("id, nombre, apellidos")
      .eq("escuela_id", escuelaId)
      .order("nombre", { ascending: true })
      .order("apellidos", { ascending: true })
      .range(from, to)
      .then(({ data, error }) => ({ data: (data as AlumnoOption[]) ?? [], error }))
  );
}

async function fetchAllMatriculaOptions(
  supabase: ReturnType<typeof createClient>,
  escuelaId: string
) {
  return fetchAllSupabaseRows<MatriculaOption>((from, to) =>
    supabase
      .from("matriculas_alumno")
      .select("id, alumno_id, numero_contrato, categorias, valor_total, fecha_inscripcion")
      .eq("escuela_id", escuelaId)
      .order("fecha_inscripcion", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to)
      .then(({ data, error }) => ({ data: (data as MatriculaOption[]) ?? [], error }))
  );
}

export default function IngresosPage() {
  const { perfil } = useAuth();
  const searchParams = useSearchParams();

  const [data, setData] = useState<IngresoRow[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoOption[]>([]);
  const [matriculas, setMatriculas] = useState<MatriculaOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalCount, setTotalCount] = useState(0);
  const [activeSection, setActiveSection] = useState<IncomeSection>(
    parseIncomeSection(searchParams.get("section"))
  );
  const [sectionState, setSectionState] = useState<Record<IncomeSection, IncomeSectionState>>({
    libro: createIncomeSectionState("libro"),
    cartera: createIncomeSectionState("cartera"),
    caja: createIncomeSectionState("caja"),
  });
  const fetchIdRef = useRef(0);
  const catalogFetchIdRef = useRef(0);
  const catalogCacheReadyRef = useRef(false);
  const [summary, setSummary] = useState<AccountingReportResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [examAvailability, setExamAvailability] = useState<ExamIncomeAvailability | null>(null);
  const [exporting, setExporting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<IngresoRow | null>(null);
  const [deleting, setDeleting] = useState<IngresoRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [dailyRows, setDailyRows] = useState<IngresoDiarioRow[]>([]);
  const [dailyStats, setDailyStats] = useState<IngresoDiarioStats>(emptyDailyStats);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState("");
  const dailyFetchIdRef = useRef(0);
  const examYearAutoAdjustedRef = useRef<Record<IncomeSection, boolean>>({
    libro: false,
    cartera: false,
    caja: false,
  });
  const {
    value: form,
    setValue: setForm,
    restoreDraft,
    clearDraft,
  } = useDraftForm("dashboard:ingresos:form", emptyForm, {
    persist: modalOpen && !editing,
  });

  const currentSectionState = sectionState[activeSection];
  const currentPage = currentSectionState.currentPage;
  const searchTerm = currentSectionState.searchTerm;
  const activeView = currentSectionState.activeView;
  const filtroAlumno = currentSectionState.filtroAlumno;
  const filtroMes = currentSectionState.filtroMes;
  const filtroMetodo = currentSectionState.filtroMetodo;
  const filtroCategoria = currentSectionState.filtroCategoria;
  const filtroEstado = currentSectionState.filtroEstado;
  const filtroYear = currentSectionState.filtroYear;

  const updateSectionState = useCallback(
    (section: IncomeSection, patch: Partial<IncomeSectionState>) => {
      setSectionState((current) => ({
        ...current,
        [section]: {
          ...current[section],
          ...patch,
        },
      }));
    },
    []
  );

  const updateCurrentSectionState = useCallback(
    (patch: Partial<IncomeSectionState>) => {
      updateSectionState(activeSection, patch);
    },
    [activeSection, updateSectionState]
  );

  useEffect(() => {
    setActiveSection(parseIncomeSection(searchParams.get("section")));
  }, [searchParams]);

  useEffect(() => {
    if (activeView !== "examenes") {
      setInfoMessage("");
    }
  }, [activeView]);

  useEffect(() => {
    if (!perfil?.escuela_id || activeView !== "examenes") {
      setExamAvailability(null);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    const loadExamAvailability = async () => {
      try {
        const [teoricoRes, practicoRes, aptitudRes] = await Promise.all([
          supabase
            .from("ingresos")
            .select("id", { count: "exact", head: true })
            .eq("escuela_id", perfil.escuela_id)
            .eq("categoria", "examen_teorico"),
          supabase
            .from("ingresos")
            .select("id", { count: "exact", head: true })
            .eq("escuela_id", perfil.escuela_id)
            .eq("categoria", "examen_practico"),
          supabase
            .from("ingresos")
            .select("id", { count: "exact", head: true })
            .eq("escuela_id", perfil.escuela_id)
            .eq("categoria", "examen_aptitud"),
        ]);

        if (cancelled) return;

        setExamAvailability({
          examen_teorico: (teoricoRes.count ?? 0) > 0,
          examen_practico: (practicoRes.count ?? 0) > 0,
          examen_aptitud: (aptitudRes.count ?? 0) > 0,
        });
      } catch (availabilityError) {
        if (!cancelled) {
          console.error(
            "[IngresosPage] Error verificando disponibilidad de exámenes:",
            availabilityError
          );
          setExamAvailability(null);
        }
      }
    };

    void loadExamAvailability();

    return () => {
      cancelled = true;
    };
  }, [perfil?.escuela_id, activeView]);

  useEffect(() => {
    if (!perfil?.escuela_id) return;
    if (activeView !== "examenes") return;
    if (filtroYear !== String(currentYear)) return;
    if (examYearAutoAdjustedRef.current[activeSection]) return;

    let cancelled = false;
    const supabase = createClient();

    const alignExamYear = async () => {
      try {
        const { count, error } = await supabase
          .from("ingresos")
          .select("id", { count: "exact", head: true })
          .eq("escuela_id", perfil.escuela_id)
          .in("categoria", EXAMEN_INCOME_CATEGORIES)
          .gte("fecha", `${currentYear}-01-01`)
          .lt("fecha", `${currentYear + 1}-01-01`);
        if (error || cancelled) return;
        if ((count ?? 0) > 0) return;

        const { data: latestRow, error: latestError } = await supabase
          .from("ingresos")
          .select("fecha")
          .eq("escuela_id", perfil.escuela_id)
          .in("categoria", EXAMEN_INCOME_CATEGORIES)
          .order("fecha", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestError || cancelled || !latestRow?.fecha) return;

        const latestYear = String(latestRow.fecha).slice(0, 4);
        if (!latestYear || latestYear === filtroYear) return;

        examYearAutoAdjustedRef.current[activeSection] = true;
        updateSectionState(activeSection, {
          filtroYear: latestYear,
          filtroMes: "",
          currentPage: 0,
        });
        setInfoMessage(
          `No hay ingresos de exámenes en ${currentYear}; se cargó automáticamente ${latestYear}, donde sí existe histórico.`
        );
      } catch (yearError) {
        console.error("[IngresosPage] Error alineando año de exámenes:", yearError);
      }
    };

    void alignExamYear();

    return () => {
      cancelled = true;
    };
  }, [perfil?.escuela_id, activeView, activeSection, filtroYear, updateSectionState]);

  useEffect(() => {
    catalogCacheReadyRef.current = false;
    setAlumnos([]);
    setMatriculas([]);
  }, [perfil?.escuela_id]);

  useEffect(() => {
    if (!perfil?.escuela_id) return;

    const escuelaId = perfil.escuela_id;
    const fetchId = ++catalogFetchIdRef.current;
    const supabase = createClient();

    const loadCatalogs = async () => {
      try {
        const [alumnosList, matriculasList] = await Promise.all([
          fetchAllAlumnoOptions(supabase, escuelaId),
          fetchAllMatriculaOptions(supabase, escuelaId),
        ]);

        if (fetchId !== catalogFetchIdRef.current) return;

        catalogCacheReadyRef.current = true;
        setAlumnos(alumnosList);
        setMatriculas(matriculasList);
      } catch (catalogError) {
        console.error("[IngresosPage] Error cargando catálogos:", catalogError);
      }
    };

    void loadCatalogs();
  }, [perfil?.escuela_id]);

  useEffect(() => {
    if (!data.length || !catalogCacheReadyRef.current) return;

    const alumnosMap = new Map(
      alumnos.map((alumno) => [alumno.id, `${alumno.nombre} ${alumno.apellidos}`.trim()])
    );
    const matriculasMap = new Map(
      matriculas.map((matricula) => [matricula.id, formatMatriculaLabel(matricula)])
    );

    setData((prev) =>
      prev.map((ingreso) => ({
        ...ingreso,
        alumno_nombre: ingreso.alumno_id ? alumnosMap.get(ingreso.alumno_id) || "—" : "—",
        matricula_label: ingreso.matricula_id
          ? matriculasMap.get(ingreso.matricula_id) || "Sin contrato"
          : "—",
      }))
    );
  }, [alumnos, matriculas, data.length]);

  useEffect(() => {
    if (!perfil?.escuela_id) return;
    const escuelaId = perfil.escuela_id;
    const shouldLoadLedger = activeSection === "libro";
    const effectiveEstadoFiltro = activeSection === "cartera" ? "pendiente" : filtroEstado;

    if (!shouldLoadLedger) {
      setData([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;

    const loadData = async (page = currentPage, search = searchTerm) => {
      setLoading(true);
      const supabase = createClient();

      // --- Build base query for counting ---
      let countQuery = supabase
        .from("ingresos")
        .select("id", { count: "exact", head: true })
        .eq("escuela_id", perfil.escuela_id);

      // --- Build base query for data ---
      let dataQuery = supabase
        .from("ingresos")
        .select(
          "id, alumno_id, matricula_id, categoria, concepto, monto, metodo_pago, medio_especifico, numero_factura, fecha, fecha_vencimiento, estado, notas, created_at"
        )
        .eq("escuela_id", perfil.escuela_id);

      // Apply client-side filters to server query
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
      if (effectiveEstadoFiltro) {
        countQuery = countQuery.eq("estado", effectiveEstadoFiltro);
        dataQuery = dataQuery.eq("estado", effectiveEstadoFiltro);
      }

      // Apply search term (concepto or cédula del alumno)
      if (search) {
        const pattern = `%${search}%`;
        const matchedIds = await findMatchedAlumnoIds(supabase, escuelaId, search);

        if (matchedIds.length > 0) {
          const orFilter = `concepto.ilike.${pattern},numero_factura.ilike.${pattern},medio_especifico.ilike.${pattern},alumno_id.in.(${matchedIds.join(",")})`;
          countQuery = countQuery.or(orFilter);
          dataQuery = dataQuery.or(orFilter);
        } else {
          const orFilter = `concepto.ilike.${pattern},numero_factura.ilike.${pattern},medio_especifico.ilike.${pattern}`;
          countQuery = countQuery.or(orFilter);
          dataQuery = dataQuery.or(orFilter);
        }
      }

      // Pagination
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const [countRes, ingresosRes] = await Promise.all([
        countQuery,
        dataQuery
          .order("fecha", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to),
      ]);

      // Prevent race conditions
      if (fetchId !== fetchIdRef.current) return;

      const alumnosList = alumnos;
      const matriculasList = matriculas;
      const alumnosMap = new Map(
        alumnosList.map((alumno) => [alumno.id, `${alumno.nombre} ${alumno.apellidos}`.trim()])
      );
      const matriculasMap = new Map(
        matriculasList.map((matricula) => [matricula.id, formatMatriculaLabel(matricula)])
      );

      setTotalCount(countRes.count ?? 0);
      setData(
        ((ingresosRes.data as Ingreso[]) ?? []).map((ingreso) => ({
          ...ingreso,
          alumno_nombre: ingreso.alumno_id ? alumnosMap.get(ingreso.alumno_id) || "—" : "—",
          matricula_label: ingreso.matricula_id
            ? matriculasMap.get(ingreso.matricula_id) || "Sin contrato"
            : "—",
        }))
      );
      setLoading(false);
    };

    void loadData();
  }, [
    perfil?.escuela_id,
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
    activeSection,
    alumnos,
    matriculas,
  ]);

  useEffect(() => {
    if (!perfil?.rol) return;
    const shouldLoadSummary = activeSection === "libro" || activeSection === "cartera";

    if (!shouldLoadSummary) {
      setSummary(null);
      setSummaryError("");
      setSummaryLoading(false);
      return;
    }

    const loadSummary = async () => {
      const { from, to } = getMonthDateRange(Number(filtroYear), filtroMes);
      const params = new URLSearchParams({
        from,
        to,
        page: String(currentPage),
        pageSize: String(PAGE_SIZE),
        include: "summary,breakdown,contracts",
      });

      if (filtroAlumno) params.set("alumno_id", filtroAlumno);
      if (filtroMetodo) params.set("ingreso_metodo", filtroMetodo);
      if (filtroCategoria) params.set("ingreso_categoria", filtroCategoria);
      if (activeSection === "cartera") {
        params.set("ingreso_estado", "pendiente");
      } else if (filtroEstado) {
        params.set("ingreso_estado", filtroEstado);
      }
      if (activeView !== "all") params.set("ingreso_view", activeView);
      if (searchTerm) params.set("q", searchTerm);

      setSummaryLoading(true);
      setSummaryError("");

      try {
        const payload = await fetchAccountingReport(params);
        setSummary(payload);
      } catch (summaryErr: unknown) {
        setSummary(null);
        setSummaryError(
          summaryErr instanceof Error
            ? summaryErr.message
            : "No se pudo cargar el resumen contable."
        );
      } finally {
        setSummaryLoading(false);
      }
    };

    void loadSummary();
  }, [
    perfil?.rol,
    filtroAlumno,
    filtroMetodo,
    filtroCategoria,
    filtroEstado,
    filtroMes,
    filtroYear,
    searchTerm,
    activeView,
    activeSection,
    currentPage,
    reloadKey,
  ]);

  useEffect(() => {
    if (!perfil?.escuela_id || activeSection !== "caja") return;
    const escuelaId = perfil.escuela_id;

    const fetchId = ++dailyFetchIdRef.current;

    const loadDailySummary = async () => {
      setDailyLoading(true);
      setDailyError("");

      try {
        const supabase = createClient();
        const result = await fetchIngresosDiariosCalculados(supabase, {
          escuelaId,
          alumnoId: filtroAlumno || undefined,
          metodoPago: filtroMetodo || undefined,
          categoria: filtroCategoria || undefined,
          estado: (filtroEstado || undefined) as EstadoIngreso | undefined,
          view: activeView,
          mes: filtroMes || undefined,
          year: Number(filtroYear),
          search: searchTerm || undefined,
        });

        if (fetchId !== dailyFetchIdRef.current) return;

        setDailyRows(result.rows);
        setDailyStats(result.stats);
        setDailyLoading(false);
      } catch (dailyErr: unknown) {
        if (fetchId !== dailyFetchIdRef.current) return;

        setDailyRows([]);
        setDailyStats(emptyDailyStats);
        setDailyError(
          dailyErr instanceof Error ? dailyErr.message : "No se pudo calcular el resumen diario."
        );
        setDailyLoading(false);
      }
    };

    void loadDailySummary();
  }, [
    perfil?.escuela_id,
    activeSection,
    filtroAlumno,
    filtroMes,
    filtroMetodo,
    filtroCategoria,
    filtroEstado,
    filtroYear,
    searchTerm,
    activeView,
    reloadKey,
  ]);

  const matriculasDisponibles = useMemo(
    () =>
      form.alumno_id
        ? matriculas.filter((matricula) => matricula.alumno_id === form.alumno_id)
        : [],
    [form.alumno_id, matriculas]
  );
  const mesesDelAno = useMemo(
    () =>
      Number(filtroYear) === currentYear
        ? MONTH_OPTIONS.filter((mes) => !mes.value || Number(mes.value) <= currentMonth)
        : MONTH_OPTIONS,
    [filtroYear]
  );
  const years = useMemo(() => buildAccountingYears(), []);
  const hayFiltros =
    filtroAlumno ||
    filtroMes ||
    filtroMetodo ||
    filtroCategoria ||
    (activeSection !== "cartera" && filtroEstado) ||
    filtroYear !== String(currentYear) ||
    activeView !== "all";
  const totalFiltrado = useMemo(
    () => data.reduce((sum, row) => sum + Number(row.monto), 0),
    [data]
  );
  const carteraRows = useMemo<CarteraTableRow[]>(
    () =>
      (summary?.contracts?.pendingRows || []).map((row) => ({
        ...row,
        id: row.obligationId,
      })),
    [summary?.contracts?.pendingRows]
  );
  const carteraTotalCount = summary?.contracts?.pendingCount || 0;
  const carteraPageTotal = useMemo(
    () => carteraRows.reduce((sum, row) => sum + Number(row.saldoPendiente || 0), 0),
    [carteraRows]
  );
  const displayedCount = activeSection === "cartera" ? carteraTotalCount : totalCount;
  const displayedPageTotal = activeSection === "cartera" ? carteraPageTotal : totalFiltrado;
  const currentSectionMeta =
    INCOME_SECTION_ITEMS.find((item) => item.id === activeSection) || INCOME_SECTION_ITEMS[0];
  const carteraBuckets = summary?.contracts?.buckets || [];
  const carteraTopDeudores = summary?.contracts?.topDeudores || [];
  const visibleViewItems =
    activeSection === "caja"
      ? []
      : activeSection === "cartera"
        ? INCOME_VIEW_ITEMS.filter(
            (item) =>
              item.id === "all" ||
              item.id === "matriculas" ||
              item.id === "practicas" ||
              item.id === "examenes"
          )
        : INCOME_VIEW_ITEMS;

  const limpiarFiltros = () => {
    setSectionState((current) => ({
      ...current,
      [activeSection]: createIncomeSectionState(activeSection),
    }));
  };

  const handlePageChange = useCallback(
    (page: number) => {
      updateCurrentSectionState({ currentPage: page });
    },
    [updateCurrentSectionState]
  );

  const handleSearchChange = useCallback(
    (term: string) => {
      updateCurrentSectionState({
        searchTerm: term,
        currentPage: 0,
      });
    },
    [updateCurrentSectionState]
  );

  const handleAlumnoChange = (alumnoId: string) => {
    const opciones = matriculas.filter((matricula) => matricula.alumno_id === alumnoId);
    setForm((prev) => ({
      ...prev,
      alumno_id: alumnoId,
      matricula_id: opciones.length === 1 ? opciones[0].id : "",
    }));
  };

  const openCreate = () => {
    setEditing(null);
    restoreDraft(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (row: IngresoRow) => {
    setEditing(row);
    setForm({
      alumno_id: row.alumno_id || "",
      matricula_id: row.matricula_id || "",
      categoria: row.categoria,
      concepto: row.concepto,
      monto: row.monto.toString(),
      metodo_pago: row.metodo_pago,
      medio_especifico: row.medio_especifico || "",
      numero_factura: row.numero_factura || "",
      fecha: row.fecha,
      fecha_vencimiento: row.fecha_vencimiento || row.fecha,
      estado: row.estado,
      notas: row.notas || "",
    });
    setError("");
    setModalOpen(true);
  };

  const openDelete = (row: IngresoRow) => {
    setDeleting(row);
    setDeleteOpen(true);
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
      ? matriculas.filter((matricula) => matricula.alumno_id === form.alumno_id)
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
      setReloadKey((value) => value + 1);
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
      setReloadKey((value) => value + 1);
    } catch (networkErr: unknown) {
      setError(networkErr instanceof Error ? networkErr.message : "Error de red al eliminar.");
      setSaving(false);
    }
  };

  const handleExportCsv = async () => {
    if (!perfil?.escuela_id) return;
    const escuelaId = perfil.escuela_id;

    setExporting(true);
    try {
      const supabase = createClient();
      const rows: IngresoRow[] = [];
      const pageSize = 1000;
      let from = 0;

      while (true) {
        let query = supabase
          .from("ingresos")
          .select(
            "id, alumno_id, matricula_id, categoria, concepto, monto, metodo_pago, medio_especifico, numero_factura, fecha, fecha_vencimiento, estado, notas, created_at"
          )
          .eq("escuela_id", escuelaId)
          .order(activeSection === "cartera" ? "fecha_vencimiento" : "fecha", {
            ascending: activeSection === "cartera",
          })
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);

        if (filtroAlumno) query = query.eq("alumno_id", filtroAlumno);
        if (filtroMetodo) query = query.eq("metodo_pago", filtroMetodo);
        if (filtroCategoria) query = query.eq("categoria", filtroCategoria);
        if (activeSection === "cartera") {
          query = query.eq("estado", "pendiente");
        } else if (filtroEstado) {
          query = query.eq("estado", filtroEstado);
        }
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

        const normalizedBatch = ((batch as Ingreso[]) ?? []).map((row) => ({
          ...row,
          alumno_nombre: row.alumno_id
            ? (() => {
                const alumno = alumnos.find((item) => item.id === row.alumno_id);
                return alumno ? `${alumno.nombre} ${alumno.apellidos}`.trim() : "—";
              })()
            : "—",
          matricula_label: row.matricula_id
            ? (() => {
                const matricula = matriculas.find((item) => item.id === row.matricula_id);
                return matricula ? formatMatriculaLabel(matricula) : "—";
              })()
            : "—",
        })) as IngresoRow[];

        rows.push(...normalizedBatch);
        if (normalizedBatch.length < pageSize) break;
        from += pageSize;
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
        rows.map((row) => [
          row.fecha,
          row.fecha_vencimiento,
          row.categoria,
          row.concepto,
          row.alumno_nombre,
          row.matricula_label,
          Number(row.monto),
          row.metodo_pago,
          row.estado,
          row.numero_factura,
          row.notas,
        ])
      );
    } catch (exportErr: unknown) {
      setError(
        exportErr instanceof Error ? exportErr.message : "No se pudo exportar los ingresos."
      );
    } finally {
      setExporting(false);
    }
  };

  const formatMoney = (value: number) => formatAccountingMoney(Number(value || 0));
  const formatDateLabel = (value: string) => formatCompactDate(value);

  const lineItems = summary?.breakdown.ingresosPorLinea || [];
  const cursosLine = lineItems.find((row) => row.nombre === "Cursos");
  const examenesLine = lineItems.find((row) => row.nombre === "Examenes");
  const practicasLine = lineItems.find((row) => row.nombre === "Practica adicional");
  const contractSummary = summary?.contracts;
  const contractMonthly = contractSummary?.monthly || [];
  const oldPendingContracts = contractSummary?.oldestPending || [];
  const veryOldPendingTotal = oldPendingContracts
    .filter((row) => row.diasPendiente >= 60)
    .reduce((sum, row) => sum + Number(row.saldoPendiente || 0), 0);
  const topCategoryItems = (summary?.breakdown.ingresosPorCategoria || [])
    .slice(0, 5)
    .map((row: AccountingBreakdownRow) => ({
      label: row.categoria || "Sin categoría",
      value: Number(row.total || 0),
      meta: `${row.cantidad} movimiento${row.cantidad === 1 ? "" : "s"} · ${getShare(Number(row.total || 0), summary?.summary.ingresosCobrados || 0)} del cobrado`,
    }));
  const topMethodItems = (summary?.breakdown.ingresosPorMetodo || [])
    .slice(0, 5)
    .map((row: AccountingBreakdownRow) => ({
      label: row.metodo_pago || "Sin método",
      value: Number(row.total || 0),
      meta: `${row.cantidad} movimiento${row.cantidad === 1 ? "" : "s"} · ${getShare(Number(row.total || 0), summary?.summary.ingresosCobrados || 0)} del cobrado`,
    }));
  const topDebtorItems = (summary?.contracts?.topDeudores || []).slice(0, 5).map((row) => ({
    label: row.nombre,
    value: Number(row.total || 0),
    meta: `${row.cantidad} obligación${row.cantidad === 1 ? "" : "es"} pendiente${row.cantidad === 1 ? "" : "s"}`,
  }));
  const oldPendingItems = oldPendingContracts.slice(0, 5).map((row) => ({
    label: row.nombre,
    value: Number(row.saldoPendiente || 0),
    meta: `${row.diasPendiente} día${row.diasPendiente === 1 ? "" : "s"} · ${row.referencia || row.documento || "Sin referencia"}`,
  }));
  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: "fecha" as keyof IngresoRow,
        label: activeSection === "cartera" ? "Registro" : "Fecha",
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
    ];

    if (activeSection === "cartera") {
      return [
        ...baseColumns,
        {
          key: "fecha_vencimiento" as keyof IngresoRow,
          label: "Vencimiento",
          render: (row: IngresoRow) => {
            const dueMeta = getDueMeta(row.fecha_vencimiento);
            return (
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {row.fecha_vencimiento ? formatDateLabel(row.fecha_vencimiento) : "—"}
                </p>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${dueMeta.className}`}
                >
                  {dueMeta.label}
                </span>
                <p className="text-[11px] text-[#86868b]">{dueMeta.detail}</p>
              </div>
            );
          },
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
      ];
    }

    return [
      ...baseColumns,
      {
        key: "metodo_pago" as keyof IngresoRow,
        label: "Método",
        render: (row: IngresoRow) => (
          <span className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-xs font-medium text-[#0071e3] capitalize">
            {metodos.find((metodo) => metodo.value === row.metodo_pago)?.label || row.metodo_pago}
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
    ];
  }, [activeSection]);

  const carteraColumns = useMemo(
    () => [
      {
        key: "fechaRegistro" as keyof CarteraTableRow,
        label: "Registro",
        render: (row: CarteraTableRow) => (
          <span className="font-medium">{formatDateLabel(row.fechaRegistro)}</span>
        ),
      },
      {
        key: "nombre" as keyof CarteraTableRow,
        label: "Alumno",
        render: (row: CarteraTableRow) => (
          <div className="space-y-1">
            <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{row.nombre}</p>
            <p className="text-xs text-[#86868b]">{row.documento || "Sin documento"}</p>
          </div>
        ),
      },
      {
        key: "referencia" as keyof CarteraTableRow,
        label: "Referencia",
        render: (row: CarteraTableRow) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              {row.referencia || "Sin referencia"}
            </p>
            <p className="text-xs text-[#86868b] capitalize">
              {(row.tipoRegistro || "registro").replace(/_/g, " ")}
            </p>
          </div>
        ),
      },
      {
        key: "valorEsperado" as keyof CarteraTableRow,
        label: "Esperado",
        render: (row: CarteraTableRow) => (
          <span className="font-medium">{formatAccountingMoney(row.valorEsperado)}</span>
        ),
      },
      {
        key: "valorCobrado" as keyof CarteraTableRow,
        label: "Cobrado",
        render: (row: CarteraTableRow) => (
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatAccountingMoney(row.valorCobrado)}
          </span>
        ),
      },
      {
        key: "saldoPendiente" as keyof CarteraTableRow,
        label: "Saldo",
        render: (row: CarteraTableRow) => (
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {formatAccountingMoney(row.saldoPendiente)}
          </span>
        ),
      },
      {
        key: "fechaReferencia" as keyof CarteraTableRow,
        label: "Pendiente desde",
        render: (row: CarteraTableRow) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              {formatDateLabel(row.fechaReferencia)}
            </p>
            <p className="text-xs text-[#86868b]">
              {row.diasPendiente > 0
                ? `${row.diasPendiente} día${row.diasPendiente === 1 ? "" : "s"} de atraso`
                : "Pendiente reciente"}
            </p>
          </div>
        ),
      },
    ],
    []
  );

  const dailyColumns = [
    {
      key: "fecha" as keyof IngresoDiarioRow,
      label: "Fecha",
      render: (row: IngresoDiarioRow) => (
        <span className="font-medium">{formatDateLabel(row.fecha)}</span>
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
          {formatMoney(row.total_cobrado)}
        </span>
      ),
    },
    {
      key: "total_pendiente" as keyof IngresoDiarioRow,
      label: "Pendiente",
      render: (row: IngresoDiarioRow) => (
        <span className="font-semibold text-yellow-600 dark:text-yellow-400">
          {formatMoney(row.total_pendiente)}
        </span>
      ),
    },
    {
      key: "total_anulado" as keyof IngresoDiarioRow,
      label: "Anulado",
      render: (row: IngresoDiarioRow) => (
        <span className="font-semibold text-red-500 dark:text-red-400">
          {formatMoney(row.total_anulado)}
        </span>
      ),
    },
    {
      key: "total_registrado" as keyof IngresoDiarioRow,
      label: "Total del día",
      render: (row: IngresoDiarioRow) => (
        <span className="font-semibold">{formatMoney(row.total_registrado)}</span>
      ),
    },
  ];

  return (
    <div>
      <AccountingWorkspaceHeader
        badge="Ingresos"
        title="Ingresos"
        description="Libro de recaudo, cartera y caja diaria. Cada submenú conserva sus propios filtros para trabajar el flujo correcto sin mezclar lectura operativa con cobranza."
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
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/5 px-4 py-2.5 text-sm font-semibold text-[#0071e3] transition-colors hover:bg-[#0071e3]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10 dark:text-[#69a9ff]"
            >
              <Download size={16} />
              {exporting ? "Exportando CSV..." : "Exportar CSV"}
            </button>
          </>
        }
      />

      <AccountingPanel
        title={currentSectionMeta.label}
        description={currentSectionMeta.description}
      >
        {visibleViewItems.length > 0 ? (
          <AccountingChipTabs
            value={activeView}
            items={visibleViewItems}
            onChange={(view) =>
              updateCurrentSectionState({
                activeView: view,
                filtroEstado:
                  activeSection === "cartera"
                    ? "pendiente"
                    : resolveIncomeViewStateFilter(view) || "",
                currentPage: 0,
              })
            }
          />
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className={labelCls}>Alumno</label>
            <select
              value={filtroAlumno}
              onChange={(e) =>
                updateCurrentSectionState({ filtroAlumno: e.target.value, currentPage: 0 })
              }
              className={inputCls}
            >
              <option value="">Todos</option>
              {alumnos.map((alumno) => (
                <option key={alumno.id} value={alumno.id}>
                  {alumno.nombre} {alumno.apellidos}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Método de pago</label>
            <select
              value={filtroMetodo}
              onChange={(e) =>
                updateCurrentSectionState({ filtroMetodo: e.target.value, currentPage: 0 })
              }
              className={inputCls}
            >
              <option value="">Todos</option>
              {metodos.map((metodo) => (
                <option key={metodo.value} value={metodo.value}>
                  {metodo.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) =>
                updateCurrentSectionState({ filtroCategoria: e.target.value, currentPage: 0 })
              }
              className={inputCls}
            >
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Estado</label>
            <select
              value={activeSection === "cartera" ? "pendiente" : filtroEstado}
              onChange={(e) =>
                updateCurrentSectionState({ filtroEstado: e.target.value, currentPage: 0 })
              }
              className={inputCls}
              disabled={activeSection === "cartera"}
            >
              <option value="">Todos</option>
              {estadosIngreso.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Año</label>
            <select
              value={filtroYear}
              onChange={(e) => {
                updateCurrentSectionState({
                  filtroYear: e.target.value,
                  filtroMes: "",
                  currentPage: 0,
                });
              }}
              className={inputCls}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Mes de {filtroYear}</label>
            <select
              value={filtroMes}
              onChange={(e) =>
                updateCurrentSectionState({ filtroMes: e.target.value, currentPage: 0 })
              }
              className={inputCls}
            >
              {mesesDelAno.map((mes) => (
                <option key={mes.value} value={mes.value}>
                  {mes.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hayFiltros && (
          <div className="mt-3 flex">
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
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
            <p className="text-xs text-[#86868b]">
              {displayedCount} {activeSection === "cartera" ? "registro" : "ingreso"}
              {displayedCount !== 1 ? "s" : ""} encontrado{displayedCount !== 1 ? "s" : ""}
            </p>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              Total página: {formatAccountingMoney(displayedPageTotal)}
            </p>
          </div>
        )}
      </AccountingPanel>

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

      {(activeSection === "libro" || activeSection === "cartera") && summaryError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {summaryError}
        </div>
      )}

      {activeSection === "libro" && (
        <div className="mb-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AccountingStatCard
              eyebrow="Recaudo"
              label="Cobrado"
              value={
                summaryLoading
                  ? "..."
                  : formatAccountingMoney(summary?.summary.ingresosCobrados || 0)
              }
              detail={`${summary?.summary.totalIngresos || 0} ingreso${(summary?.summary.totalIngresos || 0) === 1 ? "" : "s"} en el periodo.`}
              tone="success"
              icon={<Wallet size={18} />}
            />
            <AccountingStatCard
              eyebrow="Cobranza"
              label="Pendiente"
              value={
                summaryLoading
                  ? "..."
                  : formatAccountingMoney(summary?.summary.ingresosPendientes || 0)
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
              value={
                summaryLoading ? "..." : formatAccountingMoney(Number(examenesLine?.total || 0))
              }
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
              items={topCategoryItems.map((item) => ({
                label: item.label,
                value: formatAccountingMoney(item.value),
                meta: item.meta,
              }))}
            />
            <AccountingMiniList
              title="Concentración por método"
              description="Cómo está entrando el dinero."
              emptyLabel="No hay métodos con recaudo en el periodo."
              items={topMethodItems.map((item) => ({
                label: item.label,
                value: formatAccountingMoney(item.value),
                meta: item.meta,
              }))}
            />
            <AccountingMiniList
              title="Conceptos fuertes"
              description="Conceptos con mayor peso económico."
              emptyLabel="No hay conceptos registrados en el periodo."
              items={(summary?.breakdown.topConceptosIngreso || []).slice(0, 6).map((row) => ({
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
              items={topDebtorItems.map((item) => ({
                label: item.label,
                value: formatAccountingMoney(item.value),
                meta: item.meta,
              }))}
            />
          </div>
        </div>
      )}

      {activeSection === "cartera" && (
        <div className="mb-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AccountingStatCard
              eyebrow="Registros"
              label="Debería ingresar"
              value={
                summaryLoading ? "..." : formatAccountingMoney(contractSummary?.totalEsperado || 0)
              }
              detail={`${contractSummary?.registros || 0} registro${(contractSummary?.registros || 0) === 1 ? "" : "s"} analizado${(contractSummary?.registros || 0) === 1 ? "" : "s"}.`}
              tone="primary"
              icon={<BookOpen size={18} />}
            />
            <AccountingStatCard
              eyebrow="Registros"
              label="Cobrado"
              value={
                summaryLoading ? "..." : formatAccountingMoney(contractSummary?.totalCobrado || 0)
              }
              detail={`${getShare(Number(contractSummary?.totalCobrado || 0), Number(contractSummary?.totalEsperado || 0))} del esperado.`}
              tone="success"
              icon={<Wallet size={18} />}
            />
            <AccountingStatCard
              eyebrow="Registros"
              label="Falta por pagar"
              value={
                summaryLoading ? "..." : formatAccountingMoney(contractSummary?.totalPendiente || 0)
              }
              detail={`${getShare(Number(contractSummary?.totalPendiente || 0), Number(contractSummary?.totalEsperado || 0))} del esperado.`}
              tone="warning"
              icon={<Clock3 size={18} />}
            />
            <AccountingStatCard
              eyebrow="Morosidad"
              label="Pendiente > 60 días"
              value={summaryLoading ? "..." : formatAccountingMoney(veryOldPendingTotal)}
              detail={`${oldPendingContracts.filter((row) => row.diasPendiente >= 60).length} caso${oldPendingContracts.filter((row) => row.diasPendiente >= 60).length === 1 ? "" : "s"} críticos.`}
              tone="danger"
              icon={<AlertTriangle size={18} />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AccountingBreakdownCard
              title="Antigüedad de cartera"
              subtitle="Distribución de los saldos pendientes por estado de vencimiento."
              rows={carteraBuckets.map((row) => ({ ...row, concepto: row.bucket }))}
              labelKey="concepto"
              emptyLabel="Sin cartera pendiente en el rango seleccionado."
            />
            <AccountingBreakdownCard
              title="Top deudores"
              subtitle="Alumnos o referencias con mayor saldo pendiente."
              rows={carteraTopDeudores.map((row) => ({ ...row, concepto: row.nombre }))}
              labelKey="concepto"
              emptyLabel="Sin deudores pendientes en el rango seleccionado."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AccountingPanel
              title="Esperado vs cobrado por cohorte"
              description="Cuánto debía entrar por registros creados en cada mes y cuánto sigue pendiente."
            >
              {contractMonthly.length === 0 ? (
                <p className="text-sm text-[#86868b]">
                  No hay registros contractuales en el periodo seleccionado.
                </p>
              ) : (
                <div className="space-y-3">
                  {contractMonthly.slice(0, 6).map((row) => (
                    <div
                      key={row.periodo}
                      className="rounded-2xl bg-[#f7f9fc] px-4 py-3 dark:bg-[#111214]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {row.periodo}
                          </p>
                          <p className="mt-1 text-xs text-[#86868b]">
                            {row.registros} registro{row.registros === 1 ? "" : "s"} · Esperado{" "}
                            {formatAccountingMoney(row.valorEsperado)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatAccountingMoney(row.valorCobrado)}
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Pendiente {formatAccountingMoney(row.saldoPendiente)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-[#0071e3]"
                          style={{
                            width: `${Math.max(6, Math.min(100, row.valorEsperado > 0 ? Math.round((row.valorCobrado / row.valorEsperado) * 100) : 0))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccountingPanel>

            <AccountingMiniList
              title="Pendientes más antiguos"
              description="Saldos abiertos desde hace más tiempo para priorizar seguimiento."
              emptyLabel="No hay saldos antiguos pendientes en este corte."
              items={oldPendingItems.map((item) => ({
                label: item.label,
                value: formatAccountingMoney(item.value),
                meta: item.meta,
              }))}
            />
          </div>
        </div>
      )}

      {activeSection === "caja" && (
        <div className="mb-4 rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Ingresos diarios calculados
              </h3>
              <p className="text-sm text-[#86868b]">
                Este resumen consolida automaticamente los ingresos registrados por dia para
                facilitar el control de caja.
              </p>
            </div>
            <div className="text-xs text-[#86868b]">
              {searchTerm
                ? "Respeta la búsqueda aplicada en la tabla."
                : "Respeta los filtros activos de alumno, método, año y mes."}
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-gray-100 bg-[#f7f9fc] px-4 py-3 dark:border-gray-800 dark:bg-[#161618]">
              <p className="mb-1 text-[11px] tracking-[0.18em] text-[#86868b] uppercase">Cobrado</p>
              <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                {formatMoney(dailyStats.totalCobrado)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-[#f7f9fc] px-4 py-3 dark:border-gray-800 dark:bg-[#161618]">
              <p className="mb-1 text-[11px] tracking-[0.18em] text-[#86868b] uppercase">
                Promedio Diario
              </p>
              <p className="text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {formatMoney(dailyStats.promedioCobradoPorDia)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-[#f7f9fc] px-4 py-3 dark:border-gray-800 dark:bg-[#161618]">
              <p className="mb-1 text-[11px] tracking-[0.18em] text-[#86868b] uppercase">
                Mejor Día
              </p>
              <p className="text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {dailyStats.mejorDiaFecha ? formatMoney(dailyStats.mejorDiaMonto) : "—"}
              </p>
              <p className="mt-1 text-xs text-[#86868b]">
                {dailyStats.mejorDiaFecha
                  ? formatDateLabel(dailyStats.mejorDiaFecha)
                  : "Sin movimientos"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-[#f7f9fc] px-4 py-3 dark:border-gray-800 dark:bg-[#161618]">
              <p className="mb-1 text-[11px] tracking-[0.18em] text-[#86868b] uppercase">
                Días Con Movimiento
              </p>
              <p className="text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {dailyStats.diasConMovimientos}
              </p>
              <p className="mt-1 text-xs text-[#86868b]">
                Pendiente: {formatMoney(dailyStats.totalPendiente)} · Anulado:{" "}
                {formatMoney(dailyStats.totalAnulado)}
              </p>
            </div>
          </div>

          {dailyError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
              {dailyError}
            </div>
          )}

          <DataTable
            columns={dailyColumns}
            data={dailyRows}
            loading={dailyLoading}
            searchPlaceholder="Buscar fecha..."
            searchKeys={["fecha"]}
            pageSize={12}
          />
        </div>
      )}

      {(activeSection === "libro" || activeSection === "cartera") && (
        <div className="rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
          {!hayFiltros &&
            !(activeSection === "cartera" ? summaryLoading : loading) &&
            (activeSection === "cartera" ? carteraRows.length > 0 : data.length > 0) && (
              <div className="mb-3 flex justify-end">
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                  Total página: {formatAccountingMoney(displayedPageTotal)}
                </p>
              </div>
            )}
          {activeSection === "cartera" ? (
            <DataTable
              key="cartera"
              columns={carteraColumns}
              data={carteraRows}
              loading={summaryLoading}
              searchPlaceholder="Buscar por alumno, documento o contrato..."
              searchTerm={searchTerm}
              serverSide
              totalCount={carteraTotalCount}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              onSearchChange={handleSearchChange}
              pageSize={PAGE_SIZE}
            />
          ) : (
            <DataTable
              key="libro"
              columns={columns}
              data={data}
              loading={loading}
              searchPlaceholder="Buscar por concepto o cédula..."
              searchTerm={searchTerm}
              onEdit={openEdit}
              onDelete={openDelete}
              serverSide
              totalCount={totalCount}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              onSearchChange={handleSearchChange}
              pageSize={PAGE_SIZE}
            />
          )}
        </div>
      )}

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
                {categorias.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria.replace(/_/g, " ")}
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
                {alumnos.map((alumno) => (
                  <option key={alumno.id} value={alumno.id}>
                    {alumno.nombre} {alumno.apellidos}
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
              {matriculasDisponibles.map((matricula) => (
                <option key={matricula.id} value={matricula.id}>
                  {formatMatriculaLabel(matricula)}
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
                {metodos.map((metodo) => (
                  <option key={metodo.value} value={metodo.value}>
                    {metodo.label}
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
                {estadosIngreso.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
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
