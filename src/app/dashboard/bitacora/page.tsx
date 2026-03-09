"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Fuel, Wrench, Settings, Droplets, Car } from "lucide-react";

// ─── Tipos ─────────────────────────────────────────────────────

interface Vehiculo {
  id: string;
  marca: string;
  modelo: string;
  matricula: string;
  kilometraje: number;
}

interface Registro {
  id: string;
  tipo: string;
  descripcion: string;
  monto: number;
  kilometraje_actual: number | null;
  litros: number | null;
  precio_por_litro: number | null;
  fecha: string;
  notas: string | null;
  vehiculo_id: string;
  vehiculo_marca?: string;
  vehiculo_modelo?: string;
  vehiculo_matricula?: string;
}

type TipoBitacora = "gasolina" | "reparacion" | "cambio_aceite" | "revision_general";

const TIPOS: { value: TipoBitacora; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "gasolina", label: "Tanqueo", icon: <Fuel size={18} />, color: "#ff9f0a" },
  { value: "reparacion", label: "Reparación", icon: <Wrench size={18} />, color: "#ff453a" },
  { value: "revision_general", label: "Mantenimiento", icon: <Settings size={18} />, color: "#0071e3" },
  { value: "cambio_aceite", label: "Cambio de Aceite", icon: <Droplets size={18} />, color: "#30d158" },
];

const TIPO_LABEL: Record<string, string> = {
  gasolina: "Tanqueo",
  reparacion: "Reparación",
  revision_general: "Mantenimiento",
  cambio_aceite: "Cambio de Aceite",
  repuesto: "Repuesto",
  mano_obra: "Mano de Obra",
  lavado: "Lavado",
  neumaticos: "Neumáticos",
  otros: "Otros",
};

const TIPO_COLOR: Record<string, string> = {
  gasolina: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  reparacion: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  revision_general: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cambio_aceite: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const fmtFecha = (f: string) =>
  new Date(f + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

const fmtKm = (km: number) => new Intl.NumberFormat("es-CO").format(km) + " km";

// ─── Formulario vacío ──────────────────────────────────────────

const emptyForm = {
  tipo: "gasolina" as TipoBitacora,
  vehiculo_id: "",
  kilometraje_actual: "",
  descripcion: "",
  monto: "",
  litros: "",
  precio_por_litro: "",
  notas: "",
  fecha: new Date().toISOString().split("T")[0],
};

// ─── Componente ────────────────────────────────────────────────

export default function BitacoraPage() {
  const { user, perfil } = useAuth();

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  const isInstructor = perfil?.rol === "instructor";

  // ── Carga de datos ────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!perfil?.escuela_id || !user) return;
    setLoading(true);
    const supabase = createClient();

    // Obtener el instructor_id del usuario actual (si es instructor)
    let instId = instructorId;
    if (!instId && isInstructor) {
      const { data: inst } = await supabase
        .from("instructores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      instId = inst?.id ?? null;
      setInstructorId(instId);
    }

    // Cargar vehículos de la escuela
    const { data: vehiculosData } = await supabase
      .from("vehiculos")
      .select("id, marca, modelo, matricula, kilometraje")
      .eq("escuela_id", perfil.escuela_id)
      .in("estado", ["disponible", "en_uso"])
      .order("marca");

    setVehiculos(vehiculosData || []);

    // Cargar registros — instructor solo ve los suyos, admin ve todos
    let query = supabase
      .from("mantenimiento_vehiculos")
      .select("id, tipo, descripcion, monto, kilometraje_actual, litros, precio_por_litro, fecha, notas, vehiculo_id")
      .eq("escuela_id", perfil.escuela_id)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (isInstructor && instId) {
      query = query.eq("instructor_id", instId);
    }

    const { data: registrosData } = await query;

    // Enriquecer con datos de vehículo
    const vMap = new Map((vehiculosData || []).map(v => [v.id, v]));
    const enriched = (registrosData || []).map(r => {
      const v = vMap.get(r.vehiculo_id);
      return {
        ...r,
        vehiculo_marca: v?.marca ?? "",
        vehiculo_modelo: v?.modelo ?? "",
        vehiculo_matricula: v?.matricula ?? "",
      };
    });

    setRegistros(enriched);
    setLoading(false);
  }, [perfil?.escuela_id, user, isInstructor, instructorId]);

  useEffect(() => {
    if (perfil && user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id, user?.id]);

  // ── Guardar registro ──────────────────────────────────────────

  const handleSave = async () => {
    if (!form.vehiculo_id) { setError("Selecciona un vehículo."); return; }
    if (!form.kilometraje_actual) { setError("El kilometraje es obligatorio."); return; }
    if (!form.descripcion.trim()) { setError("La descripción es obligatoria."); return; }
    if (form.tipo === "gasolina" && !form.litros) { setError("Ingresa los litros de combustible."); return; }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const supabase = createClient();

      // Obtener instructor_id si no lo tenemos
      let instId = instructorId;
      if (!instId && user) {
        const { data: inst } = await supabase
          .from("instructores")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        instId = inst?.id ?? null;
        setInstructorId(instId);
      }

      const km = parseInt(form.kilometraje_actual, 10) || 0;

      const record: Record<string, unknown> = {
        escuela_id: perfil!.escuela_id,
        sede_id: perfil!.sede_id,
        vehiculo_id: form.vehiculo_id,
        instructor_id: instId,
        user_id: user!.id,
        tipo: form.tipo,
        descripcion: form.descripcion.trim(),
        monto: parseFloat(form.monto) || 0,
        kilometraje_actual: km,
        fecha: form.fecha,
        notas: form.notas.trim() || null,
      };

      if (form.tipo === "gasolina") {
        record.litros = parseFloat(form.litros) || null;
        record.precio_por_litro = parseFloat(form.precio_por_litro) || null;
      }

      // Si no tiene sede_id, buscar la principal
      if (!record.sede_id) {
        const { data: sedeData } = await supabase
          .from("sedes")
          .select("id")
          .eq("escuela_id", perfil!.escuela_id)
          .order("es_principal", { ascending: false })
          .limit(1)
          .maybeSingle();
        record.sede_id = sedeData?.id;
      }

      const { error: dbErr } = await supabase.from("mantenimiento_vehiculos").insert(record);

      if (dbErr) { setError(dbErr.message); setSaving(false); return; }

      // Actualizar kilometraje del vehículo si es mayor al actual
      const vehiculo = vehiculos.find(v => v.id === form.vehiculo_id);
      if (vehiculo && km > vehiculo.kilometraje) {
        await supabase
          .from("vehiculos")
          .update({ kilometraje: km })
          .eq("id", form.vehiculo_id);
      }

      setSaving(false);
      setSuccess("Registro guardado correctamente.");
      setForm(emptyForm);
      setShowForm(false);
      fetchData();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setSaving(false);
    }
  };

  // ── Filtrar registros ─────────────────────────────────────────

  const registrosFiltrados = filtroTipo === "todos"
    ? registros
    : registros.filter(r => r.tipo === filtroTipo);

  // ── Clases CSS ────────────────────────────────────────────────

  const inputCls = "apple-input";
  const labelCls = "apple-label";

  // ── Render ────────────────────────────────────────────────────

  return (
    <div>
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Bitácora de Vehículos
          </h2>
          <p className="text-sm text-[#86868b] mt-0.5">
            {isInstructor
              ? "Registra tanqueos, reparaciones y mantenimientos"
              : "Historial de mantenimiento y tanqueos de vehículos"}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"
        >
          <Plus size={16} /> Nuevo Registro
        </button>
      </div>

      {/* Mensaje de éxito */}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium animate-fade-in">
          {success}
        </div>
      )}

      {/* ── Formulario de nuevo registro ── */}
      {showForm && (
        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-5 sm:p-6 mb-6 border border-gray-100 dark:border-gray-800 shadow-sm animate-fade-in">
          <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-4">Nuevo registro</h3>

          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mb-4">{error}</p>}

          {/* Tipo — botones grandes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {TIPOS.map(t => {
              const sel = form.tipo === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, tipo: t.value }))}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    sel
                      ? "border-[#0071e3] bg-[#0071e3]/5 dark:bg-[#0071e3]/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <span style={{ color: sel ? t.color : "#86868b" }}>{t.icon}</span>
                  <span className={`text-xs font-medium ${sel ? "text-[#0071e3]" : "text-[#86868b]"}`}>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Vehículo + Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Vehículo *</label>
              <div className="relative">
                <Car size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
                <select
                  value={form.vehiculo_id}
                  onChange={e => setForm(prev => ({ ...prev, vehiculo_id: e.target.value }))}
                  className={`${inputCls} pl-8`}
                >
                  <option value="">Selecciona un vehículo</option>
                  {vehiculos.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.marca} {v.modelo} — {v.matricula} ({fmtKm(v.kilometraje)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Fecha *</label>
              <input
                type="date"
                value={form.fecha}
                onChange={e => setForm(prev => ({ ...prev, fecha: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Kilometraje + Monto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Kilometraje actual *</label>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={form.kilometraje_actual}
                onChange={e => setForm(prev => ({ ...prev, kilometraje_actual: e.target.value }))}
                placeholder="Ej: 45320"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Costo total ($)</label>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={form.monto}
                onChange={e => setForm(prev => ({ ...prev, monto: e.target.value }))}
                placeholder="0"
                className={inputCls}
              />
            </div>
          </div>

          {/* Campos extra para gasolina */}
          {form.tipo === "gasolina" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Litros *</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.litros}
                  onChange={e => setForm(prev => ({ ...prev, litros: e.target.value }))}
                  placeholder="Ej: 12.5"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Precio por litro ($)</label>
                <input
                  type="number"
                  min="0"
                  value={form.precio_por_litro}
                  onChange={e => setForm(prev => ({ ...prev, precio_por_litro: e.target.value }))}
                  placeholder="Ej: 15200"
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* Descripción */}
          <div className="mb-4">
            <label className={labelCls}>Descripción *</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder={
                form.tipo === "gasolina" ? "Ej: Tanqueo completo en estación Terpel"
                : form.tipo === "reparacion" ? "Ej: Se reparó el freno trasero derecho"
                : form.tipo === "cambio_aceite" ? "Ej: Cambio de aceite sintético 10W-40"
                : "Ej: Revisión general de frenos y luces"
              }
              rows={2}
              className={inputCls}
            />
          </div>

          {/* Notas */}
          <div className="mb-5">
            <label className={labelCls}>Notas adicionales</label>
            <input
              type="text"
              value={form.notas}
              onChange={e => setForm(prev => ({ ...prev, notas: e.target.value }))}
              placeholder="Opcional"
              className={inputCls}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setShowForm(false); setError(""); }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50 font-medium"
            >
              {saving ? "Guardando..." : "Guardar Registro"}
            </button>
          </div>
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFiltroTipo("todos")}
          className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
            filtroTipo === "todos"
              ? "bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f]"
              : "bg-gray-100 dark:bg-gray-800 text-[#86868b] hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Todos
        </button>
        {TIPOS.map(t => (
          <button
            key={t.value}
            onClick={() => setFiltroTipo(t.value)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors flex items-center gap-1.5 ${
              filtroTipo === t.value
                ? "bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f]"
                : "bg-gray-100 dark:bg-gray-800 text-[#86868b] hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Lista de registros ── */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-[#86868b]">
            <Car size={32} className="opacity-40" />
            <p className="text-sm">No hay registros {filtroTipo !== "todos" ? `de ${TIPO_LABEL[filtroTipo]?.toLowerCase()}` : ""}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {registrosFiltrados.map(r => (
              <div key={r.id} className="px-4 sm:px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                {/* Icono tipo */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    backgroundColor: (TIPOS.find(t => t.value === r.tipo)?.color ?? "#86868b") + "15",
                    color: TIPOS.find(t => t.value === r.tipo)?.color ?? "#86868b",
                  }}
                >
                  {TIPOS.find(t => t.value === r.tipo)?.icon ?? <Settings size={18} />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${TIPO_COLOR[r.tipo] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {TIPO_LABEL[r.tipo] ?? r.tipo}
                    </span>
                    <span className="text-xs text-[#86868b]">{fmtFecha(r.fecha)}</span>
                  </div>
                  <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mt-1 truncate">
                    {r.descripcion}
                  </p>
                  <p className="text-xs text-[#86868b] mt-0.5">
                    {r.vehiculo_marca} {r.vehiculo_modelo} — {r.vehiculo_matricula}
                    {r.kilometraje_actual ? ` · ${fmtKm(r.kilometraje_actual)}` : ""}
                    {r.tipo === "gasolina" && r.litros ? ` · ${r.litros} L` : ""}
                  </p>
                </div>

                {/* Monto */}
                {r.monto > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {fmtCOP(r.monto)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
