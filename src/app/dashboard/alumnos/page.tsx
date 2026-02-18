"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { Alumno, TipoPermiso, EstadoAlumno } from "@/types/database";
import { Plus } from "lucide-react";

const tiposPermiso: TipoPermiso[] = ["AM", "A1", "A2", "A", "B", "C", "D"];
const estadosAlumno: EstadoAlumno[] = ["activo", "inactivo", "graduado"];

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

export default function AlumnosPage() {
  const { perfil } = useAuth();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Alumno | null>(null);
  const [deleting, setDeleting] = useState<Alumno | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const fetchAlumnos = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("alumnos")
      .select("*")
      .order("created_at", { ascending: false });
    setAlumnos((data as Alumno[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (perfil) fetchAlumnos();
  }, [perfil, fetchAlumnos]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

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

  const openDelete = (alumno: Alumno) => {
    setDeleting(alumno);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.apellidos || !form.dni || !form.telefono) {
      setError("Nombre, apellidos, DNI y teléfono son obligatorios.");
      return;
    }

    setSaving(true);
    setError("");
    const supabase = createClient();

    if (editing) {
      // Actualizar
      const { error: err } = await supabase
        .from("alumnos")
        .update({
          nombre: form.nombre,
          apellidos: form.apellidos,
          dni: form.dni,
          email: form.email || null,
          telefono: form.telefono,
          fecha_nacimiento: form.fecha_nacimiento || null,
          direccion: form.direccion || null,
          tipo_permiso: form.tipo_permiso,
          estado: form.estado,
          notas: form.notas || null,
        })
        .eq("id", editing.id);

      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    } else {
      // Crear
      if (!perfil) return;
      const { error: err } = await supabase.from("alumnos").insert({
        escuela_id: perfil.escuela_id,
        sede_id: perfil.sede_id,
        user_id: perfil.id,
        nombre: form.nombre,
        apellidos: form.apellidos,
        dni: form.dni,
        email: form.email || null,
        telefono: form.telefono,
        fecha_nacimiento: form.fecha_nacimiento || null,
        direccion: form.direccion || null,
        tipo_permiso: form.tipo_permiso,
        estado: form.estado,
        notas: form.notas || null,
      });

      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setModalOpen(false);
    fetchAlumnos();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("alumnos").delete().eq("id", deleting.id);
    setSaving(false);
    setDeleteOpen(false);
    setDeleting(null);
    fetchAlumnos();
  };

  const columns = [
    {
      key: "nombre" as keyof Alumno,
      label: "Nombre",
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
      render: (row: Alumno) => (
        <span className="px-2 py-0.5 text-xs rounded-full bg-[#0071e3]/10 text-[#0071e3] font-medium">
          {row.tipo_permiso}
        </span>
      ),
    },
    {
      key: "estado" as keyof Alumno,
      label: "Estado",
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

  return (
    <div>
      {/* Header */}
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

      {/* Tabla */}
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

      {/* Modal Crear/Editar */}
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

          <div>
            <label className="block text-xs text-[#86868b] mb-1">Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none"
            />
          </div>

          {/* Botones */}
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

      {/* Confirmar eliminación */}
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={saving}
        message={`¿Eliminar a ${deleting?.nombre} ${deleting?.apellidos}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
