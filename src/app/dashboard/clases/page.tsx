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

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { Clase, TipoClase, EstadoClase, Alumno, Instructor, Vehiculo } from "@/types/database";
import { Plus } from "lucide-react";

/** Opciones validas para el tipo de clase */
const tiposClase: TipoClase[] = ["practica", "teorica"];

/** Opciones validas para el estado de una clase */
const estadosClase: EstadoClase[] = ["programada", "completada", "cancelada", "no_asistio"];

/** Valores por defecto del formulario de clase */
const emptyForm = {
  alumno_id: "", instructor_id: "", vehiculo_id: "",
  tipo: "practica" as TipoClase, fecha: "", hora_inicio: "", hora_fin: "",
  estado: "programada" as EstadoClase, notas: "",
};

/** Tipo auxiliar para las filas del mapa de alumnos/instructores */
type PersonaRow = { id: string; nombre: string; apellidos: string };

export default function ClasesPage() {
  const { perfil } = useAuth();

  // Estado principal: lista de clases con nombres resueltos
  const [data, setData] = useState<(Clase & { alumno_nombre?: string; instructor_nombre?: string })[]>([]);

  // Listas de referencia para los selectores del formulario
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  // Estado de UI
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Clase | null>(null);
  const [deleting, setDeleting] = useState<Clase | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  /**
   * fetchData - Obtiene clases, alumnos, instructores y vehiculos de Supabase.
   * Resuelve los nombres de alumno e instructor para mostrarlos en la tabla.
   */
  const fetchData = useCallback(async () => {
    const supabase = createClient();

    // Consultas en paralelo para minimizar el tiempo de carga
    const [clasesRes, alumnosRes, instructoresRes, vehiculosRes] = await Promise.all([
      supabase.from("clases").select("*").order("fecha", { ascending: false }),
      supabase.from("alumnos").select("id, nombre, apellidos").eq("estado", "activo"),
      supabase.from("instructores").select("id, nombre, apellidos").eq("estado", "activo"),
      supabase.from("vehiculos").select("id, marca, modelo, matricula").neq("estado", "baja"),
    ]);

    // Mapas id->nombre para resolver las relaciones sin joins adicionales
    const alumnosMap = new Map((alumnosRes.data || []).map((a: PersonaRow) => [a.id, `${a.nombre} ${a.apellidos}`]));
    const instructoresMap = new Map((instructoresRes.data || []).map((i: PersonaRow) => [i.id, `${i.nombre} ${i.apellidos}`]));

    // Enriquecer cada clase con los nombres resueltos
    const clases = ((clasesRes.data as Clase[]) || []).map(c => ({
      ...c,
      alumno_nombre: alumnosMap.get(c.alumno_id) || "—",
      instructor_nombre: c.instructor_id ? instructoresMap.get(c.instructor_id) || "—" : "—",
    }));

    setData(clases);
    setAlumnos((alumnosRes.data as Alumno[]) || []);
    setInstructores((instructoresRes.data as Instructor[]) || []);
    setVehiculos((vehiculosRes.data as Vehiculo[]) || []);
    setLoading(false);
  }, []);

  // Cargar datos cuando el perfil este disponible
  useEffect(() => {
    if (perfil) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  /** Abre el modal en modo creacion con el formulario vacio */
  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(""); setModalOpen(true); };

  /** Abre el modal en modo edicion con los datos de la clase seleccionada */
  const openEdit = (row: Clase) => {
    setEditing(row);
    setForm({ alumno_id: row.alumno_id, instructor_id: row.instructor_id || "", vehiculo_id: row.vehiculo_id || "", tipo: row.tipo, fecha: row.fecha, hora_inicio: row.hora_inicio, hora_fin: row.hora_fin, estado: row.estado, notas: row.notas || "" });
    setError(""); setModalOpen(true);
  };

  /** Abre el dialogo de confirmacion de borrado */
  const openDelete = (row: Clase) => { setDeleting(row); setDeleteOpen(true); };

  /**
   * handleSave - Guarda (crea o actualiza) una clase en Supabase.
   * Valida campos obligatorios antes de enviar. Envuelto en try/catch
   * para capturar errores de red inesperados.
   */
  const handleSave = async () => {
    // Validacion de campos obligatorios
    if (!form.alumno_id || !form.fecha || !form.hora_inicio || !form.hora_fin) { setError("Alumno, fecha, hora inicio y hora fin son obligatorios."); return; }
    setSaving(true); setError("");

    try {
      const supabase = createClient();

      // Construir el payload con campos opcionales como null
      const payload = {
        alumno_id: form.alumno_id, instructor_id: form.instructor_id || null,
        vehiculo_id: form.vehiculo_id || null, tipo: form.tipo, fecha: form.fecha,
        hora_inicio: form.hora_inicio, hora_fin: form.hora_fin, estado: form.estado,
        notas: form.notas || null,
      };

      if (editing) {
        // Modo edicion: actualizar la clase existente
        const { error: err } = await supabase.from("clases").update(payload).eq("id", editing.id);
        if (err) { setError(err.message); setSaving(false); return; }
      } else {
        // Modo creacion: insertar nueva clase con datos de la escuela/sede del usuario
        if (!perfil) return;
        const { error: err } = await supabase.from("clases").insert({ ...payload, escuela_id: perfil.escuela_id, sede_id: perfil.sede_id, user_id: perfil.id });
        if (err) { setError(err.message); setSaving(false); return; }
      }

      setSaving(false); setModalOpen(false); fetchData();
    } catch (networkError) {
      // Capturar errores de red u otros fallos inesperados
      setError(networkError instanceof Error ? networkError.message : "Error de conexion inesperado al guardar la clase.");
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
      setSaving(false); setDeleteOpen(false); setDeleting(null); fetchData();
    } catch (networkError) {
      // Capturar errores de red u otros fallos inesperados
      setError(networkError instanceof Error ? networkError.message : "Error de conexion inesperado al eliminar la clase.");
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
    { key: "hora_inicio" as keyof Clase, label: "Horario", render: (r: Clase) => <span>{r.hora_inicio?.slice(0, 5)} - {r.hora_fin?.slice(0, 5)}</span> },
    { key: "alumno_nombre" as string, label: "Alumno", render: (r: Clase & { alumno_nombre?: string }) => <span>{r.alumno_nombre}</span> },
    { key: "instructor_nombre" as string, label: "Instructor", render: (r: Clase & { instructor_nombre?: string }) => <span>{r.instructor_nombre}</span> },
    { key: "tipo" as keyof Clase, label: "Tipo", render: (r: Clase) => <span className="px-2 py-0.5 text-xs rounded-full bg-[#0071e3]/10 text-[#0071e3] font-medium">{r.tipo}</span> },
    { key: "estado" as keyof Clase, label: "Estado", render: (r: Clase) => <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${estadoColors[r.estado]}`}>{r.estado.replace("_", " ")}</span> },
  ];

  /** Clase CSS reutilizable para todos los inputs del formulario */
  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]";

  return (
    <div>
      {/* Cabecera con titulo y boton de nueva clase */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Clases</h2>
          <p className="text-lg text-[#86868b] mt-2 font-medium">Programa y gestiona las clases</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"><Plus size={16} /> Nueva Clase</button>
      </div>

      {/* Tabla principal de clases */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800 animate-fade-in delay-100">
        <DataTable columns={columns} data={data} loading={loading} searchPlaceholder="Buscar por fecha..." searchKeys={["fecha"]} onEdit={openEdit} onDelete={openDelete} />
      </div>

      {/* Modal de creacion/edicion de clase */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Clase" : "Nueva Clase"} maxWidth="max-w-xl">
        <div className="space-y-4">
          {/* Mensaje de error si existe */}
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

          {/* Selector de alumno (obligatorio) */}
          <div><label className="block text-xs text-[#86868b] mb-1">Alumno *</label>
            <select value={form.alumno_id} onChange={e => setForm({ ...form, alumno_id: e.target.value })} className={inputCls}>
              <option value="">Seleccionar alumno...</option>
              {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellidos}</option>)}
            </select>
          </div>

          {/* Selectores de instructor y vehiculo (opcionales) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Instructor</label>
              <select value={form.instructor_id} onChange={e => setForm({ ...form, instructor_id: e.target.value })} className={inputCls}>
                <option value="">Sin asignar</option>
                {instructores.map(i => <option key={i.id} value={i.id}>{i.nombre} {i.apellidos}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-[#86868b] mb-1">Vehículo</label>
              <select value={form.vehiculo_id} onChange={e => setForm({ ...form, vehiculo_id: e.target.value })} className={inputCls}>
                <option value="">Sin asignar</option>
                {vehiculos.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.matricula})</option>)}
              </select>
            </div>
          </div>

          {/* Selectores de tipo y estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as TipoClase })} className={inputCls}>{tiposClase.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Estado</label><select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as EstadoClase })} className={inputCls}>{estadosClase.map(e => <option key={e} value={e}>{e.replace("_", " ")}</option>)}</select></div>
          </div>

          {/* Campos de fecha y horario (obligatorios) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Fecha *</label><input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Hora inicio *</label><input type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Hora fin *</label><input type="time" value={form.hora_fin} onChange={e => setForm({ ...form, hora_fin: e.target.value })} className={inputCls} /></div>
          </div>

          {/* Campo de notas (opcional) */}
          <div><label className="block text-xs text-[#86868b] mb-1">Notas</label><textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></div>

          {/* Botones de accion del formulario */}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Clase"}</button>
          </div>
        </div>
      </Modal>

      {/* Dialogo de confirmacion de eliminacion */}
      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} loading={saving} message="¿Eliminar esta clase?" />
    </div>
  );
}
