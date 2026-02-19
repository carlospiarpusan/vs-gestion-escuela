/**
 * MantenimientoPage - Vehicle Maintenance Management
 *
 * This page provides a full CRUD interface for managing vehicle maintenance
 * records within the driving school management system. Users can create, edit,
 * and delete maintenance entries that track fuel, oil changes, spare parts,
 * labor, washes, tires, general inspections, and other expenses.
 *
 * Features:
 *  - Fetches maintenance records, vehicles, and instructors from Supabase
 *  - Displays records in a searchable, sortable DataTable
 *  - Modal form for creating/editing records with full field validation
 *  - Confirmation dialog for safe deletion with error handling
 *  - NaN-safe numeric parsing for monto, kilometraje, litros, and precio_por_litro
 *
 * @module MantenimientoPage
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { MantenimientoVehiculo, TipoMantenimiento, Vehiculo, Instructor } from "@/types/database";
import { Plus } from "lucide-react";

/** All possible maintenance type values used in the tipo selector */
const tiposMant: TipoMantenimiento[] = ["cambio_aceite", "gasolina", "repuesto", "mano_obra", "lavado", "neumaticos", "revision_general", "otros"];

/** Default empty form state, reset when opening the create modal */
const emptyForm = {
  vehiculo_id: "", instructor_id: "", tipo: "gasolina" as TipoMantenimiento,
  descripcion: "", monto: "", kilometraje_actual: "", litros: "",
  precio_por_litro: "", proveedor: "", numero_factura: "",
  fecha: new Date().toISOString().split("T")[0], notas: "",
};

/**
 * Safely parses a string to a float, returning the fallback value if the result is NaN.
 * @param value - The string value to parse
 * @param fallback - The value to return if parsing fails (defaults to 0)
 * @returns The parsed number or the fallback
 */
function safeParseFloat(value: string, fallback: number = 0): number {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Safely parses a string to an integer, returning null if the result is NaN.
 * @param value - The string value to parse
 * @returns The parsed integer or null
 */
function safeParseInt(value: string): number | null {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Safely parses a string to a float, returning null if the result is NaN.
 * Used for optional numeric fields like litros and precio_por_litro.
 * @param value - The string value to parse
 * @returns The parsed number or null
 */
function safeParseFloatOrNull(value: string): number | null {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Type for vehicle rows returned by the Supabase select query */
type VehiculoRow = { id: string; marca: string; modelo: string; matricula: string };

/** Type for instructor rows returned by the Supabase select query */
type InstructorRow = { id: string; nombre: string; apellidos: string };

export default function MantenimientoPage() {
  const { perfil } = useAuth();

  // Data state: maintenance records enriched with display names
  const [data, setData] = useState<(MantenimientoVehiculo & { vehiculo_nombre?: string; instructor_nombre?: string })[]>([]);
  // Lookup lists for the form selectors
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);

  // UI state flags
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<MantenimientoVehiculo | null>(null);
  const [deleting, setDeleting] = useState<MantenimientoVehiculo | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  /**
   * Fetches all maintenance records, vehicles, and instructors in parallel,
   * then maps vehicle/instructor names onto each maintenance record for display.
   */
  const fetchData = useCallback(async () => {
    const supabase = createClient();

    // Fetch all three datasets concurrently for performance
    const [mantRes, vehiculosRes, instructoresRes] = await Promise.all([
      supabase.from("mantenimiento_vehiculos").select("*").order("fecha", { ascending: false }),
      supabase.from("vehiculos").select("id, marca, modelo, matricula"),
      supabase.from("instructores").select("id, nombre, apellidos"),
    ]);

    // Build lookup maps to resolve IDs into human-readable names
    const vMap = new Map(
      (vehiculosRes.data || []).map((v: VehiculoRow) => [v.id, `${v.marca} ${v.modelo} (${v.matricula})`])
    );
    const iMap = new Map(
      (instructoresRes.data || []).map((i: InstructorRow) => [i.id, `${i.nombre} ${i.apellidos}`])
    );

    // Enrich maintenance records with resolved vehicle and instructor names
    const mant = ((mantRes.data as MantenimientoVehiculo[]) || []).map(m => ({
      ...m, vehiculo_nombre: vMap.get(m.vehiculo_id) || "—",
      instructor_nombre: m.instructor_id ? iMap.get(m.instructor_id) || "—" : "—",
    }));

    setData(mant);
    setVehiculos((vehiculosRes.data as Vehiculo[]) || []);
    setInstructores((instructoresRes.data as Instructor[]) || []);
    setLoading(false);
  }, []);

  // Fetch data once the user's profile is available
  useEffect(() => {
    if (perfil) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  /** Opens the modal in "create" mode with an empty form */
  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(""); setModalOpen(true); };

  /** Opens the modal in "edit" mode, pre-filling the form with existing record values */
  const openEdit = (row: MantenimientoVehiculo) => {
    setEditing(row);
    setForm({ vehiculo_id: row.vehiculo_id, instructor_id: row.instructor_id || "", tipo: row.tipo, descripcion: row.descripcion, monto: row.monto.toString(), kilometraje_actual: row.kilometraje_actual?.toString() || "", litros: row.litros?.toString() || "", precio_por_litro: row.precio_por_litro?.toString() || "", proveedor: row.proveedor || "", numero_factura: row.numero_factura || "", fecha: row.fecha, notas: row.notas || "" });
    setError(""); setModalOpen(true);
  };

  /** Opens the delete confirmation dialog for the selected record */
  const openDelete = (row: MantenimientoVehiculo) => { setDeleting(row); setDeleteOpen(true); };

  /**
   * Validates the form and saves (inserts or updates) a maintenance record.
   * Uses safe numeric parsing to prevent NaN values from reaching the database.
   * Wrapped in try/catch to handle unexpected network errors gracefully.
   */
  const handleSave = async () => {
    // Validate required fields before proceeding
    if (!form.vehiculo_id || !form.descripcion) { setError("Vehículo y descripción son obligatorios."); return; }
    setSaving(true); setError("");

    try {
      const supabase = createClient();

      // Build the payload using safe parsers to avoid NaN values
      const payload = {
        vehiculo_id: form.vehiculo_id, instructor_id: form.instructor_id || null,
        tipo: form.tipo, descripcion: form.descripcion,
        monto: safeParseFloat(form.monto, 0),
        kilometraje_actual: form.kilometraje_actual ? safeParseInt(form.kilometraje_actual) : null,
        litros: form.litros ? safeParseFloatOrNull(form.litros) : null,
        precio_por_litro: form.precio_por_litro ? safeParseFloatOrNull(form.precio_por_litro) : null,
        proveedor: form.proveedor || null, numero_factura: form.numero_factura || null,
        fecha: form.fecha, notas: form.notas || null,
      };

      if (editing) {
        // Update existing record
        const { error: err } = await supabase.from("mantenimiento_vehiculos").update(payload).eq("id", editing.id);
        if (err) { setError(err.message); setSaving(false); return; }
      } else {
        // Insert new record, attaching school/sede/user context
        if (!perfil) return;
        const { error: err } = await supabase.from("mantenimiento_vehiculos").insert({ ...payload, escuela_id: perfil.escuela_id, sede_id: perfil.sede_id, user_id: perfil.id });
        if (err) { setError(err.message); setSaving(false); return; }
      }

      setSaving(false); setModalOpen(false); fetchData();
    } catch (networkError) {
      // Catch unexpected network or runtime errors (e.g. connection lost)
      setError(networkError instanceof Error ? networkError.message : "Error de red inesperado. Intente nuevamente.");
      setSaving(false);
    }
  };

  /**
   * Deletes the currently selected maintenance record after confirmation.
   * Wrapped in try/catch to handle network or server errors.
   */
  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const { error: err } = await createClient().from("mantenimiento_vehiculos").delete().eq("id", deleting.id);
      if (err) {
        // Surface Supabase-level errors to the user
        setError(err.message);
        setSaving(false);
        return;
      }
      setSaving(false); setDeleteOpen(false); setDeleting(null); fetchData();
    } catch (networkError) {
      // Catch unexpected network or runtime errors during deletion
      setError(networkError instanceof Error ? networkError.message : "Error al eliminar. Intente nuevamente.");
      setSaving(false);
    }
  };

  /** Color mapping for each maintenance type badge in the data table */
  const tipoColors: Record<string, string> = {
    gasolina: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    cambio_aceite: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    repuesto: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    mano_obra: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    lavado: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    neumaticos: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    revision_general: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    otros: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  /** Column definitions for the DataTable, including custom render functions */
  const columns = [
    { key: "fecha" as keyof MantenimientoVehiculo, label: "Fecha" },
    { key: "vehiculo_nombre" as string, label: "Vehículo", render: (r: MantenimientoVehiculo & { vehiculo_nombre?: string }) => <span className="font-medium">{r.vehiculo_nombre}</span> },
    { key: "tipo" as keyof MantenimientoVehiculo, label: "Tipo", render: (r: MantenimientoVehiculo) => <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${tipoColors[r.tipo]}`}>{r.tipo.replace("_", " ")}</span> },
    { key: "descripcion" as keyof MantenimientoVehiculo, label: "Descripción" },
    { key: "monto" as keyof MantenimientoVehiculo, label: "Monto", render: (r: MantenimientoVehiculo) => <span className="font-medium text-red-500">${Number(r.monto).toLocaleString("es-CO")}</span> },
    { key: "kilometraje_actual" as keyof MantenimientoVehiculo, label: "Km", render: (r: MantenimientoVehiculo) => <span>{r.kilometraje_actual ? `${r.kilometraje_actual.toLocaleString()} km` : "—"}</span> },
  ];

  /** Shared CSS class string for all form inputs and selects */
  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]";

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[#f5f5f7] dark:bg-[#1d1d1f] transition-colors duration-300">
      <div className="w-full max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Mantenimiento</h2>
            <p className="text-sm text-[#86868b] mt-0.5">Registro de mantenimiento de vehículos</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"><Plus size={16} /> Nuevo Registro</button>
        </div>
        <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl p-4 sm:p-6 shadow-lg">
          <DataTable columns={columns} data={data} loading={loading} searchPlaceholder="Buscar por descripción..." searchKeys={["descripcion", "fecha"]} onEdit={openEdit} onDelete={openDelete} />
        </div>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Registro" : "Nuevo Registro de Mantenimiento"} maxWidth="max-w-xl">
          <div className="space-y-4">
            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-xs text-[#86868b] mb-1">Vehículo *</label>
                <select value={form.vehiculo_id} onChange={e => setForm({ ...form, vehiculo_id: e.target.value })} className={inputCls}>
                  <option value="">Seleccionar...</option>
                  {vehiculos.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.matricula})</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-[#86868b] mb-1">Instructor</label>
                <select value={form.instructor_id} onChange={e => setForm({ ...form, instructor_id: e.target.value })} className={inputCls}>
                  <option value="">Sin asignar</option>
                  {instructores.map(i => <option key={i.id} value={i.id}>{i.nombre} {i.apellidos}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-xs text-[#86868b] mb-1">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as TipoMantenimiento })} className={inputCls}>{tiposMant.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select></div>
              <div><label className="block text-xs text-[#86868b] mb-1">Fecha</label><input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className={inputCls} /></div>
            </div>
            <div><label className="block text-xs text-[#86868b] mb-1">Descripción *</label><input type="text" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className={inputCls} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="block text-xs text-[#86868b] mb-1">Monto ($)</label><input type="number" step="0.01" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-xs text-[#86868b] mb-1">Kilometraje</label><input type="number" value={form.kilometraje_actual} onChange={e => setForm({ ...form, kilometraje_actual: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-xs text-[#86868b] mb-1">Litros</label><input type="number" step="0.01" value={form.litros} onChange={e => setForm({ ...form, litros: e.target.value })} className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="block text-xs text-[#86868b] mb-1">$/Litro</label><input type="number" step="0.01" value={form.precio_por_litro} onChange={e => setForm({ ...form, precio_por_litro: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-xs text-[#86868b] mb-1">Proveedor</label><input type="text" value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-xs text-[#86868b] mb-1">N° Factura</label><input type="text" value={form.numero_factura} onChange={e => setForm({ ...form, numero_factura: e.target.value })} className={inputCls} /></div>
            </div>
            <div><label className="block text-xs text-[#86868b] mb-1">Notas</label><textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Registro"}</button>
            </div>
          </div>
        </Modal>
        <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} loading={saving} message="¿Eliminar este registro de mantenimiento?" />
      </div>
    </div>
  );
}
