"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type {
  Vehiculo, TipoVehiculo, EstadoVehiculo,
  MantenimientoVehiculo, TipoMantenimiento, Instructor,
} from "@/types/database";
import { Plus, Car, Wrench } from "lucide-react";

// ── Vehículos ──────────────────────────────────────────
const tipos: TipoVehiculo[] = ["coche", "moto", "camion", "autobus"];
const estadosV: EstadoVehiculo[] = ["disponible", "en_uso", "mantenimiento", "baja"];

const emptyVForm = {
  marca: "", modelo: "", matricula: "", tipo: "coche" as TipoVehiculo,
  año: "", fecha_itv: "", seguro_vencimiento: "",
  estado: "disponible" as EstadoVehiculo, kilometraje: "0", notas: "",
};

// ── Mantenimiento ──────────────────────────────────────
const tiposMant: TipoMantenimiento[] = [
  "cambio_aceite", "gasolina", "repuesto", "mano_obra",
  "lavado", "neumaticos", "revision_general", "otros",
];

const emptyMForm = {
  vehiculo_id: "", instructor_id: "", tipo: "gasolina" as TipoMantenimiento,
  descripcion: "", monto: "", kilometraje_actual: "", litros: "",
  precio_por_litro: "", proveedor: "", numero_factura: "",
  fecha: new Date().toISOString().split("T")[0], notas: "",
};

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]";
const labelCls = "block text-xs text-[#86868b] mb-1";

function safeFloat(v: string, fb = 0) { const n = parseFloat(v); return isNaN(n) ? fb : n; }
function safeInt(v: string) { const n = parseInt(v, 10); return isNaN(n) ? null : n; }
function safeFloatOrNull(v: string) { const n = parseFloat(v); return isNaN(n) ? null : n; }

type VehiculoRow = { id: string; marca: string; modelo: string; matricula: string };
type InstructorRow = { id: string; nombre: string; apellidos: string };

export default function VehiculosPage() {
  const { perfil } = useAuth();
  const [tab, setTab] = useState<"vehiculos" | "mantenimiento">("vehiculos");

  // ── Vehículos state ──────────────────────────────────
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loadingV, setLoadingV] = useState(true);
  const [modalVOpen, setModalVOpen] = useState(false);
  const [editingV, setEditingV] = useState<Vehiculo | null>(null);
  const [deletingV, setDeletingV] = useState<Vehiculo | null>(null);
  const [deleteVOpen, setDeleteVOpen] = useState(false);
  const [savingV, setSavingV] = useState(false);
  const [formV, setFormV] = useState(emptyVForm);
  const [errorV, setErrorV] = useState("");

  // ── Mantenimiento state ──────────────────────────────
  const [mantenimientos, setMantenimientos] = useState<(MantenimientoVehiculo & { vehiculo_nombre?: string; instructor_nombre?: string })[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [loadingM, setLoadingM] = useState(true);
  const [modalMOpen, setModalMOpen] = useState(false);
  const [editingM, setEditingM] = useState<MantenimientoVehiculo | null>(null);
  const [deletingM, setDeletingM] = useState<MantenimientoVehiculo | null>(null);
  const [deleteMOpen, setDeleteMOpen] = useState(false);
  const [savingM, setSavingM] = useState(false);
  const [formM, setFormM] = useState(emptyMForm);
  const [errorM, setErrorM] = useState("");

  // ── Fetch vehiculos ──────────────────────────────────
  const fetchVehiculos = useCallback(async () => {
    if (!perfil?.escuela_id) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("vehiculos")
      .select("*")
      .eq("escuela_id", perfil.escuela_id)
      .order("created_at", { ascending: false });
    setVehiculos((data as Vehiculo[]) || []);
    setLoadingV(false);
  }, [perfil?.escuela_id]);

  // ── Fetch mantenimiento ──────────────────────────────
  const fetchMantenimiento = useCallback(async () => {
    if (!perfil?.escuela_id) return;
    const supabase = createClient();
    const [mantRes, vehiculosRes, instructoresRes] = await Promise.all([
      supabase.from("mantenimiento_vehiculos").select("id, vehiculo_id, instructor_id, tipo, descripcion, monto, kilometraje_actual, litros, precio_por_litro, proveedor, numero_factura, fecha, notas, created_at").eq("escuela_id", perfil.escuela_id).order("fecha", { ascending: false }),
      supabase.from("vehiculos").select("id, marca, modelo, matricula").eq("escuela_id", perfil.escuela_id),
      supabase.from("instructores").select("id, nombre, apellidos").eq("escuela_id", perfil.escuela_id),
    ]);
    const vMap = new Map((vehiculosRes.data || []).map((v: VehiculoRow) => [v.id, `${v.marca} ${v.modelo} (${v.matricula})`]));
    const iMap = new Map((instructoresRes.data || []).map((i: InstructorRow) => [i.id, `${i.nombre} ${i.apellidos}`]));
    const mant = ((mantRes.data as MantenimientoVehiculo[]) || []).map((m) => ({
      ...m,
      vehiculo_nombre: vMap.get(m.vehiculo_id) || "—",
      instructor_nombre: m.instructor_id ? iMap.get(m.instructor_id) || "—" : "—",
    }));
    setMantenimientos(mant);
    setInstructores((instructoresRes.data as Instructor[]) || []);
    setLoadingM(false);
  }, [perfil?.escuela_id]);

  useEffect(() => {
    if (perfil) { fetchVehiculos(); fetchMantenimiento(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  // ── Vehiculos CRUD ───────────────────────────────────
  const openCreateV = () => { setEditingV(null); setFormV(emptyVForm); setErrorV(""); setModalVOpen(true); };
  const openEditV = (row: Vehiculo) => {
    setEditingV(row);
    setFormV({ marca: row.marca, modelo: row.modelo, matricula: row.matricula, tipo: row.tipo, año: row.año?.toString() || "", fecha_itv: row.fecha_itv || "", seguro_vencimiento: row.seguro_vencimiento || "", estado: row.estado, kilometraje: row.kilometraje.toString(), notas: row.notas || "" });
    setErrorV(""); setModalVOpen(true);
  };
  const openDeleteV = (row: Vehiculo) => { setDeletingV(row); setDeleteVOpen(true); };

  const handleSaveV = async () => {
    if (!formV.marca || !formV.modelo || !formV.matricula) { setErrorV("Marca, modelo y matrícula son obligatorios."); return; }
    setSavingV(true); setErrorV("");
    try {
      const supabase = createClient();
      const payload = {
        marca: formV.marca, modelo: formV.modelo, matricula: formV.matricula, tipo: formV.tipo,
        año: formV.año ? parseInt(formV.año) : null, fecha_itv: formV.fecha_itv || null,
        seguro_vencimiento: formV.seguro_vencimiento || null, estado: formV.estado,
        kilometraje: parseInt(formV.kilometraje) || 0, notas: formV.notas || null,
      };
      if (editingV) {
        const { error: err } = await supabase.from("vehiculos").update(payload).eq("id", editingV.id);
        if (err) { setErrorV(err.message); setSavingV(false); return; }
      } else {
        if (!perfil) return;
        let sedeId = perfil.sede_id;
        if (!sedeId && perfil.escuela_id) {
          const { data: s } = await supabase.from("sedes").select("id").eq("escuela_id", perfil.escuela_id).order("es_principal", { ascending: false }).limit(1).single();
          sedeId = s?.id || null;
        }
        const { error: err } = await supabase.from("vehiculos").insert({ ...payload, escuela_id: perfil.escuela_id, sede_id: sedeId, user_id: perfil.id });
        if (err) { setErrorV(err.message); setSavingV(false); return; }
      }
      setSavingV(false); setModalVOpen(false); fetchVehiculos(); fetchMantenimiento();
    } catch (e: unknown) { setErrorV(e instanceof Error ? e.message : "Error al guardar"); setSavingV(false); }
  };

  const handleDeleteV = async () => {
    if (!deletingV) return;
    setSavingV(true);
    try {
      const { error: err } = await createClient().from("vehiculos").delete().eq("id", deletingV.id);
      if (err) { setErrorV(err.message); setSavingV(false); return; }
      setSavingV(false); setDeleteVOpen(false); setDeletingV(null); fetchVehiculos(); fetchMantenimiento();
    } catch (e: unknown) { setErrorV(e instanceof Error ? e.message : "Error al eliminar"); setSavingV(false); }
  };

  // ── Mantenimiento CRUD ───────────────────────────────
  const openCreateM = () => { setEditingM(null); setFormM(emptyMForm); setErrorM(""); setModalMOpen(true); };
  const openEditM = (row: MantenimientoVehiculo) => {
    setEditingM(row);
    setFormM({ vehiculo_id: row.vehiculo_id, instructor_id: row.instructor_id || "", tipo: row.tipo, descripcion: row.descripcion, monto: row.monto.toString(), kilometraje_actual: row.kilometraje_actual?.toString() || "", litros: row.litros?.toString() || "", precio_por_litro: row.precio_por_litro?.toString() || "", proveedor: row.proveedor || "", numero_factura: row.numero_factura || "", fecha: row.fecha, notas: row.notas || "" });
    setErrorM(""); setModalMOpen(true);
  };
  const openDeleteM = (row: MantenimientoVehiculo) => { setDeletingM(row); setDeleteMOpen(true); };

  const handleSaveM = async () => {
    if (!formM.vehiculo_id || !formM.descripcion) { setErrorM("Vehículo y descripción son obligatorios."); return; }
    setSavingM(true); setErrorM("");
    try {
      const supabase = createClient();
      const payload = {
        vehiculo_id: formM.vehiculo_id, instructor_id: formM.instructor_id || null,
        tipo: formM.tipo, descripcion: formM.descripcion,
        monto: safeFloat(formM.monto, 0),
        kilometraje_actual: formM.kilometraje_actual ? safeInt(formM.kilometraje_actual) : null,
        litros: formM.litros ? safeFloatOrNull(formM.litros) : null,
        precio_por_litro: formM.precio_por_litro ? safeFloatOrNull(formM.precio_por_litro) : null,
        proveedor: formM.proveedor || null, numero_factura: formM.numero_factura || null,
        fecha: formM.fecha, notas: formM.notas || null,
      };
      if (editingM) {
        const { error: err } = await supabase.from("mantenimiento_vehiculos").update(payload).eq("id", editingM.id);
        if (err) { setErrorM(err.message); setSavingM(false); return; }
      } else {
        if (!perfil) return;
        let sedeId = perfil.sede_id;
        if (!sedeId && perfil.escuela_id) {
          const { data: s } = await supabase.from("sedes").select("id").eq("escuela_id", perfil.escuela_id).order("es_principal", { ascending: false }).limit(1).single();
          sedeId = s?.id || null;
        }
        const { error: err } = await supabase.from("mantenimiento_vehiculos").insert({ ...payload, escuela_id: perfil.escuela_id, sede_id: sedeId, user_id: perfil.id });
        if (err) { setErrorM(err.message); setSavingM(false); return; }
      }
      setSavingM(false); setModalMOpen(false); fetchMantenimiento();
    } catch (e: unknown) { setErrorM(e instanceof Error ? e.message : "Error al guardar"); setSavingM(false); }
  };

  const handleDeleteM = async () => {
    if (!deletingM) return;
    setSavingM(true);
    try {
      const { error: err } = await createClient().from("mantenimiento_vehiculos").delete().eq("id", deletingM.id);
      if (err) { setErrorM(err.message); setSavingM(false); return; }
      setSavingM(false); setDeleteMOpen(false); setDeletingM(null); fetchMantenimiento();
    } catch (e: unknown) { setErrorM(e instanceof Error ? e.message : "Error al eliminar"); setSavingM(false); }
  };

  // ── Column definitions ───────────────────────────────
  const estadoColors: Record<string, string> = {
    disponible: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    en_uso: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    mantenimiento: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    baja: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
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

  const colsV = [
    { key: "marca" as keyof Vehiculo, label: "Vehículo", render: (r: Vehiculo) => <span className="font-medium">{r.marca} {r.modelo}</span> },
    { key: "matricula" as keyof Vehiculo, label: "Matrícula" },
    { key: "tipo" as keyof Vehiculo, label: "Tipo" },
    { key: "kilometraje" as keyof Vehiculo, label: "Km", render: (r: Vehiculo) => <span>{r.kilometraje.toLocaleString()} km</span> },
    { key: "estado" as keyof Vehiculo, label: "Estado", render: (r: Vehiculo) => <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${estadoColors[r.estado]}`}>{r.estado.replace("_", " ")}</span> },
  ];

  const colsM = [
    { key: "fecha" as keyof MantenimientoVehiculo, label: "Fecha" },
    { key: "vehiculo_nombre" as string, label: "Vehículo", render: (r: MantenimientoVehiculo & { vehiculo_nombre?: string }) => <span className="font-medium">{r.vehiculo_nombre}</span> },
    { key: "tipo" as keyof MantenimientoVehiculo, label: "Tipo", render: (r: MantenimientoVehiculo) => <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${tipoColors[r.tipo]}`}>{r.tipo.replace(/_/g, " ")}</span> },
    { key: "descripcion" as keyof MantenimientoVehiculo, label: "Descripción" },
    { key: "monto" as keyof MantenimientoVehiculo, label: "Monto", render: (r: MantenimientoVehiculo) => <span className="font-semibold text-red-500">${Number(r.monto).toLocaleString("es-CO")}</span> },
    { key: "kilometraje_actual" as keyof MantenimientoVehiculo, label: "Km", render: (r: MantenimientoVehiculo) => <span>{r.kilometraje_actual ? `${r.kilometraje_actual.toLocaleString()} km` : "—"}</span> },
  ];

  return (
    <div>
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Vehículos</h2>
          <p className="text-sm text-[#86868b] mt-0.5">Gestiona la flota y el mantenimiento</p>
        </div>
        <button
          onClick={tab === "vehiculos" ? openCreateV : openCreateM}
          className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"
        >
          <Plus size={16} />
          {tab === "vehiculos" ? "Nuevo Vehículo" : "Nuevo Registro"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 mb-4 w-fit">
        <button
          onClick={() => setTab("vehiculos")}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
            tab === "vehiculos"
              ? "bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] shadow-sm"
              : "text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]"
          }`}
        >
          <Car size={15} />
          Vehículos
        </button>
        <button
          onClick={() => setTab("mantenimiento")}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
            tab === "mantenimiento"
              ? "bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] shadow-sm"
              : "text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]"
          }`}
        >
          <Wrench size={15} />
          Mantenimiento
        </button>
      </div>

      {/* Tabla Vehículos */}
      {tab === "vehiculos" && (
        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6">
          <DataTable columns={colsV} data={vehiculos} loading={loadingV} searchPlaceholder="Buscar por marca o matrícula..." searchKeys={["marca", "modelo", "matricula"]} onEdit={openEditV} onDelete={openDeleteV} />
        </div>
      )}

      {/* Tabla Mantenimiento */}
      {tab === "mantenimiento" && (
        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6">
          <DataTable columns={colsM} data={mantenimientos} loading={loadingM} searchPlaceholder="Buscar por descripción..." searchKeys={["descripcion", "fecha"]} onEdit={openEditM} onDelete={openDeleteM} />
        </div>
      )}

      {/* Modal Vehículo */}
      <Modal open={modalVOpen} onClose={() => setModalVOpen(false)} title={editingV ? "Editar Vehículo" : "Nuevo Vehículo"} maxWidth="max-w-xl">
        <div className="space-y-4">
          {errorV && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{errorV}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelCls}>Marca *</label><input type="text" value={formV.marca} onChange={(e) => setFormV({ ...formV, marca: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Modelo *</label><input type="text" value={formV.modelo} onChange={(e) => setFormV({ ...formV, modelo: e.target.value })} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={labelCls}>Matrícula *</label><input type="text" value={formV.matricula} onChange={(e) => setFormV({ ...formV, matricula: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Tipo</label><select value={formV.tipo} onChange={(e) => setFormV({ ...formV, tipo: e.target.value as TipoVehiculo })} className={inputCls}>{tipos.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className={labelCls}>Año</label><input type="number" value={formV.año} onChange={(e) => setFormV({ ...formV, año: e.target.value })} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={labelCls}>Kilometraje</label><input type="number" value={formV.kilometraje} onChange={(e) => setFormV({ ...formV, kilometraje: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Fecha ITV</label><input type="date" value={formV.fecha_itv} onChange={(e) => setFormV({ ...formV, fecha_itv: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Vence Seguro</label><input type="date" value={formV.seguro_vencimiento} onChange={(e) => setFormV({ ...formV, seguro_vencimiento: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Estado</label><select value={formV.estado} onChange={(e) => setFormV({ ...formV, estado: e.target.value as EstadoVehiculo })} className={inputCls}>{estadosV.map((e) => <option key={e} value={e}>{e.replace("_", " ")}</option>)}</select></div>
          <div><label className={labelCls}>Notas</label><textarea value={formV.notas} onChange={(e) => setFormV({ ...formV, notas: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalVOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSaveV} disabled={savingV} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">{savingV ? "Guardando..." : editingV ? "Guardar Cambios" : "Crear Vehículo"}</button>
          </div>
        </div>
      </Modal>

      {/* Modal Mantenimiento */}
      <Modal open={modalMOpen} onClose={() => setModalMOpen(false)} title={editingM ? "Editar Registro" : "Nuevo Registro de Mantenimiento"} maxWidth="max-w-xl">
        <div className="space-y-4">
          {errorM && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{errorM}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelCls}>Vehículo *</label>
              <select value={formM.vehiculo_id} onChange={(e) => setFormM({ ...formM, vehiculo_id: e.target.value })} className={inputCls}>
                <option value="">Seleccionar...</option>
                {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.matricula})</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Instructor</label>
              <select value={formM.instructor_id} onChange={(e) => setFormM({ ...formM, instructor_id: e.target.value })} className={inputCls}>
                <option value="">Sin asignar</option>
                {instructores.map((i) => <option key={i.id} value={i.id}>{i.nombre} {i.apellidos}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelCls}>Tipo</label><select value={formM.tipo} onChange={(e) => setFormM({ ...formM, tipo: e.target.value as TipoMantenimiento })} className={inputCls}>{tiposMant.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select></div>
            <div><label className={labelCls}>Fecha</label><input type="date" value={formM.fecha} onChange={(e) => setFormM({ ...formM, fecha: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Descripción *</label><input type="text" value={formM.descripcion} onChange={(e) => setFormM({ ...formM, descripcion: e.target.value })} className={inputCls} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={labelCls}>Monto ($)</label><input type="number" step="0.01" value={formM.monto} onChange={(e) => setFormM({ ...formM, monto: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Kilometraje</label><input type="number" value={formM.kilometraje_actual} onChange={(e) => setFormM({ ...formM, kilometraje_actual: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Litros</label><input type="number" step="0.01" value={formM.litros} onChange={(e) => setFormM({ ...formM, litros: e.target.value })} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={labelCls}>$/Litro</label><input type="number" step="0.01" value={formM.precio_por_litro} onChange={(e) => setFormM({ ...formM, precio_por_litro: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Proveedor</label><input type="text" value={formM.proveedor} onChange={(e) => setFormM({ ...formM, proveedor: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>N° Factura</label><input type="text" value={formM.numero_factura} onChange={(e) => setFormM({ ...formM, numero_factura: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Notas</label><textarea value={formM.notas} onChange={(e) => setFormM({ ...formM, notas: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalMOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSaveM} disabled={savingM} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">{savingM ? "Guardando..." : editingM ? "Guardar Cambios" : "Crear Registro"}</button>
          </div>
        </div>
      </Modal>

      <DeleteConfirm open={deleteVOpen} onClose={() => setDeleteVOpen(false)} onConfirm={handleDeleteV} loading={savingV} message={`¿Eliminar ${deletingV?.marca} ${deletingV?.modelo} (${deletingV?.matricula})?`} />
      <DeleteConfirm open={deleteMOpen} onClose={() => setDeleteMOpen(false)} onConfirm={handleDeleteM} loading={savingM} message="¿Eliminar este registro de mantenimiento?" />
    </div>
  );
}
