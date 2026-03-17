"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDraftForm } from "@/hooks/useDraftForm";
import DataTable from "@/components/dashboard/DataTable";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { fetchJsonWithRetry } from "@/lib/retry";
import { fetchSchoolCategories } from "@/lib/school-categories";
import type { Ingreso, MetodoPago, TipoRegistroAlumno } from "@/types/database";
import { BookOpen, DollarSign, Plus, X } from "lucide-react";
import AlumnoModal from "./AlumnoModal";
import MatriculaModal from "./MatriculaModal";
import AbonoModal from "./AbonoModal";
import {
  PAGE_SIZE,
  MONTH_OPTIONS,
  YEAR_OPTIONS,
  tiposRegistroAlumno,
  emptyForm,
  emptyMatriculaForm,
  formatTipoRegistroLabel,
  formatNotaExamen,
  getCategoriasDisponiblesParaTipos,
  resolveSedeId,
  type AlumnoRow,
  type AlumnosListResponse,
  type MatriculaResumen,
} from "./constants";

export default function AlumnosPage() {
  const { perfil } = useAuth();

  // --- Paginación server-side ---
  const [alumnos, setAlumnos] = useState<AlumnoRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [categoriasEscuela, setCategoriasEscuela] = useState<string[]>([]);
  const [tramitadorOptions, setTramitadorOptions] = useState<string[]>([]);
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
  const [abonoFecha, setAbonoFecha] = useState(new Date().toISOString().split("T")[0]);
  const [abonoSaving, setAbonoSaving] = useState(false);
  const [abonoError, setAbonoError] = useState("");

  const fetchIdRef = useRef(0);

  // ─── Data fetching ───────────────────────────────────────────────────

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

  useEffect(() => {
    if (!perfil?.escuela_id) return;

    let cancelled = false;

    const loadTramitadores = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("gastos")
          .select("proveedor")
          .eq("escuela_id", perfil.escuela_id)
          .eq("categoria", "tramitador")
          .not("proveedor", "is", null)
          .order("proveedor", { ascending: true })
          .limit(200);

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setTramitadorOptions(
            Array.from(
              new Set(
                ((data as Array<{ proveedor: string | null }> | null) || [])
                  .map((row) => row.proveedor?.trim())
                  .filter((value): value is string => Boolean(value))
              )
            )
          );
        }
      } catch {
        if (!cancelled) {
          setTramitadorOptions([]);
        }
      }
    };

    void loadTramitadores();

    return () => {
      cancelled = true;
    };
  }, [perfil?.escuela_id]);

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

  // ─── Modal openers ──────────────────────────────────────────────────

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
    setAbonoFecha(new Date().toISOString().split("T")[0]);
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

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.nombre || !form.apellidos || !form.dni || !form.telefono) {
      setError("Nombre, apellidos, cédula y teléfono son obligatorios.");
      return;
    }

    const isAptitud = form.tipo_registro === "aptitud_conductor";
    const isPractice = form.tipo_registro === "practica_adicional";

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

    const tramitadorValidationMessage = getTramitadorValidationMessage(
      form.tiene_tramitador,
      form.tramitador_nombre
    );
    if (tramitadorValidationMessage) {
      setError(tramitadorValidationMessage);
      return;
    }

    if (!perfil?.escuela_id) {
      setError("Tu usuario no tiene escuela asignada. Contacta al administrador.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const sedeId = await resolveSedeId(perfil.escuela_id, perfil.sede_id);
      if (!sedeId) {
        setError("No se encontró una sede para esta escuela. Crea una sede primero.");
        setSaving(false);
        return;
      }
      const tramitadorValorNum = parseFloat(form.tramitador_valor) || 0;
      await fetchJsonWithRetry("/api/alumnos/manage", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alumno_id: editing?.id,
          sede_id: sedeId,
          tipo_registro: form.tipo_registro,
          nombre: form.nombre.trim(),
          apellidos: form.apellidos.trim(),
          dni: form.dni.trim(),
          email: form.email.trim() || null,
          telefono: form.telefono.trim(),
          direccion: form.direccion.trim() || null,
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
          tiene_tramitador: form.tiene_tramitador,
          tramitador_nombre: form.tramitador_nombre.trim() || null,
          tramitador_valor: form.tiene_tramitador ? tramitadorValorNum || null : null,
        }),
      });

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

    const tramitadorValidationMessage = getTramitadorValidationMessage(
      matriculaForm.tiene_tramitador,
      matriculaForm.tramitador_nombre
    );
    if (tramitadorValidationMessage) {
      setMatriculaError(tramitadorValidationMessage);
      return;
    }

    setMatriculaSaving(true);
    setMatriculaError("");

    try {
      const sedeId =
        matriculaAlumno.sede_id || (await resolveSedeId(perfil.escuela_id, perfil.sede_id));
      if (!sedeId) {
        setMatriculaError("No se encontró una sede para esta escuela.");
        setMatriculaSaving(false);
        return;
      }

      const tramitadorValorNum = parseFloat(matriculaForm.tramitador_valor) || 0;
      await fetchJsonWithRetry("/api/alumnos/matriculas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alumno_id: matriculaAlumno.id,
          sede_id: sedeId,
          numero_contrato: matriculaForm.numero_contrato.trim() || null,
          fecha_inscripcion: matriculaForm.fecha_inscripcion,
          categorias: matriculaForm.categorias,
          valor_total: valorTotalNum || null,
          notas: matriculaForm.notas.trim() || null,
          abono: abonoNum,
          metodo_pago_abono: matriculaForm.metodo_pago_abono,
          tiene_tramitador: matriculaForm.tiene_tramitador,
          tramitador_nombre: matriculaForm.tramitador_nombre.trim() || null,
          tramitador_valor: matriculaForm.tiene_tramitador ? tramitadorValorNum || null : null,
        }),
      });

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

    if (!abonoFecha) {
      setAbonoError("Debes seleccionar una fecha para el abono.");
      return;
    }

    if (abonoMatriculas.length > 0 && !abonoMatriculaActual) {
      setAbonoError("Selecciona la matrícula a la que corresponde este abono.");
      return;
    }

    setAbonoSaving(true);
    setAbonoError("");

    try {
      await fetchJsonWithRetry("/api/alumnos/abonos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alumno_id: abonoAlumno.id,
          matricula_id: abonoMatriculaActual?.id || null,
          monto,
          metodo_pago: abonoMetodo,
          concepto: abonoConcepto.trim() || null,
          fecha: abonoFecha,
        }),
      });

      // Reload ingresos after successful insert
      const supabase = createClient();
      const { data } = await supabase
        .from("ingresos")
        .select("*")
        .eq("alumno_id", abonoAlumno.id)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });

      setAbonoIngresos((data as Ingreso[]) || []);
      setAbonoMonto("");
      setAbonoConcepto("");
      setAbonoFecha(new Date().toISOString().split("T")[0]);
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

  // ─── Render ─────────────────────────────────────────────────────────

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

      {/* ========== Filters ========== */}
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

      {/* ========== DataTable ========== */}
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

      {/* ========== Modals ========== */}
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
        error={error}
        saving={saving}
        handleSave={handleSave}
        toggleCategoria={toggleCategoria}
        openNewMatricula={openNewMatricula}
        categoriasEscuela={categoriasEscuela}
        tramitadorOptions={tramitadorOptions}
      />

      <MatriculaModal
        matriculaOpen={matriculaOpen}
        setMatriculaOpen={setMatriculaOpen}
        matriculaAlumno={matriculaAlumno}
        matriculaForm={matriculaForm}
        setMatriculaForm={setMatriculaForm}
        matriculaSaving={matriculaSaving}
        matriculaError={matriculaError}
        handleSaveMatricula={handleSaveMatricula}
        toggleMatriculaCategoria={toggleMatriculaCategoria}
        categoriasEscuela={categoriasEscuela}
        tramitadorOptions={tramitadorOptions}
      />

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
        abonoError={abonoError}
        handleSaveAbono={handleSaveAbono}
      />

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
