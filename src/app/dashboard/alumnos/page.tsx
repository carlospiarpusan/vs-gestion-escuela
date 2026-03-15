"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDraftForm } from "@/hooks/useDraftForm";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { fetchJsonWithRetry, runSupabaseMutationWithRetry } from "@/lib/retry";
import { getContractPrefixHint, normalizeContractNumber } from "@/lib/contract-number";
import { fetchSchoolCategories } from "@/lib/school-categories";
import type {
  Alumno,
  EstadoAlumno,
  Ingreso,
  MatriculaAlumno,
  MetodoPago,
  TipoPermiso,
  TipoRegistroAlumno,
} from "@/types/database";
import { BookOpen, DollarSign, Plus, X } from "lucide-react";

const PAGE_SIZE = 10;

const MONTH_OPTIONS = [
  { value: "", label: "Todos los meses" },
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

const estadosAlumno: EstadoAlumno[] = ["activo", "inactivo", "graduado"];
const tiposRegistroAlumno: { value: TipoRegistroAlumno; label: string }[] = [
  { value: "regular", label: "Alumno regular" },
  { value: "aptitud_conductor", label: "Aptitud conductores" },
  { value: "practica_adicional", label: "Práctica adicional" },
];
const metodosPago: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "datafono", label: "Datáfono" },
  { value: "nequi", label: "Nequi" },
  { value: "sistecredito", label: "Sistecrédito" },
  { value: "otro", label: "Otro" },
];
const TODAS_CATEGORIAS = [
  "A1",
  "A2",
  "B1",
  "C1",
  "RC1",
  "C2",
  "C3",
  "A2 y B1",
  "A2 y C1",
  "A2 y RC1",
  "A2 y C2",
  "A2 y C3",
  "A1 y B1",
  "A1 y C1",
  "A1 y RC1",
  "A1 y C2",
  "A1 y C3",
];
const CATEGORIAS_APTITUD = ["C1", "C2", "C3"];

type MatriculaResumen = Pick<
  MatriculaAlumno,
  | "id"
  | "alumno_id"
  | "numero_contrato"
  | "categorias"
  | "valor_total"
  | "fecha_inscripcion"
  | "estado"
  | "notas"
  | "tiene_tramitador"
  | "tramitador_nombre"
  | "tramitador_valor"
  | "created_at"
>;

type AlumnoRow = Alumno & {
  matriculas: MatriculaResumen[];
  categorias_resumen: string[];
  valor_total_resumen: number;
  total_pagado: number;
  saldo_pendiente: number;
};

type AlumnosListResponse = {
  totalCount: number;
  rows: AlumnoRow[];
};

const emptyForm = {
  tipo_registro: "regular" as TipoRegistroAlumno,
  nombre: "",
  apellidos: "",
  dni: "",
  email: "",
  telefono: "",
  direccion: "",
  tipo_permiso: "B" as TipoPermiso,
  categorias: [] as string[],
  estado: "activo" as EstadoAlumno,
  empresa_convenio: "",
  nota_examen_teorico: "",
  fecha_examen_teorico: "",
  nota_examen_practico: "",
  fecha_examen_practico: "",
  notas: "",
  numero_contrato: "",
  fecha_inscripcion: new Date().toISOString().split("T")[0],
  valor_total: "",
  abono: "",
  metodo_pago_abono: "efectivo" as MetodoPago,
  tiene_tramitador: false,
  tramitador_nombre: "",
  tramitador_valor: "",
};

const emptyMatriculaForm = {
  numero_contrato: "",
  fecha_inscripcion: new Date().toISOString().split("T")[0],
  categorias: [] as string[],
  valor_total: "",
  notas: "",
  abono: "",
  metodo_pago_abono: "efectivo" as MetodoPago,
  tiene_tramitador: false,
  tramitador_nombre: "",
  tramitador_valor: "",
};

const inputClass = "apple-input";
const labelClass = "apple-label";

function mapTipoPermiso(categorias: string[]) {
  const first = categorias[0] ? categorias[0].toUpperCase() : "";
  if (first.startsWith("AM")) return "AM";
  if (first.startsWith("A1")) return "A1";
  if (first.startsWith("A2")) return "A2";
  if (first.startsWith("A")) return "A";
  if (first.startsWith("RC") || first.startsWith("C")) return "C";
  return "B";
}

function buildAptitudReference() {
  return `APT-${Date.now()}`;
}

function buildPracticeReference() {
  return `PRA-${Date.now()}`;
}

function formatTipoRegistroLabel(tipo: TipoRegistroAlumno) {
  if (tipo === "aptitud_conductor") return "Aptitud";
  if (tipo === "practica_adicional") return "Práctica";
  return "Curso";
}

function formatNotaExamen(nota: number | null, fecha: string | null) {
  if (nota === null || Number.isNaN(Number(nota))) return "Sin registrar";
  const notaLabel = Number(nota).toLocaleString("es-CO", {
    minimumFractionDigits: Number(nota) % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  });
  return fecha ? `${notaLabel} · ${fecha}` : notaLabel;
}

function formatMatriculaLabel(matricula: MatriculaResumen) {
  if (matricula.numero_contrato) return `Contrato ${matricula.numero_contrato}`;
  if ((matricula.categorias ?? []).length > 0) return (matricula.categorias ?? []).join(", ");
  return "Sin contrato";
}

function getCategoriasDisponiblesParaTipos(
  tipos: TipoRegistroAlumno[],
  categoriasEscuela: string[]
) {
  const tiposActivos = tipos.length > 0 ? tipos : tiposRegistroAlumno.map((tipo) => tipo.value);
  const categorias = new Set<string>();

  if (tiposActivos.includes("regular")) {
    (categoriasEscuela.length > 0 ? categoriasEscuela : TODAS_CATEGORIAS).forEach((cat) =>
      categorias.add(cat)
    );
  }

  if (tiposActivos.includes("aptitud_conductor")) {
    CATEGORIAS_APTITUD.forEach((cat) => categorias.add(cat));
  }

  return Array.from(categorias);
}

async function resolveSedeId(escuelaId: string, preferredSedeId: string | null) {
  if (preferredSedeId) return preferredSedeId;

  const supabase = createClient();
  const { data } = await supabase
    .from("sedes")
    .select("id")
    .eq("escuela_id", escuelaId)
    .order("es_principal", { ascending: false })
    .limit(1)
    .single();

  return data?.id || null;
}

export default function AlumnosPage() {
  const { perfil } = useAuth();

  // --- Paginación server-side ---
  const [alumnos, setAlumnos] = useState<AlumnoRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [categoriasEscuela, setCategoriasEscuela] = useState<string[]>([]);
  const [filtrosTipo, setFiltrosTipo] = useState<TipoRegistroAlumno[]>([]);
  const [filtrosCat, setFiltrosCat] = useState<string[]>([]);
  const [filtroMes, setFiltroMes] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<AlumnoRow | null>(null);
  const [deleting, setDeleting] = useState<AlumnoRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
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
  const [matriculaError, setMatriculaError] = useState("");
  const {
    value: matriculaForm,
    setValue: setMatriculaForm,
    restoreDraft: restoreMatriculaDraft,
    clearDraft: clearMatriculaDraft,
  } = useDraftForm("dashboard:alumnos:matricula-form", emptyMatriculaForm, {
    persist: matriculaOpen,
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
  const [abonoSaving, setAbonoSaving] = useState(false);
  const [abonoError, setAbonoError] = useState("");

  // Ref para evitar fetchs duplicados o stale
  const fetchIdRef = useRef(0);

  /**
   * Fetch paginado server-side.
   * Solo trae la página actual de alumnos + sus matrículas e ingresos.
   * Ordenado por created_at DESC para priorizar datos nuevos.
   */
  const fetchAlumnos = useCallback(
    async (
      page = 0,
      search = "",
      catFilters: string[] = [],
      typeFilters: TipoRegistroAlumno[] = [],
      mesFilter: string = ""
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

      try {
        const payload = await fetchJsonWithRetry<AlumnosListResponse>(
          `/api/alumnos?${params.toString()}`
        );
        if (fetchId !== fetchIdRef.current) return;

        setAlumnos(payload.rows || []);
        setTotalCount(payload.totalCount || 0);
      } catch (fetchError) {
        if (fetchId !== fetchIdRef.current) return;
        console.error("[AlumnosPage] Error cargando alumnos:", fetchError);
        setAlumnos([]);
        setTotalCount(0);
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [perfil?.escuela_id]
  );

  useEffect(() => {
    if (!perfil) return;
    fetchAlumnos(currentPage, searchTerm, filtrosCat, filtrosTipo, filtroMes);
  }, [fetchAlumnos, perfil, currentPage, searchTerm, filtrosCat, filtrosTipo, filtroMes]);

  useEffect(() => {
    if (!perfil?.escuela_id) return;

    let cancelled = false;

    const loadCategorias = async () => {
      try {
        const categorias = await fetchSchoolCategories(perfil.escuela_id!);
        if (!cancelled) {
          setCategoriasEscuela(categorias);
        }
      } catch {
        if (!cancelled) {
          setCategoriasEscuela([]);
        }
      }
    };

    void loadCategorias();

    return () => {
      cancelled = true;
    };
  }, [perfil?.escuela_id]);

  /** Callback del DataTable server-side: cambio de página */
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  /** Callback del DataTable server-side: cambio de búsqueda (ya con debounce) */
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(0); // volver a primera página al buscar
  }, []);

  const categoriasFiltroDisponibles = useMemo(
    () => getCategoriasDisponiblesParaTipos(filtrosTipo, categoriasEscuela),
    [categoriasEscuela, filtrosTipo]
  );

  useEffect(() => {
    setFiltrosCat((prev) => prev.filter((cat) => categoriasFiltroDisponibles.includes(cat)));
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

  const toggleFiltroCat = (cat: string) => {
    setFiltrosCat((prev) => {
      const next = prev.includes(cat) ? prev.filter((value) => value !== cat) : [...prev, cat];
      setCurrentPage(0); // volver a primera página al filtrar
      return next;
    });
  };

  const toggleFiltroTipo = (tipo: TipoRegistroAlumno) => {
    setFiltrosTipo((prev) => {
      const next = prev.includes(tipo) ? prev.filter((value) => value !== tipo) : [...prev, tipo];
      const categoriasDisponibles = getCategoriasDisponiblesParaTipos(next, categoriasEscuela);
      setFiltrosCat((current) => current.filter((cat) => categoriasDisponibles.includes(cat)));
      setCurrentPage(0);
      return next;
    });
  };

  const toggleCategoria = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      categorias:
        prev.tipo_registro === "aptitud_conductor"
          ? prev.categorias[0] === cat
            ? []
            : [cat]
          : prev.categorias.includes(cat)
            ? prev.categorias.filter((value) => value !== cat)
            : [...prev.categorias, cat],
    }));
  };

  const toggleMatriculaCategoria = (cat: string) => {
    setMatriculaForm((prev) => ({
      ...prev,
      categorias: prev.categorias.includes(cat)
        ? prev.categorias.filter((value) => value !== cat)
        : [...prev.categorias, cat],
    }));
  };

  const openCreate = () => {
    setEditing(null);
    restoreAlumnoDraft(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (alumno: AlumnoRow) => {
    const matricula = alumno.matriculas[0] ?? null;
    setEditing(alumno);
    setForm({
      tipo_registro: alumno.tipo_registro,
      nombre: alumno.nombre,
      apellidos: alumno.apellidos,
      dni: alumno.dni,
      email: alumno.email || "",
      telefono: alumno.telefono,
      direccion: alumno.direccion || "",
      tipo_permiso: alumno.tipo_permiso,
      categorias: matricula?.categorias || alumno.categorias_resumen,
      estado: alumno.estado,
      empresa_convenio: alumno.empresa_convenio || "",
      nota_examen_teorico:
        alumno.nota_examen_teorico !== null ? String(alumno.nota_examen_teorico) : "",
      fecha_examen_teorico: alumno.fecha_examen_teorico || "",
      nota_examen_practico:
        alumno.nota_examen_practico !== null ? String(alumno.nota_examen_practico) : "",
      fecha_examen_practico: alumno.fecha_examen_practico || "",
      notas: alumno.notas || "",
      numero_contrato: matricula?.numero_contrato || alumno.numero_contrato || "",
      fecha_inscripcion:
        matricula?.fecha_inscripcion ||
        alumno.fecha_inscripcion ||
        new Date().toISOString().split("T")[0],
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
    });
    setError("");
    setModalOpen(true);
  };

  const openDelete = (alumno: AlumnoRow) => {
    setDeleting(alumno);
    setDeleteError("");
    setDeleteOpen(true);
  };

  const openNewMatricula = (alumno: AlumnoRow) => {
    setMatriculaAlumno(alumno);
    restoreMatriculaDraft({
      ...emptyMatriculaForm,
      fecha_inscripcion: new Date().toISOString().split("T")[0],
    });
    setMatriculaError("");
    setMatriculaOpen(true);
  };

  const openAbono = useCallback(async (alumno: AlumnoRow) => {
    setAbonoAlumno(alumno);
    setAbonoMatriculas(alumno.matriculas);
    setAbonoMatriculaId(alumno.matriculas[0]?.id || "");
    setAbonoMonto("");
    setAbonoMetodo("efectivo");
    setAbonoConcepto("");
    setAbonoError("");
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
  }, []);

  const handleSave = async () => {
    if (!form.nombre || !form.apellidos || !form.dni || !form.telefono) {
      setError("Nombre, apellidos, cédula y teléfono son obligatorios.");
      return;
    }

    const isAptitud = form.tipo_registro === "aptitud_conductor";
    const isPractice = form.tipo_registro === "practica_adicional";
    const gestionaMatricula =
      !isAptitud && !isPractice && (!editing || editing.matriculas.length <= 1);

    if (!isPractice && form.categorias.length === 0) {
      setError(
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

    if (
      [notaTeoricaNum, notaPracticaNum].some(
        (nota) => nota !== null && (Number.isNaN(nota) || nota < 0 || nota > 100)
      )
    ) {
      setError("Las calificaciones deben estar entre 0 y 100.");
      return;
    }

    if (!editing && abonoNum > 0 && valorTotalNum > 0 && abonoNum > valorTotalNum) {
      setError(
        isAptitud
          ? "El pago inicial no puede ser mayor al valor del servicio."
          : "El abono no puede ser mayor al valor total del curso."
      );
      return;
    }

    if (!perfil?.escuela_id) {
      setError("Tu usuario no tiene escuela asignada. Contacta al administrador.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const supabase = createClient();
      const sedeId = await resolveSedeId(perfil.escuela_id, perfil.sede_id);
      if (!sedeId) {
        setError("No se encontró una sede para esta escuela. Crea una sede primero.");
        setSaving(false);
        return;
      }

      let alumnoUserId = editing?.user_id || perfil.id;

      if (!editing && !isAptitud && !isPractice) {
        const authJson = await fetchJsonWithRetry<{ user_id: string }>("/api/crear-alumno-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: `${form.nombre} ${form.apellidos}`.trim(),
            email: form.email || null,
            dni: form.dni,
            escuela_id: perfil.escuela_id,
            sede_id: sedeId,
          }),
        });
        alumnoUserId = authJson.user_id;
      }

      const tramitadorValorNum = parseFloat(form.tramitador_valor) || 0;
      const referenciaAptitud = isAptitud
        ? form.numero_contrato.trim() || editing?.numero_contrato || buildAptitudReference()
        : null;
      const referenciaPractica = isPractice
        ? form.numero_contrato.trim() || editing?.numero_contrato || buildPracticeReference()
        : null;
      const numeroContratoNormalizado =
        !isAptitud && !isPractice
          ? normalizeContractNumber(form.numero_contrato, form.categorias)
          : null;
      const categoriaPrincipal = isAptitud ? form.categorias.slice(0, 1) : [];
      const hoy = new Date().toISOString().split("T")[0];
      const alumnoPayload = {
        user_id: alumnoUserId,
        escuela_id: perfil.escuela_id,
        sede_id: sedeId,
        tipo_registro: form.tipo_registro,
        numero_contrato: isAptitud
          ? referenciaAptitud
          : isPractice
            ? referenciaPractica
            : (editing?.numero_contrato ?? null),
        nombre: form.nombre,
        apellidos: form.apellidos,
        dni: form.dni,
        email: form.email || null,
        telefono: form.telefono,
        fecha_nacimiento: null,
        direccion: form.direccion || null,
        tipo_permiso:
          gestionaMatricula || isAptitud
            ? mapTipoPermiso(form.categorias)
            : editing?.tipo_permiso || form.tipo_permiso,
        categorias: isAptitud ? categoriaPrincipal : isPractice ? [] : (editing?.categorias ?? []),
        estado: form.estado,
        notas: form.notas || null,
        valor_total:
          isAptitud || isPractice ? valorTotalNum || null : (editing?.valor_total ?? null),
        fecha_inscripcion:
          isAptitud || isPractice
            ? form.fecha_inscripcion || hoy
            : (editing?.fecha_inscripcion ?? null),
        empresa_convenio: isAptitud
          ? form.empresa_convenio.trim() || null
          : isPractice
            ? form.empresa_convenio.trim() || "Práctica adicional"
            : null,
        nota_examen_teorico: isAptitud ? notaTeoricaNum : null,
        fecha_examen_teorico: isAptitud ? form.fecha_examen_teorico || null : null,
        nota_examen_practico: isAptitud ? notaPracticaNum : null,
        fecha_examen_practico: isAptitud ? form.fecha_examen_practico || null : null,
        tiene_tramitador: false,
        tramitador_nombre: null,
        tramitador_valor: null,
      };
      const matriculaPayload =
        !isAptitud && gestionaMatricula
          ? {
              escuela_id: perfil.escuela_id,
              sede_id: sedeId,
              alumno_id: editing?.id,
              created_by: perfil.id,
              numero_contrato: numeroContratoNormalizado,
              categorias: form.categorias,
              valor_total: valorTotalNum || null,
              fecha_inscripcion: form.fecha_inscripcion || new Date().toISOString().split("T")[0],
              estado: "activo" as const,
              notas: editingMatricula?.notas || null,
              tiene_tramitador: form.tiene_tramitador,
              tramitador_nombre: form.tiene_tramitador
                ? form.tramitador_nombre.trim() || null
                : null,
              tramitador_valor: form.tiene_tramitador ? tramitadorValorNum || null : null,
            }
          : null;

      if (editing) {
        await runSupabaseMutationWithRetry(() =>
          supabase.from("alumnos").update(alumnoPayload).eq("id", editing.id)
        );

        if (gestionaMatricula && matriculaPayload) {
          if (editingMatricula) {
            await runSupabaseMutationWithRetry(() =>
              supabase
                .from("matriculas_alumno")
                .update(matriculaPayload)
                .eq("id", editingMatricula.id)
            );

            if (form.tiene_tramitador && tramitadorValorNum > 0) {
              const originalValor = editingMatricula.tramitador_valor ?? 0;
              const diferencia = tramitadorValorNum - originalValor;
              const esPrimeraVez = !editingMatricula.tiene_tramitador;
              const montoGasto = esPrimeraVez ? tramitadorValorNum : diferencia;
              if (montoGasto > 0) {
                await runSupabaseMutationWithRetry(() =>
                  supabase.from("gastos").insert([
                    {
                      escuela_id: perfil.escuela_id,
                      sede_id: sedeId,
                      user_id: perfil.id,
                      categoria: "tramitador",
                      concepto: `Tramitador — ${form.nombre} ${form.apellidos}`,
                      monto: montoGasto,
                      metodo_pago: "transferencia",
                      proveedor: form.tramitador_nombre.trim() || null,
                      fecha: hoy,
                      recurrente: false,
                      notas: `Tramitador asignado al alumno ${form.nombre} ${form.apellidos}`,
                    },
                  ])
                );
              }
            }
          } else {
            await runSupabaseMutationWithRetry(() =>
              supabase.from("matriculas_alumno").insert([
                {
                  ...matriculaPayload,
                  alumno_id: editing.id,
                },
              ])
            );

            if (form.tiene_tramitador && tramitadorValorNum > 0) {
              await runSupabaseMutationWithRetry(() =>
                supabase.from("gastos").insert([
                  {
                    escuela_id: perfil.escuela_id,
                    sede_id: sedeId,
                    user_id: perfil.id,
                    categoria: "tramitador",
                    concepto: `Tramitador — ${form.nombre} ${form.apellidos}`,
                    monto: tramitadorValorNum,
                    metodo_pago: "transferencia",
                    proveedor: form.tramitador_nombre.trim() || null,
                    fecha: hoy,
                    recurrente: false,
                    notas: `Tramitador asignado al alumno ${form.nombre} ${form.apellidos}`,
                  },
                ])
              );
            }
          }
        }
      } else {
        const { data: alumnoData } = await runSupabaseMutationWithRetry(() =>
          supabase.from("alumnos").insert([alumnoPayload]).select("id").single()
        );
        if (!alumnoData) throw new Error("No se pudo crear el alumno.");

        let matriculaId: string | null = null;
        if (matriculaPayload) {
          const { data: newMatricula } = await runSupabaseMutationWithRetry(() =>
            supabase
              .from("matriculas_alumno")
              .insert([
                {
                  ...matriculaPayload,
                  alumno_id: alumnoData.id,
                },
              ])
              .select("id")
              .single()
          );
          if (!newMatricula) throw new Error("No se pudo crear la matrícula.");
          matriculaId = newMatricula.id;
        }

        if (abonoNum > 0) {
          await runSupabaseMutationWithRetry(() =>
            supabase.from("ingresos").insert([
              {
                escuela_id: perfil.escuela_id,
                sede_id: sedeId,
                user_id: perfil.id,
                alumno_id: alumnoData.id,
                matricula_id: matriculaId,
                categoria: isAptitud ? "examen_aptitud" : isPractice ? "clase_suelta" : "matricula",
                concepto: isAptitud
                  ? `Examen de aptitud — ${form.nombre} ${form.apellidos}`
                  : isPractice
                    ? `Práctica adicional — ${form.nombre} ${form.apellidos}`
                    : `Matrícula — ${form.nombre} ${form.apellidos}`,
                monto: abonoNum,
                metodo_pago: form.metodo_pago_abono,
                fecha: hoy,
                estado: "cobrado",
                notas: null,
              },
            ])
          );
        }

        if (!isAptitud && !isPractice && form.tiene_tramitador && tramitadorValorNum > 0) {
          await runSupabaseMutationWithRetry(() =>
            supabase.from("gastos").insert([
              {
                escuela_id: perfil.escuela_id,
                sede_id: sedeId,
                user_id: perfil.id,
                categoria: "tramitador",
                concepto: `Tramitador — ${form.nombre} ${form.apellidos}`,
                monto: tramitadorValorNum,
                metodo_pago: "transferencia",
                proveedor: form.tramitador_nombre.trim() || null,
                fecha: hoy,
                recurrente: false,
                notas: `Tramitador asignado al alumno ${form.nombre} ${form.apellidos}`,
              },
            ])
          );
        }
      }

      clearAlumnoDraft(emptyForm);
      setModalOpen(false);
      fetchAlumnos(currentPage, searchTerm, filtrosCat, filtrosTipo);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "Error al guardar";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMatricula = async () => {
    if (!matriculaAlumno || !perfil?.escuela_id) return;
    if (matriculaAlumno.tipo_registro !== "regular") {
      setMatriculaError("Solo los alumnos regulares pueden tener matrículas.");
      return;
    }

    if (matriculaForm.categorias.length === 0) {
      setMatriculaError("Debes seleccionar al menos una categoría de curso.");
      return;
    }

    const valorTotalNum = parseFloat(String(matriculaForm.valor_total)) || 0;
    const abonoNum = parseFloat(String(matriculaForm.abono)) || 0;
    if (abonoNum > 0 && valorTotalNum > 0 && abonoNum > valorTotalNum) {
      setMatriculaError("El abono no puede ser mayor al valor total del curso.");
      return;
    }

    setMatriculaSaving(true);
    setMatriculaError("");

    try {
      const supabase = createClient();
      const sedeId =
        matriculaAlumno.sede_id || (await resolveSedeId(perfil.escuela_id, perfil.sede_id));
      if (!sedeId) {
        setMatriculaError("No se encontró una sede para esta escuela.");
        setMatriculaSaving(false);
        return;
      }

      const tramitadorValorNum = parseFloat(matriculaForm.tramitador_valor) || 0;
      const numeroContratoNormalizado = normalizeContractNumber(
        matriculaForm.numero_contrato,
        matriculaForm.categorias
      );
      const hoy = new Date().toISOString().split("T")[0];
      const { data: nuevaMatricula } = await runSupabaseMutationWithRetry(() =>
        supabase
          .from("matriculas_alumno")
          .insert([
            {
              escuela_id: perfil.escuela_id,
              sede_id: sedeId,
              alumno_id: matriculaAlumno.id,
              created_by: perfil.id,
              numero_contrato: numeroContratoNormalizado,
              categorias: matriculaForm.categorias,
              valor_total: valorTotalNum || null,
              fecha_inscripcion: matriculaForm.fecha_inscripcion || hoy,
              estado: "activo",
              notas: matriculaForm.notas.trim() || null,
              tiene_tramitador: matriculaForm.tiene_tramitador,
              tramitador_nombre: matriculaForm.tiene_tramitador
                ? matriculaForm.tramitador_nombre.trim() || null
                : null,
              tramitador_valor: matriculaForm.tiene_tramitador ? tramitadorValorNum || null : null,
            },
          ])
          .select("id")
          .single()
      );

      if (!nuevaMatricula) {
        throw new Error("No se pudo crear la matrícula.");
      }

      if (abonoNum > 0) {
        await runSupabaseMutationWithRetry(() =>
          supabase.from("ingresos").insert([
            {
              escuela_id: perfil.escuela_id,
              sede_id: sedeId,
              user_id: perfil.id,
              alumno_id: matriculaAlumno.id,
              matricula_id: nuevaMatricula.id,
              categoria: "matricula",
              concepto: `Matrícula — ${matriculaAlumno.nombre} ${matriculaAlumno.apellidos}`,
              monto: abonoNum,
              metodo_pago: matriculaForm.metodo_pago_abono,
              fecha: hoy,
              estado: "cobrado",
              notas: null,
            },
          ])
        );
      }

      if (matriculaForm.tiene_tramitador && tramitadorValorNum > 0) {
        await runSupabaseMutationWithRetry(() =>
          supabase.from("gastos").insert([
            {
              escuela_id: perfil.escuela_id,
              sede_id: sedeId,
              user_id: perfil.id,
              categoria: "tramitador",
              concepto: `Tramitador — ${matriculaAlumno.nombre} ${matriculaAlumno.apellidos}`,
              monto: tramitadorValorNum,
              metodo_pago: "transferencia",
              proveedor: matriculaForm.tramitador_nombre.trim() || null,
              fecha: hoy,
              recurrente: false,
              notas: `Tramitador asignado al alumno ${matriculaAlumno.nombre} ${matriculaAlumno.apellidos}`,
            },
          ])
        );
      }

      setMatriculaOpen(false);
      setMatriculaAlumno(null);
      clearMatriculaDraft(emptyMatriculaForm);
      fetchAlumnos(currentPage, searchTerm, filtrosCat, filtrosTipo);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "Error al crear la matrícula";
      setMatriculaError(message);
    } finally {
      setMatriculaSaving(false);
    }
  };

  const handleSaveAbono = async () => {
    if (!abonoAlumno || !perfil?.escuela_id) return;

    const monto = parseFloat(abonoMonto);
    if (!monto || monto <= 0) {
      setAbonoError("El monto del abono debe ser mayor a 0.");
      return;
    }

    if (abonoMatriculas.length > 0 && !abonoMatriculaActual) {
      setAbonoError("Selecciona la matrícula a la que corresponde este abono.");
      return;
    }

    const valorTotal = Number(
      abonoMatriculaActual?.valor_total || abonoAlumno.valor_total_resumen || 0
    );
    const totalPagado = abonoIngresosFiltrados
      .filter((ingreso) => ingreso.estado === "cobrado")
      .reduce((sum, ingreso) => sum + Number(ingreso.monto), 0);
    const saldo = valorTotal - totalPagado;

    if (valorTotal > 0 && monto > saldo + 0.01) {
      setAbonoError(
        `El abono ($${monto.toLocaleString("es-CO")}) supera el saldo pendiente ($${saldo.toLocaleString("es-CO")}).`
      );
      return;
    }

    setAbonoSaving(true);
    setAbonoError("");

    try {
      const supabase = createClient();
      const sedeId = await resolveSedeId(perfil.escuela_id, perfil.sede_id);

      const { error: insertError } = await supabase.from("ingresos").insert([
        {
          escuela_id: perfil.escuela_id,
          sede_id: sedeId,
          user_id: perfil.id,
          alumno_id: abonoAlumno.id,
          matricula_id: abonoMatriculaActual?.id || null,
          categoria:
            abonoAlumno.tipo_registro === "aptitud_conductor"
              ? "examen_aptitud"
              : abonoAlumno.tipo_registro === "practica_adicional"
                ? "clase_suelta"
                : "matricula",
          concepto:
            abonoConcepto.trim() ||
            (abonoAlumno.tipo_registro === "aptitud_conductor"
              ? `Pago aptitud — ${abonoAlumno.nombre} ${abonoAlumno.apellidos}`
              : abonoAlumno.tipo_registro === "practica_adicional"
                ? `Práctica adicional — ${abonoAlumno.nombre} ${abonoAlumno.apellidos}`
                : `Abono — ${abonoAlumno.nombre} ${abonoAlumno.apellidos}`),
          monto,
          metodo_pago: abonoMetodo,
          fecha: new Date().toISOString().split("T")[0],
          estado: "cobrado",
          notas: null,
        },
      ]);

      if (insertError) throw insertError;

      const { data } = await supabase
        .from("ingresos")
        .select("*")
        .eq("alumno_id", abonoAlumno.id)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });

      setAbonoIngresos((data as Ingreso[]) || []);
      setAbonoMonto("");
      setAbonoConcepto("");
      fetchAlumnos(currentPage, searchTerm, filtrosCat, filtrosTipo);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "Error al registrar";
      setAbonoError(message);
    } finally {
      setAbonoSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;

    setSaving(true);
    setDeleteError("");
    try {
      const supabase = createClient();
      const { error: alumnoError } = await supabase.from("alumnos").delete().eq("id", deleting.id);
      if (alumnoError) throw alumnoError;

      setDeleteOpen(false);
      setDeleting(null);
      fetchAlumnos(currentPage, searchTerm, filtrosCat, filtrosTipo);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "fecha_inscripcion" as keyof AlumnoRow,
      label: "Matrícula y Contrato",
      render: (row: AlumnoRow) => {
        const matriculaReciente = row.matriculas?.[0];
        const fecha =
          matriculaReciente?.fecha_inscripcion || row.fecha_inscripcion || row.created_at;

        // Collect all unique contract numbers from matrículas + alumno record
        const contratos = new Set<string>();
        if (row.numero_contrato) contratos.add(row.numero_contrato);
        for (const m of row.matriculas || []) {
          if (m.numero_contrato) contratos.add(m.numero_contrato);
        }
        const contratoList = Array.from(contratos);

        return (
          <div>
            <span className="text-sm font-medium">
              {fecha
                ? new Date(fecha).toLocaleDateString("es-CO", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
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
                {row.matriculas.length} matrículas activas
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
      ),
    },
  ];

  const valorTotalAbono = Number(
    abonoMatriculaActual?.valor_total || abonoAlumno?.valor_total_resumen || 0
  );
  const totalPagadoAbono = abonoIngresosFiltrados
    .filter((ingreso) => ingreso.estado === "cobrado")
    .reduce((sum, ingreso) => sum + Number(ingreso.monto), 0);
  const saldoPendienteAbono = valorTotalAbono - totalPagadoAbono;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Alumnos</h2>
          <p className="mt-0.5 text-sm text-[#86868b]">
            Gestiona alumnos regulares, procesos de aptitud y práctica adicional desde un solo lugar
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED]"
        >
          <Plus size={16} />
          Nuevo Alumno
        </button>
      </div>

      {(() => {
        const hayFiltrosActivos =
          filtrosTipo.length > 0 || filtrosCat.length > 0 || filtroMes !== "";
        return (
          <div className="mb-4 rounded-2xl border border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-[#1d1d1f]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-[#86868b] uppercase">
                    Filtros de alumnos
                  </p>
                  <p className="mt-1 text-sm text-[#86868b]">
                    Combina tipo de registro, mes y categorías para separar cursos, aptitudes y
                    prácticas adicionales.
                  </p>
                </div>
                {hayFiltrosActivos && (
                  <button
                    onClick={() => {
                      setFiltrosTipo([]);
                      setFiltrosCat([]);
                      setFiltroMes("");
                      setCurrentPage(0);
                    }}
                    className="inline-flex items-center gap-1 self-start rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#86868b] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  >
                    <X size={11} />
                    Limpiar filtros
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-[#86868b]">Periodo</span>
                <div className="flex items-center gap-2">
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
                    className="apple-input rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#86868b] hover:border-gray-300 focus:ring-2 focus:ring-[#0071e3]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
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
                      const currentYear =
                        filtroMes.split("-")[0] || String(new Date().getFullYear());
                      setFiltroMes(newMonth ? `${currentYear}-${newMonth}` : currentYear);
                      setCurrentPage(0);
                    }}
                    disabled={!(filtroMes.split("-")[0] || "")}
                    className="apple-input rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#86868b] hover:border-gray-300 focus:ring-2 focus:ring-[#0071e3]/20 focus:outline-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-[#86868b]">Tipo de registro</span>
                <div className="flex flex-wrap items-center gap-2">
                  {tiposRegistroAlumno.map((tipo) => {
                    const activo = filtrosTipo.includes(tipo.value);
                    return (
                      <button
                        key={tipo.value}
                        onClick={() => toggleFiltroTipo(tipo.value)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          activo
                            ? "bg-[#0071e3] text-white"
                            : "bg-gray-100 text-[#86868b] hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                        }`}
                      >
                        {tipo.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-[#86868b]">Categorías</span>
                {categoriasFiltroDisponibles.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {categoriasFiltroDisponibles.map((cat) => {
                      const activo = filtrosCat.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleFiltroCat(cat)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                            activo
                              ? "bg-[#0071e3] text-white"
                              : "bg-gray-100 text-[#86868b] hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-[#86868b] dark:bg-[#141414]">
                    El tipo seleccionado no trabaja con categorías. Usa este filtro para cursos
                    regulares o aptitud.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
        <DataTable
          columns={columns}
          data={alumnos}
          loading={loading}
          searchPlaceholder="Buscar por nombre, cédula, referencia o convenio..."
          searchTerm={searchTerm}
          onEdit={openEdit}
          onDelete={openDelete}
          serverSide
          totalCount={totalCount}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onSearchChange={handleSearchChange}
          pageSize={PAGE_SIZE}
          extraActions={(row) => (
            <>
              {row.tipo_registro === "regular" && (
                <button
                  onClick={() => openNewMatricula(row)}
                  className="rounded-lg p-1.5 text-[#86868b] transition-colors hover:bg-blue-50 hover:text-[#0071e3] dark:hover:bg-blue-900/20"
                  title="Nueva matrícula"
                  aria-label="Nueva matrícula"
                >
                  <BookOpen size={14} />
                </button>
              )}
              <button
                onClick={() => openAbono(row)}
                className="rounded-lg p-1.5 text-[#86868b] transition-colors hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20"
                title={row.tipo_registro === "regular" ? "Registrar abono" : "Registrar pago"}
                aria-label={row.tipo_registro === "regular" ? "Registrar abono" : "Registrar pago"}
              >
                <DollarSign size={14} />
              </button>
            </>
          )}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing
            ? isAptitudForm
              ? "Editar proceso de aptitud"
              : isPracticeForm
                ? "Editar práctica adicional"
                : "Editar Alumno"
            : isAptitudForm
              ? "Nuevo proceso de aptitud"
              : isPracticeForm
                ? "Nueva práctica adicional"
                : "Nuevo Alumno"
        }
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
              {error}
            </p>
          )}

          {editing && editing.tipo_registro === "regular" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  openNewMatricula(editing);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-[#0071e3]/20 px-3 py-2 text-sm text-[#0071e3] transition-colors hover:bg-[#0071e3]/5"
              >
                <BookOpen size={14} />
                Nueva matrícula
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Apellidos *</label>
              <input
                type="text"
                value={form.apellidos}
                onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Cédula *</label>
              <input
                type="text"
                value={form.dni}
                onChange={(e) => setForm({ ...form, dni: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Teléfono *</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Correo</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Dirección</label>
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Tipo de registro</label>
              <select
                value={form.tipo_registro}
                onChange={(e) => {
                  const nextType = e.target.value as TipoRegistroAlumno;
                  setForm((prev) => ({
                    ...prev,
                    tipo_registro: nextType,
                    categorias:
                      nextType === "aptitud_conductor"
                        ? prev.categorias.slice(0, 1)
                        : prev.categorias,
                    empresa_convenio:
                      nextType === "aptitud_conductor"
                        ? prev.empresa_convenio || "Supertaxis"
                        : nextType === "practica_adicional"
                          ? prev.empresa_convenio || "Práctica adicional"
                          : "",
                    tiene_tramitador: nextType === "regular" ? prev.tiene_tramitador : false,
                    tramitador_nombre: nextType === "regular" ? prev.tramitador_nombre : "",
                    tramitador_valor: nextType === "regular" ? prev.tramitador_valor : "",
                  }));
                }}
                disabled={Boolean(editing)}
                className={`${inputClass} ${editing ? "cursor-not-allowed opacity-70" : ""}`}
              >
                {tiposRegistroAlumno.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
              {editing && (
                <p className="mt-1 text-[11px] text-[#86868b]">
                  El tipo se fija al crear el registro para no romper su historial.
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                {isAptitudForm
                  ? "Convenio / empresa"
                  : isPracticeForm
                    ? "Servicio / origen"
                    : "Estado"}
              </label>
              {isAptitudForm || isPracticeForm ? (
                <input
                  type="text"
                  value={form.empresa_convenio}
                  onChange={(e) => setForm({ ...form, empresa_convenio: e.target.value })}
                  placeholder={isAptitudForm ? "Supertaxis" : "Práctica adicional"}
                  className={inputClass}
                />
              ) : (
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoAlumno })}
                  className={inputClass}
                >
                  {estadosAlumno.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {editingHasMultipleMatriculas ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                Este alumno tiene varias matrículas. Aquí solo se actualizan sus datos personales;
                contrato, valor y categorías se gestionan por matrícula.
              </div>
              <div className="space-y-2">
                {editing?.matriculas.map((matricula) => (
                  <div
                    key={matricula.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-[#0a0a0a]"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {formatMatriculaLabel(matricula)}
                      </p>
                      <p className="text-xs text-[#86868b]">
                        {matricula.fecha_inscripcion || "Sin fecha"} ·{" "}
                        {(matricula.categorias ?? []).join(", ") || "Sin categorías"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {matricula.valor_total
                        ? `$${Number(matricula.valor_total).toLocaleString("es-CO")}`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : isAptitudForm ? (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Categoría evaluada *</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {Array.from(new Set([...CATEGORIAS_APTITUD, ...form.categorias])).map((cat) => {
                    const selected = form.categorias.includes(cat);
                    return (
                      <button
                        key={`aptitud-${cat}`}
                        type="button"
                        onClick={() => toggleCategoria(cat)}
                        className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                          selected
                            ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
                            : "border-gray-200 text-[#86868b] hover:border-gray-300 dark:border-gray-700"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Referencia interna</label>
                  <input
                    type="text"
                    value={form.numero_contrato}
                    onChange={(e) => setForm({ ...form, numero_contrato: e.target.value })}
                    placeholder="Se genera si la dejas vacía"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fecha del proceso</label>
                  <input
                    type="date"
                    value={form.fecha_inscripcion}
                    onChange={(e) => setForm({ ...form, fecha_inscripcion: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoAlumno })}
                    className={inputClass}
                  >
                    {estadosAlumno.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Valor del servicio</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="120000"
                    value={form.valor_total}
                    onChange={(e) => setForm({ ...form, valor_total: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-xl bg-gray-50 px-4 py-4 dark:bg-[#0a0a0a]">
                <div>
                  <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Resultados del examen
                  </p>
                  <p className="mt-1 text-xs text-[#86868b]">
                    Registra la calificación de 0 a 100 para cada prueba.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Calificación teórica</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0 - 100"
                      value={form.nota_examen_teorico}
                      onChange={(e) => setForm({ ...form, nota_examen_teorico: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fecha examen teórico</label>
                    <input
                      type="date"
                      value={form.fecha_examen_teorico}
                      onChange={(e) => setForm({ ...form, fecha_examen_teorico: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Calificación práctica</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0 - 100"
                      value={form.nota_examen_practico}
                      onChange={(e) => setForm({ ...form, nota_examen_practico: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fecha examen práctico</label>
                    <input
                      type="date"
                      value={form.fecha_examen_practico}
                      onChange={(e) => setForm({ ...form, fecha_examen_practico: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : isPracticeForm ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Referencia interna</label>
                  <input
                    type="text"
                    value={form.numero_contrato}
                    onChange={(e) => setForm({ ...form, numero_contrato: e.target.value })}
                    placeholder="Se genera si la dejas vacía"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fecha del servicio</label>
                  <input
                    type="date"
                    value={form.fecha_inscripcion}
                    onChange={(e) => setForm({ ...form, fecha_inscripcion: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoAlumno })}
                    className={inputClass}
                  >
                    {estadosAlumno.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Valor del servicio</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.valor_total}
                    onChange={(e) => setForm({ ...form, valor_total: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-[#4a4a4f] dark:bg-[#0a0a0a] dark:text-[#d2d2d7]">
                Este tipo de registro sirve para personas o alumnos que compran horas prácticas por
                fuera del curso principal. No crea matrícula ni exige categoría.
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className={labelClass}>
                  Categoría del curso *{" "}
                  <span className="font-normal normal-case">
                    ({form.categorias.length} seleccionada{form.categorias.length !== 1 ? "s" : ""})
                  </span>
                </label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(categoriasEscuela.length > 0 ? categoriasEscuela : TODAS_CATEGORIAS).map(
                    (cat) => {
                      const selected = form.categorias.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategoria(cat)}
                          className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                            selected
                              ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
                              : "border-gray-200 text-[#86868b] hover:border-gray-300 dark:border-gray-700"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>N° contrato</label>
                  <input
                    type="text"
                    value={form.numero_contrato}
                    onChange={(e) => setForm({ ...form, numero_contrato: e.target.value })}
                    onBlur={(e) =>
                      setForm({
                        ...form,
                        numero_contrato:
                          normalizeContractNumber(e.target.value, form.categorias) ?? "",
                      })
                    }
                    placeholder={getContractPrefixHint(form.categorias)}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-[#86868b]">
                    Se guarda con prefijo obligatorio segun la categoria:{" "}
                    {getContractPrefixHint(form.categorias)}.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Fecha inscripción</label>
                  <input
                    type="date"
                    value={form.fecha_inscripcion}
                    onChange={(e) => setForm({ ...form, fecha_inscripcion: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoAlumno })}
                    className={inputClass}
                  >
                    {estadosAlumno.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Valor total del curso</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.valor_total}
                    onChange={(e) => setForm({ ...form, valor_total: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
                <label className="flex cursor-pointer items-center gap-3 select-none">
                  <div
                    className="relative"
                    onClick={() => setForm({ ...form, tiene_tramitador: !form.tiene_tramitador })}
                  >
                    <div
                      className={`h-6 w-10 rounded-full transition-colors ${form.tiene_tramitador ? "bg-[#0071e3]" : "bg-gray-200 dark:bg-gray-700"}`}
                    >
                      <div
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.tiene_tramitador ? "translate-x-5" : "translate-x-1"}`}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      Tiene tramitador
                    </p>
                    <p className="text-xs text-[#86868b]">
                      El costo se registrará automáticamente en Gastos
                    </p>
                  </div>
                </label>

                {form.tiene_tramitador && (
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Nombre del tramitador</label>
                      <input
                        type="text"
                        value={form.tramitador_nombre}
                        onChange={(e) => setForm({ ...form, tramitador_nombre: e.target.value })}
                        placeholder="Nombre o agencia"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Valor{" "}
                        {editingMatricula && (editingMatricula.tramitador_valor ?? 0) > 0
                          ? "(ajuste sobre el anterior)"
                          : "(va a Gastos)"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.tramitador_valor}
                        onChange={(e) => setForm({ ...form, tramitador_valor: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!editingHasMultipleMatriculas && !isAptitudForm && !isPracticeForm && (
            <div className="flex items-end">
              <p className="text-xs text-[#86868b]">
                {editing
                  ? "La ficha personal se actualiza siempre; los valores del curso viven en la matrícula."
                  : "Al crear el alumno se genera también su primera matrícula."}
              </p>
            </div>
          )}

          {editingHasMultipleMatriculas && (
            <div>
              <label className={labelClass}>Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoAlumno })}
                className={inputClass}
              >
                {estadosAlumno.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          {!editing && (
            <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
              <p className="mb-3 text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
                {isAptitudForm || isPracticeForm ? "Pago inicial" : "Abono inicial"}
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>
                      {isAptitudForm || isPracticeForm ? "Monto del pago" : "Monto del abono"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.abono}
                      onChange={(e) => setForm({ ...form, abono: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Método de pago</label>
                    <select
                      value={form.metodo_pago_abono}
                      onChange={(e) =>
                        setForm({ ...form, metodo_pago_abono: e.target.value as MetodoPago })
                      }
                      className={inputClass}
                    >
                      {metodosPago.map((metodo) => (
                        <option key={metodo.value} value={metodo.value}>
                          {metodo.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {parseFloat(String(form.valor_total)) > 0 && (
                  <p className="text-xs text-[#86868b]">
                    Saldo pendiente tras {isAptitudForm || isPracticeForm ? "pago" : "abono"}:{" "}
                    <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      $
                      {Math.max(
                        0,
                        parseFloat(String(form.valor_total)) - (parseFloat(String(form.abono)) || 0)
                      ).toLocaleString("es-CO")}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

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
              {saving
                ? "Guardando..."
                : editing
                  ? "Guardar Cambios"
                  : isAptitudForm
                    ? "Crear Proceso de Aptitud"
                    : isPracticeForm
                      ? "Crear Registro de Práctica"
                      : "Crear Alumno"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={matriculaOpen}
        onClose={() => setMatriculaOpen(false)}
        title={`Nueva matrícula — ${matriculaAlumno?.nombre} ${matriculaAlumno?.apellidos}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {matriculaError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
              {matriculaError}
            </p>
          )}

          {matriculaAlumno && matriculaAlumno.matriculas.length > 0 && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-[#0a0a0a]">
              <p className="mb-2 text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
                Matrículas actuales
              </p>
              <div className="space-y-2">
                {matriculaAlumno.matriculas.map((matricula) => (
                  <div key={matricula.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {formatMatriculaLabel(matricula)}
                      </p>
                      <p className="text-xs text-[#86868b]">
                        {matricula.fecha_inscripcion || "Sin fecha"} ·{" "}
                        {(matricula.categorias ?? []).join(", ") || "Sin categorías"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {matricula.valor_total
                        ? `$${Number(matricula.valor_total).toLocaleString("es-CO")}`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>
              Categoría del curso *{" "}
              <span className="font-normal normal-case">
                ({matriculaForm.categorias.length} seleccionada
                {matriculaForm.categorias.length !== 1 ? "s" : ""})
              </span>
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {(categoriasEscuela.length > 0 ? categoriasEscuela : TODAS_CATEGORIAS).map((cat) => {
                const selected = matriculaForm.categorias.includes(cat);
                return (
                  <button
                    key={`matricula-${cat}`}
                    type="button"
                    onClick={() => toggleMatriculaCategoria(cat)}
                    className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                      selected
                        ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
                        : "border-gray-200 text-[#86868b] hover:border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>N° contrato</label>
              <input
                type="text"
                value={matriculaForm.numero_contrato}
                onChange={(e) =>
                  setMatriculaForm({ ...matriculaForm, numero_contrato: e.target.value })
                }
                onBlur={(e) =>
                  setMatriculaForm({
                    ...matriculaForm,
                    numero_contrato:
                      normalizeContractNumber(e.target.value, matriculaForm.categorias) ?? "",
                  })
                }
                placeholder={getContractPrefixHint(matriculaForm.categorias)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-[#86868b]">
                Se guarda con prefijo obligatorio segun la categoria:{" "}
                {getContractPrefixHint(matriculaForm.categorias)}.
              </p>
            </div>
            <div>
              <label className={labelClass}>Fecha inscripción</label>
              <input
                type="date"
                value={matriculaForm.fecha_inscripcion}
                onChange={(e) =>
                  setMatriculaForm({ ...matriculaForm, fecha_inscripcion: e.target.value })
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Valor total del curso</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={matriculaForm.valor_total}
                onChange={(e) =>
                  setMatriculaForm({ ...matriculaForm, valor_total: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Notas del contrato</label>
              <input
                type="text"
                value={matriculaForm.notas}
                onChange={(e) => setMatriculaForm({ ...matriculaForm, notas: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
            <label className="flex cursor-pointer items-center gap-3 select-none">
              <div
                className="relative"
                onClick={() =>
                  setMatriculaForm({
                    ...matriculaForm,
                    tiene_tramitador: !matriculaForm.tiene_tramitador,
                  })
                }
              >
                <div
                  className={`h-6 w-10 rounded-full transition-colors ${matriculaForm.tiene_tramitador ? "bg-[#0071e3]" : "bg-gray-200 dark:bg-gray-700"}`}
                >
                  <div
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${matriculaForm.tiene_tramitador ? "translate-x-5" : "translate-x-1"}`}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Tiene tramitador
                </p>
                <p className="text-xs text-[#86868b]">
                  El costo se registrará automáticamente en Gastos
                </p>
              </div>
            </label>

            {matriculaForm.tiene_tramitador && (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nombre del tramitador</label>
                  <input
                    type="text"
                    value={matriculaForm.tramitador_nombre}
                    onChange={(e) =>
                      setMatriculaForm({ ...matriculaForm, tramitador_nombre: e.target.value })
                    }
                    placeholder="Nombre o agencia"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Valor del tramitador</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={matriculaForm.tramitador_valor}
                    onChange={(e) =>
                      setMatriculaForm({ ...matriculaForm, tramitador_valor: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
            <p className="mb-3 text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
              Abono inicial
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Monto del abono</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={matriculaForm.abono}
                    onChange={(e) => setMatriculaForm({ ...matriculaForm, abono: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Método de pago</label>
                  <select
                    value={matriculaForm.metodo_pago_abono}
                    onChange={(e) =>
                      setMatriculaForm({
                        ...matriculaForm,
                        metodo_pago_abono: e.target.value as MetodoPago,
                      })
                    }
                    className={inputClass}
                  >
                    {metodosPago.map((metodo) => (
                      <option key={`matricula-${metodo.value}`} value={metodo.value}>
                        {metodo.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {parseFloat(String(matriculaForm.valor_total)) > 0 && (
                <p className="text-xs text-[#86868b]">
                  Saldo pendiente tras abono:{" "}
                  <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    $
                    {Math.max(
                      0,
                      parseFloat(String(matriculaForm.valor_total)) -
                        (parseFloat(String(matriculaForm.abono)) || 0)
                    ).toLocaleString("es-CO")}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setMatriculaOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveMatricula}
              disabled={matriculaSaving}
              className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
            >
              {matriculaSaving ? "Guardando..." : "Crear Matrícula"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={abonoOpen}
        onClose={() => setAbonoOpen(false)}
        title={`${abonoAlumno?.tipo_registro === "regular" ? "Abonos" : "Pagos"} — ${abonoAlumno?.nombre} ${abonoAlumno?.apellidos}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {abonoMatriculas.length > 1 && (
            <div>
              <label className={labelClass}>Matrícula</label>
              <select
                value={abonoMatriculaId}
                onChange={(e) => setAbonoMatriculaId(e.target.value)}
                className={inputClass}
              >
                {abonoMatriculas.map((matricula) => (
                  <option key={matricula.id} value={matricula.id}>
                    {formatMatriculaLabel(matricula)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {valorTotalAbono > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-[#0a0a0a]">
                <p className="mb-1 text-[10px] tracking-wider text-[#86868b] uppercase">
                  Valor Curso
                </p>
                <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  ${valorTotalAbono.toLocaleString("es-CO")}
                </p>
              </div>
              <div className="rounded-xl bg-green-50 p-3 text-center dark:bg-green-900/20">
                <p className="mb-1 text-[10px] tracking-wider text-green-600 uppercase dark:text-green-400">
                  Pagado
                </p>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  ${totalPagadoAbono.toLocaleString("es-CO")}
                </p>
              </div>
              <div
                className={`rounded-xl p-3 text-center ${saldoPendienteAbono <= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20"}`}
              >
                <p
                  className={`mb-1 text-[10px] tracking-wider uppercase ${saldoPendienteAbono <= 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}
                >
                  {saldoPendienteAbono <= 0 ? "¡Al día!" : "Pendiente"}
                </p>
                <p
                  className={`text-sm font-semibold ${saldoPendienteAbono <= 0 ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}
                >
                  ${Math.max(0, saldoPendienteAbono).toLocaleString("es-CO")}
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
              Historial de pagos
            </p>
            {loadingIngresos ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0071e3] border-t-transparent" />
              </div>
            ) : abonoIngresosFiltrados.length === 0 ? (
              <p className="rounded-xl bg-gray-50 py-3 text-center text-xs text-[#86868b] dark:bg-[#0a0a0a]">
                Sin pagos registrados
              </p>
            ) : (
              <div className="max-h-44 space-y-1.5 overflow-y-auto">
                {abonoIngresosFiltrados.map((ingreso) => (
                  <div
                    key={ingreso.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-[#0a0a0a]"
                  >
                    <div>
                      <p className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {ingreso.concepto}
                      </p>
                      <p className="text-[10px] text-[#86868b]">
                        {ingreso.fecha} ·{" "}
                        {metodosPago.find((metodo) => metodo.value === ingreso.metodo_pago)
                          ?.label || ingreso.metodo_pago}
                      </p>
                    </div>
                    <span className="ml-3 shrink-0 text-sm font-semibold text-green-600 dark:text-green-400">
                      +${ingreso.monto.toLocaleString("es-CO")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
            <p className="text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
              {abonoAlumno?.tipo_registro === "regular"
                ? "Registrar nuevo abono"
                : "Registrar nuevo pago"}
            </p>

            {abonoError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
                {abonoError}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Monto *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="0"
                  value={abonoMonto}
                  onChange={(e) => setAbonoMonto(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Método de pago</label>
                <select
                  value={abonoMetodo}
                  onChange={(e) => setAbonoMetodo(e.target.value as MetodoPago)}
                  className={inputClass}
                >
                  {metodosPago.map((metodo) => (
                    <option key={metodo.value} value={metodo.value}>
                      {metodo.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Concepto (opcional)</label>
              <input
                type="text"
                placeholder={
                  abonoAlumno?.tipo_registro === "aptitud_conductor"
                    ? `Pago aptitud — ${abonoAlumno?.nombre} ${abonoAlumno?.apellidos}`
                    : abonoAlumno?.tipo_registro === "practica_adicional"
                      ? `Práctica adicional — ${abonoAlumno?.nombre} ${abonoAlumno?.apellidos}`
                      : `Abono — ${abonoAlumno?.nombre} ${abonoAlumno?.apellidos}`
                }
                value={abonoConcepto}
                onChange={(e) => setAbonoConcepto(e.target.value)}
                className={inputClass}
              />
            </div>

            {valorTotalAbono > 0 && parseFloat(abonoMonto) > 0 && (
              <p className="text-xs text-[#86868b]">
                Saldo pendiente tras abono:{" "}
                <span
                  className={`font-semibold ${saldoPendienteAbono - parseFloat(abonoMonto) <= 0 ? "text-green-600" : "text-amber-600"}`}
                >
                  $
                  {Math.max(0, saldoPendienteAbono - (parseFloat(abonoMonto) || 0)).toLocaleString(
                    "es-CO"
                  )}
                </span>
              </p>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleSaveAbono}
                disabled={abonoSaving || !abonoMonto}
                className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
              >
                {abonoSaving
                  ? "Registrando..."
                  : abonoAlumno?.tipo_registro === "regular"
                    ? "Registrar Abono"
                    : "Registrar Pago"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <DeleteConfirm
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={saving}
        description={
          <div className="space-y-3">
            <p>¿Eliminar este alumno? Esta acción no se puede deshacer.</p>
            {deleteError && <p className="text-red-500">{deleteError}</p>}
          </div>
        }
      />
    </div>
  );
}
