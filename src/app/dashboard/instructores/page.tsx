/**
 * InstructoresPage - Instructor management dashboard page.
 *
 * Provides a full CRUD interface for managing driving-school instructors,
 * backed by a Supabase "instructores" table.  Features include:
 *   - Paginated / searchable data table via <DataTable />
 *   - Create & edit modal with form validation
 *   - Delete confirmation dialog
 *
 * @module dashboard/instructores
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { Instructor, TipoPermiso, EstadoInstructor } from "@/types/database";
import { Plus } from "lucide-react";

/** All driving-licence categories an instructor can specialise in. */
const especialidades: TipoPermiso[] = ["AM", "A1", "A2", "A", "B", "C", "D"];

/** Allowed activity states for an instructor record. */
const estados: EstadoInstructor[] = ["activo", "inactivo"];

/** Blank form used when creating a new instructor or resetting the modal. */
const emptyForm = {
  nombre: "",
  apellidos: "",
  dni: "",
  email: "",
  telefono: "",
  licencia: "",
  especialidad: "B" as TipoPermiso,
  estado: "activo" as EstadoInstructor,
  color: "#0071e3",
};

export default function InstructoresPage() {
  const { perfil } = useAuth();

  // --- State -----------------------------------------------------------
  const [data, setData] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Instructor | null>(null);
  const [deleting, setDeleting] = useState<Instructor | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  // --- Data fetching ----------------------------------------------------

  /** Fetch all instructors from Supabase, ordered by most-recent first. */
  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("instructores").select("*").order("created_at", { ascending: false });
    setData((data as Instructor[]) || []);
    setLoading(false);
  }, []);

  // Re-fetch whenever the authenticated profile becomes available.
  useEffect(() => {
    if (perfil) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  // --- Modal helpers ----------------------------------------------------

  /** Open the modal in "create" mode with a blank form. */
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  /** Open the modal in "edit" mode, pre-filling the form with existing data. */
  const openEdit = (row: Instructor) => {
    setEditing(row);
    setForm({
      nombre: row.nombre,
      apellidos: row.apellidos,
      dni: row.dni,
      email: row.email || "",
      telefono: row.telefono,
      licencia: row.licencia,
      especialidad: row.especialidad,
      estado: row.estado,
      color: row.color,
    });
    setError("");
    setModalOpen(true);
  };

  /** Open the delete-confirmation dialog for the given instructor. */
  const openDelete = (row: Instructor) => {
    setDeleting(row);
    setDeleteOpen(true);
  };

  // --- Save (create / update) -------------------------------------------

  /**
   * Validate the form, then either INSERT or UPDATE the instructor row in
   * Supabase.  Wrapped in try/catch so network-level failures surface as
   * user-visible error messages instead of crashing silently.
   */
  const handleSave = async () => {
    // Client-side required-field validation.
    if (!form.nombre || !form.apellidos || !form.dni || !form.telefono || !form.licencia) {
      setError("Nombre, apellidos, DNI, teléfono y licencia son obligatorios.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const supabase = createClient();

      if (editing) {
        // --- Update existing instructor ---
        const { error: err } = await supabase.from("instructores").update({
          nombre: form.nombre, apellidos: form.apellidos, dni: form.dni,
          email: form.email || null, telefono: form.telefono, licencia: form.licencia,
          especialidad: form.especialidad, estado: form.estado, color: form.color,
        }).eq("id", editing.id);
        if (err) { setError(err.message); setSaving(false); return; }
      } else {
        // --- Create new instructor ---
        if (!perfil) return;
        const { error: err } = await supabase.from("instructores").insert({
          escuela_id: perfil.escuela_id, sede_id: perfil.sede_id, user_id: perfil.id,
          nombre: form.nombre, apellidos: form.apellidos, dni: form.dni,
          email: form.email || null, telefono: form.telefono, licencia: form.licencia,
          especialidad: form.especialidad, estado: form.estado, color: form.color,
        });
        if (err) { setError(err.message); setSaving(false); return; }
      }

      // Success - close modal and refresh the table.
      setSaving(false);
      setModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      // Network or unexpected runtime error.
      const message = err instanceof Error ? err.message : "Error inesperado al guardar.";
      setError(message);
      setSaving(false);
    }
  };

  // --- Delete -----------------------------------------------------------

  /**
   * Delete the currently-selected instructor from Supabase.
   * Wrapped in try/catch so network errors are surfaced to the user.
   */
  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("instructores").delete().eq("id", deleting.id);

      if (err) {
        // Supabase returned a domain-level error (e.g. FK constraint).
        setError(err.message);
        setSaving(false);
        return;
      }

      // Success - close dialog and refresh.
      setSaving(false);
      setDeleteOpen(false);
      setDeleting(null);
      fetchData();
    } catch (err: unknown) {
      // Network or unexpected runtime error.
      const message = err instanceof Error ? err.message : "Error inesperado al eliminar.";
      setError(message);
      setSaving(false);
    }
  };

  // --- Table column definitions -----------------------------------------

  const columns = [
    { key: "nombre" as keyof Instructor, label: "Nombre", render: (r: Instructor) => <span className="font-medium">{r.nombre} {r.apellidos}</span> },
    { key: "dni" as keyof Instructor, label: "DNI" },
    { key: "telefono" as keyof Instructor, label: "Teléfono" },
    { key: "licencia" as keyof Instructor, label: "Licencia" },
    { key: "especialidad" as keyof Instructor, label: "Esp.", render: (r: Instructor) => <span className="px-2 py-0.5 text-xs rounded-full bg-[#0071e3]/10 text-[#0071e3] font-medium">{r.especialidad}</span> },
    {
      key: "estado" as keyof Instructor, label: "Estado", render: (r: Instructor) => {
        const c = r.estado === "activo" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
        return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${c}`}>{r.estado}</span>;
      }
    },
  ];

  /** Shared Tailwind class string for all text inputs / selects in the modal. */
  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]";

  // --- Render -----------------------------------------------------------

  return (
    <div>
      {/* Page header + "New Instructor" button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Instructores</h2>
          <p className="text-sm text-[#86868b] mt-0.5">Gestiona los instructores de tu escuela</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors">
          <Plus size={16} /> Nuevo Instructor
        </button>
      </div>

      {/* Data table card */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6">
        <DataTable columns={columns} data={data} loading={loading} searchPlaceholder="Buscar por nombre o DNI..." searchKeys={["nombre", "apellidos", "dni"]} onEdit={openEdit} onDelete={openDelete} />
      </div>

      {/* Create / Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Instructor" : "Nuevo Instructor"} maxWidth="max-w-xl">
        <div className="space-y-4">
          {/* Inline error banner */}
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

          {/* Row: Nombre + Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Nombre *</label><input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Apellidos *</label><input type="text" value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })} className={inputCls} /></div>
          </div>

          {/* Row: DNI + Telefono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">DNI *</label><input type="text" value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Teléfono *</label><input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className={inputCls} /></div>
          </div>

          {/* Row: Email + Licencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Licencia *</label><input type="text" value={form.licencia} onChange={e => setForm({ ...form, licencia: e.target.value })} className={inputCls} /></div>
          </div>

          {/* Row: Especialidad + Estado + Color */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Especialidad</label>
              <select value={form.especialidad} onChange={e => setForm({ ...form, especialidad: e.target.value as TipoPermiso })} className={inputCls}>
                {especialidades.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-[#86868b] mb-1">Estado</label>
              <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as EstadoInstructor })} className={inputCls}>
                {estados.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-[#86868b] mb-1">Color</label><input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer" /></div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Instructor"}</button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation dialog */}
      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} loading={saving} message={`¿Eliminar a ${deleting?.nombre} ${deleting?.apellidos}?`} />
    </div>
  );
}
