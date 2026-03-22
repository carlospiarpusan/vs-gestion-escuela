"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDraftForm } from "@/hooks/useDraftForm";
import { clearSchoolCategoriesCache } from "@/lib/school-categories";
import {
  SCHOOL_PLAN_ORDER,
  SCHOOL_PLAN_DESCRIPTORS,
  getSchoolPlanDescriptor,
} from "@/lib/school-plans";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { getPasswordValidationError } from "@/lib/password-policy";
import { fetchJsonWithRetry, runSupabaseMutationWithRetry } from "@/lib/retry";
import type { Escuela, EstadoEscuela, PlanEscuela } from "@/types/database";
import { Plus, Building2, Eye, EyeOff, Filter, Users, MapPin } from "lucide-react";

const planes: PlanEscuela[] = SCHOOL_PLAN_ORDER;
const estados: EstadoEscuela[] = ["activa", "inactiva", "suspendida"];
const filterSelectClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-[#1d1d1f] transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-[#1d1d1f] dark:text-[#f5f5f7] dark:hover:border-gray-600";

const CATEGORIAS_INDIVIDUALES = ["A1", "A2", "B1", "C1", "RC1", "C2", "C3"];
const CATEGORIAS_COMBO = [
  "A2 y B1",
  "A2 y C1",
  "A2 y RC1",
  "A2 y C2",
  "A2 y C3",
  "A1 y B1",
  "A1 y C1",
  "A1 y RC1",
  "A1 y C2",
  "A1 y C3",
];

const emptyEscuelaForm = {
  nombre: "",
  cif: "",
  telefono: "",
  email: "",
  direccion: "",
  plan: "basico" as PlanEscuela,
  estado: "activa" as EstadoEscuela,
  max_alumnos: 50,
  max_sedes: 1,
  categorias: [] as string[],
};

const emptyAdminForm = {
  nombre: "",
  email: "",
  password: "",
};

const inputClass = "apple-input";

const labelClass = "apple-label";

export default function EscuelasPage() {
  const { perfil } = useAuth();

  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Escuela | null>(null);
  const [deleting, setDeleting] = useState<Escuela | null>(null);
  const [saving, setSaving] = useState(false);
  const [crearAdmin, setCrearAdmin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [filterPlan, setFilterPlan] = useState<PlanEscuela | "">("");
  const [filterEstado, setFilterEstado] = useState<EstadoEscuela | "">("");
  const {
    value: escuelaForm,
    setValue: setEscuelaForm,
    restoreDraft: restoreEscuelaDraft,
    clearDraft: clearEscuelaDraft,
  } = useDraftForm("dashboard:escuelas:escuela-form", emptyEscuelaForm, {
    persist: modalOpen && !editing,
  });
  const {
    value: adminForm,
    setValue: setAdminForm,
    restoreDraft: restoreAdminDraft,
    clearDraft: clearAdminDraft,
  } = useDraftForm("dashboard:escuelas:admin-form", emptyAdminForm, {
    persist: modalOpen && !editing && crearAdmin,
  });
  const selectedPlan = getSchoolPlanDescriptor(escuelaForm.plan);

  const fetchEscuelas = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("escuelas")
      .select("*")
      .order("created_at", { ascending: false });
    setEscuelas((data as Escuela[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (perfil) fetchEscuelas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  const openCreate = () => {
    setEditing(null);
    restoreEscuelaDraft(emptyEscuelaForm);
    restoreAdminDraft(emptyAdminForm);
    setCrearAdmin(true);
    setShowPassword(false);
    setError("");
    setModalOpen(true);
  };

  const toggleCategoria = (cat: string) => {
    setEscuelaForm((prev) => ({
      ...prev,
      categorias: prev.categorias.includes(cat)
        ? prev.categorias.filter((c) => c !== cat)
        : [...prev.categorias, cat],
    }));
  };

  const openEdit = (escuela: Escuela) => {
    setEditing(escuela);
    setEscuelaForm({
      nombre: escuela.nombre,
      cif: escuela.cif || "",
      telefono: escuela.telefono || "",
      email: escuela.email || "",
      direccion: escuela.direccion || "",
      plan: escuela.plan,
      estado: escuela.estado,
      max_alumnos: escuela.max_alumnos,
      max_sedes: escuela.max_sedes,
      categorias: escuela.categorias || [],
    });
    setAdminForm(emptyAdminForm);
    setCrearAdmin(false);
    setShowPassword(false);
    setError("");
    setModalOpen(true);
  };

  const openDelete = (escuela: Escuela) => {
    setDeleting(escuela);
    setDeleteError("");
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!escuelaForm.nombre.trim() || !escuelaForm.cif.trim()) {
      setError("El nombre y el NIT son obligatorios.");
      return;
    }
    if (!editing && crearAdmin) {
      if (!adminForm.nombre.trim() || !adminForm.email.trim() || !adminForm.password) {
        setError("Completa todos los datos del administrador.");
        return;
      }
      const passwordError = getPasswordValidationError(adminForm.password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    }

    setSaving(true);
    setError("");
    const supabase = createClient();

    try {
      if (editing) {
        await runSupabaseMutationWithRetry(() =>
          supabase
            .from("escuelas")
            .update({
              nombre: escuelaForm.nombre,
              cif: escuelaForm.cif,
              telefono: escuelaForm.telefono || null,
              email: escuelaForm.email || null,
              direccion: escuelaForm.direccion || null,
              plan: escuelaForm.plan,
              estado: escuelaForm.estado,
              max_alumnos: escuelaForm.max_alumnos,
              max_sedes: escuelaForm.max_sedes,
              categorias: escuelaForm.categorias,
            })
            .eq("id", editing.id)
        );
      } else {
        await fetchJsonWithRetry("/api/escuelas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: escuelaForm.nombre,
            cif: escuelaForm.cif,
            telefono: escuelaForm.telefono || null,
            email: escuelaForm.email || null,
            direccion: escuelaForm.direccion || null,
            plan: escuelaForm.plan,
            estado: escuelaForm.estado,
            max_alumnos: escuelaForm.max_alumnos,
            max_sedes: escuelaForm.max_sedes,
            categorias: escuelaForm.categorias,
            crear_admin: crearAdmin,
            admin: crearAdmin
              ? {
                  nombre: adminForm.nombre,
                  email: adminForm.email,
                  password: adminForm.password,
                }
              : undefined,
          }),
        });
      }

      clearSchoolCategoriesCache(editing?.id);
      clearEscuelaDraft(emptyEscuelaForm);
      clearAdminDraft(emptyAdminForm);
      setModalOpen(false);
      fetchEscuelas();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "Error al guardar";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    setDeleteError("");
    try {
      await fetchJsonWithRetry("/api/escuelas/eliminar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escuela_id: deleting.id }),
      });

      clearSchoolCategoriesCache(deleting.id);
      setDeleteOpen(false);
      setDeleting(null);
      fetchEscuelas();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "Error al eliminar";
      setDeleteError(msg);
    } finally {
      setSaving(false);
    }
  };

  const filteredEscuelas = escuelas.filter((e) => {
    if (filterPlan && e.plan !== filterPlan) return false;
    if (filterEstado && e.estado !== filterEstado) return false;
    return true;
  });

  const stats = {
    total: escuelas.length,
    activas: escuelas.filter((e) => e.estado === "activa").length,
    suspendidas: escuelas.filter((e) => e.estado === "suspendida").length,
    inactivas: escuelas.filter((e) => e.estado === "inactiva").length,
  };

  const estadoColors: Record<string, string> = {
    activa: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    inactiva: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    suspendida: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const columns = [
    {
      key: "nombre" as keyof Escuela,
      label: "Escuela",
      render: (row: Escuela) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#0071e3]/10">
            <Building2 size={14} className="text-[#0071e3]" />
          </div>
          <div>
            <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{row.nombre}</p>
            {row.direccion && <p className="text-xs text-[#86868b]">{row.direccion}</p>}
          </div>
        </div>
      ),
    },
    { key: "cif" as keyof Escuela, label: "NIT" },
    { key: "telefono" as keyof Escuela, label: "Teléfono" },
    { key: "email" as keyof Escuela, label: "Correo" },
    {
      key: "plan" as keyof Escuela,
      label: "Plan",
      render: (row: Escuela) => {
        const plan = getSchoolPlanDescriptor(row.plan);
        return (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${plan?.badgeClassName ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
          >
            {plan?.label ?? row.plan}
          </span>
        );
      },
    },
    {
      key: "max_alumnos" as keyof Escuela,
      label: "Capacidad",
      render: (row: Escuela) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-[#86868b]">
            <Users size={12} />
            <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              {row.max_alumnos}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#86868b]">
            <MapPin size={12} />
            <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{row.max_sedes}</span>
          </div>
        </div>
      ),
    },
    {
      key: "categorias" as keyof Escuela,
      label: "Categorías",
      render: (row: Escuela) => {
        const cats = row.categorias || [];
        if (cats.length === 0) return <span className="text-xs text-[#86868b]">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {cats.map((c) => (
              <span
                key={c}
                className="rounded-md bg-[#0071e3]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#0071e3]"
              >
                {c}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "estado" as keyof Escuela,
      label: "Estado",
      render: (row: Escuela) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${estadoColors[row.estado]}`}
        >
          {row.estado}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Cabecera */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Escuelas</h2>
          <p className="mt-0.5 text-sm text-[#86868b]">
            Gestiona todas las autoescuelas de la plataforma
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED]"
        >
          <Plus size={16} />
          Nueva Escuela
        </button>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-4">
        {SCHOOL_PLAN_ORDER.map((planId) => {
          const plan = SCHOOL_PLAN_DESCRIPTORS[planId];
          return (
            <article
              key={plan.id}
              className={`rounded-2xl border px-4 py-4 ${plan.panelClassName}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${plan.badgeClassName}`}
                >
                  {plan.badge}
                </span>
                <span className="text-[11px] font-semibold tracking-[0.16em] text-[#66707a] uppercase">
                  {plan.label}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {plan.audience}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#66707a] dark:text-[#aeb6bf]">
                {plan.dashboardDescription}
              </p>
              <p className={`mt-3 text-xs font-medium ${plan.accentClassName}`}>
                {plan.capacityGuide}
              </p>
            </article>
          );
        })}
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total, color: "text-[#1d1d1f] dark:text-[#f5f5f7]" },
          { label: "Activas", value: stats.activas, color: "text-green-600 dark:text-green-400" },
          {
            label: "Suspendidas",
            value: stats.suspendidas,
            color: "text-red-600 dark:text-red-400",
          },
          { label: "Inactivas", value: stats.inactivas, color: "text-gray-500" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-[#1d1d1f]"
          >
            <p className="text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
              {s.label}
            </p>
            <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros + Tabla */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-[#86868b]" />
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value as PlanEscuela | "")}
            className={filterSelectClass}
          >
            <option value="">Todos los planes</option>
            {planes.map((p) => (
              <option key={p} value={p}>
                {SCHOOL_PLAN_DESCRIPTORS[p].label}
              </option>
            ))}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as EstadoEscuela | "")}
            className={filterSelectClass}
          >
            <option value="">Todos los estados</option>
            {estados.map((e) => (
              <option key={e} value={e} className="capitalize">
                {e}
              </option>
            ))}
          </select>
          {(filterPlan || filterEstado) && (
            <button
              onClick={() => {
                setFilterPlan("");
                setFilterEstado("");
              }}
              className="rounded-lg px-2 py-1 text-xs text-[#0071e3] transition-colors hover:bg-[#0071e3]/10"
            >
              Limpiar filtros
            </button>
          )}
          {(filterPlan || filterEstado) && (
            <span className="text-xs text-[#86868b]">
              {filteredEscuelas.length} de {escuelas.length}
            </span>
          )}
        </div>
        <DataTable
          columns={columns}
          data={filteredEscuelas}
          loading={loading}
          searchPlaceholder="Buscar por nombre, NIT o correo..."
          searchKeys={["nombre", "cif", "email"]}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Escuela" : "Nueva Escuela"}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
              {error}
            </p>
          )}

          {/* Sección: Datos de la escuela */}
          <div>
            <p className="mb-3 text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
              Datos de la escuela
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nombre *</label>
                  <input
                    type="text"
                    value={escuelaForm.nombre}
                    onChange={(e) => setEscuelaForm({ ...escuelaForm, nombre: e.target.value })}
                    placeholder="AutoEscuela Ejemplo"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>NIT *</label>
                  <input
                    type="text"
                    value={escuelaForm.cif}
                    onChange={(e) => setEscuelaForm({ ...escuelaForm, cif: e.target.value })}
                    placeholder="900.123.456-7"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input
                    type="tel"
                    value={escuelaForm.telefono}
                    onChange={(e) => setEscuelaForm({ ...escuelaForm, telefono: e.target.value })}
                    placeholder="601 234 567"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Correo</label>
                  <input
                    type="email"
                    value={escuelaForm.email}
                    onChange={(e) => setEscuelaForm({ ...escuelaForm, email: e.target.value })}
                    placeholder="info@escuela.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Dirección</label>
                <input
                  type="text"
                  value={escuelaForm.direccion}
                  onChange={(e) => setEscuelaForm({ ...escuelaForm, direccion: e.target.value })}
                  placeholder="Calle Principal #123, Ciudad"
                  className={inputClass}
                />
              </div>

              {/* Categorías habilitadas */}
              <div>
                <label className={labelClass}>
                  Categorías habilitadas{" "}
                  <span className="font-normal normal-case">
                    ({escuelaForm.categorias.length} seleccionada
                    {escuelaForm.categorias.length !== 1 ? "s" : ""})
                  </span>
                </label>
                <div className="mt-1 space-y-2">
                  <div>
                    <p className="mb-1.5 text-[10px] text-[#86868b]">Individuales</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIAS_INDIVIDUALES.map((cat) => {
                        const sel = escuelaForm.categorias.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategoria(cat)}
                            className={`rounded-lg border-2 px-3 py-1 text-xs font-semibold transition-colors ${
                              sel
                                ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
                                : "border-gray-200 text-[#86868b] hover:border-gray-300 dark:border-gray-700"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] text-[#86868b]">Combos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIAS_COMBO.map((cat) => {
                        const sel = escuelaForm.categorias.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategoria(cat)}
                            className={`rounded-lg border-2 px-3 py-1 text-xs font-semibold transition-colors ${
                              sel
                                ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
                                : "border-gray-200 text-[#86868b] hover:border-gray-300 dark:border-gray-700"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Plan</label>
                  <select
                    value={escuelaForm.plan}
                    onChange={(e) =>
                      setEscuelaForm({ ...escuelaForm, plan: e.target.value as PlanEscuela })
                    }
                    className={inputClass}
                  >
                    {planes.map((p) => (
                      <option key={p} value={p}>
                        {SCHOOL_PLAN_DESCRIPTORS[p].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Estado</label>
                  <select
                    value={escuelaForm.estado}
                    onChange={(e) =>
                      setEscuelaForm({ ...escuelaForm, estado: e.target.value as EstadoEscuela })
                    }
                    className={inputClass}
                  >
                    {estados.map((e) => (
                      <option key={e} value={e} className="capitalize">
                        {e}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="mt-1 mb-2 text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
                Límites de capacidad
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Máx. alumnos</label>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={escuelaForm.max_alumnos}
                    onChange={(e) =>
                      setEscuelaForm({
                        ...escuelaForm,
                        max_alumnos: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Máx. sedes</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={escuelaForm.max_sedes}
                    onChange={(e) =>
                      setEscuelaForm({
                        ...escuelaForm,
                        max_sedes: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {selectedPlan ? (
                <div className={`rounded-2xl border px-4 py-4 ${selectedPlan.panelClassName}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${selectedPlan.badgeClassName}`}
                      >
                        {selectedPlan.badge}
                      </span>
                      <p className="mt-3 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {selectedPlan.label}
                      </p>
                    </div>
                    <p className={`text-xs font-medium ${selectedPlan.accentClassName}`}>
                      {selectedPlan.capacityGuide}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#66707a] dark:text-[#aeb6bf]">
                    {selectedPlan.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPlan.focusPoints.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white/70 px-2.5 py-1 text-[11px] font-medium text-[#4b5563] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#c7c7cc]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Sección: Administrador (solo en creación) */}
          {!editing && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
                  Administrador de la escuela
                </p>
                <label className="flex cursor-pointer items-center gap-1.5 select-none">
                  <input
                    type="checkbox"
                    checked={crearAdmin}
                    onChange={(e) => setCrearAdmin(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#0071e3]"
                  />
                  <span className="text-xs text-[#86868b]">Crear ahora</span>
                </label>
              </div>

              {crearAdmin ? (
                <div className="space-y-3 rounded-xl border border-gray-200 bg-[#f5f5f7] p-4 dark:border-gray-800 dark:bg-[#0a0a0a]">
                  <div>
                    <label className={labelClass}>Nombre completo *</label>
                    <input
                      type="text"
                      value={adminForm.nombre}
                      onChange={(e) => setAdminForm({ ...adminForm, nombre: e.target.value })}
                      placeholder="Carlos García"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Correo *</label>
                      <input
                        type="email"
                        value={adminForm.email}
                        onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                        placeholder="admin@escuela.com"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Contraseña *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={adminForm.password}
                          onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                          placeholder="Mín. 6 caracteres"
                          className={`${inputClass} pr-9`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="px-1 text-xs text-[#86868b]">
                  Podrás crear el administrador más adelante desde el panel de usuarios.
                </p>
              )}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
            >
              {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Escuela"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Error eliminación */}
      {deleteError && deleteOpen && (
        <div className="fixed inset-x-0 top-4 z-[60] flex justify-center">
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-500 shadow-lg dark:border-red-800 dark:bg-red-900/20">
            {deleteError}
          </p>
        </div>
      )}

      {/* Confirmación eliminar */}
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError("");
        }}
        onConfirm={handleDelete}
        loading={saving}
        message={`¿Eliminar la escuela "${deleting?.nombre}"? Se eliminarán todos sus datos. Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
