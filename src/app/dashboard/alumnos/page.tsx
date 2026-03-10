"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type {
  Alumno,
  EstadoAlumno,
  Ingreso,
  MatriculaAlumno,
  MetodoPago,
  TipoPermiso,
} from "@/types/database";
import { BookOpen, DollarSign, Plus, X } from "lucide-react";

const PAGE_SIZE = 10;

const estadosAlumno: EstadoAlumno[] = ["activo", "inactivo", "graduado"];
const metodosPago: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "datafono", label: "Datáfono" },
  { value: "nequi", label: "Nequi" },
  { value: "sistecredito", label: "Sistecrédito" },
  { value: "otro", label: "Otro" },
];
const TODAS_CATEGORIAS = [
  "A1", "A2", "B1", "C1", "RC1", "C2", "C3",
  "A2 y B1", "A2 y C1", "A2 y RC1", "A2 y C2", "A2 y C3",
  "A1 y B1", "A1 y C1", "A1 y RC1", "A1 y C2", "A1 y C3",
];

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

const emptyForm = {
  nombre: "",
  apellidos: "",
  dni: "",
  email: "",
  telefono: "",
  direccion: "",
  tipo_permiso: "B" as TipoPermiso,
  categorias: [] as string[],
  estado: "activo" as EstadoAlumno,
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

function formatMatriculaLabel(matricula: MatriculaResumen) {
  if (matricula.numero_contrato) return `Contrato ${matricula.numero_contrato}`;
  if ((matricula.categorias ?? []).length > 0) return (matricula.categorias ?? []).join(", ");
  return "Sin contrato";
}

function sortMatriculas(a: MatriculaResumen, b: MatriculaResumen) {
  const dateA = a.fecha_inscripcion ? new Date(`${a.fecha_inscripcion}T00:00:00`).getTime() : 0;
  const dateB = b.fecha_inscripcion ? new Date(`${b.fecha_inscripcion}T00:00:00`).getTime() : 0;
  if (dateA !== dateB) return dateB - dateA;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
  const [filtrosCat, setFiltrosCat] = useState<string[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<AlumnoRow | null>(null);
  const [deleting, setDeleting] = useState<AlumnoRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const [matriculaOpen, setMatriculaOpen] = useState(false);
  const [matriculaAlumno, setMatriculaAlumno] = useState<AlumnoRow | null>(null);
  const [matriculaSaving, setMatriculaSaving] = useState(false);
  const [matriculaError, setMatriculaError] = useState("");
  const [matriculaForm, setMatriculaForm] = useState(emptyMatriculaForm);

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
  const fetchAlumnos = useCallback(async (page = 0, search = "", catFilters: string[] = []) => {
    if (!perfil?.escuela_id) return;

    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    const supabase = createClient();

    // 1. Contar total (para la paginación)
    let countQuery = supabase
      .from("alumnos")
      .select("id", { count: "exact", head: true })
      .eq("escuela_id", perfil.escuela_id);

    if (search) {
      countQuery = countQuery.or(
        `nombre.ilike.%${search}%,apellidos.ilike.%${search}%,dni.ilike.%${search}%`
      );
    }

    // 2. Traer solo la página actual
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let dataQuery = supabase
      .from("alumnos")
      .select("id, nombre, apellidos, dni, telefono, email, tipo_permiso, categorias, estado, valor_total, fecha_inscripcion, ciudad, departamento, direccion, tiene_tramitador, tramitador_nombre, tramitador_valor, sede_id, user_id, created_at, notas, numero_contrato")
      .eq("escuela_id", perfil.escuela_id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search) {
      dataQuery = dataQuery.or(
        `nombre.ilike.%${search}%,apellidos.ilike.%${search}%,dni.ilike.%${search}%`
      );
    }

    const [countRes, alumnosRes] = await Promise.all([countQuery, dataQuery]);

    // Evitar race conditions: si ya se disparó otro fetch, ignorar este
    if (fetchId !== fetchIdRef.current) return;

    const alumnosList = (alumnosRes.data as Alumno[]) ?? [];
    const alumnoIds = alumnosList.map((a) => a.id);

    // 3. Traer matrículas e ingresos SOLO de los alumnos de esta página
    let matriculasData: MatriculaResumen[] = [];
    let ingresosData: { alumno_id: string; matricula_id: string | null; monto: number; estado: string }[] = [];

    if (alumnoIds.length > 0) {
      const [matriculasRes, ingresosRes] = await Promise.all([
        supabase
          .from("matriculas_alumno")
          .select("id, alumno_id, numero_contrato, categorias, valor_total, fecha_inscripcion, estado, notas, tiene_tramitador, tramitador_nombre, tramitador_valor, created_at")
          .in("alumno_id", alumnoIds),
        supabase
          .from("ingresos")
          .select("alumno_id, matricula_id, monto, estado")
          .in("alumno_id", alumnoIds),
      ]);
      matriculasData = (matriculasRes.data as MatriculaResumen[]) ?? [];
      ingresosData = (ingresosRes.data ?? []) as typeof ingresosData;
    }

    if (fetchId !== fetchIdRef.current) return;

    // 4. Armar filas enriquecidas
    const matriculasPorAlumno = new Map<string, MatriculaResumen[]>();
    for (const matricula of matriculasData.sort(sortMatriculas)) {
      const actuales = matriculasPorAlumno.get(matricula.alumno_id) ?? [];
      actuales.push(matricula);
      matriculasPorAlumno.set(matricula.alumno_id, actuales);
    }

    const pagosPorAlumno = new Map<string, number>();
    for (const ingreso of ingresosData) {
      if (ingreso.estado !== "cobrado") continue;
      pagosPorAlumno.set(ingreso.alumno_id, (pagosPorAlumno.get(ingreso.alumno_id) || 0) + Number(ingreso.monto));
    }

    let rows = alumnosList.map((alumno) => {
      const matriculas = matriculasPorAlumno.get(alumno.id) ?? [];
      const categoriasResumen = matriculas.length > 0
        ? Array.from(new Set(matriculas.flatMap((matricula) => matricula.categorias ?? []))).sort()
        : (alumno.categorias ?? []);
      const valorTotalResumen = matriculas.length > 0
        ? matriculas
            .filter((matricula) => matricula.estado !== "cancelado")
            .reduce((sum, matricula) => sum + Number(matricula.valor_total || 0), 0)
        : Number(alumno.valor_total || 0);
      const totalPagado = pagosPorAlumno.get(alumno.id) || 0;

      return {
        ...alumno,
        matriculas,
        categorias_resumen: categoriasResumen,
        valor_total_resumen: valorTotalResumen,
        total_pagado: totalPagado,
        saldo_pendiente: Math.max(valorTotalResumen - totalPagado, 0),
      };
    });

    // 5. Filtro por categorías (client-side sobre la página actual)
    if (catFilters.length > 0) {
      rows = rows.filter((row) =>
        catFilters.some((cat) => row.categorias_resumen.includes(cat))
      );
    }

    setAlumnos(rows);
    setTotalCount(countRes.count ?? 0);
    setLoading(false);
  }, [perfil?.escuela_id]);

  const fetchCategorias = useCallback(async (escuelaId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("escuelas")
      .select("categorias")
      .eq("id", escuelaId)
      .single();

    setCategoriasEscuela(data?.categorias || []);
  }, []);

  useEffect(() => {
    if (!perfil) return;
    fetchAlumnos(currentPage, searchTerm, filtrosCat);
    if (perfil.escuela_id) fetchCategorias(perfil.escuela_id);
  }, [fetchAlumnos, fetchCategorias, perfil, currentPage, searchTerm, filtrosCat]);

  /** Callback del DataTable server-side: cambio de página */
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  /** Callback del DataTable server-side: cambio de búsqueda (ya con debounce) */
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(0); // volver a primera página al buscar
  }, []);

  const editingHasMultipleMatriculas = Boolean(editing && editing.matriculas.length > 1);
  const editingMatricula = editing && editing.matriculas.length === 1 ? editing.matriculas[0] : null;
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

  const toggleCategoria = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      categorias: prev.categorias.includes(cat)
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
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (alumno: AlumnoRow) => {
    const matricula = alumno.matriculas[0] ?? null;
    setEditing(alumno);
    setForm({
      nombre: alumno.nombre,
      apellidos: alumno.apellidos,
      dni: alumno.dni,
      email: alumno.email || "",
      telefono: alumno.telefono,
      direccion: alumno.direccion || "",
      tipo_permiso: alumno.tipo_permiso,
      categorias: matricula?.categorias || alumno.categorias_resumen,
      estado: alumno.estado,
      notas: alumno.notas || "",
      numero_contrato: matricula?.numero_contrato || "",
      fecha_inscripcion: matricula?.fecha_inscripcion || new Date().toISOString().split("T")[0],
      valor_total: matricula?.valor_total ? String(matricula.valor_total) : "",
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
    setMatriculaForm({
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

    const gestionaMatricula = !editing || editing.matriculas.length <= 1;
    if (gestionaMatricula && form.categorias.length === 0) {
      setError("Debes seleccionar al menos una categoría de curso.");
      return;
    }

    const abonoNum = parseFloat(String(form.abono)) || 0;
    const valorTotalNum = parseFloat(String(form.valor_total)) || 0;
    if (!editing && abonoNum > 0 && valorTotalNum > 0 && abonoNum > valorTotalNum) {
      setError("El abono no puede ser mayor al valor total del curso.");
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

      if (!editing) {
        const authRes = await fetch("/api/crear-alumno-auth", {
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
        const authJson = await authRes.json();
        if (!authRes.ok) {
          setError(authJson.error || "Error al crear la cuenta del alumno.");
          setSaving(false);
          return;
        }
        alumnoUserId = authJson.user_id;
      }

      const tramitadorValorNum = parseFloat(form.tramitador_valor) || 0;
      const alumnoPayload = {
        user_id: alumnoUserId,
        escuela_id: perfil.escuela_id,
        sede_id: sedeId,
        nombre: form.nombre,
        apellidos: form.apellidos,
        dni: form.dni,
        email: form.email || null,
        telefono: form.telefono,
        fecha_nacimiento: null,
        direccion: form.direccion || null,
        tipo_permiso: gestionaMatricula ? mapTipoPermiso(form.categorias) : (editing?.tipo_permiso || form.tipo_permiso),
        categorias: [],
        estado: form.estado,
        notas: form.notas || null,
        valor_total: null,
        fecha_inscripcion: null,
        numero_contrato: null,
        tiene_tramitador: false,
        tramitador_nombre: null,
        tramitador_valor: null,
      };
      const matriculaPayload = gestionaMatricula
        ? {
            escuela_id: perfil.escuela_id,
            sede_id: sedeId,
            alumno_id: editing?.id,
            created_by: perfil.id,
            numero_contrato: form.numero_contrato.trim() || null,
            categorias: form.categorias,
            valor_total: valorTotalNum || null,
            fecha_inscripcion: form.fecha_inscripcion || new Date().toISOString().split("T")[0],
            estado: "activo" as const,
            notas: editingMatricula?.notas || null,
            tiene_tramitador: form.tiene_tramitador,
            tramitador_nombre: form.tiene_tramitador ? (form.tramitador_nombre.trim() || null) : null,
            tramitador_valor: form.tiene_tramitador ? (tramitadorValorNum || null) : null,
          }
        : null;
      const hoy = new Date().toISOString().split("T")[0];

      if (editing) {
        const { error: alumnoError } = await supabase.from("alumnos").update(alumnoPayload).eq("id", editing.id);
        if (alumnoError) throw alumnoError;

        if (gestionaMatricula && matriculaPayload) {
          if (editingMatricula) {
            const { error: matriculaError } = await supabase
              .from("matriculas_alumno")
              .update(matriculaPayload)
              .eq("id", editingMatricula.id);
            if (matriculaError) throw matriculaError;

            if (form.tiene_tramitador && tramitadorValorNum > 0) {
              const originalValor = editingMatricula.tramitador_valor ?? 0;
              const diferencia = tramitadorValorNum - originalValor;
              const esPrimeraVez = !editingMatricula.tiene_tramitador;
              const montoGasto = esPrimeraVez ? tramitadorValorNum : diferencia;
              if (montoGasto > 0) {
                await supabase.from("gastos").insert([{
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
                }]);
              }
            }
          } else {
            const { error: insertMatriculaError } = await supabase.from("matriculas_alumno").insert([{
              ...matriculaPayload,
              alumno_id: editing.id,
            }]);
            if (insertMatriculaError) throw insertMatriculaError;

            if (form.tiene_tramitador && tramitadorValorNum > 0) {
              await supabase.from("gastos").insert([{
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
              }]);
            }
          }
        }
      } else {
        const { data: alumnoData, error: insertAlumnoError } = await supabase
          .from("alumnos")
          .insert([alumnoPayload])
          .select("id")
          .single();
        if (insertAlumnoError || !alumnoData) throw insertAlumnoError || new Error("No se pudo crear el alumno.");

        let matriculaId: string | null = null;
        if (matriculaPayload) {
          const { data: newMatricula, error: insertMatriculaError } = await supabase
            .from("matriculas_alumno")
            .insert([{
              ...matriculaPayload,
              alumno_id: alumnoData.id,
            }])
            .select("id")
            .single();
          if (insertMatriculaError || !newMatricula) throw insertMatriculaError || new Error("No se pudo crear la matrícula.");
          matriculaId = newMatricula.id;
        }

        if (abonoNum > 0) {
          await supabase.from("ingresos").insert([{
            escuela_id: perfil.escuela_id,
            sede_id: sedeId,
            user_id: perfil.id,
            alumno_id: alumnoData.id,
            matricula_id: matriculaId,
            categoria: "matricula",
            concepto: `Matrícula — ${form.nombre} ${form.apellidos}`,
            monto: abonoNum,
            metodo_pago: form.metodo_pago_abono,
            fecha: hoy,
            estado: "cobrado",
            notas: null,
          }]);
        }

        if (form.tiene_tramitador && tramitadorValorNum > 0) {
          await supabase.from("gastos").insert([{
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
          }]);
        }
      }

      setModalOpen(false);
      fetchAlumnos(currentPage, searchTerm, filtrosCat);
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
      const sedeId = matriculaAlumno.sede_id || await resolveSedeId(perfil.escuela_id, perfil.sede_id);
      if (!sedeId) {
        setMatriculaError("No se encontró una sede para esta escuela.");
        setMatriculaSaving(false);
        return;
      }

      const tramitadorValorNum = parseFloat(matriculaForm.tramitador_valor) || 0;
      const hoy = new Date().toISOString().split("T")[0];
      const { data: nuevaMatricula, error: matriculaInsertError } = await supabase
        .from("matriculas_alumno")
        .insert([{
          escuela_id: perfil.escuela_id,
          sede_id: sedeId,
          alumno_id: matriculaAlumno.id,
          created_by: perfil.id,
          numero_contrato: matriculaForm.numero_contrato.trim() || null,
          categorias: matriculaForm.categorias,
          valor_total: valorTotalNum || null,
          fecha_inscripcion: matriculaForm.fecha_inscripcion || hoy,
          estado: "activo",
          notas: matriculaForm.notas.trim() || null,
          tiene_tramitador: matriculaForm.tiene_tramitador,
          tramitador_nombre: matriculaForm.tiene_tramitador ? (matriculaForm.tramitador_nombre.trim() || null) : null,
          tramitador_valor: matriculaForm.tiene_tramitador ? (tramitadorValorNum || null) : null,
        }])
        .select("id")
        .single();

      if (matriculaInsertError || !nuevaMatricula) {
        throw matriculaInsertError || new Error("No se pudo crear la matrícula.");
      }

      if (abonoNum > 0) {
        const { error: ingresoError } = await supabase.from("ingresos").insert([{
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
        }]);
        if (ingresoError) throw ingresoError;
      }

      if (matriculaForm.tiene_tramitador && tramitadorValorNum > 0) {
        const { error: gastoError } = await supabase.from("gastos").insert([{
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
        }]);
        if (gastoError) throw gastoError;
      }

      setMatriculaOpen(false);
      setMatriculaAlumno(null);
      setMatriculaForm(emptyMatriculaForm);
      fetchAlumnos(currentPage, searchTerm, filtrosCat);
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

    const valorTotal = Number(abonoMatriculaActual?.valor_total || abonoAlumno.valor_total_resumen || 0);
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

      const { error: insertError } = await supabase.from("ingresos").insert([{
        escuela_id: perfil.escuela_id,
        sede_id: sedeId,
        user_id: perfil.id,
        alumno_id: abonoAlumno.id,
        matricula_id: abonoMatriculaActual?.id || null,
        categoria: "matricula",
        concepto: abonoConcepto.trim() || `Abono — ${abonoAlumno.nombre} ${abonoAlumno.apellidos}`,
        monto,
        metodo_pago: abonoMetodo,
        fecha: new Date().toISOString().split("T")[0],
        estado: "cobrado",
        notas: null,
      }]);

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
      fetchAlumnos(currentPage, searchTerm, filtrosCat);
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
      fetchAlumnos(currentPage, searchTerm, filtrosCat);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "nombre" as keyof AlumnoRow,
      label: "Alumno",
      render: (row: AlumnoRow) => <span className="font-medium">{row.nombre} {row.apellidos}</span>,
    },
    { key: "dni" as keyof AlumnoRow, label: "Cédula" },
    { key: "telefono" as keyof AlumnoRow, label: "Teléfono" },
    {
      key: "categorias_resumen" as keyof AlumnoRow,
      label: "Cursos",
      render: (row: AlumnoRow) => {
        if (row.categorias_resumen.length === 0) return <span className="text-[#86868b] text-xs">—</span>;
        return (
          <div>
            <div className="flex flex-wrap gap-1">
              {row.categorias_resumen.map((categoria) => (
                <span
                  key={`${row.id}-${categoria}`}
                  className="px-1.5 py-0.5 text-[10px] rounded-md bg-[#0071e3]/10 text-[#0071e3] font-semibold"
                >
                  {categoria}
                </span>
              ))}
            </div>
            {row.matriculas.length > 1 && (
              <p className="text-[10px] text-[#86868b] mt-1">{row.matriculas.length} matrículas activas</p>
            )}
          </div>
        );
      },
    },
    {
      key: "valor_total_resumen" as keyof AlumnoRow,
      label: "Valor Total",
      render: (row: AlumnoRow) =>
        row.valor_total_resumen > 0
          ? <span className="text-sm font-medium">${row.valor_total_resumen.toLocaleString("es-CO")}</span>
          : <span className="text-[#86868b] text-xs">—</span>,
    },
    {
      key: "saldo_pendiente" as keyof AlumnoRow,
      label: "Saldo Pendiente",
      render: (row: AlumnoRow) => {
        if (row.valor_total_resumen <= 0) return <span className="text-[#86868b] text-xs">—</span>;
        if (row.saldo_pendiente <= 0) {
          return (
            <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
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
  ];

  const valorTotalAbono = Number(abonoMatriculaActual?.valor_total || abonoAlumno?.valor_total_resumen || 0);
  const totalPagadoAbono = abonoIngresosFiltrados
    .filter((ingreso) => ingreso.estado === "cobrado")
    .reduce((sum, ingreso) => sum + Number(ingreso.monto), 0);
  const saldoPendienteAbono = valorTotalAbono - totalPagadoAbono;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Alumnos</h2>
          <p className="text-sm text-[#86868b] mt-0.5">Gestiona los alumnos de tu escuela</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"
        >
          <Plus size={16} />
          Nuevo Alumno
        </button>
      </div>

      {(() => {
        const categorias = categoriasEscuela.length > 0 ? categoriasEscuela : TODAS_CATEGORIAS;
        return (
          <div className="bg-white dark:bg-[#1d1d1f] rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#86868b] font-medium mr-1">Filtrar:</span>
            {categorias.map((cat) => {
              const activo = filtrosCat.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleFiltroCat(cat)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                    activo
                      ? "bg-[#0071e3] text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-[#86868b] hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
            {filtrosCat.length > 0 && (
              <button
                onClick={() => setFiltrosCat([])}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-[#86868b] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-1"
              >
                <X size={11} />
                Limpiar
              </button>
            )}
          </div>
        );
      })()}

      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6">
        <DataTable
          columns={columns}
          data={alumnos}
          loading={loading}
          searchPlaceholder="Buscar por nombre o cédula..."
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
              <button
                onClick={() => openNewMatricula(row)}
                className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-[#86868b] hover:text-[#0071e3]"
                title="Nueva matrícula"
                aria-label="Nueva matrícula"
              >
                <BookOpen size={14} />
              </button>
              <button
                onClick={() => openAbono(row)}
                className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-[#86868b] hover:text-green-600"
                title="Registrar abono"
                aria-label="Registrar abono"
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
        title={editing ? "Editar Alumno" : "Nuevo Alumno"}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {editing && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  openNewMatricula(editing);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[#0071e3]/20 text-[#0071e3] hover:bg-[#0071e3]/5 transition-colors"
              >
                <BookOpen size={14} />
                Nueva matrícula
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {editingHasMultipleMatriculas ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                Este alumno tiene varias matrículas. Aquí solo se actualizan sus datos personales; contrato, valor y categorías se gestionan por matrícula.
              </div>
              <div className="space-y-2">
                {editing?.matriculas.map((matricula) => (
                  <div
                    key={matricula.id}
                    className="rounded-xl bg-gray-50 dark:bg-[#0a0a0a] px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{formatMatriculaLabel(matricula)}</p>
                      <p className="text-xs text-[#86868b]">
                        {matricula.fecha_inscripcion || "Sin fecha"} · {(matricula.categorias ?? []).join(", ") || "Sin categorías"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {matricula.valor_total ? `$${Number(matricula.valor_total).toLocaleString("es-CO")}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className={labelClass}>
                  Categoría del curso *{" "}
                  <span className="normal-case font-normal">
                    ({form.categorias.length} seleccionada{form.categorias.length !== 1 ? "s" : ""})
                  </span>
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(categoriasEscuela.length > 0 ? categoriasEscuela : TODAS_CATEGORIAS).map((cat) => {
                    const selected = form.categorias.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategoria(cat)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-semibold border-2 transition-colors ${
                          selected
                            ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
                            : "border-gray-200 dark:border-gray-700 text-[#86868b] hover:border-gray-300"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>N° contrato</label>
                  <input
                    type="text"
                    value={form.numero_contrato}
                    onChange={(e) => setForm({ ...form, numero_contrato: e.target.value })}
                    className={inputClass}
                  />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoAlumno })}
                    className={inputClass}
                  >
                    {estadosAlumno.map((estado) => (
                      <option key={estado} value={estado}>{estado}</option>
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

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative" onClick={() => setForm({ ...form, tiene_tramitador: !form.tiene_tramitador })}>
                    <div className={`w-10 h-6 rounded-full transition-colors ${form.tiene_tramitador ? "bg-[#0071e3]" : "bg-gray-200 dark:bg-gray-700"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-transform ${form.tiene_tramitador ? "translate-x-5" : "translate-x-1"}`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Tiene tramitador</p>
                    <p className="text-xs text-[#86868b]">El costo se registrará automáticamente en Gastos</p>
                  </div>
                </label>

                {form.tiene_tramitador && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
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
                        Valor {editingMatricula && (editingMatricula.tramitador_valor ?? 0) > 0 ? "(ajuste sobre el anterior)" : "(va a Gastos)"}
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

          {!editingHasMultipleMatriculas && (
            <div className="flex items-end">
              <p className="text-xs text-[#86868b]">
                {editing ? "La ficha personal se actualiza siempre; los valores del curso viven en la matrícula." : "Al crear el alumno se genera también su primera matrícula."}
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
                  <option key={estado} value={estado}>{estado}</option>
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
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] mb-3">
                Abono inicial
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Monto del abono</label>
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
                      onChange={(e) => setForm({ ...form, metodo_pago_abono: e.target.value as MetodoPago })}
                      className={inputClass}
                    >
                      {metodosPago.map((metodo) => (
                        <option key={metodo.value} value={metodo.value}>{metodo.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {parseFloat(String(form.valor_total)) > 0 && (
                  <p className="text-xs text-[#86868b]">
                    Saldo pendiente tras abono:{" "}
                    <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      ${Math.max(0, parseFloat(String(form.valor_total)) - (parseFloat(String(form.abono)) || 0)).toLocaleString("es-CO")}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Alumno"}
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
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {matriculaError}
            </p>
          )}

          {matriculaAlumno && matriculaAlumno.matriculas.length > 0 && (
            <div className="rounded-xl bg-gray-50 dark:bg-[#0a0a0a] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] mb-2">
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
                        {matricula.fecha_inscripcion || "Sin fecha"} · {(matricula.categorias ?? []).join(", ") || "Sin categorías"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {matricula.valor_total ? `$${Number(matricula.valor_total).toLocaleString("es-CO")}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>
              Categoría del curso *{" "}
              <span className="normal-case font-normal">
                ({matriculaForm.categorias.length} seleccionada{matriculaForm.categorias.length !== 1 ? "s" : ""})
              </span>
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {(categoriasEscuela.length > 0 ? categoriasEscuela : TODAS_CATEGORIAS).map((cat) => {
                const selected = matriculaForm.categorias.includes(cat);
                return (
                  <button
                    key={`matricula-${cat}`}
                    type="button"
                    onClick={() => toggleMatriculaCategoria(cat)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-semibold border-2 transition-colors ${
                      selected
                        ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
                        : "border-gray-200 dark:border-gray-700 text-[#86868b] hover:border-gray-300"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>N° contrato</label>
              <input
                type="text"
                value={matriculaForm.numero_contrato}
                onChange={(e) => setMatriculaForm({ ...matriculaForm, numero_contrato: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha inscripción</label>
              <input
                type="date"
                value={matriculaForm.fecha_inscripcion}
                onChange={(e) => setMatriculaForm({ ...matriculaForm, fecha_inscripcion: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Valor total del curso</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={matriculaForm.valor_total}
                onChange={(e) => setMatriculaForm({ ...matriculaForm, valor_total: e.target.value })}
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

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative" onClick={() => setMatriculaForm({ ...matriculaForm, tiene_tramitador: !matriculaForm.tiene_tramitador })}>
                <div className={`w-10 h-6 rounded-full transition-colors ${matriculaForm.tiene_tramitador ? "bg-[#0071e3]" : "bg-gray-200 dark:bg-gray-700"}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-transform ${matriculaForm.tiene_tramitador ? "translate-x-5" : "translate-x-1"}`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Tiene tramitador</p>
                <p className="text-xs text-[#86868b]">El costo se registrará automáticamente en Gastos</p>
              </div>
            </label>

            {matriculaForm.tiene_tramitador && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className={labelClass}>Nombre del tramitador</label>
                  <input
                    type="text"
                    value={matriculaForm.tramitador_nombre}
                    onChange={(e) => setMatriculaForm({ ...matriculaForm, tramitador_nombre: e.target.value })}
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
                    onChange={(e) => setMatriculaForm({ ...matriculaForm, tramitador_valor: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] mb-3">
              Abono inicial
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    onChange={(e) => setMatriculaForm({ ...matriculaForm, metodo_pago_abono: e.target.value as MetodoPago })}
                    className={inputClass}
                  >
                    {metodosPago.map((metodo) => (
                      <option key={`matricula-${metodo.value}`} value={metodo.value}>{metodo.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {parseFloat(String(matriculaForm.valor_total)) > 0 && (
                <p className="text-xs text-[#86868b]">
                  Saldo pendiente tras abono:{" "}
                  <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    ${Math.max(0, parseFloat(String(matriculaForm.valor_total)) - (parseFloat(String(matriculaForm.abono)) || 0)).toLocaleString("es-CO")}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setMatriculaOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveMatricula}
              disabled={matriculaSaving}
              className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50"
            >
              {matriculaSaving ? "Guardando..." : "Crear Matrícula"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={abonoOpen}
        onClose={() => setAbonoOpen(false)}
        title={`Abonos — ${abonoAlumno?.nombre} ${abonoAlumno?.apellidos}`}
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
                  <option key={matricula.id} value={matricula.id}>{formatMatriculaLabel(matricula)}</option>
                ))}
              </select>
            </div>
          )}

          {valorTotalAbono > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0a]">
                <p className="text-[10px] text-[#86868b] uppercase tracking-wider mb-1">Valor Curso</p>
                <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  ${valorTotalAbono.toLocaleString("es-CO")}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
                <p className="text-[10px] text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Pagado</p>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  ${totalPagadoAbono.toLocaleString("es-CO")}
                </p>
              </div>
              <div className={`text-center p-3 rounded-xl ${saldoPendienteAbono <= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20"}`}>
                <p className={`text-[10px] uppercase tracking-wider mb-1 ${saldoPendienteAbono <= 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {saldoPendienteAbono <= 0 ? "¡Al día!" : "Pendiente"}
                </p>
                <p className={`text-sm font-semibold ${saldoPendienteAbono <= 0 ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
                  ${Math.max(0, saldoPendienteAbono).toLocaleString("es-CO")}
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] mb-2">
              Historial de pagos
            </p>
            {loadingIngresos ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : abonoIngresosFiltrados.length === 0 ? (
              <p className="text-xs text-[#86868b] text-center py-3 bg-gray-50 dark:bg-[#0a0a0a] rounded-xl">
                Sin pagos registrados
              </p>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {abonoIngresosFiltrados.map((ingreso) => (
                  <div
                    key={ingreso.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0a0a0a]"
                  >
                    <div>
                      <p className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {ingreso.concepto}
                      </p>
                      <p className="text-[10px] text-[#86868b]">
                        {ingreso.fecha} · {metodosPago.find((metodo) => metodo.value === ingreso.metodo_pago)?.label || ingreso.metodo_pago}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400 ml-3 shrink-0">
                      +${ingreso.monto.toLocaleString("es-CO")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b]">
              Registrar nuevo abono
            </p>

            {abonoError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                {abonoError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <option key={metodo.value} value={metodo.value}>{metodo.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Concepto (opcional)</label>
              <input
                type="text"
                placeholder={`Abono — ${abonoAlumno?.nombre} ${abonoAlumno?.apellidos}`}
                value={abonoConcepto}
                onChange={(e) => setAbonoConcepto(e.target.value)}
                className={inputClass}
              />
            </div>

            {valorTotalAbono > 0 && parseFloat(abonoMonto) > 0 && (
              <p className="text-xs text-[#86868b]">
                Saldo pendiente tras abono:{" "}
                <span className={`font-semibold ${(saldoPendienteAbono - parseFloat(abonoMonto)) <= 0 ? "text-green-600" : "text-amber-600"}`}>
                  ${Math.max(0, saldoPendienteAbono - (parseFloat(abonoMonto) || 0)).toLocaleString("es-CO")}
                </span>
              </p>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleSaveAbono}
                disabled={abonoSaving || !abonoMonto}
                className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50"
              >
                {abonoSaving ? "Registrando..." : "Registrar Abono"}
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
