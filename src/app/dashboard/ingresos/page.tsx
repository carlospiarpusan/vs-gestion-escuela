/**
 * @file IngresosPage - Pagina de gestion de ingresos de la escuela.
 *
 * Permite al usuario listar, crear, editar y eliminar registros de ingresos.
 * Los ingresos se almacenan en Supabase y pueden estar asociados a un alumno.
 * Incluye filtrado por concepto/fecha, seleccion de categoria, metodo de pago,
 * estado (cobrado, pendiente, anulado) y campos opcionales como factura y notas.
 *
 * @module dashboard/ingresos
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { Ingreso, CategoriaIngreso, MetodoPago, EstadoIngreso, Alumno } from "@/types/database";
import { Plus } from "lucide-react";

// Opciones fijas para los selects del formulario
const categorias: CategoriaIngreso[] = ["matricula", "mensualidad", "clase_suelta", "examen_teorico", "examen_practico", "material", "tasas_dgt", "otros"];
const metodos: MetodoPago[] = ["efectivo", "datafono", "nequi", "sistecredito", "otro"];
const estadosIngreso: EstadoIngreso[] = ["cobrado", "pendiente", "anulado"];

// Formulario vacio con valores por defecto
const emptyForm = {
  alumno_id: "", categoria: "mensualidad" as CategoriaIngreso, concepto: "",
  monto: "", metodo_pago: "efectivo" as MetodoPago, medio_especifico: "",
  numero_factura: "", fecha: new Date().toISOString().split("T")[0],
  estado: "cobrado" as EstadoIngreso, notas: "",
};

export default function IngresosPage() {
  const { perfil } = useAuth();

  // Estado principal: lista de ingresos con nombre del alumno adjunto
  const [data, setData] = useState<(Ingreso & { alumno_nombre?: string })[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado del modal de creacion/edicion
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Ingreso | null>(null);
  const [deleting, setDeleting] = useState<Ingreso | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  /**
   * Carga los ingresos y alumnos desde Supabase.
   * Construye un mapa de alumnos para mostrar el nombre junto a cada ingreso.
   */
  const fetchData = useCallback(async () => {
    const supabase = createClient();

    // Consultar ingresos y alumnos en paralelo
    const [ingresosRes, alumnosRes] = await Promise.all([
      supabase.from("ingresos").select("*").order("fecha", { ascending: false }),
      supabase.from("alumnos").select("id, nombre, apellidos"),
    ]);

    // Crear mapa id -> nombre completo para resolver alumno_id
    const alumnosMap = new Map(
      (alumnosRes.data || []).map((a: { id: string; nombre: string; apellidos: string }) => [a.id, `${a.nombre} ${a.apellidos}`])
    );

    // Enriquecer cada ingreso con el nombre del alumno
    const ingresos = ((ingresosRes.data as Ingreso[]) || []).map(i => ({ ...i, alumno_nombre: i.alumno_id ? alumnosMap.get(i.alumno_id) || "—" : "—" }));
    setData(ingresos);
    setAlumnos((alumnosRes.data as Alumno[]) || []);
    setLoading(false);
  }, []);

  // Cargar datos cuando el perfil del usuario este disponible
  useEffect(() => {
    if (perfil) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  /** Abre el modal en modo creacion con formulario limpio */
  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(""); setModalOpen(true); };

  /** Abre el modal en modo edicion, pre-rellenando el formulario con los datos del ingreso */
  const openEdit = (row: Ingreso) => {
    setEditing(row);
    setForm({ alumno_id: row.alumno_id || "", categoria: row.categoria, concepto: row.concepto, monto: row.monto.toString(), metodo_pago: row.metodo_pago, medio_especifico: row.medio_especifico || "", numero_factura: row.numero_factura || "", fecha: row.fecha, estado: row.estado, notas: row.notas || "" });
    setError(""); setModalOpen(true);
  };

  /** Abre el dialogo de confirmacion de eliminacion */
  const openDelete = (row: Ingreso) => { setDeleting(row); setDeleteOpen(true); };

  /**
   * Guarda (crea o actualiza) un ingreso en Supabase.
   * Valida campos obligatorios y el formato numerico del monto antes de enviar.
   */
  const handleSave = async () => {
    // Validar campos obligatorios
    if (!form.concepto || !form.monto) { setError("Concepto y monto son obligatorios."); return; }

    // Validar que el monto sea un numero valido
    const montoNum = parseFloat(form.monto);
    if (isNaN(montoNum)) { setError("El monto debe ser un valor numérico válido."); return; }

    setSaving(true); setError("");

    try {
      const supabase = createClient();

      // Construir el payload comun para insert/update
      const payload = {
        alumno_id: form.alumno_id || null, categoria: form.categoria, concepto: form.concepto,
        monto: montoNum, metodo_pago: form.metodo_pago,
        medio_especifico: form.medio_especifico || null, numero_factura: form.numero_factura || null,
        fecha: form.fecha, estado: form.estado, notas: form.notas || null,
      };

      if (editing) {
        // Modo edicion: actualizar registro existente
        const { error: err } = await supabase.from("ingresos").update(payload).eq("id", editing.id);
        if (err) { setError(err.message); setSaving(false); return; }
      } else {
        // Modo creacion: insertar nuevo registro con datos de la escuela/sede/usuario
        if (!perfil) return;
        const { error: err } = await supabase.from("ingresos").insert({ ...payload, escuela_id: perfil.escuela_id, sede_id: perfil.sede_id, user_id: perfil.id });
        if (err) { setError(err.message); setSaving(false); return; }
      }

      setSaving(false); setModalOpen(false); fetchData();
    } catch (networkErr: unknown) {
      // Capturar errores de red u otros errores inesperados
      const message = networkErr instanceof Error ? networkErr.message : "Error de red al guardar el ingreso.";
      setError(message);
      setSaving(false);
    }
  };

  /**
   * Elimina el ingreso seleccionado de Supabase.
   * Muestra un error si la operacion falla.
   */
  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const { error: err } = await createClient().from("ingresos").delete().eq("id", deleting.id);
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
      setSaving(false); setDeleteOpen(false); setDeleting(null); fetchData();
    } catch (networkErr: unknown) {
      // Capturar errores de red durante la eliminacion
      const message = networkErr instanceof Error ? networkErr.message : "Error de red al eliminar el ingreso.";
      setError(message);
      setSaving(false);
    }
  };

  // Colores de badge segun el estado del ingreso
  const estadoColors: Record<string, string> = {
    cobrado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    anulado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  // Definicion de columnas para la tabla de ingresos
  const columns = [
    { key: "fecha" as keyof Ingreso, label: "Fecha" },
    { key: "concepto" as keyof Ingreso, label: "Concepto", render: (r: Ingreso) => <span className="font-medium">{r.concepto}</span> },
    { key: "alumno_nombre" as string, label: "Alumno", render: (r: Ingreso & { alumno_nombre?: string }) => <span>{r.alumno_nombre}</span> },
    { key: "monto" as keyof Ingreso, label: "Monto", render: (r: Ingreso) => <span className="font-medium text-green-600 dark:text-green-400">${Number(r.monto).toLocaleString("es-CO")}</span> },
    { key: "metodo_pago" as keyof Ingreso, label: "Método", render: (r: Ingreso) => <span className="px-2 py-0.5 text-xs rounded-full bg-[#0071e3]/10 text-[#0071e3] font-medium">{r.metodo_pago}</span> },
    { key: "estado" as keyof Ingreso, label: "Estado", render: (r: Ingreso) => <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${estadoColors[r.estado]}`}>{r.estado}</span> },
  ];

  // Clases CSS reutilizables para los inputs del formulario
  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]";

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[#f5f5f7] dark:bg-[#1d1d1f] transition-colors duration-300">
      <div className="w-full max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Ingresos</h2>
            <p className="text-sm text-[#86868b] mt-0.5">Registra los ingresos de tu escuela</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"><Plus size={16} /> Nuevo Ingreso</button>
        </div>
        <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl p-4 sm:p-6 shadow-lg">
          <DataTable columns={columns} data={data} loading={loading} searchPlaceholder="Buscar por concepto..." searchKeys={["concepto", "fecha"]} onEdit={openEdit} onDelete={openDelete} />
        </div>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Ingreso" : "Nuevo Ingreso"} maxWidth="max-w-xl">
          <div className="space-y-4">
            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-xs text-[#86868b] mb-1">Categoría</label><select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value as CategoriaIngreso })} className={inputCls}>{categorias.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}</select></div>
              <div><label className="block text-xs text-[#86868b] mb-1">Alumno</label>
                <select value={form.alumno_id} onChange={e => setForm({ ...form, alumno_id: e.target.value })} className={inputCls}>
                  <option value="">Sin alumno</option>
                  {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellidos}</option>)}
                </select>
              </div>
            </div>
            <div><label className="block text-xs text-[#86868b] mb-1">Concepto *</label><input type="text" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} className={inputCls} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="block text-xs text-[#86868b] mb-1">Monto *</label><input type="number" step="0.01" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-xs text-[#86868b] mb-1">Método de Pago</label><select value={form.metodo_pago} onChange={e => setForm({ ...form, metodo_pago: e.target.value as MetodoPago })} className={inputCls}>{metodos.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className="block text-xs text-[#86868b] mb-1">Fecha</label><input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="block text-xs text-[#86868b] mb-1">Estado</label><select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as EstadoIngreso })} className={inputCls}>{estadosIngreso.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
              <div><label className="block text-xs text-[#86868b] mb-1">Medio específico</label><input type="text" value={form.medio_especifico} onChange={e => setForm({ ...form, medio_especifico: e.target.value })} className={inputCls} placeholder="Ej: Nequi 300..." /></div>
              <div><label className="block text-xs text-[#86868b] mb-1">N° Factura</label><input type="text" value={form.numero_factura} onChange={e => setForm({ ...form, numero_factura: e.target.value })} className={inputCls} /></div>
            </div>
            <div><label className="block text-xs text-[#86868b] mb-1">Notas</label><textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Ingreso"}</button>
            </div>
          </div>
        </Modal>
        <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} loading={saving} message="¿Eliminar este ingreso?" />
      </div>
    </div>
  );
}
