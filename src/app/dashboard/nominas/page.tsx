"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  UserCheck,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  CreditCard,
  Ban,
  Trash2,
  Edit3,
  RefreshCw,
  X,
  Heart,
  Shield,
  Briefcase,
} from "lucide-react";
import type {
  TipoEmpleadoNomina,
  TipoContratoNomina,
  EstadoNomina,
  TipoConceptoNomina,
} from "@/types/database";

// ── Tipos locales ────────────────────────────────────────────────────
type ConceptoForm = {
  tipo: TipoConceptoNomina;
  concepto: string;
  descripcion: string;
  valor: number;
};

type NominaRow = {
  id: string;
  escuela_id: string;
  sede_id: string;
  empleado_tipo: TipoEmpleadoNomina;
  empleado_id: string;
  empleado_nombre: string;
  periodo_anio: number;
  periodo_mes: number;
  tipo_contrato: TipoContratoNomina;
  salario_base: number;
  total_devengado: number;
  total_deducciones: number;
  neto_pagar: number;
  estado: EstadoNomina;
  fecha_pago: string | null;
  notas: string | null;
  nomina_conceptos: Array<{
    id: string;
    tipo: TipoConceptoNomina;
    concepto: string;
    descripcion: string | null;
    valor: number;
  }>;
};

type EmpleadoOption = { id: string; nombre: string; sede_id: string };
type SedeOption = { id: string; nombre: string; es_principal: boolean | null };

// ── Constantes ───────────────────────────────────────────────────────
const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const CONCEPTOS_INSTRUCTOR: ConceptoForm[] = [
  {
    tipo: "deduccion",
    concepto: "Seguridad social - Salud",
    descripcion: "Aporte salud (12.5%)",
    valor: 0,
  },
  {
    tipo: "deduccion",
    concepto: "Seguridad social - Pensión",
    descripcion: "Aporte pensión (16%)",
    valor: 0,
  },
  { tipo: "deduccion", concepto: "ARL", descripcion: "Riesgos laborales", valor: 0 },
  { tipo: "devengo", concepto: "Bonificación", descripcion: "", valor: 0 },
];

const CONCEPTOS_ADMINISTRATIVO: ConceptoForm[] = [
  { tipo: "devengo", concepto: "Auxilio de transporte", descripcion: "", valor: 0 },
  { tipo: "devengo", concepto: "Bonificación", descripcion: "", valor: 0 },
  { tipo: "deduccion", concepto: "Salud empleado", descripcion: "4% del salario", valor: 0 },
  { tipo: "deduccion", concepto: "Pensión empleado", descripcion: "4% del salario", valor: 0 },
  { tipo: "deduccion", concepto: "Salud empresa", descripcion: "8.5% aporte patronal", valor: 0 },
  { tipo: "deduccion", concepto: "Pensión empresa", descripcion: "12% aporte patronal", valor: 0 },
  { tipo: "deduccion", concepto: "ARL", descripcion: "Riesgos laborales", valor: 0 },
  { tipo: "deduccion", concepto: "Caja de compensación", descripcion: "4%", valor: 0 },
];

const ESTADO_STYLES: Record<EstadoNomina, { bg: string; text: string; label: string }> = {
  borrador: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-300",
    label: "Borrador",
  },
  aprobada: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    label: "Aprobada",
  },
  pagada: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-300",
    label: "Pagada",
  },
  anulada: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    label: "Anulada",
  },
};

function formatMoney(val: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val);
}

// ── Componente principal ─────────────────────────────────────────────
export default function NominasPage() {
  const { perfil, activeEscuelaId } = useAuth();
  const escuelaId = activeEscuelaId ?? perfil?.escuela_id;
  const sedeId = perfil?.sede_id;

  const [tab, setTab] = useState<TipoEmpleadoNomina>("instructor");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [nominas, setNominas] = useState<NominaRow[]>([]);
  const [instructores, setInstructores] = useState<EmpleadoOption[]>([]);
  const [administrativos, setAdministrativos] = useState<EmpleadoOption[]>([]);
  const [sedes, setSedes] = useState<SedeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Formulario ────────────────────────────────────────────────────
  const [formEmpleadoId, setFormEmpleadoId] = useState("");
  const [formSedeId, setFormSedeId] = useState(sedeId ?? "");
  const [formSalarioBase, setFormSalarioBase] = useState(0);
  const [formConceptos, setFormConceptos] = useState<ConceptoForm[]>([]);
  const [formNotas, setFormNotas] = useState("");

  // ── Fetch nóminas ─────────────────────────────────────────────────
  const fetchNominas = useCallback(async () => {
    if (!escuelaId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        escuela_id: escuelaId,
        anio: String(anio),
        mes: String(mes),
        tipo: tab,
      });
      if (sedeId) params.set("sede_id", sedeId);

      const res = await fetch(`/api/nominas?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al cargar");

      setNominas(json.nominas ?? []);
      setInstructores(json.instructores ?? []);
      setAdministrativos(json.administrativos ?? []);
      setSedes(json.sedes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [escuelaId, sedeId, anio, mes, tab]);

  useEffect(() => {
    void fetchNominas();
  }, [fetchNominas]);

  // ── Empleados filtrados por tab ───────────────────────────────────
  const empleados = tab === "instructor" ? instructores : administrativos;
  const empleadosSinNomina = empleados.filter((e) => !nominas.some((n) => n.empleado_id === e.id));

  // ── Totales del periodo ───────────────────────────────────────────
  const resumen = useMemo(() => {
    const filtered = nominas.filter((n) => n.empleado_tipo === tab);
    return {
      total: filtered.length,
      devengado: filtered.reduce((s, n) => s + Number(n.total_devengado), 0),
      deducciones: filtered.reduce((s, n) => s + Number(n.total_deducciones), 0),
      neto: filtered.reduce((s, n) => s + Number(n.neto_pagar), 0),
      pagadas: filtered.filter((n) => n.estado === "pagada").length,
      pendientes: filtered.filter((n) => n.estado !== "pagada" && n.estado !== "anulada").length,
    };
  }, [nominas, tab]);

  // ── Abrir formulario ──────────────────────────────────────────────
  const openNewForm = useCallback(() => {
    setEditingId(null);
    setFormEmpleadoId("");
    setFormSedeId(sedeId ?? sedes[0]?.id ?? "");
    setFormSalarioBase(0);
    setFormConceptos(
      tab === "instructor"
        ? CONCEPTOS_INSTRUCTOR.map((c) => ({ ...c }))
        : CONCEPTOS_ADMINISTRATIVO.map((c) => ({ ...c }))
    );
    setFormNotas("");
    setShowForm(true);
  }, [tab, sedeId, sedes]);

  const openEditForm = useCallback((nomina: NominaRow) => {
    setEditingId(nomina.id);
    setFormEmpleadoId(nomina.empleado_id);
    setFormSedeId(nomina.sede_id);
    setFormSalarioBase(Number(nomina.salario_base));
    // Reconstruct conceptos from the saved data (skip first "Honorarios"/"Salario base")
    const conceptosSaved = (nomina.nomina_conceptos ?? [])
      .filter((c) => c.concepto !== "Honorarios" && c.concepto !== "Salario base")
      .map((c) => ({
        tipo: c.tipo,
        concepto: c.concepto,
        descripcion: c.descripcion ?? "",
        valor: Number(c.valor),
      }));
    setFormConceptos(
      conceptosSaved.length > 0
        ? conceptosSaved
        : nomina.empleado_tipo === "instructor"
          ? CONCEPTOS_INSTRUCTOR.map((c) => ({ ...c }))
          : CONCEPTOS_ADMINISTRATIVO.map((c) => ({ ...c }))
    );
    setFormNotas(nomina.notas ?? "");
    setShowForm(true);
  }, []);

  // ── Guardar nómina ────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!escuelaId) return;
    const empleado = empleados.find((e) => e.id === formEmpleadoId);
    if (!empleado && !editingId) {
      setError("Selecciona un empleado.");
      return;
    }

    setSaving(true);
    setError(null);

    const conceptosActivos = formConceptos.filter((c) => c.valor > 0);

    try {
      if (editingId) {
        // PATCH
        const res = await fetch("/api/nominas", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nomina_id: editingId,
            salario_base: formSalarioBase,
            conceptos: conceptosActivos,
            notas: formNotas || null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Error al actualizar");
      } else {
        // POST
        const res = await fetch("/api/nominas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            escuela_id: escuelaId,
            sede_id: formSedeId || sedeId || sedes[0]?.id,
            empleado_tipo: tab,
            empleado_id: formEmpleadoId,
            empleado_nombre: empleado!.nombre,
            periodo_anio: anio,
            periodo_mes: mes,
            tipo_contrato: tab === "instructor" ? "prestacion_servicios" : "contrato_laboral",
            salario_base: formSalarioBase,
            conceptos: conceptosActivos,
            notas: formNotas || null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Error al crear");
      }

      setShowForm(false);
      void fetchNominas();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }, [
    escuelaId,
    sedeId,
    sedes,
    tab,
    anio,
    mes,
    formEmpleadoId,
    formSedeId,
    formSalarioBase,
    formConceptos,
    formNotas,
    empleados,
    editingId,
    fetchNominas,
  ]);

  // ── Cambiar estado ────────────────────────────────────────────────
  const changeEstado = useCallback(
    async (nominaId: string, estado: EstadoNomina, fechaPago?: string) => {
      setSaving(true);
      try {
        const body: Record<string, unknown> = { nomina_id: nominaId, estado };
        if (fechaPago) body.fecha_pago = fechaPago;
        if (estado !== "pagada") body.fecha_pago = null;

        const res = await fetch("/api/nominas", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error);
        }
        void fetchNominas();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setSaving(false);
      }
    },
    [fetchNominas]
  );

  // ── Eliminar ──────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (nominaId: string, nombre: string) => {
      if (!confirm(`¿Eliminar la nómina de ${nombre}?`)) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/nominas?id=${nominaId}`, { method: "DELETE" });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error);
        }
        void fetchNominas();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setSaving(false);
      }
    },
    [fetchNominas]
  );

  // ── Navegación de periodo ─────────────────────────────────────────
  const prevMonth = () => {
    if (mes === 1) {
      setMes(12);
      setAnio(anio - 1);
    } else setMes(mes - 1);
  };
  const nextMonth = () => {
    if (mes === 12) {
      setMes(1);
      setAnio(anio + 1);
    } else setMes(mes + 1);
  };

  // ── Actualizar concepto ───────────────────────────────────────────
  const updateConcepto = (idx: number, field: keyof ConceptoForm, value: string | number) => {
    setFormConceptos((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };
  const addConcepto = () => {
    setFormConceptos((prev) => [
      ...prev,
      { tipo: "devengo", concepto: "", descripcion: "", valor: 0 },
    ]);
  };
  const removeConcepto = (idx: number) => {
    setFormConceptos((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Calcular totales del form ─────────────────────────────────────
  const formDevengado =
    formSalarioBase +
    formConceptos.filter((c) => c.tipo === "devengo").reduce((s, c) => s + c.valor, 0);
  const formDeducciones = formConceptos
    .filter((c) => c.tipo === "deduccion")
    .reduce((s, c) => s + c.valor, 0);
  const formNeto = formDevengado - formDeducciones;

  const nominasFiltradas = nominas.filter((n) => n.empleado_tipo === tab);

  if (!escuelaId) {
    return (
      <div className="p-6 text-center text-[#86868b]">
        Selecciona una escuela para gestionar nóminas.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">Nóminas</h2>
          <p className="text-sm text-[#86868b]">
            Gestión de pagos mensuales a instructores y administrativos.
          </p>
        </div>
        <button
          onClick={openNewForm}
          disabled={empleadosSinNomina.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0071e3] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
        >
          <Plus size={16} />
          Nueva nómina
        </button>
      </div>

      {/* Tabs instructores / administrativos */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800/60">
        <button
          onClick={() => setTab("instructor")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            tab === "instructor"
              ? "bg-white text-[#1d1d1f] shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
          }`}
        >
          <UserCheck size={16} />
          Instructores
        </button>
        <button
          onClick={() => setTab("administrativo")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            tab === "administrativo"
              ? "bg-white text-[#1d1d1f] shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
          }`}
        >
          <Users size={16} />
          Administrativos
        </button>
      </div>

      {/* Navegación de periodo */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800/40">
        <button
          onClick={prevMonth}
          className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
          {MESES[mes - 1]} {anio}
        </span>
        <button
          onClick={nextMonth}
          className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Resumen KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/40">
          <p className="text-xs text-[#86868b]">Total devengado</p>
          <p className="mt-1 text-lg font-bold text-[#1d1d1f] dark:text-white">
            {formatMoney(resumen.devengado)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/40">
          <p className="text-xs text-[#86868b]">Deducciones</p>
          <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">
            {formatMoney(resumen.deducciones)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/40">
          <p className="text-xs text-[#86868b]">Neto a pagar</p>
          <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(resumen.neto)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/40">
          <p className="text-xs text-[#86868b]">Nóminas</p>
          <p className="mt-1 text-lg font-bold text-[#1d1d1f] dark:text-white">
            {resumen.pagadas}/{resumen.total}
            <span className="ml-1 text-xs font-normal text-[#86868b]">pagadas</span>
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={20} className="animate-spin text-[#86868b]" />
          <span className="ml-2 text-sm text-[#86868b]">Cargando nóminas...</span>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/40">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
              {editingId ? "Editar nómina" : "Nueva nómina"} —{" "}
              {tab === "instructor" ? "Instructor" : "Administrativo"}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-[#86868b] hover:text-[#1d1d1f]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Empleado */}
            {!editingId && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[#86868b]">
                  {tab === "instructor" ? "Instructor" : "Empleado"}
                </label>
                <select
                  value={formEmpleadoId}
                  onChange={(e) => setFormEmpleadoId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Seleccionar...</option>
                  {empleadosSinNomina.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sede */}
            {!editingId && sedes.length > 1 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[#86868b]">Sede</label>
                <select
                  value={formSedeId}
                  onChange={(e) => setFormSedeId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Salario/Honorarios base */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[#86868b]">
                {tab === "instructor" ? "Honorarios (pago base)" : "Salario base"}
              </label>
              <input
                type="number"
                min={0}
                value={formSalarioBase || ""}
                onChange={(e) => setFormSalarioBase(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[#86868b]">Notas</label>
              <input
                type="text"
                value={formNotas}
                onChange={(e) => setFormNotas(e.target.value)}
                placeholder="Opcional..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Conceptos */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                {tab === "instructor" ? "Seguridad social y otros" : "Conceptos de nómina"}
              </h4>
              <button
                onClick={addConcepto}
                className="inline-flex items-center gap-1 text-xs text-[#0071e3] hover:underline"
              >
                <Plus size={12} /> Agregar concepto
              </button>
            </div>

            <div className="space-y-2">
              {formConceptos.map((c, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800/60"
                >
                  <select
                    value={c.tipo}
                    onChange={(e) => updateConcepto(idx, "tipo", e.target.value)}
                    className="w-28 shrink-0 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="devengo">Devengo (+)</option>
                    <option value="deduccion">Deducción (-)</option>
                  </select>
                  <input
                    type="text"
                    value={c.concepto}
                    onChange={(e) => updateConcepto(idx, "concepto", e.target.value)}
                    placeholder="Concepto"
                    className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    value={c.valor || ""}
                    onChange={(e) => updateConcepto(idx, "valor", Number(e.target.value) || 0)}
                    placeholder="$0"
                    className="w-28 shrink-0 rounded border border-gray-200 bg-white px-2 py-1.5 text-right text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={() => removeConcepto(idx)}
                    className="shrink-0 text-[#86868b] hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Preview totales */}
          <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
            <div className="text-center">
              <p className="text-[10px] tracking-wide text-[#86868b] uppercase">Devengado</p>
              <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">
                {formatMoney(formDevengado)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] tracking-wide text-[#86868b] uppercase">Deducciones</p>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">
                {formatMoney(formDeducciones)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] tracking-wide text-[#86868b] uppercase">Neto a pagar</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatMoney(formNeto)}
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#86868b] hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (!editingId && !formEmpleadoId) || formSalarioBase <= 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0071e3] px-4 py-2 text-sm font-medium text-white hover:bg-[#0077ED] disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              {editingId ? "Actualizar" : "Crear nómina"}
            </button>
          </div>
        </div>
      )}

      {/* Tabla de nóminas */}
      {!loading && nominasFiltradas.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-gray-800/20">
          <Briefcase size={32} className="mx-auto text-[#86868b]" />
          <p className="mt-3 text-sm font-medium text-[#1d1d1f] dark:text-white">
            No hay nóminas para {MESES[mes - 1]} {anio}
          </p>
          <p className="mt-1 text-xs text-[#86868b]">
            Haz clic en &quot;Nueva nómina&quot; para registrar el primer pago.
          </p>
        </div>
      )}

      {!loading && nominasFiltradas.length > 0 && (
        <div className="space-y-3">
          {nominasFiltradas.map((n) => {
            const st = ESTADO_STYLES[n.estado];
            const devengos = (n.nomina_conceptos ?? []).filter((c) => c.tipo === "devengo");
            const deducciones = (n.nomina_conceptos ?? []).filter((c) => c.tipo === "deduccion");

            return (
              <div
                key={n.id}
                className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800/40"
              >
                {/* Cabecera */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30">
                      {tab === "instructor" ? (
                        <UserCheck size={18} className="text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Users size={18} className="text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                        {n.empleado_nombre}
                      </p>
                      <p className="text-xs text-[#86868b]">
                        {tab === "instructor" ? "Prestación de servicios" : "Contrato laboral"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.bg} ${st.text}`}
                  >
                    {st.label}
                  </span>
                </div>

                {/* Detalle de conceptos */}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {/* Devengos */}
                  <div className="rounded-lg bg-emerald-50/50 p-3 dark:bg-emerald-900/10">
                    <p className="mb-1.5 flex items-center gap-1 text-[10px] tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
                      <Heart size={10} /> Devengos
                    </p>
                    {devengos.map((c) => (
                      <div key={c.id} className="flex justify-between text-xs">
                        <span className="text-[#1d1d1f] dark:text-gray-300">{c.concepto}</span>
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                          {formatMoney(Number(c.valor))}
                        </span>
                      </div>
                    ))}
                    <div className="mt-1 border-t border-emerald-200 pt-1 dark:border-emerald-800">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[#1d1d1f] dark:text-white">Total devengado</span>
                        <span className="text-emerald-700 dark:text-emerald-400">
                          {formatMoney(Number(n.total_devengado))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deducciones */}
                  <div className="rounded-lg bg-red-50/50 p-3 dark:bg-red-900/10">
                    <p className="mb-1.5 flex items-center gap-1 text-[10px] tracking-wide text-red-700 uppercase dark:text-red-400">
                      <Shield size={10} /> Deducciones
                    </p>
                    {deducciones.length === 0 && (
                      <p className="text-xs text-[#86868b]">Sin deducciones</p>
                    )}
                    {deducciones.map((c) => (
                      <div key={c.id} className="flex justify-between text-xs">
                        <span className="text-[#1d1d1f] dark:text-gray-300">{c.concepto}</span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          -{formatMoney(Number(c.valor))}
                        </span>
                      </div>
                    ))}
                    {deducciones.length > 0 && (
                      <div className="mt-1 border-t border-red-200 pt-1 dark:border-red-800">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-[#1d1d1f] dark:text-white">Total deducciones</span>
                          <span className="text-red-600 dark:text-red-400">
                            -{formatMoney(Number(n.total_deducciones))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Neto y acciones */}
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                  <div>
                    <span className="text-xs text-[#86868b]">Neto a pagar: </span>
                    <span className="text-base font-bold text-[#1d1d1f] dark:text-white">
                      {formatMoney(Number(n.neto_pagar))}
                    </span>
                    {n.fecha_pago && (
                      <span className="ml-2 text-xs text-[#86868b]">Pagado el {n.fecha_pago}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {n.estado === "borrador" && (
                      <>
                        <button
                          onClick={() => openEditForm(n)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[#0071e3] hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Edit3 size={12} /> Editar
                        </button>
                        <button
                          onClick={() => changeEstado(n.id, "aprobada")}
                          disabled={saving}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Check size={12} /> Aprobar
                        </button>
                        <button
                          onClick={() => handleDelete(n.id, n.empleado_nombre)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                    {n.estado === "aprobada" && (
                      <>
                        <button
                          onClick={() => {
                            const hoy = new Date().toISOString().split("T")[0];
                            void changeEstado(n.id, "pagada", hoy);
                          }}
                          disabled={saving}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400"
                        >
                          <CreditCard size={12} /> Registrar pago
                        </button>
                        <button
                          onClick={() => changeEstado(n.id, "borrador")}
                          disabled={saving}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[#86868b] hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Devolver a borrador
                        </button>
                      </>
                    )}
                    {n.estado === "pagada" && (
                      <button
                        onClick={() => changeEstado(n.id, "anulada")}
                        disabled={saving}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Ban size={12} /> Anular
                      </button>
                    )}
                  </div>
                </div>

                {n.notas && <p className="mt-2 text-xs text-[#86868b] italic">{n.notas}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
