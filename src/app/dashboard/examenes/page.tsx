/**
 * @file ExamenesPage - Exam management dashboard page
 * @description Provides a full CRUD interface for managing student exams (examenes).
 *   Users can create, edit, and delete exam records, including exam type (teorico/practico),
 *   date, time, result status, number of attempts, and notes. Data is persisted via Supabase
 *   and scoped to the authenticated user's school and campus (escuela/sede).
 * @module dashboard/examenes
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { Examen, TipoExamen, ResultadoExamen, Alumno } from "@/types/database";
import { Plus } from "lucide-react";

/** Available exam types for the tipo selector */
const tipos: TipoExamen[] = ["teorico", "practico"];

/** Available result statuses for the resultado selector */
const resultados: ResultadoExamen[] = ["pendiente", "aprobado", "suspendido"];

/** Default empty form values used when creating a new exam or resetting the form */
const emptyForm = {
  alumno_id: "", tipo: "teorico" as TipoExamen, fecha: "", hora: "",
  resultado: "pendiente" as ResultadoExamen, intentos: "1", notas: "",
};

export default function ExamenesPage() {
  // Authentication context – provides the current user profile
  const { perfil } = useAuth();

  // Exam data enriched with the student's full name for display
  const [data, setData] = useState<(Examen & { alumno_nombre?: string })[]>([]);

  // List of students used to populate the alumno selector dropdown
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);

  // Loading state for the initial data fetch
  const [loading, setLoading] = useState(true);

  // Modal visibility toggles
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Currently selected exam for editing or deletion
  const [editing, setEditing] = useState<Examen | null>(null);
  const [deleting, setDeleting] = useState<Examen | null>(null);

  // Tracks whether a save/delete operation is in progress
  const [saving, setSaving] = useState(false);

  // Controlled form state for the create/edit modal
  const [form, setForm] = useState(emptyForm);

  // User-facing error message displayed inside the modal
  const [error, setError] = useState("");

  /**
   * Fetches all exams and students from Supabase, builds a lookup map
   * to attach student names to each exam record, and updates component state.
   */
  const fetchData = useCallback(async () => {
    const supabase = createClient();

    // Fetch exams (newest first) and student names in parallel
    const [examenesRes, alumnosRes] = await Promise.all([
      supabase.from("examenes").select("*").order("fecha", { ascending: false }),
      supabase.from("alumnos").select("id, nombre, apellidos"),
    ]);

    // Build an id -> full-name map for quick lookup when enriching exam rows
    const alumnosMap = new Map(
      (alumnosRes.data || []).map((a: { id: string; nombre: string; apellidos: string }) => [a.id, `${a.nombre} ${a.apellidos}`])
    );

    // Enrich each exam record with a human-readable student name
    const examenes = ((examenesRes.data as Examen[]) || []).map(e => ({ ...e, alumno_nombre: alumnosMap.get(e.alumno_id) || "—" }));

    setData(examenes);
    setAlumnos((alumnosRes.data as Alumno[]) || []);
    setLoading(false);
  }, []);

  // Trigger data fetch once the user profile is available
  useEffect(() => {
    if (perfil) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  /** Opens the create-exam modal with a blank form */
  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(""); setModalOpen(true); };

  /** Opens the edit-exam modal, pre-populating the form with the selected row's data */
  const openEdit = (row: Examen) => {
    setEditing(row);
    setForm({ alumno_id: row.alumno_id, tipo: row.tipo, fecha: row.fecha, hora: row.hora || "", resultado: row.resultado, intentos: row.intentos.toString(), notas: row.notas || "" });
    setError(""); setModalOpen(true);
  };

  /** Opens the delete confirmation dialog for the selected exam */
  const openDelete = (row: Examen) => { setDeleting(row); setDeleteOpen(true); };

  /**
   * Validates the form, then creates or updates an exam record in Supabase.
   * Handles both Supabase errors and unexpected network/runtime errors.
   */
  const handleSave = async () => {
    // Validate required fields before attempting the save
    if (!form.alumno_id || !form.fecha) { setError("Alumno y fecha son obligatorios."); return; }
    setSaving(true); setError("");

    try {
      const supabase = createClient();

      // Build the payload from the controlled form state
      const payload = { alumno_id: form.alumno_id, tipo: form.tipo, fecha: form.fecha, hora: form.hora || null, resultado: form.resultado, intentos: parseInt(form.intentos) || 1, notas: form.notas || null };

      if (editing) {
        // Update existing exam record
        const { error: err } = await supabase.from("examenes").update(payload).eq("id", editing.id);
        if (err) { setError(err.message); setSaving(false); return; }
      } else {
        // Insert new exam record, associating it with the user's school and campus
        if (!perfil) return;
        const { error: err } = await supabase.from("examenes").insert({ ...payload, escuela_id: perfil.escuela_id, sede_id: perfil.sede_id, user_id: perfil.id });
        if (err) { setError(err.message); setSaving(false); return; }
      }

      setSaving(false); setModalOpen(false); fetchData();
    } catch (networkError) {
      // Catch unexpected network or runtime errors not handled by Supabase client
      setError(networkError instanceof Error ? networkError.message : "Error de red inesperado. Inténtalo de nuevo.");
      setSaving(false);
    }
  };

  /**
   * Deletes the currently selected exam record from Supabase.
   * Wrapped in try/catch to handle network or unexpected errors gracefully.
   */
  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);

    try {
      const { error: err } = await createClient().from("examenes").delete().eq("id", deleting.id);

      if (err) {
        // Surface Supabase-level errors to the user
        setError(err.message);
        setSaving(false);
        return;
      }

      setSaving(false); setDeleteOpen(false); setDeleting(null); fetchData();
    } catch (networkError) {
      // Catch unexpected network or runtime errors during deletion
      setError(networkError instanceof Error ? networkError.message : "Error al eliminar el examen. Inténtalo de nuevo.");
      setSaving(false);
    }
  };

  /** Color classes for each resultado badge, supporting both light and dark themes */
  const resultadoColors: Record<string, string> = {
    pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    aprobado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    suspendido: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  /** Column definitions for the DataTable component */
  const columns = [
    { key: "fecha" as keyof Examen, label: "Fecha" },
    { key: "alumno_nombre" as string, label: "Alumno", render: (r: Examen & { alumno_nombre?: string }) => <span>{r.alumno_nombre}</span> },
    { key: "tipo" as keyof Examen, label: "Tipo", render: (r: Examen) => <span className="px-2 py-0.5 text-xs rounded-full bg-[#0071e3]/10 text-[#0071e3] font-medium">{r.tipo}</span> },
    { key: "intentos" as keyof Examen, label: "Intentos" },
    { key: "resultado" as keyof Examen, label: "Resultado", render: (r: Examen) => <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${resultadoColors[r.resultado]}`}>{r.resultado}</span> },
  ];

  /** Shared Tailwind classes for all form inputs and selects */
  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]";

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[#f5f5f7] dark:bg-[#1d1d1f] transition-colors duration-300">
      <div className="w-full max-w-4xl px-4 py-8">
        {/* Page header with title and create button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Exámenes</h2>
            <p className="text-sm text-[#86868b] mt-0.5">Gestiona los exámenes de tus alumnos</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"><Plus size={16} /> Nuevo Examen</button>
        </div>

        {/* Main data table card */}
        <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl p-4 sm:p-6 shadow-lg">
          <DataTable columns={columns} data={data} loading={loading} searchPlaceholder="Buscar por fecha..." searchKeys={["fecha"]} onEdit={openEdit} onDelete={openDelete} />
        </div>

        {/* Create / Edit exam modal */}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Examen" : "Nuevo Examen"} maxWidth="max-w-lg">
          <div className="space-y-4">
            {/* Inline error banner */}
            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

            {/* Student selector */}
            <div><label className="block text-xs text-[#86868b] mb-1">Alumno *</label>
              <select value={form.alumno_id} onChange={e => setForm({ ...form, alumno_id: e.target.value })} className={inputCls}>
                <option value="">Seleccionar alumno...</option>
                {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellidos}</option>)}
              </select>
            </div>

            {/* Tipo and Resultado selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-xs text-[#86868b] mb-1">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as TipoExamen })} className={inputCls}>{tipos.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="block text-xs text-[#86868b] mb-1">Resultado</label><select value={form.resultado} onChange={e => setForm({ ...form, resultado: e.target.value as ResultadoExamen })} className={inputCls}>{resultados.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
            </div>

            {/* Date, time, and attempts fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="block text-xs text-[#86868b] mb-1">Fecha *</label><input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-xs text-[#86868b] mb-1">Hora</label><input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-xs text-[#86868b] mb-1">Intentos</label><input type="number" min="1" value={form.intentos} onChange={e => setForm({ ...form, intentos: e.target.value })} className={inputCls} /></div>
            </div>

            {/* Optional notes textarea */}
            <div><label className="block text-xs text-[#86868b] mb-1">Notas</label><textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></div>

            {/* Modal action buttons */}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Examen"}</button>
            </div>
          </div>
        </Modal>

        {/* Delete confirmation dialog */}
        <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} loading={saving} message="¿Eliminar este examen?" />
      </div>
    </div>
  );
}
