"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase";
import { validateEnrollmentBirthDate } from "@/lib/ansv";
import { useAuth } from "@/hooks/useAuth";
import { useDraftForm } from "@/hooks/useDraftForm";
import DataTable from "@/components/dashboard/DataTable";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import FilterPanel from "@/components/dashboard/FilterPanel";
import PageScaffold from "@/components/dashboard/PageScaffold";
import SummaryRow from "@/components/dashboard/SummaryRow";
import { fetchJsonWithRetry } from "@/lib/retry";
import {
  normalizeStoredCourseCategories,
  toggleCourseCategorySelection,
} from "@/lib/course-categories";
import {
  APP_TIME_ZONE,
  extractDateOnly,
  formatDateOnlyForDisplay,
  getCurrentYear,
  getTodayDateString,
} from "@/lib/date-utils";
import {
  getDashboardListCached,
  invalidateDashboardClientCaches,
} from "@/lib/dashboard-client-cache";
import { canAuditedRolePerformAction, isAuditedRole } from "@/lib/role-capabilities";
import type { Ingreso, MetodoPago, TipoRegistroAlumno } from "@/types/database";
import {
  BookOpen,
  DollarSign,
  Plus,
  Printer,
  UserRound,
  CalendarDays,
  X,
  ReceiptText,
} from "lucide-react";
import { VS_BILLING_SCHOOL, INVOICE_STAFF_ROLES } from "@/lib/vs-billing/scope";
import { toast } from "sonner";
import {
  PAGE_SIZE,
  MONTH_OPTIONS,
  YEAR_OPTIONS,
  tiposRegistroAlumno,
  emptyForm,
  applyAlumnoBillingDefaults,
  emptyMatriculaForm,
  formatTipoRegistroLabel,
  formatNotaExamen,
  getCategoriasDisponiblesParaTipos,
  resolveSedeId,
  type AlumnoRow,
  type AlumnosListResponse,
  type MatriculaResumen,
} from "./constants";

const AlumnoModal = dynamic(() => import("./AlumnoModal"), { ssr: false });
const MatriculaModal = dynamic(() => import("./MatriculaModal"), { ssr: false });
const AbonoModal = dynamic(() => import("./AbonoModal"), { ssr: false });
const FacturaElectronicaModal = dynamic(() => import("./FacturaElectronicaModal"), { ssr: false });

type AlumnosCatalogosResponse = {
  categoriasEscuela: string[];
  tramitadorOptions: string[];
  defaultSedeId: string | null;
};

function alumnoTieneContratoAsignado(alumno: AlumnoRow) {
  if (alumno.tipo_registro !== "regular") return false;
  if (alumno.numero_contrato?.trim()) return true;
  return (alumno.matriculas ?? []).some((matricula) =>
    Boolean(
      matricula.numero_contrato?.trim() ||
      matricula.prefijo_contrato ||
      (matricula.consecutivo_contrato != null && Number(matricula.consecutivo_contrato) > 0)
    )
  );
}

export default function AlumnosPage() {
  const { perfil } = useAuth();
  const auditedRole = isAuditedRole(perfil?.rol) ? perfil.rol : null;
  const canCreateStudent = auditedRole
    ? canAuditedRolePerformAction(auditedRole, "students", "create")
    : true;
  const canEditStudent = auditedRole
    ? canAuditedRolePerformAction(auditedRole, "students", "edit")
    : true;
  const canDeleteStudent = auditedRole
    ? canAuditedRolePerformAction(auditedRole, "students", "delete")
    : true;
  const canCreateIncome = auditedRole
    ? canAuditedRolePerformAction(auditedRole, "income", "create")
    : true;

  // --- Paginación server-side ---
  const [alumnos, setAlumnos] = useState<AlumnoRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summaryCounts, setSummaryCounts] = useState({
    regularCount: 0,
    specialCount: 0,
    periodStudentCount: 0,
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [categoriasEscuela, setCategoriasEscuela] = useState<string[]>([]);
  const [tramitadorOptions, setTramitadorOptions] = useState<string[]>([]);
  const [defaultSedeId, setDefaultSedeId] = useState<string | null>(null);
  const [filtrosTipo, setFiltrosTipo] = useState<TipoRegistroAlumno[]>([]);
  const [filtrosCat, setFiltrosCat] = useState<string[]>([]);
  const [filtroMes, setFiltroMes] = useState<string>("");
  const [filtroFecha, setFiltroFecha] = useState<string>("");
  const [filtroFactura, setFiltroFactura] = useState<"" | "sin_factura" | "facturado">("");

  const [modalOpen, setModalOpen] = useState(false);
  const [facturaAlumno, setFacturaAlumno] = useState<AlumnoRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<AlumnoRow | null>(null);
  const [deleting, setDeleting] = useState<AlumnoRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [alumnoSaveError, setAlumnoSaveError] = useState("");
  const {
    value: form,
    setValue: setForm,
    restoreDraft: restoreAlumnoDraft,
    clearDraft: clearAlumnoDraft,
  } = useDraftForm("dashboard:alumnos:form", emptyForm, {
    persist: modalOpen && !editing,
  });

  const [matriculaOpen, setMatriculaOpen] = useState(false);
  const [matriculaAlumno, setMatriculaAlumno] = useState<AlumnoRow | null>(null);
  const [matriculaSaving, setMatriculaSaving] = useState(false);
  const [matriculaEditing, setMatriculaEditing] = useState<MatriculaResumen | null>(null);
  const [matriculaSaveError, setMatriculaSaveError] = useState("");
  const {
    value: matriculaForm,
    setValue: setMatriculaForm,
    restoreDraft: restoreMatriculaDraft,
    clearDraft: clearMatriculaDraft,
  } = useDraftForm("dashboard:alumnos:matricula-form", emptyMatriculaForm, {
    persist: matriculaOpen && !matriculaEditing,
    contextId: matriculaAlumno?.id,
  });

  const [abonoOpen, setAbonoOpen] = useState(false);
  const [abonoAlumno, setAbonoAlumno] = useState<AlumnoRow | null>(null);
  const [abonoMatriculas, setAbonoMatriculas] = useState<MatriculaResumen[]>([]);
  const [abonoMatriculaId, setAbonoMatriculaId] = useState("");
  const [abonoIngresos, setAbonoIngresos] = useState<Ingreso[]>([]);
  const [loadingIngresos, setLoadingIngresos] = useState(false);
  const [abonoMonto, setAbonoMonto] = useState("");
  const [abonoMetodo, setAbonoMetodo] = useState<MetodoPago>("efectivo");
  const [abonoConcepto, setAbonoConcepto] = useState("");
  const [abonoFecha, setAbonoFecha] = useState(getTodayDateString());
  const [abonoSaving, setAbonoSaving] = useState(false);
  const abonoOperation = useRef<{ signature: string; id: string } | null>(null);

  const fetchIdRef = useRef(0);
  const catalogsLoadedRef = useRef(false);

  // ─── Data fetching ───────────────────────────────────────────────────

  const fetchAlumnos = useCallback(
    async (
      page = 0,
      search = "",
      catFilters: string[] = [],
      typeFilters: TipoRegistroAlumno[] = [],
      mesFilter: string = "",
      fechaFilter: string = "",
      forceFresh = false,
      facturaFilter: "" | "sin_factura" | "facturado" = ""
    ) => {
      if (!perfil?.escuela_id) return;

      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });

      if (search) params.set("q", search);
      if (catFilters.length > 0) params.set("categorias", catFilters.join(","));
      if (typeFilters.length > 0) params.set("tipos", typeFilters.join(","));
      if (mesFilter) params.set("mes", mesFilter);
      if (fechaFilter) params.set("fecha", fechaFilter);
      if (facturaFilter) params.set("factura", facturaFilter);

      // En la primera carga incluimos catálogos para ahorrar 1 HTTP request
      const needCatalogs = !catalogsLoadedRef.current;
      if (needCatalogs) params.set("include_catalogs", "1");

      try {
        const payload = await getDashboardListCached<
          AlumnosListResponse & { _catalogs?: AlumnosCatalogosResponse }
        >({
          name: "alumnos-table",
          scope: {
            id: perfil?.id,
            rol: perfil?.rol,
            escuelaId: perfil?.escuela_id,
            sedeId: perfil?.sede_id,
          },
          params,
          forceFresh,
          loader: () => {
            const requestParams = new URLSearchParams(params);
            if (forceFresh) requestParams.set("fresh", "1");
            return fetchJsonWithRetry<
              AlumnosListResponse & { _catalogs?: AlumnosCatalogosResponse }
            >(`/api/alumnos?${requestParams.toString()}`);
          },
        });
        if (fetchId !== fetchIdRef.current) return;

        setAlumnos(payload.rows || []);
        setTotalCount(payload.totalCount || 0);
        setSummaryCounts({
          regularCount: payload.summary?.regularCount || 0,
          specialCount: payload.summary?.specialCount || 0,
          periodStudentCount: payload.summary?.periodStudentCount || 0,
        });

        // Hidratar catálogos desde la respuesta combinada
        if (payload._catalogs && !catalogsLoadedRef.current) {
          catalogsLoadedRef.current = true;
          setCategoriasEscuela(payload._catalogs.categoriasEscuela || []);
          setTramitadorOptions(payload._catalogs.tramitadorOptions || []);
          setDefaultSedeId(payload._catalogs.defaultSedeId || null);
        }
      } catch (fetchError) {
        if (fetchId !== fetchIdRef.current) return;
        console.error("[AlumnosPage] Error cargando alumnos:", fetchError);
        setAlumnos([]);
        setTotalCount(0);
        setSummaryCounts({ regularCount: 0, specialCount: 0, periodStudentCount: 0 });
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [perfil?.escuela_id, perfil?.id, perfil?.rol, perfil?.sede_id]
  );

  useEffect(() => {
    if (!perfil?.escuela_id) return;
    fetchAlumnos(
      currentPage,
      searchTerm,
      filtrosCat,
      filtrosTipo,
      filtroMes,
      filtroFecha,
      false,
      filtroFactura
    );
  }, [
    fetchAlumnos,
    perfil?.escuela_id,
    currentPage,
    searchTerm,
    filtrosCat,
    filtrosTipo,
    filtroMes,
    filtroFecha,
    filtroFactura,
  ]);

  // ─── Callbacks ───────────────────────────────────────────────────────

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(0);
  }, []);

  const getTramitadorValidationMessage = useCallback(
    (enabled: boolean, tramitadorNombre: string) => {
      if (!enabled) return null;
      if (!tramitadorNombre.trim()) {
        return "Debes indicar el nombre del tramitador.";
      }
      return null;
    },
    []
  );

  const categoriasFiltroDisponibles = useMemo(
    () => getCategoriasDisponiblesParaTipos(filtrosTipo, categoriasEscuela),
    [categoriasEscuela, filtrosTipo]
  );

  useEffect(() => {
    setFiltrosCat((prev) => {
      const next = prev.filter((cat) => categoriasFiltroDisponibles.includes(cat));
      return next.length === prev.length ? prev : next;
    });
  }, [categoriasFiltroDisponibles]);

  const editingHasMultipleMatriculas = Boolean(
    editing && editing.tipo_registro === "regular" && editing.matriculas.length > 1
  );
  const editingMatricula =
    editing && editing.tipo_registro === "regular" && editing.matriculas.length === 1
      ? editing.matriculas[0]
      : null;
  const isAptitudForm = form.tipo_registro === "aptitud_conductor";
  const isPracticeForm = form.tipo_registro === "practica_adicional";
  const abonoMatriculaActual = useMemo(
    () => abonoMatriculas.find((matricula) => matricula.id === abonoMatriculaId) ?? null,
    [abonoMatriculaId, abonoMatriculas]
  );
  const abonoIngresosFiltrados = useMemo(
    () =>
      abonoMatriculaActual
        ? abonoIngresos.filter((ingreso) => ingreso.matricula_id === abonoMatriculaActual.id)
        : abonoIngresos,
    [abonoIngresos, abonoMatriculaActual]
  );
  const deletingTieneContrato = deleting ? alumnoTieneContratoAsignado(deleting) : false;

  // ─── Filter toggles ─────────────────────────────────────────────────

  const toggleFiltroCat = (cat: string) => {
    setFiltrosCat((prev) => {
      const next = prev.includes(cat) ? prev.filter((value) => value !== cat) : [...prev, cat];
      setCurrentPage(0);
      return next;
    });
  };

  const toggleFiltroTipo = (tipo: TipoRegistroAlumno) => {
    setFiltrosTipo((prev) => {
      const next = prev.includes(tipo) ? prev.filter((value) => value !== tipo) : [...prev, tipo];
      const categoriasDisponibles = getCategoriasDisponiblesParaTipos(next, categoriasEscuela);
      setFiltrosCat((current) => {
        const filtered = current.filter((cat) => categoriasDisponibles.includes(cat));
        return filtered.length === current.length ? current : filtered;
      });
      setCurrentPage(0);
      return next;
    });
  };

  const toggleCategoria = (cat: string) => {
    setForm((prev) => {
      const nextCategorias =
        prev.tipo_registro === "aptitud_conductor"
          ? prev.categorias[0] === cat
            ? []
            : [cat]
          : toggleCourseCategorySelection(prev.categorias, cat);

      let nextAnsv = prev.ansv_categoria;
      if (!nextCategorias.includes(nextAnsv)) {
        nextAnsv = nextCategorias.length > 0 ? nextCategorias[0] : "";
      }

      return {
        ...prev,
        ansv_categoria: nextAnsv,
        categorias: nextCategorias,
      };
    });
  };

  const toggleMatriculaCategoria = (cat: string) => {
    setMatriculaForm((prev) => {
      const nextCategorias = toggleCourseCategorySelection(prev.categorias, cat);
      let nextAnsv = prev.ansv_categoria;
      if (!nextCategorias.includes(nextAnsv)) {
        nextAnsv = nextCategorias.length > 0 ? nextCategorias[0] : "";
      }

      return {
        ...prev,
        ansv_categoria: nextAnsv,
        categorias: nextCategorias,
      };
    });
  };

  // ─── Modal openers ──────────────────────────────────────────────────

  const openCreate = () => {
    if (!canCreateStudent) return;
    setEditing(null);
    setAlumnoSaveError("");
    restoreAlumnoDraft(emptyForm);
    setForm((current) => {
      const restored = applyAlumnoBillingDefaults({ ...emptyForm, ...current });
      const categorias = normalizeStoredCourseCategories(restored.categorias);
      let ansv_categoria = restored.ansv_categoria || "";
      if (categorias.length > 0 && (!ansv_categoria || !categorias.includes(ansv_categoria))) {
        ansv_categoria = categorias[0];
      }
      return { ...restored, categorias, ansv_categoria };
    });
    setModalOpen(true);
  };

  const openEdit = (alumno: AlumnoRow) => {
    if (!canEditStudent) return;
    const matricula = alumno.matriculas[0] ?? null;
    const categorias = normalizeStoredCourseCategories(
      (matricula?.categorias as string[] | undefined) || alumno.categorias_resumen
    );
    let ansv_categoria = matricula?.ansv?.categoria || "";
    if (categorias.length > 0 && (!ansv_categoria || !categorias.includes(ansv_categoria))) {
      ansv_categoria = categorias[0];
    }
    setEditing(alumno);
    setAlumnoSaveError("");
    setForm({
      tipo_registro: alumno.tipo_registro,
      nombre: alumno.nombre,
      apellidos: alumno.apellidos,
      dni: alumno.dni,
      tipo_documento: alumno.tipo_documento || "CC",
      email: alumno.email || "",
      lugar_expedicion_documento: alumno.lugar_expedicion_documento || "",
      telefono: alumno.telefono || "",
      fecha_nacimiento: extractDateOnly(alumno.fecha_nacimiento) || "",
      sexo: alumno.sexo || "",
      ansv_categoria,
      direccion: alumno.direccion || "",
      ciudad: alumno.ciudad || "",
      departamento: alumno.departamento || "",
      pais: alumno.datos_facturacion?.country || "CO",
      municipio_codigo: alumno.datos_facturacion?.cityCode || "",
      regimen_fiscal: alumno.datos_facturacion?.taxRegime || "",
      responsabilidad_fiscal: alumno.datos_facturacion?.responsibilities || "R-99-PN",
      tipo_permiso: alumno.tipo_permiso,
      categorias,
      estado: alumno.estado,
      empresa_convenio: alumno.empresa_convenio || "",
      nota_examen_teorico:
        alumno.nota_examen_teorico !== null ? String(alumno.nota_examen_teorico) : "",
      fecha_examen_teorico: extractDateOnly(alumno.fecha_examen_teorico) || "",
      nota_examen_practico:
        alumno.nota_examen_practico !== null ? String(alumno.nota_examen_practico) : "",
      fecha_examen_practico: extractDateOnly(alumno.fecha_examen_practico) || "",
      notas: alumno.notas || "",
      numero_contrato: matricula?.numero_contrato || alumno.numero_contrato || "",
      fecha_inscripcion:
        extractDateOnly(matricula?.fecha_inscripcion || alumno.fecha_inscripcion) ||
        getTodayDateString(),
      valor_total: matricula?.valor_total
        ? String(matricula.valor_total)
        : alumno.valor_total
          ? String(alumno.valor_total)
          : "",
      abono: "",
      metodo_pago_abono: "efectivo",
      tiene_tramitador: Boolean(matricula?.tiene_tramitador),
      tramitador_nombre: matricula?.tramitador_nombre || "",
      tramitador_valor: matricula?.tramitador_valor ? String(matricula.tramitador_valor) : "",
      consentimiento_datos: alumno.consentimiento_datos ?? true,
      facturado: alumno.facturado ?? false,
      numero_factura_electronica: alumno.numero_factura_electronica || "",
    });
    setModalOpen(true);
  };

  const openDelete = (alumno: AlumnoRow) => {
    if (!canDeleteStudent) return;
    setDeleting(alumno);
    setDeleteOpen(true);
  };

  const openNewMatricula = (alumno: AlumnoRow) => {
    if (!canEditStudent) return;
    setMatriculaAlumno(alumno);
    setMatriculaEditing(null);
    setMatriculaSaveError("");
    restoreMatriculaDraft(
      {
        ...emptyMatriculaForm,
        fecha_inscripcion: getTodayDateString(),
      },
      alumno.id
    );
    setMatriculaForm((current) => {
      const categorias = normalizeStoredCourseCategories(current.categorias);
      let ansv_categoria = current.ansv_categoria || "";
      if (categorias.length > 0 && (!ansv_categoria || !categorias.includes(ansv_categoria))) {
        ansv_categoria = categorias[0];
      }
      return {
        ...current,
        categorias,
        ansv_categoria,
      };
    }, alumno.id);
    setMatriculaOpen(true);
  };

  const openEditMatricula = (alumno: AlumnoRow, matricula: MatriculaResumen) => {
    if (!canEditStudent) return;
    setMatriculaAlumno(alumno);
    setMatriculaEditing(matricula);
    setMatriculaSaveError("");
    const categorias = normalizeStoredCourseCategories(matricula.categorias || []);
    let ansv_categoria = matricula.ansv?.categoria || "";
    if (categorias.length > 0 && (!ansv_categoria || !categorias.includes(ansv_categoria))) {
      ansv_categoria = categorias[0];
    }
    setMatriculaForm(
      {
        ...emptyMatriculaForm,
        estado: matricula.estado,
        ansv_categoria,
        fecha_inscripcion: extractDateOnly(matricula.fecha_inscripcion) || getTodayDateString(),
        categorias,
        valor_total: matricula.valor_total == null ? "" : String(matricula.valor_total),
        notas: matricula.notas || "",
        tiene_tramitador: Boolean(matricula.tiene_tramitador),
        tramitador_nombre: matricula.tramitador_nombre || "",
        tramitador_valor:
          matricula.tramitador_valor == null ? "" : String(matricula.tramitador_valor),
      },
      alumno.id
    );
    setMatriculaOpen(true);
  };

  const openAbono = useCallback(
    async (alumno: AlumnoRow) => {
      if (!canCreateIncome) return;
      setAbonoAlumno(alumno);
      setAbonoMatriculas(alumno.matriculas);
      setAbonoMatriculaId(alumno.matriculas[0]?.id || "");
      setAbonoMonto("");
      setAbonoMetodo("efectivo");
      setAbonoConcepto("");
      setAbonoFecha(getTodayDateString());
      setAbonoIngresos([]);
      setAbonoOpen(true);
      setLoadingIngresos(true);

      const supabase = createClient();
      const { data } = await supabase
        .from("ingresos")
        .select("*")
        .eq("alumno_id", alumno.id)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });

      setAbonoIngresos((data as Ingreso[]) || []);
      setLoadingIngresos(false);
    },
    [canCreateIncome]
  );

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleSave = async () => {
    if (editing ? !canEditStudent : !canCreateStudent) return;
    if (saving) return;
    setSaving(true);
    setAlumnoSaveError("");
    const reportSaveError = (message: string) => {
      setAlumnoSaveError(message);
      toast.error(message);
    };
    try {
      const { alumnoSchema, alumnoEditSchema } = await import("./schemas");
      const { studentBillingContactSchema, studentBillingProfileFromForm } =
        await import("@/lib/student-billing-contact");
      const ansvCategoria =
        form.ansv_categoria || (form.categorias.length > 0 ? form.categorias[0] : "");
      const formToValidate = {
        ...form,
        ansv_categoria: ansvCategoria,
      };
      const result = (editing ? alumnoEditSchema : alumnoSchema).safeParse(formToValidate);
      if (!result.success) {
        reportSaveError(result.error.issues[0]?.message || "Error de validación.");
        return;
      }
      if (editing?.tipo_registro === "regular") {
        try {
          if ((form.fecha_nacimiento || null) !== extractDateOnly(editing.fecha_nacimiento))
            validateEnrollmentBirthDate(form.fecha_nacimiento);
          if (editing.sexo && !form.sexo)
            throw new Error("El sexo es obligatorio para ANSV; no borres el dato guardado.");
        } catch (error) {
          reportSaveError((error as Error).message);
          return;
        }
      }
      const billingProfile = studentBillingProfileFromForm(form);
      if (!editing) {
        const contact = studentBillingContactSchema.safeParse({
          ...form,
          datos_facturacion: billingProfile,
        });
        if (!contact.success) {
          reportSaveError(
            contact.error.issues[0]?.message || "Completa los datos obligatorios de facturación."
          );
          return;
        }
      }

      const isPersonalEdit = editing?.tipo_registro === "regular";
      const initialBilling = editing
        ? studentBillingProfileFromForm({
            pais: editing.datos_facturacion?.country || "CO",
            municipio_codigo: editing.datos_facturacion?.cityCode || "",
            regimen_fiscal: editing.datos_facturacion?.taxRegime || "",
            responsabilidad_fiscal: editing.datos_facturacion?.responsibilities || "R-99-PN",
          })
        : null;
      const fiscalProfileChanged =
        !initialBilling ||
        Object.entries(billingProfile).some(
          ([key, value]) => initialBilling[key as keyof typeof initialBilling] !== value
        );
      const isAptitud = form.tipo_registro === "aptitud_conductor";
      const isPractice = form.tipo_registro === "practica_adicional";

      if (!isPractice && !isPersonalEdit && form.categorias.length === 0) {
        reportSaveError(
          isAptitud
            ? "Debes seleccionar la categoría evaluada."
            : "Debes seleccionar al menos una categoría de curso."
        );
        return;
      }

      const abonoNum = parseFloat(String(form.abono)) || 0;
      const valorTotalNum = parseFloat(String(form.valor_total)) || 0;
      const notaTeoricaNum =
        form.nota_examen_teorico === "" ? null : parseFloat(String(form.nota_examen_teorico));
      const notaPracticaNum =
        form.nota_examen_practico === "" ? null : parseFloat(String(form.nota_examen_practico));

      if (!editing && abonoNum > 0 && valorTotalNum > 0 && abonoNum > valorTotalNum) {
        reportSaveError(
          isAptitud
            ? "El pago inicial no puede ser mayor al valor del servicio."
            : "El abono no puede ser mayor al valor total del curso."
        );
        return;
      }

      const tramitadorValidationMessage = getTramitadorValidationMessage(
        form.tiene_tramitador,
        form.tramitador_nombre
      );
      if (!isPersonalEdit && tramitadorValidationMessage) {
        reportSaveError(tramitadorValidationMessage);
        return;
      }

      if (!perfil?.escuela_id) {
        reportSaveError("Tu usuario no tiene escuela asignada. Contacta al administrador.");
        return;
      }

      const sedeId =
        editing?.sede_id ||
        defaultSedeId ||
        (await resolveSedeId(perfil.escuela_id, perfil.sede_id));
      if (!sedeId) {
        reportSaveError("No se encontró una sede para esta escuela. Crea una sede primero.");
        setSaving(false);
        return;
      }
      const tramitadorValorNum = parseFloat(form.tramitador_valor) || 0;
      await fetchJsonWithRetry("/api/alumnos/manage", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alumno_id: editing?.id,
          solo_ficha: Boolean(isPersonalEdit),
          sede_id: sedeId,
          tipo_registro: form.tipo_registro,
          nombre: form.nombre.trim(),
          apellidos: form.apellidos.trim(),
          dni: form.dni.trim(),
          tipo_documento: form.tipo_documento,
          lugar_expedicion_documento: form.lugar_expedicion_documento.trim(),
          email: form.email.trim() || null,
          telefono: form.telefono.trim(),
          fecha_nacimiento: form.fecha_nacimiento || null,
          sexo: form.sexo || undefined,
          ansv_categoria: ansvCategoria || undefined,
          direccion: form.direccion.trim() || null,
          ciudad: form.ciudad.trim() || null,
          departamento: form.departamento.trim() || null,
          datos_facturacion:
            fiscalProfileChanged && form.municipio_codigo && form.regimen_fiscal
              ? billingProfile
              : undefined,
          categorias: form.categorias,
          estado: form.estado,
          empresa_convenio: form.empresa_convenio.trim() || null,
          nota_examen_teorico: notaTeoricaNum,
          fecha_examen_teorico: form.fecha_examen_teorico || null,
          nota_examen_practico: notaPracticaNum,
          fecha_examen_practico: form.fecha_examen_practico || null,
          notas: form.notas.trim() || null,
          numero_contrato: form.numero_contrato.trim() || null,
          fecha_inscripcion: form.fecha_inscripcion || null,
          valor_total: valorTotalNum || null,
          abono: abonoNum,
          metodo_pago_abono: form.metodo_pago_abono,
          tiene_tramitador: isPersonalEdit ? false : form.tiene_tramitador,
          tramitador_nombre: form.tramitador_nombre.trim() || null,
          tramitador_valor: form.tiene_tramitador ? tramitadorValorNum || null : null,
          consentimiento_datos: form.consentimiento_datos,
          facturado: form.facturado,
          numero_factura_electronica: form.numero_factura_electronica.trim() || null,
        }),
      });

      clearAlumnoDraft(emptyForm);
      setModalOpen(false);
      toast.success(editing ? "Alumno actualizado" : "Alumno registrado");
      invalidateDashboardClientCaches();
      fetchAlumnos(
        currentPage,
        searchTerm,
        filtrosCat,
        filtrosTipo,
        filtroMes,
        filtroFecha,
        true,
        filtroFactura
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "Error al guardar";
      reportSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMatricula = async () => {
    if (!canEditStudent) return;
    if (matriculaSaving) return;
    if (!matriculaAlumno || !perfil?.escuela_id) return;
    if (matriculaAlumno.tipo_registro !== "regular") {
      toast.error("Solo los alumnos regulares pueden tener matrículas.");
      return;
    }

    setMatriculaSaving(true);
    setMatriculaSaveError("");
    const reportMatriculaError = (message: string) => {
      setMatriculaSaveError(message);
      toast.error(message);
    };
    try {
      const { matriculaSchema } = await import("./schemas");
      const ansvCategoria =
        matriculaForm.ansv_categoria ||
        (matriculaForm.categorias.length > 0 ? matriculaForm.categorias[0] : "");
      const result = matriculaSchema.safeParse(matriculaForm);
      if (!result.success) {
        reportMatriculaError(
          result.error.issues[0]?.message || "Verifica los datos del formulario."
        );
        return;
      }

      const valorTotalNum = parseFloat(String(matriculaForm.valor_total)) || 0;
      const abonoNum = parseFloat(String(matriculaForm.abono)) || 0;
      if (!matriculaEditing && abonoNum > 0 && valorTotalNum > 0 && abonoNum > valorTotalNum) {
        reportMatriculaError("El abono no puede ser mayor al valor total del curso.");
        return;
      }

      const tramitadorValidationMessage = getTramitadorValidationMessage(
        matriculaForm.tiene_tramitador,
        matriculaForm.tramitador_nombre
      );
      if (tramitadorValidationMessage) {
        reportMatriculaError(tramitadorValidationMessage);
        return;
      }

      const sedeId =
        matriculaAlumno.sede_id ||
        defaultSedeId ||
        (await resolveSedeId(perfil.escuela_id, perfil.sede_id));
      if (!sedeId) {
        reportMatriculaError("No se encontró una sede para esta escuela.");
        setMatriculaSaving(false);
        return;
      }

      const tramitadorValorNum = parseFloat(matriculaForm.tramitador_valor) || 0;
      await fetchJsonWithRetry("/api/alumnos/matriculas", {
        method: matriculaEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alumno_id: matriculaAlumno.id,
          matricula_id: matriculaEditing?.id,
          estado: matriculaForm.estado,
          sede_id: sedeId,
          fecha_inscripcion: matriculaForm.fecha_inscripcion,
          ansv_categoria: ansvCategoria || undefined,
          categorias: matriculaForm.categorias,
          valor_total: matriculaForm.valor_total === "" ? null : valorTotalNum,
          notas: matriculaForm.notas.trim() || null,
          abono: matriculaEditing ? 0 : abonoNum,
          metodo_pago_abono: matriculaForm.metodo_pago_abono,
          tiene_tramitador: matriculaForm.tiene_tramitador,
          tramitador_nombre: matriculaForm.tramitador_nombre.trim() || null,
          tramitador_valor: matriculaForm.tiene_tramitador ? tramitadorValorNum || null : null,
        }),
      });

      setMatriculaOpen(false);
      setMatriculaAlumno(null);
      clearMatriculaDraft(emptyMatriculaForm);
      toast.success(matriculaEditing ? "Matrícula actualizada" : "Matrícula creada correctamente");
      setMatriculaEditing(null);
      invalidateDashboardClientCaches();
      fetchAlumnos(
        currentPage,
        searchTerm,
        filtrosCat,
        filtrosTipo,
        filtroMes,
        filtroFecha,
        true,
        filtroFactura
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "Error al guardar la matrícula";
      reportMatriculaError(message);
    } finally {
      setMatriculaSaving(false);
    }
  };

  const handleSaveAbono = async () => {
    if (!canCreateIncome) return;
    if (abonoSaving) return;
    if (!abonoAlumno || !perfil?.escuela_id) return;

    let paymentSaved = false;
    setAbonoSaving(true);
    try {
      const { abonoSchema } = await import("./schemas");
      const result = abonoSchema.safeParse({ monto: abonoMonto });
      if (!result.success) {
        toast.error(result.error.issues[0]?.message);
        return;
      }
      const monto = parseFloat(abonoMonto);

      if (!abonoFecha) {
        toast.error("Debes seleccionar una fecha para el abono.");
        return;
      }

      if (abonoMatriculas.length > 0 && !abonoMatriculaActual) {
        toast.error("Selecciona la matrícula a la que corresponde este abono.");
        return;
      }

      const payment = {
        alumno_id: abonoAlumno.id,
        matricula_id: abonoMatriculaActual?.id || null,
        monto,
        metodo_pago: abonoMetodo,
        concepto: abonoConcepto.trim() || null,
        fecha: abonoFecha,
      };
      const signature = JSON.stringify([perfil.id, perfil.escuela_id, payment]);
      if (abonoOperation.current?.signature !== signature) {
        abonoOperation.current = { signature, id: crypto.randomUUID() };
      }
      await fetchJsonWithRetry("/api/alumnos/abonos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payment,
          operacion_id: abonoOperation.current.id,
        }),
      });
      paymentSaved = true;
      abonoOperation.current = null;
      setAbonoMonto("");
      setAbonoConcepto("");
      setAbonoFecha(getTodayDateString());
      toast.success("Abono registrado con éxito");

      // Reload ingresos after successful insert
      const supabase = createClient();
      const { data, error: refreshError } = await supabase
        .from("ingresos")
        .select("*")
        .eq("alumno_id", abonoAlumno.id)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });

      if (refreshError) toast.warning("El abono quedó guardado. Actualiza la lista para verlo.");
      else setAbonoIngresos((data as Ingreso[]) || []);
      invalidateDashboardClientCaches();
      fetchAlumnos(
        currentPage,
        searchTerm,
        filtrosCat,
        filtrosTipo,
        filtroMes,
        filtroFecha,
        true,
        filtroFactura
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "Error al registrar";
      if (paymentSaved)
        toast.warning("El abono quedó guardado. Actualiza la página para ver los saldos.");
      else toast.error(message);
    } finally {
      setAbonoSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDeleteStudent) return;
    if (!deleting) return;

    setSaving(true);
    try {
      const tieneContrato = alumnoTieneContratoAsignado(deleting);

      await fetchJsonWithRetry(tieneContrato ? "/api/alumnos/cancelar" : "/api/alumnos/manage", {
        method: tieneContrato ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alumno_id: deleting.id }),
      });

      setDeleteOpen(false);
      setDeleting(null);
      toast.success(tieneContrato ? "Alumno cancelado" : "Alumno eliminado");
      invalidateDashboardClientCaches();
      fetchAlumnos(
        currentPage,
        searchTerm,
        filtrosCat,
        filtrosTipo,
        filtroMes,
        filtroFecha,
        true,
        filtroFactura
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  // ─── Column definitions ─────────────────────────────────────────────

  const columns = [
    {
      key: "fecha_inscripcion" as keyof AlumnoRow,
      label: "Matrícula y Contrato",
      render: (row: AlumnoRow) => {
        const matriculaReciente = row.matriculas?.[0];
        const fecha =
          matriculaReciente?.fecha_inscripcion || row.fecha_inscripcion || row.created_at;

        const contratos = new Set<string>();
        if (row.numero_contrato) contratos.add(row.numero_contrato);
        for (const m of row.matriculas || []) {
          if (m.numero_contrato) contratos.add(m.numero_contrato);
        }
        const contratoList = Array.from(contratos);

        return (
          <div>
            <span className="text-sm font-medium">
              {matriculaReciente?.fecha_inscripcion || row.fecha_inscripcion
                ? formatDateOnlyForDisplay(fecha)
                : row.created_at
                  ? new Intl.DateTimeFormat("es-CO", {
                      timeZone: APP_TIME_ZONE,
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }).format(new Date(row.created_at))
                  : "—"}
            </span>
            {contratoList.length > 0 && (
              <div className="mt-0.5 space-y-0.5">
                {contratoList.map((c) => (
                  <p key={c} className="text-[11px] text-[#86868b]">
                    {c}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "nombre" as keyof AlumnoRow,
      label: "Alumno",
      render: (row: AlumnoRow) => (
        <div>
          <span className="font-medium">
            {row.nombre} {row.apellidos}
          </span>
          {row.tipo_registro !== "regular" && row.empresa_convenio && (
            <p className="mt-0.5 text-[11px] text-[#86868b]">{row.empresa_convenio}</p>
          )}
        </div>
      ),
    },
    { key: "dni" as keyof AlumnoRow, label: "Cédula" },
    { key: "telefono" as keyof AlumnoRow, label: "Teléfono" },
    {
      key: "categorias_resumen" as keyof AlumnoRow,
      label: "Cursos",
      render: (row: AlumnoRow) => {
        if (row.categorias_resumen.length === 0)
          return <span className="text-xs text-[#86868b]">—</span>;
        return (
          <div>
            <div className="flex flex-wrap gap-1">
              {row.categorias_resumen.map((categoria) => (
                <span
                  key={`${row.id}-${categoria}`}
                  className="rounded-md bg-[#0071e3]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#0071e3]"
                >
                  {categoria}
                </span>
              ))}
            </div>
            {row.matriculas.length > 1 && (
              <p className="mt-1 text-[10px] text-[#86868b]">
                {row.matriculas.filter((m) => m.estado === "activo").length} matrículas activas
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "valor_total_resumen" as keyof AlumnoRow,
      label: "Valor Total",
      render: (row: AlumnoRow) =>
        row.valor_total_resumen > 0 ? (
          <span className="text-sm font-medium">
            ${row.valor_total_resumen.toLocaleString("es-CO")}
          </span>
        ) : (
          <span className="text-xs text-[#86868b]">—</span>
        ),
    },
    {
      key: "saldo_pendiente" as keyof AlumnoRow,
      label: "Saldo Pendiente",
      render: (row: AlumnoRow) => {
        if (row.valor_total_resumen <= 0) return <span className="text-xs text-[#86868b]">—</span>;
        if (row.saldo_pendiente <= 0) {
          return (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Al día
            </span>
          );
        }
        return (
          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            ${row.saldo_pendiente.toLocaleString("es-CO")}
          </span>
        );
      },
    },
    {
      key: "facturado" as keyof AlumnoRow,
      label: "Factura",
      render: (row: AlumnoRow) => {
        const invoices = row.matriculas.filter((m) => m.facturax_invoice);
        if (invoices.length) {
          return (
            <div className="space-y-1 text-xs">
              {invoices.map((m) => (
                <div key={m.id}>
                  <span
                    className={
                      m.facturax_invoice?.state === "accepted"
                        ? "font-medium text-green-700 dark:text-green-400"
                        : "font-medium text-amber-700 dark:text-amber-400"
                    }
                  >
                    {m.facturax_invoice?.number || "Pendiente"}
                    {m.facturax_invoice?.state === "accepted" ? "" : " · Sin validar"}
                  </span>
                  <p className="text-[10px] text-[#86868b]">
                    Contrato {m.numero_contrato || "sin numero"}
                  </p>
                </div>
              ))}
            </div>
          );
        }
        if (row.facturado) {
          return (
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Facturado
              </span>
              {row.numero_factura_electronica && (
                <p className="mt-0.5 text-[10px] text-[#86868b]">
                  {row.numero_factura_electronica}
                </p>
              )}
            </div>
          );
        }
        return (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
            Sin factura
          </span>
        );
      },
    },
    {
      key: "nota_examen_teorico" as keyof AlumnoRow,
      label: "Resultados",
      render: (row: AlumnoRow) =>
        row.tipo_registro === "aptitud_conductor" ? (
          <div className="text-xs leading-5">
            <p>
              <span className="font-semibold">Teórico:</span>{" "}
              {formatNotaExamen(row.nota_examen_teorico, row.fecha_examen_teorico)}
            </p>
            <p>
              <span className="font-semibold">Práctico:</span>{" "}
              {formatNotaExamen(row.nota_examen_practico, row.fecha_examen_practico)}
            </p>
          </div>
        ) : (
          <span className="text-xs text-[#86868b]">—</span>
        ),
    },
    {
      key: "tipo_registro" as keyof AlumnoRow,
      label: "Tipo",
      render: (row: AlumnoRow) => (
        <div className="flex flex-col gap-1">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              row.tipo_registro === "aptitud_conductor"
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                : row.tipo_registro === "practica_adicional"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
            }`}
          >
            {formatTipoRegistroLabel(row.tipo_registro)}
          </span>
          {row.estado === "pre_registrado" && (
            <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
              Pre-registrado
            </span>
          )}
        </div>
      ),
    },
  ];

  // ─── Abono derived values ───────────────────────────────────────────

  const valorTotalAbono = Number(
    abonoMatriculaActual?.valor_total || abonoAlumno?.valor_total_resumen || 0
  );
  const totalPagadoAbono = abonoIngresosFiltrados
    .filter((ingreso) => ingreso.estado === "cobrado")
    .reduce((sum, ingreso) => sum + Number(ingreso.monto), 0);
  const saldoPendienteAbono = valorTotalAbono - totalPagadoAbono;
  const summaryItems = useMemo(() => {
    const hasPeriodFilter = Boolean(filtroFecha || filtroMes);
    const primaryValue = hasPeriodFilter
      ? summaryCounts.periodStudentCount
      : totalCount || alumnos.length;
    const primaryLabel = hasPeriodFilter ? "Alumnos del periodo" : "Registros filtrados";
    const primaryDetail = hasPeriodFilter
      ? `${summaryCounts.periodStudentCount} alumnos regulares con fecha propia dentro del periodo seleccionado en horario de Bogotá.`
      : `${totalCount || alumnos.length} registros totales · ${summaryCounts.regularCount} regulares y ${summaryCounts.specialCount} especiales.`;

    return [
      {
        id: "total",
        label: primaryLabel,
        value: String(primaryValue),
        detail: primaryDetail,
        icon: <UserRound size={18} />,
        tone: "primary" as const,
      },
      {
        id: "periodo",
        label: "Periodo activo",
        value: filtroFecha || filtroMes || "Todos",
        detail: "Usa filtros para separar cohortes, cursos y servicios.",
        icon: <CalendarDays size={18} />,
        tone: "default" as const,
      },
    ];
  }, [
    alumnos.length,
    filtroFecha,
    filtroMes,
    summaryCounts.periodStudentCount,
    summaryCounts.regularCount,
    summaryCounts.specialCount,
    totalCount,
  ]);

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <PageScaffold
      eyebrow="Operación"
      title="Alumnos"
      description="Gestiona expedientes, matrículas, procesos de aptitud y prácticas adicionales desde una sola vista operativa."
      actions={
        canCreateStudent ? (
          <button onClick={openCreate} className="apple-button-primary text-sm">
            <Plus size={16} />
            Nuevo alumno
          </button>
        ) : null
      }
    >
      <SummaryRow items={summaryItems} columns={2} />

      {/* ========== Filters ========== */}
      {(() => {
        const hayFiltrosActivos =
          filtrosTipo.length > 0 ||
          filtrosCat.length > 0 ||
          filtroMes !== "" ||
          filtroFecha !== "" ||
          filtroFactura !== "";
        return (
          <FilterPanel
            title="Filtros de alumnos"
            description="Combina periodo, tipo de registro, categorias y estado de factura para encontrar rapido lo que necesitas."
            actions={
              hayFiltrosActivos ? (
                <button
                  onClick={() => {
                    setFiltrosTipo([]);
                    setFiltrosCat([]);
                    setFiltroMes("");
                    setFiltroFecha("");
                    setFiltroFactura("");
                    setCurrentPage(0);
                  }}
                  className="apple-button-ghost text-xs"
                >
                  <X size={12} />
                  Limpiar filtros
                </button>
              ) : null
            }
          >
            <div className="md:col-span-2 xl:col-span-2">
              <span className="mb-2 block text-xs font-medium text-[#86868b]">Periodo</span>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={filtroMes.split("-")[0] || ""}
                  onChange={(e) => {
                    const newYear = e.target.value;
                    const currentMonth = filtroMes.split("-")[1] || "";
                    setFiltroMes(
                      newYear ? (currentMonth ? `${newYear}-${currentMonth}` : newYear) : ""
                    );
                    setCurrentPage(0);
                  }}
                  className="apple-select"
                >
                  <option value="">Todos los años</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <select
                  value={filtroMes.split("-")[1] || ""}
                  onChange={(e) => {
                    const newMonth = e.target.value;
                    const currentYear = filtroMes.split("-")[0] || String(getCurrentYear());
                    setFiltroMes(newMonth ? `${currentYear}-${newMonth}` : currentYear);
                    setCurrentPage(0);
                  }}
                  disabled={!(filtroMes.split("-")[0] || "")}
                  className="apple-select"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-2 xl:col-span-2">
              <span className="mb-2 block text-xs font-medium text-[#86868b]">Fecha exacta</span>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => {
                  setFiltroFecha(e.target.value);
                  setCurrentPage(0);
                }}
                className="apple-input"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-2">
              <span className="mb-2 block text-xs font-medium text-[#86868b]">
                Tipo de registro
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {tiposRegistroAlumno.map((tipo) => {
                  const activo = filtrosTipo.includes(tipo.value);
                  return (
                    <button
                      key={tipo.value}
                      onClick={() => toggleFiltroTipo(tipo.value)}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                        activo
                          ? "bg-[#0071e3] text-white"
                          : "border border-[var(--surface-border)] bg-[var(--surface-strong)] text-[#66707a] hover:text-[#111214] dark:text-[#aeb6bf] dark:hover:text-[#f5f5f7]"
                      }`}
                    >
                      {tipo.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2 xl:col-span-2">
              <span className="mb-2 block text-xs font-medium text-[#86868b]">
                Factura electronica
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { value: "sin_factura" as const, label: "Sin facturar" },
                    { value: "facturado" as const, label: "Facturado" },
                  ] as const
                ).map((opt) => {
                  const activo = filtroFactura === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setFiltroFactura(activo ? "" : opt.value);
                        setCurrentPage(0);
                      }}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                        activo
                          ? opt.value === "sin_factura"
                            ? "bg-red-500 text-white"
                            : "bg-green-600 text-white"
                          : "border border-[var(--surface-border)] bg-[var(--surface-strong)] text-[#66707a] hover:text-[#111214] dark:text-[#aeb6bf] dark:hover:text-[#f5f5f7]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <span className="mb-2 block text-xs font-medium text-[#86868b]">Categorias</span>
              {categoriasFiltroDisponibles.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {categoriasFiltroDisponibles.map((cat) => {
                    const activo = filtrosCat.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleFiltroCat(cat)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                          activo
                            ? "bg-[#0071e3] text-white"
                            : "border border-[var(--surface-border)] bg-[var(--surface-strong)] text-[#66707a] hover:text-[#111214] dark:text-[#aeb6bf] dark:hover:text-[#f5f5f7]"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[18px] border border-[var(--surface-border)] bg-[var(--surface-strong)] px-3 py-3 text-xs text-[#66707a] dark:text-[#aeb6bf]">
                  El tipo seleccionado no trabaja con categorías. Usa este filtro para cursos
                  regulares o aptitud.
                </div>
              )}
            </div>
          </FilterPanel>
        );
      })()}

      {/* ========== DataTable ========== */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
        <DataTable
          columns={columns}
          data={alumnos}
          loading={loading}
          searchPlaceholder="Buscar por nombre, cédula, referencia o convenio..."
          searchTerm={searchTerm}
          onEdit={canEditStudent ? openEdit : undefined}
          onDelete={canDeleteStudent ? openDelete : undefined}
          serverSide
          totalCount={totalCount}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onSearchChange={handleSearchChange}
          pageSize={PAGE_SIZE}
          mobileCardRender={(row) => (
            <div className="apple-panel-muted rounded-[24px] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#111214] dark:text-[#f5f5f7]">
                    {row.nombre} {row.apellidos}
                  </p>
                  <p className="mt-1 text-xs text-[#66707a] dark:text-[#aeb6bf]">
                    {row.dni} · {formatTipoRegistroLabel(row.tipo_registro)}
                  </p>
                </div>
                <span className="rounded-full bg-[#0071e3]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0071e3] dark:bg-[#0071e3]/15 dark:text-[#69a9ff]">
                  {row.categorias_resumen.join(", ") || "Sin categoría"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-[#7b8591] uppercase">
                    Teléfono
                  </p>
                  <p className="mt-1 text-[#111214] dark:text-[#f5f5f7]">{row.telefono}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-[#7b8591] uppercase">
                    Valor total
                  </p>
                  <p className="mt-1 text-[#111214] dark:text-[#f5f5f7]">
                    ${row.valor_total_resumen.toLocaleString("es-CO")}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-[#7b8591] uppercase">
                    Saldo pendiente
                  </p>
                  <p className="mt-1 font-semibold text-amber-600 dark:text-amber-400">
                    {row.saldo_pendiente > 0
                      ? `$${row.saldo_pendiente.toLocaleString("es-CO")}`
                      : "Al día"}
                  </p>
                </div>
              </div>
            </div>
          )}
          extraActions={(row) => (
            <>
              {row.escuela_id === VS_BILLING_SCHOOL.id &&
                perfil &&
                INVOICE_STAFF_ROLES.includes(perfil.rol) && (
                  <button
                    onClick={() => setFacturaAlumno(row)}
                    className="rounded-lg p-1.5 text-[#86868b] transition-colors hover:bg-blue-50 hover:text-[#0071e3] dark:hover:bg-blue-900/20"
                    title="Factura electronica por contrato"
                    aria-label="Factura electronica por contrato"
                  >
                    <ReceiptText size={14} />
                  </button>
                )}
              {canEditStudent && row.tipo_registro === "regular" && (
                <button
                  onClick={() => openNewMatricula(row)}
                  className="rounded-lg p-1.5 text-[#86868b] transition-colors hover:bg-blue-50 hover:text-[#0071e3] dark:hover:bg-blue-900/20"
                  title="Nueva matrícula"
                  aria-label="Nueva matrícula"
                >
                  <BookOpen size={14} />
                </button>
              )}
              {canCreateIncome ? (
                <button
                  onClick={() => openAbono(row)}
                  className="rounded-lg p-1.5 text-[#86868b] transition-colors hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20"
                  title={row.tipo_registro === "regular" ? "Registrar abono" : "Registrar pago"}
                  aria-label={
                    row.tipo_registro === "regular" ? "Registrar abono" : "Registrar pago"
                  }
                >
                  <DollarSign size={14} />
                </button>
              ) : null}
              {row.tipo_registro === "regular" && (
                <button
                  onClick={() => {
                    if (row.matriculas?.[0]?.id) {
                      window.open(`/print/contrato/${row.matriculas[0].id}`, "_blank");
                    } else {
                      toast.error("El alumno no tiene matrícula para imprimir.");
                    }
                  }}
                  className="rounded-lg p-1.5 text-[#86868b] transition-colors hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20"
                  title="Imprimir contrato"
                  aria-label="Imprimir contrato"
                >
                  <Printer size={14} />
                </button>
              )}
            </>
          )}
        />
      </div>

      {/* ========== Modals ========== */}
      {facturaAlumno && (
        <FacturaElectronicaModal
          userId={perfil?.id}
          alumno={facturaAlumno}
          onEditStudent={
            canEditStudent
              ? () => {
                  setFacturaAlumno(null);
                  openEdit(facturaAlumno);
                }
              : undefined
          }
          onClose={() => {
            setFacturaAlumno(null);
            invalidateDashboardClientCaches();
            void fetchAlumnos(
              currentPage,
              searchTerm,
              filtrosCat,
              filtrosTipo,
              filtroMes,
              filtroFecha,
              true,
              filtroFactura
            );
          }}
        />
      )}
      {modalOpen && (
        <AlumnoModal
          modalOpen={modalOpen}
          setModalOpen={setModalOpen}
          editing={editing}
          editingHasMultipleMatriculas={editingHasMultipleMatriculas}
          editingMatricula={editingMatricula}
          isAptitudForm={isAptitudForm}
          isPracticeForm={isPracticeForm}
          form={form}
          setForm={setForm}
          saving={saving}
          handleSave={handleSave}
          toggleCategoria={toggleCategoria}
          openNewMatricula={openNewMatricula}
          openEditMatricula={openEditMatricula}
          formError={alumnoSaveError}
          categoriasEscuela={categoriasEscuela}
          tramitadorOptions={tramitadorOptions}
        />
      )}

      {matriculaOpen && (
        <MatriculaModal
          matriculaOpen={matriculaOpen}
          setMatriculaOpen={setMatriculaOpen}
          matriculaAlumno={matriculaAlumno}
          matriculaForm={matriculaForm}
          setMatriculaForm={setMatriculaForm}
          matriculaSaving={matriculaSaving}
          editingMatricula={matriculaEditing}
          formError={matriculaSaveError}
          onEditMatricula={openEditMatricula}
          handleSaveMatricula={handleSaveMatricula}
          toggleMatriculaCategoria={toggleMatriculaCategoria}
          categoriasEscuela={categoriasEscuela}
          tramitadorOptions={tramitadorOptions}
        />
      )}

      {abonoOpen && (
        <AbonoModal
          abonoOpen={abonoOpen}
          setAbonoOpen={setAbonoOpen}
          abonoAlumno={abonoAlumno}
          abonoMatriculas={abonoMatriculas}
          abonoMatriculaId={abonoMatriculaId}
          setAbonoMatriculaId={setAbonoMatriculaId}
          abonoIngresosFiltrados={abonoIngresosFiltrados}
          loadingIngresos={loadingIngresos}
          valorTotalAbono={valorTotalAbono}
          totalPagadoAbono={totalPagadoAbono}
          saldoPendienteAbono={saldoPendienteAbono}
          abonoMonto={abonoMonto}
          setAbonoMonto={setAbonoMonto}
          abonoMetodo={abonoMetodo}
          setAbonoMetodo={setAbonoMetodo}
          abonoConcepto={abonoConcepto}
          setAbonoConcepto={setAbonoConcepto}
          abonoFecha={abonoFecha}
          setAbonoFecha={setAbonoFecha}
          abonoSaving={abonoSaving}
          handleSaveAbono={handleSaveAbono}
        />
      )}

      <DeleteConfirm
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={saving}
        title={deletingTieneContrato ? "Cancelar alumno" : "Eliminar alumno"}
        description={
          deleting ? (
            deletingTieneContrato ? (
              <div className="space-y-2">
                <p>
                  Vas a cancelar a{" "}
                  <strong>
                    {deleting.nombre} {deleting.apellidos}
                  </strong>
                  .
                </p>
                <p>
                  El contrato y sus matrículas se conservan, el consecutivo no se reutiliza y el
                  alumno quedará inactivo.
                </p>
              </div>
            ) : (
              <p>
                ¿Estás seguro de que quieres eliminar a{" "}
                <strong>
                  {deleting.nombre} {deleting.apellidos}
                </strong>
                ? Esta acción no se puede deshacer.
              </p>
            )
          ) : undefined
        }
        confirmLabel={deletingTieneContrato ? "Cancelar alumno" : "Eliminar"}
        loadingLabel={deletingTieneContrato ? "Cancelando..." : "Eliminando..."}
      />
    </PageScaffold>
  );
}
