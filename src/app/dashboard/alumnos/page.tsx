/**
 * @file AlumnosPage - Página de gestión de alumnos del dashboard.
 *
 * Esta página permite al usuario (administrador o profesor) realizar operaciones
 * CRUD completas sobre los registros de alumnos almacenados en Supabase:
 *   - Listar todos los alumnos en una tabla con búsqueda.
 *   - Crear un nuevo alumno mediante un modal con formulario.
 *   - Editar un alumno existente reutilizando el mismo modal.
 *   - Eliminar un alumno con confirmación previa y manejo de errores.
 *
 * Los errores de guardado y eliminación se muestran en la interfaz mediante
 * el estado `error` y `deleteError`, respectivamente, evitando el uso de `alert()`.
 *
 * @module dashboard/alumnos
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { Alumno, TipoPermiso, EstadoAlumno } from "@/types/database";
import { Plus } from "lucide-react";

/** Tipos de permiso de conducir disponibles en España. */
const tiposPermiso: TipoPermiso[] = ["AM", "A1", "A2", "A", "B", "C", "D"];

/** Posibles estados en los que puede encontrarse un alumno. */
const estadosAlumno: EstadoAlumno[] = ["activo", "inactivo", "graduado"];

/**
 * Formulario vacío utilizado como valor inicial al crear un nuevo alumno
 * o al resetear el formulario.
 */
const emptyForm = {
  nombre: "",
  apellidos: "",
  dni: "",
  email: "",
  telefono: "",
  fecha_nacimiento: "",
  direccion: "",
  tipo_permiso: "B" as TipoPermiso,
  estado: "activo" as EstadoAlumno,
  notas: "",
};

/**
 * Componente principal de la página de Alumnos.
 *
 * Gestiona el estado local para la lista de alumnos, modales de creación/edición,
 * confirmación de eliminación, y mensajes de error tanto para guardado como
 * para eliminación.
 *
 * @returns JSX.Element - La interfaz completa de gestión de alumnos.
 */
export default function AlumnosPage() {
  // ─── Hook de autenticación para obtener el perfil del usuario logueado ───
  const { perfil } = useAuth();

  // ─── Estado principal: lista de alumnos y flag de carga ───
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Estado de modales: apertura/cierre de modal y diálogo de eliminación ───
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ─── Referencias al alumno que se está editando o eliminando ───
  const [editing, setEditing] = useState<Alumno | null>(null);
  const [deleting, setDeleting] = useState<Alumno | null>(null);

  // ─── Estado de guardado: indica si hay una operación en curso ───
  const [saving, setSaving] = useState(false);

  // ─── Estado del formulario de creación/edición ───
  const [form, setForm] = useState(emptyForm);

  // ─── Errores: uno para el modal de guardar, otro para el flujo de eliminación ───
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  /**
   * Obtiene la lista de alumnos desde Supabase, ordenados por fecha de creación
   * descendente (más recientes primero). Actualiza el estado local al completar.
   */
  const fetchAlumnos = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("alumnos")
      .select("*")
      .order("created_at", { ascending: false });
    setAlumnos((data as Alumno[]) || []);
    setLoading(false);
  }, []);

  /**
   * Efecto que carga los alumnos una vez que el perfil del usuario
   * está disponible (es decir, el usuario está autenticado).
   */
  useEffect(() => {
    if (perfil) {
      fetchAlumnos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  /**
   * Abre el modal en modo "creación": resetea el formulario y limpia errores.
   */
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  /**
   * Abre el modal en modo "edición": carga los datos del alumno seleccionado
   * en el formulario y limpia errores previos.
   *
   * @param alumno - El alumno cuyos datos se van a editar.
   */
  const openEdit = (alumno: Alumno) => {
    setEditing(alumno);
    setForm({
      nombre: alumno.nombre,
      apellidos: alumno.apellidos,
      dni: alumno.dni,
      email: alumno.email || "",
      telefono: alumno.telefono,
      fecha_nacimiento: alumno.fecha_nacimiento || "",
      direccion: alumno.direccion || "",
      tipo_permiso: alumno.tipo_permiso,
      estado: alumno.estado,
      notas: alumno.notas || "",
    });
    setError("");
    setModalOpen(true);
  };

  /**
   * Abre el diálogo de confirmación de eliminación para el alumno dado.
   * Limpia cualquier error de eliminación anterior.
   *
   * @param alumno - El alumno que se desea eliminar.
   */
  const openDelete = (alumno: Alumno) => {
    setDeleting(alumno);
    setDeleteError("");
    setDeleteOpen(true);
  };

  /**
   * Guarda un alumno (creación o edición) en Supabase.
   *
   * Valida que los campos obligatorios estén completos antes de enviar la
   * petición. En caso de error, lo muestra en el estado `error` dentro del modal.
   */
  const handleSave = async () => {
    // Validación de campos obligatorios
    if (!form.nombre || !form.apellidos || !form.dni || !form.telefono) {
      setError("Nombre, apellidos, DNI y teléfono son obligatorios.");
      return;
    }

    setSaving(true);
    setError("");
    const supabase = createClient();

    try {
      if (editing) {
        // Actualizar alumno existente
        const { error } = await supabase
          .from("alumnos")
          .update(form)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        // Insertar nuevo alumno
        const { error } = await supabase.from("alumnos").insert([form]);
        if (error) throw error;
      }
      // Cerrar modal y refrescar la lista tras un guardado exitoso
      setModalOpen(false);
      fetchAlumnos();
    } catch (err: unknown) {
      // Mostrar el error en el modal en lugar de usar alert()
      const message = err instanceof Error ? err.message : "Error al guardar";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Elimina el alumno seleccionado de Supabase tras la confirmación del usuario.
   *
   * Los errores se muestran mediante el estado `deleteError` para que se
   * rendericen junto al diálogo de confirmación, en lugar de usar `alert()`.
   */
  const handleDelete = async () => {
    if (!deleting) return;

    setSaving(true);
    setDeleteError("");

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("alumnos")
        .delete()
        .eq("id", deleting.id);
      if (error) throw error;

      // Eliminación exitosa: cerrar diálogo y refrescar la lista
      setDeleteOpen(false);
      setDeleting(null);
      fetchAlumnos();
    } catch (err: unknown) {
      // Mostrar error en la UI en lugar de alert()
      const message = err instanceof Error ? err.message : "Error al eliminar el alumno";
      setDeleteError(message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Definición de columnas para el componente DataTable.
   * Cada columna puede tener una función `render` personalizada para
   * dar formato visual (badges, colores, etc.) a los datos.
   */
  const columns = [
    {
      key: "nombre" as keyof Alumno,
      label: "Nombre",
      /** Renderiza nombre completo (nombre + apellidos) en negrita. */
      render: (row: Alumno) => (
        <span className="font-medium">
          {row.nombre} {row.apellidos}
        </span>
      ),
    },
    { key: "dni" as keyof Alumno, label: "DNI" },
    { key: "telefono" as keyof Alumno, label: "Teléfono" },
    {
      key: "tipo_permiso" as keyof Alumno,
      label: "Permiso",
      /** Renderiza el tipo de permiso como badge azul. */
      render: (row: Alumno) => (
        <span className="px-2 py-0.5 text-xs rounded-full bg-[#0071e3]/10 text-[#0071e3] font-medium">
          {row.tipo_permiso}
        </span>
      ),
    },
    {
      key: "estado" as keyof Alumno,
      label: "Estado",
      /**
       * Renderiza el estado del alumno como badge con colores semánticos:
       *   - activo: verde
       *   - inactivo: gris
       *   - graduado: púrpura
       */
      render: (row: Alumno) => {
        const colors: Record<string, string> = {
          activo: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
          inactivo: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
          graduado: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        };
        return (
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${colors[row.estado]}`}>
            {row.estado}
          </span>
        );
      },
    },
  ];

  // ─── Renderizado principal de la página ───
  return (
    <div>
      {/* ── Cabecera: título de la sección y botón para crear nuevo alumno ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Alumnos
          </h2>
          <p className="text-sm text-[#86868b] mt-0.5">
            Gestiona los alumnos de tu escuela
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"
        >
          <Plus size={16} />
          Nuevo Alumno
        </button>
      </div>

      {/* ── Tabla de alumnos con búsqueda integrada ── */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6">
        <DataTable
          columns={columns}
          data={alumnos}
          loading={loading}
          searchPlaceholder="Buscar por nombre o DNI..."
          searchKeys={["nombre", "apellidos", "dni"]}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      </div>

      {/* ── Modal de Crear/Editar alumno ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Alumno" : "Nuevo Alumno"}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {/* Mensaje de error de validación o guardado */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Fila: Nombre y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#86868b] mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#86868b] mb-1">
                Apellidos *
              </label>
              <input
                type="text"
                value={form.apellidos}
                onChange={(e) =>
                  setForm({ ...form, apellidos: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
              />
            </div>
          </div>

          {/* Fila: DNI y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#86868b] mb-1">
                DNI *
              </label>
              <input
                type="text"
                value={form.dni}
                onChange={(e) => setForm({ ...form, dni: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#86868b] mb-1">
                Teléfono *
              </label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) =>
                  setForm({ ...form, telefono: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
              />
            </div>
          </div>

          {/* Fila: Email y Fecha de Nacimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#86868b] mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#86868b] mb-1">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                value={form.fecha_nacimiento}
                onChange={(e) =>
                  setForm({ ...form, fecha_nacimiento: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
              />
            </div>
          </div>

          {/* Campo: Dirección (ancho completo) */}
          <div>
            <label className="block text-xs text-[#86868b] mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) =>
                setForm({ ...form, direccion: e.target.value })
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
            />
          </div>

          {/* Fila: Tipo de Permiso y Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#86868b] mb-1">
                Tipo de Permiso
              </label>
              <select
                value={form.tipo_permiso}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tipo_permiso: e.target.value as TipoPermiso,
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
              >
                {tiposPermiso.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#86868b] mb-1">
                Estado
              </label>
              <select
                value={form.estado}
                onChange={(e) =>
                  setForm({
                    ...form,
                    estado: e.target.value as EstadoAlumno,
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
              >
                {estadosAlumno.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Campo: Notas (textarea, ancho completo) */}
          <div>
            <label className="block text-xs text-[#86868b] mb-1">Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none"
            />
          </div>

          {/* Botones de acción del formulario: Cancelar y Guardar */}
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
              {saving
                ? "Guardando..."
                : editing
                  ? "Guardar Cambios"
                  : "Crear Alumno"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Mensaje de error de eliminación (se muestra sobre el diálogo) ── */}
      {deleteError && deleteOpen && (
        <div className="fixed inset-x-0 top-4 z-[60] flex justify-center">
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg shadow-lg border border-red-200 dark:border-red-800">
            {deleteError}
          </p>
        </div>
      )}

      {/* ── Diálogo de confirmación de eliminación ── */}
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError("");
        }}
        onConfirm={handleDelete}
        loading={saving}
        message={`¿Eliminar a ${deleting?.nombre} ${deleting?.apellidos}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
