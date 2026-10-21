"use client";
import { formatDateOnlyForDisplay } from "@/lib/date-utils";

import Link from "next/link";
import { formatCop as formatCOP } from "@/lib/intl-formatters";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useDraftForm } from "@/hooks/useDraftForm";
import { clearSchoolCategoriesCache } from "@/lib/school-categories";
import {
  normalizeStoredCourseCategories,
  SELECTABLE_COURSE_CATEGORIES,
  toggleCourseCategorySelection,
} from "@/lib/course-categories";
import {
  SCHOOL_PLAN_ORDER,
  SCHOOL_PLAN_DESCRIPTORS,
  getSchoolPlanDescriptor,
} from "@/lib/school-plans";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { getPasswordValidationError, PASSWORD_POLICY_HINT } from "@/lib/password-policy";
import { fetchJsonWithRetry } from "@/lib/retry";
import type { EstadoEscuela, PlanEscuela, PlanConfig } from "@/types/database";
import {
  Plus,
  Building2,
  Eye,
  EyeOff,
  Filter,
  GraduationCap,
  Car,
  DollarSign,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  Settings2,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EscuelaEnriquecida = {
  id: string;
  nombre: string;
  cif: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  categorias: string[] | null;
  plan: PlanEscuela;
  estado: EstadoEscuela;
  max_alumnos: number;
  max_sedes: number;
  fecha_alta: string | null;
  created_at: string;
  alumnos_activos: number;
  sedes_activas: number;
  sedes_total: number;
  instructores_activos: number;
  admin_nombre: string | null;
  admin_email: string | null;
  admin_ultimo_acceso: string | null;
  ingresos_mes: number;
};

type SortField = "nombre" | "alumnos_activos" | "sedes_activas" | "ingresos_mes" | "created_at";
type SortDir = "asc" | "desc";
type TabId = "escuelas" | "planes";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const planes: PlanEscuela[] = SCHOOL_PLAN_ORDER;
const estados: EstadoEscuela[] = ["activa", "inactiva", "suspendida"];

const CATEGORIAS_INDIVIDUALES = [...SELECTABLE_COURSE_CATEGORIES];

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

const emptyAdminForm = { nombre: "", email: "", password: "" };

const estadoColors: Record<string, string> = {
  activa: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  inactiva: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400",
  suspendida: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Sin registro";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

function capacityPct(current: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(Math.round((current / max) * 100), 100);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SortableHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = currentField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 text-left text-[11px] font-semibold tracking-wide text-zinc-500 uppercase transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
    >
      {label}
      <ArrowUpDown
        size={11}
        className={active ? "text-blue-500" : "text-zinc-300 dark:text-zinc-600"}
      />
      {active && (
        <span className="text-[9px] text-blue-500">
          {currentDir === "asc" ? "\u2191" : "\u2193"}
        </span>
      )}
    </button>
  );
}

function CapacityMiniBar({ current, max }: { current: number; max: number }) {
  const pct = capacityPct(current, max);
  const color = pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200/60 dark:bg-zinc-700/40">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold text-zinc-600 tabular-nums dark:text-zinc-400">
        {pct}%
      </span>
    </div>
  );
}

function ExpandedRow({ school }: { school: EscuelaEnriquecida }) {
  const desc = getSchoolPlanDescriptor(school.plan);
  return (
    <tr className="bg-zinc-50/80 dark:bg-zinc-800/30">
      <td colSpan={8} className="px-5 py-5">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Info */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              Datos de contacto
            </p>
            <div className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
              {school.cif && <p>NIT: {school.cif}</p>}
              {school.telefono && <p>Tel: {school.telefono}</p>}
              {school.email && <p>Email: {school.email}</p>}
              {school.direccion && <p>Dir: {school.direccion}</p>}
              {school.fecha_alta && (
                <p>
                  Alta:{" "}
                  {formatDateOnlyForDisplay(school.fecha_alta, "es-CO", {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Categorías */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              Categorías habilitadas
            </p>
            {(school.categorias?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-1">
                {school.categorias!.map((c) => (
                  <span
                    key={c}
                    className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">Sin categorías</p>
            )}
          </div>

          {/* Admin */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              Administrador principal
            </p>
            {school.admin_nombre ? (
              <div className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                <p className="font-medium">{school.admin_nombre}</p>
                <p className="text-zinc-500">{school.admin_email}</p>
                <p className="flex items-center gap-1 text-zinc-400">
                  <Clock size={10} />
                  {timeAgo(school.admin_ultimo_acceso)}
                </p>
              </div>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Sin administrador asignado
              </p>
            )}
          </div>

          {/* Plan */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              Plan actual
            </p>
            {desc && (
              <div className={`rounded-xl border p-3 ${desc.panelClassName}`}>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${desc.badgeClassName}`}
                >
                  {desc.badge}
                </span>
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{desc.summary}</p>
                <p className={`mt-1 text-[10px] font-medium ${desc.accentClassName}`}>
                  {desc.capacityGuide}
                </p>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function EscuelasPage() {
  const { perfil } = useAuth();
  const inlineErrorRef = useRef<HTMLParagraphElement | null>(null);
  const planesRequestedRef = useRef(false);

  // Data
  const [escuelas, setEscuelas] = useState<EscuelaEnriquecida[]>([]);
  const [planesConfig, setPlanesConfig] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [planesLoading, setPlanesLoading] = useState(false);

  // Tab
  const [activeTab, setActiveTab] = useState<TabId>("escuelas");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<EscuelaEnriquecida | null>(null);
  const [deleting, setDeleting] = useState<EscuelaEnriquecida | null>(null);
  const [saving, setSaving] = useState(false);
  const [crearAdmin, setCrearAdmin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<PlanEscuela | "">("");
  const [filterEstado, setFilterEstado] = useState<EstadoEscuela | "">("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Forms
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

  /* ---------- Fetchers -------------------------------------------- */

  const fetchEscuelas = useCallback(async () => {
    try {
      const data = await fetchJsonWithRetry<{
        escuelas: EscuelaEnriquecida[];
      }>("/api/escuelas");
      setEscuelas(data.escuelas);
    } catch (err) {
      console.error("Error al cargar escuelas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlanes = useCallback(async () => {
    setPlanesLoading(true);
    try {
      const data = await fetchJsonWithRetry<{ planes: PlanConfig[] }>("/api/planes");
      setPlanesConfig(data.planes);
    } catch (err) {
      console.error("Error al cargar planes:", err);
    } finally {
      setPlanesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (perfil) {
      fetchEscuelas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  useEffect(() => {
    planesRequestedRef.current = false;
    setPlanesConfig([]);
    setPlanesLoading(false);
  }, [perfil?.id]);

  useEffect(() => {
    if (!perfil || activeTab !== "planes" || planesRequestedRef.current) return;
    planesRequestedRef.current = true;
    void fetchPlanes();
  }, [activeTab, fetchPlanes, perfil]);

  /* ---------- Sorting + Filtering --------------------------------- */

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField]
  );

  const filtered = useMemo(() => {
    let result = escuelas;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.nombre.toLowerCase().includes(q) ||
          (e.cif ?? "").toLowerCase().includes(q) ||
          (e.email ?? "").toLowerCase().includes(q)
      );
    }
    if (filterPlan) result = result.filter((e) => e.plan === filterPlan);
    if (filterEstado) result = result.filter((e) => e.estado === filterEstado);

    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "nombre":
          cmp = a.nombre.localeCompare(b.nombre, "es-CO");
          break;
        case "alumnos_activos":
          cmp = a.alumnos_activos - b.alumnos_activos;
          break;
        case "sedes_activas":
          cmp = a.sedes_activas - b.sedes_activas;
          break;
        case "ingresos_mes":
          cmp = a.ingresos_mes - b.ingresos_mes;
          break;
        case "created_at":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [escuelas, search, filterPlan, filterEstado, sortField, sortDir]);

  /* ---------- Stats ----------------------------------------------- */

  const stats = useMemo(() => {
    const total = escuelas.length;
    const activas = escuelas.filter((e) => e.estado === "activa").length;
    const totalAlumnos = escuelas.reduce((s, e) => s + e.alumnos_activos, 0);
    const totalIngresos = escuelas.reduce((s, e) => s + e.ingresos_mes, 0);
    const totalInstructores = escuelas.reduce((s, e) => s + e.instructores_activos, 0);
    return {
      total,
      activas,
      totalAlumnos,
      totalIngresos,
      totalInstructores,
    };
  }, [escuelas]);

  /* ---------- CRUD ------------------------------------------------ */

  const revealError = useCallback((message: string) => {
    setError(message);
    toast.error(message);
    requestAnimationFrame(() => {
      inlineErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const toggleCategoria = (cat: string) => {
    setEscuelaForm((prev) => ({
      ...prev,
      categorias: toggleCourseCategorySelection(prev.categorias, cat),
    }));
  };

  const openCreate = () => {
    setEditing(null);
    restoreEscuelaDraft(emptyEscuelaForm);
    setEscuelaForm((current) => ({
      ...current,
      categorias: normalizeStoredCourseCategories(current.categorias),
    }));
    restoreAdminDraft(emptyAdminForm);
    setCrearAdmin(true);
    setShowPassword(false);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (e: EscuelaEnriquecida) => {
    setEditing(e);
    setEscuelaForm({
      nombre: e.nombre,
      cif: e.cif || "",
      telefono: e.telefono || "",
      email: e.email || "",
      direccion: e.direccion || "",
      plan: e.plan,
      estado: e.estado,
      max_alumnos: e.max_alumnos,
      max_sedes: e.max_sedes,
      categorias: normalizeStoredCourseCategories(e.categorias || []),
    });
    setAdminForm(emptyAdminForm);
    setCrearAdmin(false);
    setShowPassword(false);
    setError("");
    setModalOpen(true);
  };

  const openDelete = (e: EscuelaEnriquecida) => {
    setDeleting(e);
    setDeleteError("");
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!escuelaForm.nombre.trim() || !escuelaForm.cif.trim()) {
      revealError("El nombre y el NIT son obligatorios.");
      return;
    }
    if (escuelaForm.email.trim() && !isValidEmail(escuelaForm.email)) {
      revealError("Ingresa un correo valido para la escuela o dejalo vacio.");
      return;
    }
    if (!editing && crearAdmin) {
      if (!adminForm.nombre.trim() || !adminForm.email.trim() || !adminForm.password) {
        revealError("Completa todos los datos del administrador.");
        return;
      }
      if (!isValidEmail(adminForm.email)) {
        revealError("Ingresa un correo valido para el administrador.");
        return;
      }
      const passwordError = getPasswordValidationError(adminForm.password);
      if (passwordError) {
        revealError(passwordError);
        return;
      }
    }

    setSaving(true);
    setError("");

    try {
      if (editing) {
        await fetchJsonWithRetry("/api/escuelas", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editing.id,
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
          }),
        });
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
      revealError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const deletingSchool = deleting;
    setSaving(true);
    setDeleteError("");
    try {
      await fetchJsonWithRetry("/api/escuelas/eliminar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escuela_id: deletingSchool.id }),
      });
      clearSchoolCategoriesCache(deletingSchool.id);
      setEscuelas((prev) => prev.filter((school) => school.id !== deletingSchool.id));
      setExpandedId((prev) => (prev === deletingSchool.id ? null : prev));
      setDeleteOpen(false);
      setDeleting(null);
      toast.success(`Escuela "${deletingSchool.nombre}" eliminada correctamente.`);
      await fetchEscuelas();
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

  const handleQuickEstado = async (id: string, newEstado: EstadoEscuela) => {
    try {
      await fetchJsonWithRetry("/api/escuelas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado: newEstado }),
      });
      fetchEscuelas();
    } catch (err) {
      console.error("Error al cambiar estado:", err);
    }
  };

  /* ---------- Render ---------------------------------------------- */

  const selectedPlan = getSchoolPlanDescriptor(escuelaForm.plan);
  const adminPasswordError =
    !editing && crearAdmin && adminForm.password
      ? getPasswordValidationError(adminForm.password)
      : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 pb-12 dark:bg-[#09090b]">
      {/* Hero */}
      <div className="relative overflow-hidden bg-white px-6 py-10 lg:px-12 dark:bg-[#09090b]">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-[50%] -left-[10%] h-[150%] w-[120%] rotate-12 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600/10 via-zinc-900/0 to-transparent dark:from-blue-600/20" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200/50 bg-blue-50/50 px-3 py-1 text-xs font-medium text-blue-700 backdrop-blur-md dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                <Building2 size={14} />
                Gestión de plataforma
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 lg:text-4xl dark:text-white">
                Escuelas y Planes
              </h1>
              <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                Administra escuelas afiliadas, configura planes de suscripción y monitorea la
                operación global.
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0077ED]"
            >
              <Plus size={16} />
              Nueva Escuela
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto mt-[-1rem] max-w-7xl px-4 lg:px-12">
        {/* KPI Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            {
              label: "Escuelas",
              value: stats.total,
              icon: <Building2 size={16} />,
              iconBg: "bg-blue-100 dark:bg-blue-500/20",
              iconColor: "text-blue-600 dark:text-blue-400",
            },
            {
              label: "Activas",
              value: stats.activas,
              icon: <ShieldCheck size={16} />,
              iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
              iconColor: "text-emerald-600 dark:text-emerald-400",
            },
            {
              label: "Alumnos",
              value: stats.totalAlumnos.toLocaleString("es-CO"),
              icon: <GraduationCap size={16} />,
              iconBg: "bg-purple-100 dark:bg-purple-500/20",
              iconColor: "text-purple-600 dark:text-purple-400",
            },
            {
              label: "Instructores",
              value: stats.totalInstructores,
              icon: <Car size={16} />,
              iconBg: "bg-amber-100 dark:bg-amber-500/20",
              iconColor: "text-amber-600 dark:text-amber-400",
            },
            {
              label: "Ingresos mes",
              value: formatCOP(stats.totalIngresos),
              icon: <DollarSign size={16} />,
              iconBg: "bg-teal-100 dark:bg-teal-500/20",
              iconColor: "text-teal-600 dark:text-teal-400",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white/70 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900/50"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  {kpi.label}
                </p>
                <div className={`rounded-lg p-1.5 ${kpi.iconBg} ${kpi.iconColor}`}>{kpi.icon}</div>
              </div>
              <p className="mt-2 text-xl font-black text-zinc-900 dark:text-white">
                {loading ? "-" : kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-8 flex items-center gap-1 border-b border-zinc-200 dark:border-white/10">
          {(
            [
              { id: "escuelas" as TabId, label: "Escuelas", icon: <Building2 size={14} /> },
              { id: "planes" as TabId, label: "Configurar Planes", icon: <Settings2 size={14} /> },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============================================================ */}
        {/*  TAB: Escuelas                                               */}
        {/* ============================================================ */}
        {activeTab === "escuelas" && (
          <div className="mt-6">
            {/* Filters */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative flex-1 sm:max-w-xs">
                <Search
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  placeholder="Buscar escuela, NIT o correo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-white/10 dark:bg-zinc-900/70 dark:text-white dark:placeholder:text-zinc-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={13} className="text-zinc-400" />
                <select
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value as PlanEscuela | "")}
                  className="appearance-none rounded-xl border border-zinc-200 bg-white py-2 pr-7 pl-3 text-xs font-medium text-zinc-700 dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-300"
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
                  className="appearance-none rounded-xl border border-zinc-200 bg-white py-2 pr-7 pl-3 text-xs font-medium text-zinc-700 dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-300"
                >
                  <option value="">Todo estado</option>
                  {estados.map((e) => (
                    <option key={e} value={e} className="capitalize">
                      {e}
                    </option>
                  ))}
                </select>
                {(search || filterPlan || filterEstado) && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilterPlan("");
                      setFilterEstado("");
                    }}
                    className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#121214]">
              {loading ? (
                <div className="space-y-3 p-6">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-12 w-full animate-pulse rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60"
                    />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <Search size={24} className="mx-auto text-zinc-300 dark:text-zinc-600" />
                  <p className="mt-3 text-sm text-zinc-500">No se encontraron escuelas</p>
                </div>
              ) : (
                <>
                  {/* Desktop */}
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-zinc-100 dark:border-white/5">
                          <th className="w-8 px-3 py-3" />
                          <th className="px-4 py-3">
                            <SortableHeader
                              label="Escuela"
                              field="nombre"
                              currentField={sortField}
                              currentDir={sortDir}
                              onSort={handleSort}
                            />
                          </th>
                          <th className="px-4 py-3 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                            Plan
                          </th>
                          <th className="px-4 py-3 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                            Estado
                          </th>
                          <th className="px-4 py-3">
                            <SortableHeader
                              label="Alumnos"
                              field="alumnos_activos"
                              currentField={sortField}
                              currentDir={sortDir}
                              onSort={handleSort}
                            />
                          </th>
                          <th className="px-4 py-3">
                            <SortableHeader
                              label="Sedes"
                              field="sedes_activas"
                              currentField={sortField}
                              currentDir={sortDir}
                              onSort={handleSort}
                            />
                          </th>
                          <th className="px-4 py-3">
                            <SortableHeader
                              label="Ingresos mes"
                              field="ingresos_mes"
                              currentField={sortField}
                              currentDir={sortDir}
                              onSort={handleSort}
                            />
                          </th>
                          <th className="px-4 py-3 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50 dark:divide-white/5">
                        {filtered.map((school) => {
                          const planDesc = getSchoolPlanDescriptor(school.plan);
                          const isExpanded = expandedId === school.id;
                          return (
                            <>
                              <tr
                                key={school.id}
                                className="group transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.03]"
                              >
                                <td className="px-3 py-3">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedId(isExpanded ? null : school.id)}
                                    className="rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp size={14} />
                                    ) : (
                                      <ChevronDown size={14} />
                                    )}
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100/80 dark:bg-blue-500/15">
                                      <Building2
                                        size={14}
                                        className="text-blue-600 dark:text-blue-400"
                                      />
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                        {school.nombre}
                                      </p>
                                      {school.admin_nombre && (
                                        <p className="text-[11px] text-zinc-400">
                                          {school.admin_nombre}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${planDesc?.badgeClassName ?? "bg-zinc-100 text-zinc-600"}`}
                                  >
                                    {planDesc?.label ?? school.plan}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={school.estado}
                                    onChange={(e) =>
                                      handleQuickEstado(school.id, e.target.value as EstadoEscuela)
                                    }
                                    className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold capitalize ${estadoColors[school.estado]}`}
                                  >
                                    {estados.map((est) => (
                                      <option key={est} value={est}>
                                        {est}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    <span className="text-xs font-semibold text-zinc-700 tabular-nums dark:text-zinc-300">
                                      {school.alumnos_activos}
                                      <span className="text-zinc-400">/{school.max_alumnos}</span>
                                    </span>
                                    <CapacityMiniBar
                                      current={school.alumnos_activos}
                                      max={school.max_alumnos}
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs font-semibold text-zinc-700 tabular-nums dark:text-zinc-300">
                                    {school.sedes_activas}
                                    <span className="text-zinc-400">/{school.max_sedes}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1">
                                    <TrendingUp size={12} className="text-emerald-500" />
                                    <span className="text-xs font-semibold text-zinc-700 tabular-nums dark:text-zinc-300">
                                      {formatCOP(school.ingresos_mes)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => openEdit(school)}
                                      className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white"
                                      title="Editar"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openDelete(school)}
                                      className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                      title="Eliminar"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <ExpandedRow key={`exp-${school.id}`} school={school} />
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile */}
                  <div className="divide-y divide-zinc-100 lg:hidden dark:divide-white/5">
                    {filtered.map((school) => {
                      const planDesc = getSchoolPlanDescriptor(school.plan);
                      return (
                        <div key={school.id} className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                {school.nombre}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${planDesc?.badgeClassName ?? ""}`}
                                >
                                  {planDesc?.label ?? school.plan}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${estadoColors[school.estado]}`}
                                >
                                  {school.estado}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEdit(school)}
                                className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => openDelete(school)}
                                className="rounded-lg p-1.5 text-zinc-400 hover:text-red-600"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                              <p className="text-[10px] text-zinc-500">Alumnos</p>
                              <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-white">
                                {school.alumnos_activos}
                                <span className="text-xs font-normal text-zinc-400">
                                  /{school.max_alumnos}
                                </span>
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-500">Sedes</p>
                              <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-white">
                                {school.sedes_activas}
                                <span className="text-xs font-normal text-zinc-400">
                                  /{school.max_sedes}
                                </span>
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-500">Ingresos</p>
                              <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-white">
                                {formatCOP(school.ingresos_mes)}
                              </p>
                            </div>
                          </div>
                          <CapacityMiniBar
                            current={school.alumnos_activos}
                            max={school.max_alumnos}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer count */}
                  <div className="border-t border-zinc-100 px-5 py-3 dark:border-white/5">
                    <p className="text-xs text-zinc-500">
                      Mostrando{" "}
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {filtered.length}
                      </span>{" "}
                      de{" "}
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {escuelas.length}
                      </span>{" "}
                      escuelas
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/*  TAB: Configurar Planes                                      */}
        {/* ============================================================ */}
        {activeTab === "planes" && (
          <div className="mt-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Catálogo comercial
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                La edición de precios, capacidades y ciclos comerciales ahora vive en el Centro de
                Suscripciones para evitar duplicidad entre módulos.
              </p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white/85 p-6 dark:border-white/10 dark:bg-zinc-900/60">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Desde allí el super admin puede editar el catálogo mensual/anual, operar
                suscripciones por escuela y ejecutar acciones comerciales con auditoría.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/suscripciones"
                  className="inline-flex min-h-[44px] items-center rounded-2xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
                >
                  Ir al Centro de Suscripciones
                </Link>
                <button
                  type="button"
                  onClick={() => void fetchPlanes()}
                  className="inline-flex min-h-[44px] items-center rounded-2xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-white/10 dark:text-zinc-200"
                >
                  Refrescar catálogo
                </button>
              </div>
              {planesLoading ? (
                <div className="mt-5 h-24 animate-pulse rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
              ) : planesConfig.length > 0 ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {planesConfig.map((plan) => (
                    <div
                      key={plan.id}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-white/5"
                    >
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {plan.nombre}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        {plan.precio_mensual.toLocaleString("es-CO")} / mes
                      </p>
                      <p className="text-xs text-zinc-500">
                        {plan.precio_anual.toLocaleString("es-CO")} / año
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/*  Modal Crear/Editar Escuela                                    */}
      {/* ============================================================== */}
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

          {/* Datos */}
          <div>
            <p className="mb-3 text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
              Datos de la escuela
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="apple-label">Nombre *</label>
                  <input
                    type="text"
                    value={escuelaForm.nombre}
                    onChange={(e) => setEscuelaForm({ ...escuelaForm, nombre: e.target.value })}
                    placeholder="Escuela Ejemplo"
                    className="apple-input"
                  />
                </div>
                <div>
                  <label className="apple-label">NIT *</label>
                  <input
                    type="text"
                    value={escuelaForm.cif}
                    onChange={(e) => setEscuelaForm({ ...escuelaForm, cif: e.target.value })}
                    placeholder="900.123.456-7"
                    className="apple-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="apple-label">Teléfono</label>
                  <input
                    type="tel"
                    value={escuelaForm.telefono}
                    onChange={(e) =>
                      setEscuelaForm({
                        ...escuelaForm,
                        telefono: e.target.value,
                      })
                    }
                    placeholder="601 234 567"
                    className="apple-input"
                  />
                </div>
                <div>
                  <label className="apple-label">Correo</label>
                  <input
                    type="email"
                    value={escuelaForm.email}
                    onChange={(e) => setEscuelaForm({ ...escuelaForm, email: e.target.value })}
                    placeholder="info@escuela.com"
                    className="apple-input"
                  />
                </div>
              </div>

              <div>
                <label className="apple-label">Dirección</label>
                <input
                  type="text"
                  value={escuelaForm.direccion}
                  onChange={(e) =>
                    setEscuelaForm({
                      ...escuelaForm,
                      direccion: e.target.value,
                    })
                  }
                  placeholder="Calle Principal #123, Ciudad"
                  className="apple-input"
                />
              </div>

              {/* Categorías */}
              <div>
                <label className="apple-label">
                  Categorías habilitadas{" "}
                  <span className="font-normal normal-case">
                    ({escuelaForm.categorias.length} seleccionada
                    {escuelaForm.categorias.length !== 1 ? "s" : ""})
                  </span>
                </label>
                <div className="mt-1 space-y-2">
                  <p className="text-[11px] text-[#86868b]">
                    Los combos se forman seleccionando moto y carro por separado en la matrícula.
                  </p>
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
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="apple-label">Plan</label>
                  <select
                    value={escuelaForm.plan}
                    onChange={(e) =>
                      setEscuelaForm({
                        ...escuelaForm,
                        plan: e.target.value as PlanEscuela,
                      })
                    }
                    className="apple-input"
                  >
                    {planes.map((p) => (
                      <option key={p} value={p}>
                        {SCHOOL_PLAN_DESCRIPTORS[p].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="apple-label">Estado</label>
                  <select
                    value={escuelaForm.estado}
                    onChange={(e) =>
                      setEscuelaForm({
                        ...escuelaForm,
                        estado: e.target.value as EstadoEscuela,
                      })
                    }
                    className="apple-input"
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
                  <label className="apple-label">Máx. alumnos</label>
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
                    className="apple-input"
                  />
                </div>
                <div>
                  <label className="apple-label">Máx. sedes</label>
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
                    className="apple-input"
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

          {/* Admin (solo creación) */}
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
                    <label className="apple-label">Nombre completo *</label>
                    <input
                      type="text"
                      value={adminForm.nombre}
                      onChange={(e) => setAdminForm({ ...adminForm, nombre: e.target.value })}
                      placeholder="Carlos García"
                      className="apple-input"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="apple-label">Correo *</label>
                      <input
                        type="email"
                        value={adminForm.email}
                        onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                        placeholder="admin@escuela.com"
                        className="apple-input"
                      />
                    </div>
                    <div>
                      <label className="apple-label">Contraseña *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={adminForm.password}
                          onChange={(e) =>
                            setAdminForm({
                              ...adminForm,
                              password: e.target.value,
                            })
                          }
                          placeholder="Min. 8, 1 mayuscula y 1 numero"
                          className="apple-input pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      <p
                        className={`mt-1 text-xs ${
                          adminPasswordError ? "text-red-500" : "text-[#86868b]"
                        }`}
                      >
                        {adminPasswordError ?? PASSWORD_POLICY_HINT}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="px-1 text-xs text-[#86868b]">
                  Podrás crear el administrador más adelante.
                </p>
              )}
            </div>
          )}

          {/* Botones */}
          {error && (
            <p
              ref={inlineErrorRef}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
            >
              {error}
            </p>
          )}
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
