/**
 * InstructoresPage - Instructor management dashboard page.
 *
 * Provides a full CRUD interface for managing driving-school instructors,
 * backed by a Supabase "instructores" table.  Features include:
 *   - Paginated / searchable data table via <DataTable />
 *   - Create & edit modal with form validation
 *   - Delete confirmation dialog
 *   - Multi-select specialties filtered to school's enabled categories
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
import type { Instructor, EstadoInstructor } from "@/types/database";
import { Plus } from "lucide-react";

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
  especialidades: [] as string[],
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
  const [categoriasEscuela, setCategoriasEscuela] = useState<string[]>([]);

  // --- Data fetching ----------------------------------------------------

  /** Fetch all instructors from Supabase, ordered by most-recent first. */
  const fetchData = useCallback(async () => {
    if (!perfil?.escuela_id) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("instructores")
      .select("id, nombre, apellidos, dni, telefono, licencia, especialidad, especialidades, estado, color, created_at")
      .eq("escuela_id", perfil.escuela_id)
      .order("created_at", { ascending: false });
    setData((data as Instructor[]) || []);
    setLoading(false);
  }, [perfil?.escuela_id]);

  // Re-fetch whenever the authenticated profile becomes available.
  // Also load school's enabled categories.
  useEffect(() => {
    if (!perfil) return;
    fetchData();

    const loadCategorias = async () => {
      if (!perfil.escuela_id) return;
      const supabase = createClient();
      const { data: escuela } = await supabase
        .from("escuelas")
        .select("categorias")
        .eq("id", perfil.escuela_id)
        .single();
      if (escuela?.categorias) setCategoriasEscuela(escuela.categorias);
    };
    loadCategorias();
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
      especialidades: row.especialidades ?? (row.especialidad ? [row.especialidad] : []),
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

  /** Toggle a category in the especialidades array. */
  const toggleEspecialidad = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      especialidades: prev.especialidades.includes(cat)
        ? prev.especialidades.filter((e) => e !== cat)
        : [...prev.especialidades, cat],
    }));
  };

  // --- Save (create / update) -------------------------------------------

  const handleSave = async () => {
    if (!form.nombre || !form.apellidos || !form.dni || !form.telefono || !form.licencia) {
      setError("Nombre, apellidos, DNI, teléfono y licencia son obligatorios.");
      return;
    }
    if (form.especialidades.length === 0) {
      setError("Selecciona al menos una especialidad.");
      return;
    }
    setSaving(true);
    setError("");

    // Use first selected specialty as the legacy single-value field
    const especialidadPrincipal = form.especialidades[0];

    try {
      const supabase = createClient();

      if (editing) {
        const { error: err } = await supabase.from("instructores").update({
          nombre: form.nombre, apellidos: form.apellidos, dni: form.dni,
          email: form.email || null, telefono: form.telefono, licencia: form.licencia,
          especialidad: especialidadPrincipal,
          especialidades: form.especialidades,
          estado: form.estado, color: form.color,
        }).eq("id", editing.id);
        if (err) { setError(err.message); setSaving(false); return; }
      } else {
        if (!perfil) return;

        let sedeId = perfil.sede_id;
        if (!sedeId && perfil.escuela_id) {
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
          setError("No se encontró una sede asignada. Contacta al administrador.");
          setSaving(false);
          return;
        }

        // Crear cuenta de acceso para el instructor (email=cédula, password=cédula)
        const authRes = await fetch("/api/crear-instructor-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: `${form.nombre} ${form.apellidos}`,
            email: form.email || null,
            dni: form.dni,
            escuela_id: perfil.escuela_id,
            sede_id: sedeId,
          }),
        });
        const authJson = await authRes.json();
        if (!authRes.ok) {
          setError(authJson.error || "Error al crear la cuenta del instructor.");
          setSaving(false);
          return;
        }

        const { error: err } = await supabase.from("instructores").insert({
          escuela_id: perfil.escuela_id, sede_id: sedeId, user_id: authJson.user_id,
          nombre: form.nombre, apellidos: form.apellidos, dni: form.dni,
          email: form.email || null, telefono: form.telefono, licencia: form.licencia,
          especialidad: especialidadPrincipal,
          especialidades: form.especialidades,
          estado: form.estado, color: form.color,
        });
        if (err) { setError(err.message); setSaving(false); return; }
      }

      setSaving(false);
      setModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado al guardar.";
      setError(message);
      setSaving(false);
    }
  };

  // --- Delete -----------------------------------------------------------

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("instructores").delete().eq("id", deleting.id);

      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }

      setSaving(false);
      setDeleteOpen(false);
      setDeleting(null);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado al eliminar.";
      setError(message);
      setSaving(false);
    }
  };

  // --- Table column definitions -----------------------------------------

  const columns = [
    {
      key: "nombre" as keyof Instructor, label: "Nombre",
      render: (r: Instructor) => <span className="font-medium">{r.nombre} {r.apellidos}</span>
    },
    { key: "dni" as keyof Instructor, label: "DNI" },
    { key: "telefono" as keyof Instructor, label: "Teléfono" },
    { key: "licencia" as keyof Instructor, label: "Licencia" },
    {
      key: "especialidades" as keyof Instructor, label: "Especialidades",
      render: (r: Instructor) => {
        const cats = r.especialidades ?? (r.especialidad ? [r.especialidad] : []);
        return (
          <div className="flex flex-wrap gap-1">
            {cats.map((c) => (
              <span key={c} className="px-2 py-0.5 text-xs rounded-full bg-[#0071e3]/10 text-[#0071e3] font-medium">{c}</span>
            ))}
          </div>
        );
      }
    },
    {
      key: "estado" as keyof Instructor, label: "Estado",
      render: (r: Instructor) => {
        const c = r.estado === "activo"
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
        return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${c}`}>{r.estado}</span>;
      }
    },
  ];

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]";

  // --- Render -----------------------------------------------------------

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Instructores</h2>
          <p className="text-sm text-[#86868b] mt-0.5">Gestiona los instructores de tu escuela</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors">
          <Plus size={16} /> Nuevo Instructor
        </button>
      </div>

      {/* Data table */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6">
        <DataTable columns={columns} data={data} loading={loading} searchPlaceholder="Buscar por nombre o DNI..." searchKeys={["nombre", "apellidos", "dni"]} onEdit={openEdit} onDelete={openDelete} />
      </div>

      {/* Create / Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Instructor" : "Nuevo Instructor"} maxWidth="max-w-xl">
        <div className="space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

          {/* Nombre + Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Nombre *</label><input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Apellidos *</label><input type="text" value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })} className={inputCls} /></div>
          </div>

          {/* DNI + Telefono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">DNI *</label><input type="text" value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Teléfono *</label><input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className={inputCls} /></div>
          </div>

          {/* Email + Licencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Licencia *</label><input type="text" value={form.licencia} onChange={e => setForm({ ...form, licencia: e.target.value })} className={inputCls} /></div>
          </div>

          {/* Especialidades (checkboxes de categorías de la escuela) */}
          <div>
            <label className="block text-xs text-[#86868b] mb-2">Especialidades *</label>
            {categoriasEscuela.length === 0 ? (
              <p className="text-xs text-[#86868b] italic">La escuela no tiene categorías configuradas.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categoriasEscuela.map((cat) => {
                  const selected = form.especialidades.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleEspecialidad(cat)}
                      className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
                        selected
                          ? "bg-[#0071e3] text-white border-[#0071e3]"
                          : "bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] border-gray-200 dark:border-gray-700 hover:border-[#0071e3]"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Estado + Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Estado</label>
              <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as EstadoInstructor })} className={inputCls}>
                {estados.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-[#86868b] mb-1">Color</label>
              <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Instructor"}</button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} loading={saving} message={`¿Eliminar a ${deleting?.nombre} ${deleting?.apellidos}?`} />
    </div>
  );
}
