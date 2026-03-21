/**
 * ClasesPage - Pagina de gestion de clases del dashboard.
 *
 * Permite listar, crear, editar y eliminar clases (practicas y teoricas).
 * Los datos se obtienen de Supabase y se muestran en un DataTable reutilizable.
 * Incluye modales para el formulario de creacion/edicion y confirmacion de borrado.
 *
 * Dependencias principales:
 *  - Supabase (base de datos y autenticacion)
 *  - useAuth (perfil del usuario autenticado)
 *  - DataTable, Modal, DeleteConfirm (componentes de UI del dashboard)
 */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { fetchJsonWithRetry } from "@/lib/retry";
import {
  getDashboardCatalogCached,
  getDashboardListCached,
  invalidateDashboardClientCaches,
} from "@/lib/dashboard-client-cache";
import { revalidateTaggedServerCaches } from "@/lib/server-cache-client";
import { buildScopedMutationRevalidationTags } from "@/lib/server-cache-tags";
import type { Clase, TipoClase, EstadoClase, Alumno, Instructor, Vehiculo } from "@/types/database";
import { Plus } from "lucide-react";

const PAGE_SIZE = 10;

/** Opciones validas para el tipo de clase */
const tiposClase: TipoClase[] = ["practica", "teorica"];

/** Opciones validas para el estado de una clase */
const estadosClase: EstadoClase[] = ["programada", "completada", "cancelada", "no_asistio"];

/** Valores por defecto del formulario de clase */
const emptyForm = {
  alumno_id: "",
  instructor_id: "",
  vehiculo_id: "",
  tipo: "practica" as TipoClase,
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  estado: "programada" as EstadoClase,
  notas: "",
};

type ClaseRow = Clase & { alumno_nombre?: string; instructor_nombre?: string };
type ClasesListResponse = {
  totalCount: number;
  rows: ClaseRow[];
};

export default function ClasesPage() {
  const { perfil } = useAuth();
  const escuelaId = perfil?.escuela_id ?? null;

  // Estado principal: lista de clases con nombres resueltos
  const [data, setData] = useState<ClaseRow[]>([]);

  // --- Paginacion server-side ---
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const fetchIdRef = useRef(0);

  // Listas de referencia para los selectores del formulario
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  // Estado de UI
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Clase | null>(null);
  const [deleting, setDeleting] = useState<Clase | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  /**
   * fetchData - Obtiene clases paginadas desde la API server-side.
   */
  const fetchData = useCallback(
    async (page = 0, search = "") => {
      if (!escuelaId) return;

      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      setTableError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (search.trim()) params.set("q", search.trim());

        const payload = await getDashboardListCached<ClasesListResponse>({
          name: "clases-table",
          scope: {
            id: perfil?.id,
            rol: perfil?.rol,
            escuelaId,
            sedeId: perfil?.sede_id,
          },
          params,
          loader: () => fetchJsonWithRetry<ClasesListResponse>(`/api/clases?${params.toString()}`),
        });

        if (fetchId !== fetchIdRef.current) return;

        setData(payload.rows || []);
        setTotalCount(payload.totalCount || 0);
      } catch (fetchError: unknown) {
        if (fetchId !== fetchIdRef.current) return;
        setData([]);
        setTotalCount(0);
        setTableError(
          fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las clases."
        );
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [escuelaId, perfil?.id, perfil?.rol, perfil?.sede_id]
  );

  // Cargar datos cuando el perfil este disponible o cambie la pagina/busqueda
  useEffect(() => {
    if (!escuelaId) return;
    void fetchData(currentPage, searchTerm);
  }, [escuelaId, fetchData, currentPage, searchTerm]);

  useEffect(() => {
    if (!escuelaId) return;

    let cancelled = false;

    const loadCatalogs = async () => {
      const catalogs = await getDashboardCatalogCached<{
        alumnos: Alumno[];
        instructores: Instructor[];
        vehiculos: Vehiculo[];
      }>({
        name: "clases-form",
        scope: {
          id: perfil?.id,
          rol: perfil?.rol,
          escuelaId,
          sedeId: perfil?.sede_id,
        },
        loader: () =>
          fetchJsonWithRetry<{
            alumnos: Alumno[];
            instructores: Instructor[];
            vehiculos: Vehiculo[];
          }>("/api/clases/catalogos"),
      });

      if (cancelled) return;
      setAlumnos(catalogs.alumnos);
      setInstructores(catalogs.instructores);
      setVehiculos(catalogs.vehiculos);
    };

    void loadCatalogs();

    return () => {
      cancelled = true;
    };
  }, [escuelaId, perfil?.id, perfil?.rol, perfil?.sede_id]);

  /** Callback del DataTable server-side: cambio de pagina */
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  /** Callback del DataTable server-side: cambio de busqueda (ya con debounce) */
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(0); // volver a primera pagina al buscar
  }, []);

  /** Abre el modal en modo creacion con el formulario vacio */
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  /** Abre el modal en modo edicion con los datos de la clase seleccionada */
  const openEdit = (row: Clase) => {
    setEditing(row);
    setForm({
      alumno_id: row.alumno_id,
      instructor_id: row.instructor_id || "",
      vehiculo_id: row.vehiculo_id || "",
      tipo: row.tipo,
      fecha: row.fecha,
      hora_inicio: row.hora_inicio,
      hora_fin: row.hora_fin,
      estado: row.estado,
      notas: row.notas || "",
    });
    setError("");
    setModalOpen(true);
  };

  /** Abre el dialogo de confirmacion de borrado */
  const openDelete = (row: Clase) => {
    setDeleting(row);
    setDeleteOpen(true);
  };

  /**
   * handleSave - Guarda (crea o actualiza) una clase en Supabase.
   * Valida campos obligatorios antes de enviar. Envuelto en try/catch
   * para capturar errores de red inesperados.
   */
  const handleSave = async () => {
    // Validacion de campos obligatorios
    if (!form.alumno_id || !form.fecha || !form.hora_inicio || !form.hora_fin) {
      setError("Alumno, fecha, hora inicio y hora fin son obligatorios.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const supabase = createClient();

      // Construir el payload con campos opcionales como null
      const payload = {
        alumno_id: form.alumno_id,
        instructor_id: form.instructor_id || null,
        vehiculo_id: form.vehiculo_id || null,
        tipo: form.tipo,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        estado: form.estado,
        notas: form.notas || null,
      };

      if (editing) {
        // Modo edicion: actualizar la clase existente
        const { error: err } = await supabase.from("clases").update(payload).eq("id", editing.id);
        if (err) {
          setError(err.message);
          setSaving(false);
          return;
        }
      } else {
        // Modo creacion: insertar nueva clase con datos de la escuela/sede del usuario
        if (!perfil?.escuela_id) {
          setError("No se encontró una escuela activa para programar la clase.");
          setSaving(false);
          return;
        }

        let sedeId = perfil.sede_id;
        if (!sedeId) {
          const { data: sedeData } = await supabase
            .from("sedes")
            .select("id")
            .eq("escuela_id", perfil.escuela_id)
            .order("es_principal", { ascending: false })
            .limit(1)
            .maybeSingle();
          sedeId = sedeData?.id ?? null;
        }

        if (!sedeId) {
          setError("No se encontró una sede activa para programar la clase.");
          setSaving(false);
          return;
        }

        const { error: err } = await supabase.from("clases").insert({
          ...payload,
          escuela_id: perfil.escuela_id,
          sede_id: sedeId,
          user_id: perfil.id,
        });
        if (err) {
          setError(err.message);
          setSaving(false);
          return;
        }
      }

      setSaving(false);
      setModalOpen(false);
      invalidateDashboardClientCaches([
        "dashboard-list:clases-table:",
        "dashboard-catalog:clases-form:",
        "dashboard-summary:",
      ]);
      void revalidateTaggedServerCaches(
        buildScopedMutationRevalidationTags({
          scope: { escuelaId: perfil?.escuela_id, sedeId: perfil?.sede_id },
          includeFinance: false,
          includeDashboard: true,
        })
      );
      fetchData(currentPage, searchTerm);
    } catch (networkError) {
      // Capturar errores de red u otros fallos inesperados
      setError(
        networkError instanceof Error
          ? networkError.message
          : "Error de conexion inesperado al guardar la clase."
      );
      setSaving(false);
    }
  };

  /**
   * handleDelete - Elimina una clase de Supabase.
   * Envuelto en try/catch para manejar errores de red o de la base de datos.
   */
  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);

    try {
      const { error: err } = await createClient().from("clases").delete().eq("id", deleting.id);
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
      setSaving(false);
      setDeleteOpen(false);
      setDeleting(null);
      invalidateDashboardClientCaches(["dashboard-list:clases-table:", "dashboard-summary:"]);
      void revalidateTaggedServerCaches(
        buildScopedMutationRevalidationTags({
          scope: { escuelaId: perfil?.escuela_id, sedeId: perfil?.sede_id },
          includeFinance: false,
          includeDashboard: true,
        })
      );
      fetchData(currentPage, searchTerm);
    } catch (networkError) {
      // Capturar errores de red u otros fallos inesperados
      setError(
        networkError instanceof Error
          ? networkError.message
          : "Error de conexion inesperado al eliminar la clase."
      );
      setSaving(false);
    }
  };

  /** Mapa de colores por estado para los badges de la tabla */
  const estadoColors: Record<string, string> = {
    programada: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completada: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelada: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    no_asistio: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  };

  /** Definicion de columnas para el DataTable */
  const columns = [
    { key: "fecha" as keyof Clase, label: "Fecha" },
    {
      key: "hora_inicio" as keyof Clase,
      label: "Horario",
      render: (r: Clase) => (
        <span>
          {r.hora_inicio?.slice(0, 5)} - {r.hora_fin?.slice(0, 5)}
        </span>
      ),
    },
    {
      key: "alumno_nombre" as string,
      label: "Alumno",
      render: (r: Clase & { alumno_nombre?: string }) => <span>{r.alumno_nombre}</span>,
    },
    {
      key: "instructor_nombre" as string,
      label: "Instructor",
      render: (r: Clase & { instructor_nombre?: string }) => <span>{r.instructor_nombre}</span>,
    },
    {
      key: "tipo" as keyof Clase,
      label: "Tipo",
      render: (r: Clase) => (
        <span className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-xs font-medium text-[#0071e3]">
          {r.tipo}
        </span>
      ),
    },
    {
      key: "estado" as keyof Clase,
      label: "Estado",
      render: (r: Clase) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estadoColors[r.estado]}`}>
          {r.estado.replace("_", " ")}
        </span>
      ),
    },
  ];

  /** Clase CSS reutilizable para todos los inputs del formulario */
  const inputCls = "apple-input";

  return (
    <div>
      {/* Cabecera con titulo y boton de nueva clase */}
      <div className="animate-fade-in mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Clases
          </h2>
          <p className="mt-2 text-lg font-medium text-[#86868b]">Programa y gestiona las clases</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED]"
        >
          <Plus size={16} /> Nueva Clase
        </button>
      </div>

      {/* Tabla principal de clases */}
      <div className="animate-fade-in rounded-3xl border border-gray-100 bg-white p-6 shadow-sm delay-100 sm:p-8 dark:border-gray-800 dark:bg-[#1d1d1f]">
        {tableError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
            {tableError}
          </div>
        )}
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          searchPlaceholder="Buscar por fecha, tipo, estado..."
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
      </div>

      {/* Modal de creacion/edicion de clase */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Clase" : "Nueva Clase"}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {/* Mensaje de error si existe */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
              {error}
            </p>
          )}

          {/* Selector de alumno (obligatorio) */}
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Alumno *</label>
            <select
              value={form.alumno_id}
              onChange={(e) => setForm({ ...form, alumno_id: e.target.value })}
              className={inputCls}
            >
              <option value="">Seleccionar alumno...</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} {a.apellidos}
                </option>
              ))}
            </select>
          </div>

          {/* Selectores de instructor y vehiculo (opcionales) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Instructor</label>
              <select
                value={form.instructor_id}
                onChange={(e) => setForm({ ...form, instructor_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Sin asignar</option>
                {instructores.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} {i.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Vehículo</label>
              <select
                value={form.vehiculo_id}
                onChange={(e) => setForm({ ...form, vehiculo_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Sin asignar</option>
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} ({v.matricula})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selectores de tipo y estado */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoClase })}
                className={inputCls}
              >
                {tiposClase.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoClase })}
                className={inputCls}
              >
                {estadosClase.map((e) => (
                  <option key={e} value={e}>
                    {e.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Campos de fecha y horario (obligatorios) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Fecha *</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Hora inicio *</label>
              <input
                type="time"
                value={form.hora_inicio}
                onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Hora fin *</label>
              <input
                type="time"
                value={form.hora_fin}
                onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Campo de notas (opcional) */}
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Botones de accion del formulario */}
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
              {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Clase"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Dialogo de confirmacion de eliminacion */}
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={saving}
        message="¿Eliminar esta clase?"
      />
    </div>
  );
}
