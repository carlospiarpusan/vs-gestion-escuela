"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { Ingreso, CategoriaIngreso, MetodoPago, EstadoIngreso, Alumno } from "@/types/database";
import { Plus, X } from "lucide-react";

const categorias: CategoriaIngreso[] = ["matricula", "mensualidad", "clase_suelta", "examen_teorico", "examen_practico", "material", "tasas_dgt", "otros"];
const metodos: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "datafono", label: "Datáfono" },
  { value: "nequi", label: "Nequi" },
  { value: "sistecredito", label: "Sistecrédito" },
  { value: "otro", label: "Otro" },
];
const estadosIngreso: EstadoIngreso[] = ["cobrado", "pendiente", "anulado"];

const emptyForm = {
  alumno_id: "", categoria: "mensualidad" as CategoriaIngreso, concepto: "",
  monto: "", metodo_pago: "efectivo" as MetodoPago, medio_especifico: "",
  numero_factura: "", fecha: new Date().toISOString().split("T")[0],
  estado: "cobrado" as EstadoIngreso, notas: "",
};

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]";
const labelCls = "block text-xs text-[#86868b] mb-1";

export default function IngresosPage() {
  const { perfil } = useAuth();

  const [data, setData] = useState<(Ingreso & { alumno_nombre?: string })[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroAlumno, setFiltroAlumno] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Ingreso | null>(null);
  const [deleting, setDeleting] = useState<Ingreso | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!perfil?.escuela_id) return;
    const supabase = createClient();
    const [ingresosRes, alumnosRes] = await Promise.all([
      supabase
        .from("ingresos")
        .select("id, alumno_id, categoria, concepto, monto, metodo_pago, medio_especifico, numero_factura, fecha, estado, notas, created_at")
        .eq("escuela_id", perfil.escuela_id)
        .order("fecha", { ascending: false }),
      supabase.from("alumnos").select("id, nombre, apellidos").eq("escuela_id", perfil.escuela_id),
    ]);
    const alumnosMap = new Map(
      (alumnosRes.data || []).map((a: { id: string; nombre: string; apellidos: string }) => [
        a.id, `${a.nombre} ${a.apellidos}`,
      ])
    );
    const ingresos = ((ingresosRes.data as Ingreso[]) || []).map((i) => ({
      ...i,
      alumno_nombre: i.alumno_id ? alumnosMap.get(i.alumno_id) || "—" : "—",
    }));
    setData(ingresos);
    setAlumnos((alumnosRes.data as Alumno[]) || []);
    setLoading(false);
  }, [perfil?.escuela_id]);

  useEffect(() => {
    if (perfil) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  // Aplicar filtros: día tiene prioridad sobre mes
  const datosFiltrados = useMemo(() => {
    return data.filter((row) => {
      if (filtroAlumno && row.alumno_id !== filtroAlumno) return false;
      if (filtroFecha) {
        if (row.fecha !== filtroFecha) return false;
      } else if (filtroMes) {
        if (!row.fecha.startsWith(filtroMes)) return false;
      }
      if (filtroMetodo && row.metodo_pago !== filtroMetodo) return false;
      return true;
    });
  }, [data, filtroAlumno, filtroFecha, filtroMes, filtroMetodo]);

  const totalFiltrado = useMemo(
    () => datosFiltrados.reduce((s, r) => s + Number(r.monto), 0),
    [datosFiltrados]
  );

  const hayFiltros = filtroAlumno || filtroFecha || filtroMes || filtroMetodo;

  const limpiarFiltros = () => {
    setFiltroAlumno("");
    setFiltroFecha("");
    setFiltroMes("");
    setFiltroMetodo("");
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(""); setModalOpen(true); };

  const openEdit = (row: Ingreso) => {
    setEditing(row);
    setForm({
      alumno_id: row.alumno_id || "", categoria: row.categoria, concepto: row.concepto,
      monto: row.monto.toString(), metodo_pago: row.metodo_pago,
      medio_especifico: row.medio_especifico || "", numero_factura: row.numero_factura || "",
      fecha: row.fecha, estado: row.estado, notas: row.notas || "",
    });
    setError(""); setModalOpen(true);
  };

  const openDelete = (row: Ingreso) => { setDeleting(row); setDeleteOpen(true); };

  const handleSave = async () => {
    if (!form.concepto || !form.monto) { setError("Concepto y monto son obligatorios."); return; }
    const montoNum = parseFloat(form.monto);
    if (isNaN(montoNum)) { setError("El monto debe ser un valor numérico válido."); return; }

    setSaving(true); setError("");
    try {
      const supabase = createClient();
      const payload = {
        alumno_id: form.alumno_id || null, categoria: form.categoria, concepto: form.concepto,
        monto: montoNum, metodo_pago: form.metodo_pago,
        medio_especifico: form.medio_especifico || null, numero_factura: form.numero_factura || null,
        fecha: form.fecha, estado: form.estado, notas: form.notas || null,
      };

      if (editing) {
        const { error: err } = await supabase.from("ingresos").update(payload).eq("id", editing.id);
        if (err) { setError(err.message); setSaving(false); return; }
      } else {
        if (!perfil) return;
        // Determinar sede_id (admin_escuela puede no tener sede_id en perfil)
        let sedeId = perfil.sede_id;
        if (!sedeId && perfil.escuela_id) {
          const { data: sedeData } = await supabase
            .from("sedes").select("id")
            .eq("escuela_id", perfil.escuela_id)
            .order("es_principal", { ascending: false })
            .limit(1).single();
          sedeId = sedeData?.id || null;
        }
        const { error: err } = await supabase.from("ingresos").insert({
          ...payload,
          escuela_id: perfil.escuela_id,
          sede_id: sedeId,
          user_id: perfil.id,
        });
        if (err) { setError(err.message); setSaving(false); return; }
      }
      setSaving(false); setModalOpen(false); fetchData();
    } catch (networkErr: unknown) {
      setError(networkErr instanceof Error ? networkErr.message : "Error de red al guardar.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const { error: err } = await createClient().from("ingresos").delete().eq("id", deleting.id);
      if (err) { setError(err.message); setSaving(false); return; }
      setSaving(false); setDeleteOpen(false); setDeleting(null); fetchData();
    } catch (networkErr: unknown) {
      setError(networkErr instanceof Error ? networkErr.message : "Error de red al eliminar.");
      setSaving(false);
    }
  };

  const estadoColors: Record<string, string> = {
    cobrado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    anulado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const columns = [
    { key: "fecha" as keyof Ingreso, label: "Fecha" },
    {
      key: "concepto" as keyof Ingreso, label: "Concepto",
      render: (r: Ingreso) => <span className="font-medium">{r.concepto}</span>,
    },
    {
      key: "alumno_nombre" as string, label: "Alumno",
      render: (r: Ingreso & { alumno_nombre?: string }) => <span>{r.alumno_nombre}</span>,
    },
    {
      key: "monto" as keyof Ingreso, label: "Monto",
      render: (r: Ingreso) => (
        <span className="font-semibold text-green-600 dark:text-green-400">
          ${Number(r.monto).toLocaleString("es-CO")}
        </span>
      ),
    },
    {
      key: "metodo_pago" as keyof Ingreso, label: "Método",
      render: (r: Ingreso) => (
        <span className="px-2 py-0.5 text-xs rounded-full bg-[#0071e3]/10 text-[#0071e3] font-medium capitalize">
          {metodos.find((m) => m.value === r.metodo_pago)?.label || r.metodo_pago}
        </span>
      ),
    },
    {
      key: "estado" as keyof Ingreso, label: "Estado",
      render: (r: Ingreso) => (
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${estadoColors[r.estado]}`}>
          {r.estado}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Ingresos</h2>
          <p className="text-sm text-[#86868b] mt-0.5">Registra y filtra los ingresos de tu escuela</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"
        >
          <Plus size={16} /> Nuevo Ingreso
        </button>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-xl px-4 py-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Alumno */}
          <div>
            <label className={labelCls}>Alumno</label>
            <select
              value={filtroAlumno}
              onChange={(e) => setFiltroAlumno(e.target.value)}
              className={inputCls}
            >
              <option value="">Todos</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre} {a.apellidos}</option>
              ))}
            </select>
          </div>

          {/* Método de pago */}
          <div>
            <label className={labelCls}>Método de pago</label>
            <select
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
              className={inputCls}
            >
              <option value="">Todos</option>
              {metodos.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Mes */}
          <div>
            <label className={labelCls}>Mes</label>
            <input
              type="month"
              value={filtroMes}
              onChange={(e) => { setFiltroMes(e.target.value); setFiltroFecha(""); }}
              className={inputCls}
            />
          </div>

          {/* Día específico */}
          <div>
            <label className={labelCls}>Día específico</label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => { setFiltroFecha(e.target.value); setFiltroMes(""); }}
              className={inputCls}
            />
          </div>
        </div>

        {/* Limpiar filtros */}
        {hayFiltros && (
          <div className="mt-3 flex">
            <button
              onClick={limpiarFiltros}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg text-[#86868b] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <X size={12} />
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Resumen del filtro */}
        {hayFiltros && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-[#86868b]">
              {datosFiltrados.length} ingreso{datosFiltrados.length !== 1 ? "s" : ""} encontrado{datosFiltrados.length !== 1 ? "s" : ""}
            </p>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              Total: ${totalFiltrado.toLocaleString("es-CO")}
            </p>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6">
        {/* Total general cuando no hay filtros */}
        {!hayFiltros && !loading && data.length > 0 && (
          <div className="flex justify-end mb-3">
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              Total: ${data.reduce((s, r) => s + Number(r.monto), 0).toLocaleString("es-CO")}
            </p>
          </div>
        )}
        <DataTable
          columns={columns}
          data={datosFiltrados}
          loading={loading}
          searchPlaceholder="Buscar por concepto..."
          searchKeys={["concepto"]}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      </div>

      {/* Modal Crear/Editar */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Ingreso" : "Nuevo Ingreso"} maxWidth="max-w-xl">
        <div className="space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Categoría</label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaIngreso })} className={inputCls}>
                {categorias.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Alumno</label>
              <select value={form.alumno_id} onChange={(e) => setForm({ ...form, alumno_id: e.target.value })} className={inputCls}>
                <option value="">Sin alumno</option>
                {alumnos.map((a) => <option key={a.id} value={a.id}>{a.nombre} {a.apellidos}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Concepto *</label>
            <input type="text" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} className={inputCls} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Monto *</label>
              <input type="number" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Método de pago</label>
              <select value={form.metodo_pago} onChange={(e) => setForm({ ...form, metodo_pago: e.target.value as MetodoPago })} className={inputCls}>
                {metodos.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fecha</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoIngreso })} className={inputCls}>
                {estadosIngreso.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Medio específico</label>
              <input type="text" value={form.medio_especifico} onChange={(e) => setForm({ ...form, medio_especifico: e.target.value })} className={inputCls} placeholder="Ej: Nequi 300..." />
            </div>
            <div>
              <label className={labelCls}>N° Factura</label>
              <input type="text" value={form.numero_factura} onChange={(e) => setForm({ ...form, numero_factura: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notas</label>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Ingreso"}</button>
          </div>
        </div>
      </Modal>

      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} loading={saving} message="¿Eliminar este ingreso? Esta acción no se puede deshacer." />
    </div>
  );
}
