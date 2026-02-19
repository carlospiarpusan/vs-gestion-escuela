/**
 * VehiculosPage - Pagina de gestion de vehiculos de la flota.
 *
 * Permite listar, crear, editar y eliminar vehiculos asociados a una
 * escuela y sede. Utiliza Supabase como backend y muestra los datos
 * en una tabla interactiva con modal de formulario y confirmacion de
 * eliminacion.
 *
 * @module dashboard/vehiculos
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { Vehiculo, TipoVehiculo, EstadoVehiculo } from "@/types/database";
import { Plus } from "lucide-react";

/** Opciones disponibles para el tipo de vehiculo */
const tipos: TipoVehiculo[] = ["coche", "moto", "camion", "autobus"];

/** Opciones disponibles para el estado de un vehiculo */
const estados: EstadoVehiculo[] = ["disponible", "en_uso", "mantenimiento", "baja"];

/** Valores por defecto del formulario al crear un vehiculo nuevo */
const emptyForm = {
  marca: "", modelo: "", matricula: "", tipo: "coche" as TipoVehiculo,
  año: "", fecha_itv: "", seguro_vencimiento: "",
  estado: "disponible" as EstadoVehiculo, kilometraje: "0", notas: "",
};

export default function VehiculosPage() {
  const { perfil } = useAuth();

  // -- Estado principal de la pagina --
  const [data, setData] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);

  // -- Estado del modal de creacion/edicion --
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehiculo | null>(null);
  const [form, setForm] = useState(emptyForm);

  // -- Estado del dialogo de eliminacion --
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Vehiculo | null>(null);

  // -- Estado compartido de guardado y errores --
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /**
   * Obtiene la lista completa de vehiculos desde Supabase,
   * ordenados por fecha de creacion descendente.
   */
  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("vehiculos").select("*").order("created_at", { ascending: false });
    setData((data as Vehiculo[]) || []);
    setLoading(false);
  }, []);

  // Carga los datos cuando el perfil del usuario esta disponible
  // Carga los datos cuando el perfil del usuario esta disponible
  useEffect(() => {
    if (perfil) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]); // Solo recargar si cambia el ID del perfil

  /** Abre el modal en modo creacion con el formulario vacio */
  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(""); setModalOpen(true); };

  /** Abre el modal en modo edicion, rellenando el formulario con los datos existentes */
  const openEdit = (row: Vehiculo) => {
    setEditing(row);
    setForm({ marca: row.marca, modelo: row.modelo, matricula: row.matricula, tipo: row.tipo, año: row.año?.toString() || "", fecha_itv: row.fecha_itv || "", seguro_vencimiento: row.seguro_vencimiento || "", estado: row.estado, kilometraje: row.kilometraje.toString(), notas: row.notas || "" });
    setError(""); setModalOpen(true);
  };

  /** Abre el dialogo de confirmacion de eliminacion */
  const openDelete = (row: Vehiculo) => { setDeleting(row); setDeleteOpen(true); };

  /**
   * Guarda un vehiculo (creacion o actualizacion) en Supabase.
   * Valida los campos obligatorios y muestra errores si los hay.
   */
  const handleSave = async () => {
    // Validacion de campos obligatorios
    if (!form.marca || !form.modelo || !form.matricula) { setError("Marca, modelo y matrícula son obligatorios."); return; }
    setSaving(true); setError("");

    try {
      const supabase = createClient();

      // Construir el payload con los valores del formulario
      const payload = {
        marca: form.marca, modelo: form.modelo, matricula: form.matricula, tipo: form.tipo,
        año: form.año ? parseInt(form.año) : null, fecha_itv: form.fecha_itv || null,
        seguro_vencimiento: form.seguro_vencimiento || null, estado: form.estado,
        kilometraje: parseInt(form.kilometraje) || 0, notas: form.notas || null,
      };

      if (editing) {
        // Modo edicion: actualizar el registro existente
        const { error: err } = await supabase.from("vehiculos").update(payload).eq("id", editing.id);
        if (err) { setError(err.message); setSaving(false); return; }
      } else {
        // Modo creacion: insertar nuevo registro con datos de la escuela/sede
        if (!perfil) return;
        const { error: err } = await supabase.from("vehiculos").insert({ ...payload, escuela_id: perfil.escuela_id, sede_id: perfil.sede_id, user_id: perfil.id });
        if (err) { setError(err.message); setSaving(false); return; }
      }

      setSaving(false); setModalOpen(false); fetchData();
    } catch (err: unknown) {
      // Capturar errores de red u otros errores inesperados
      const message = err instanceof Error ? err.message : "Error de red al guardar el vehículo.";
      setError(message);
      setSaving(false);
    }
  };

  /**
   * Elimina el vehiculo seleccionado de Supabase.
   * Muestra un error si la operacion falla.
   */
  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);

    try {
      const { error: err } = await createClient().from("vehiculos").delete().eq("id", deleting.id);

      if (err) {
        // Error devuelto por Supabase (ej. restricciones de FK)
        setError(err.message);
        setSaving(false);
        return;
      }

      setSaving(false); setDeleteOpen(false); setDeleting(null); fetchData();
    } catch (err: unknown) {
      // Capturar errores de red u otros errores inesperados
      const message = err instanceof Error ? err.message : "Error de red al eliminar el vehículo.";
      setError(message);
      setSaving(false);
    }
  };

  /** Mapa de colores por estado para las etiquetas de la tabla */
  const estadoColors: Record<string, string> = {
    disponible: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    en_uso: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    mantenimiento: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    baja: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  /** Definicion de columnas para la DataTable */
  const columns = [
    { key: "marca" as keyof Vehiculo, label: "Vehículo", render: (r: Vehiculo) => <span className="font-medium">{r.marca} {r.modelo}</span> },
    { key: "matricula" as keyof Vehiculo, label: "Matrícula" },
    { key: "tipo" as keyof Vehiculo, label: "Tipo" },
    { key: "kilometraje" as keyof Vehiculo, label: "Km", render: (r: Vehiculo) => <span>{r.kilometraje.toLocaleString()} km</span> },
    { key: "estado" as keyof Vehiculo, label: "Estado", render: (r: Vehiculo) => <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${estadoColors[r.estado]}`}>{r.estado.replace("_", " ")}</span> },
  ];

  /** Clases CSS reutilizables para los inputs del formulario */
  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]";

  return (
    <div>
      {/* Encabezado de la pagina con titulo y boton de creacion */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Vehículos</h2>
          <p className="text-sm text-[#86868b] mt-0.5">Gestiona la flota de vehículos</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"><Plus size={16} /> Nuevo Vehículo</button>
      </div>

      {/* Tabla de vehiculos con busqueda y acciones */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6">
        <DataTable columns={columns} data={data} loading={loading} searchPlaceholder="Buscar por marca o matrícula..." searchKeys={["marca", "modelo", "matricula"]} onEdit={openEdit} onDelete={openDelete} />
      </div>

      {/* Modal de creacion/edicion de vehiculo */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Vehículo" : "Nuevo Vehículo"} maxWidth="max-w-xl">
        <div className="space-y-4">
          {/* Mensaje de error si lo hay */}
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

          {/* Fila: Marca y Modelo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Marca *</label><input type="text" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Modelo *</label><input type="text" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} className={inputCls} /></div>
          </div>

          {/* Fila: Matricula, Tipo y Ano */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Matrícula *</label><input type="text" value={form.matricula} onChange={e => setForm({ ...form, matricula: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as TipoVehiculo })} className={inputCls}>{tipos.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Año</label><input type="number" value={form.año} onChange={e => setForm({ ...form, año: e.target.value })} className={inputCls} /></div>
          </div>

          {/* Fila: Kilometraje, Fecha ITV y Vencimiento del Seguro */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Kilometraje</label><input type="number" value={form.kilometraje} onChange={e => setForm({ ...form, kilometraje: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Fecha ITV</label><input type="date" value={form.fecha_itv} onChange={e => setForm({ ...form, fecha_itv: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Vence Seguro</label><input type="date" value={form.seguro_vencimiento} onChange={e => setForm({ ...form, seguro_vencimiento: e.target.value })} className={inputCls} /></div>
          </div>

          {/* Estado del vehiculo */}
          <div><label className="block text-xs text-[#86868b] mb-1">Estado</label><select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as EstadoVehiculo })} className={inputCls}>{estados.map(e => <option key={e} value={e}>{e.replace("_", " ")}</option>)}</select></div>

          {/* Notas adicionales */}
          <div><label className="block text-xs text-[#86868b] mb-1">Notas</label><textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></div>

          {/* Botones de accion del formulario */}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Vehículo"}</button>
          </div>
        </div>
      </Modal>

      {/* Dialogo de confirmacion de eliminacion */}
      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} loading={saving} message={`¿Eliminar ${deleting?.marca} ${deleting?.modelo} (${deleting?.matricula})?`} />
    </div>
  );
}
