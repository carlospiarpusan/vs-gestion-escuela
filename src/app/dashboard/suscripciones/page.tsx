"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  ChevronDown,
  CreditCard,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchJsonWithRetry } from "@/lib/retry";
import {
  getSchoolPlanDescriptor,
  SCHOOL_PLAN_DESCRIPTORS,
  SCHOOL_PLAN_ORDER,
} from "@/lib/school-plans";
import type {
  PlatformSubscriptionsResponse,
  PlatformSubscriptionSchool,
  PlatformSubscriptionStats,
  PlatformSubscriptionPlanBreakdown,
  PlatformSubscriptionHealth,
} from "@/lib/platform-subscriptions";
import type { PlanEscuela } from "@/types/database";

/* ------------------------------------------------------------------ */
/*  Sort helpers                                                       */
/* ------------------------------------------------------------------ */

type SortField = "nombre" | "capacidadPct" | "alumnosTotal" | "sedesActivas";
type SortDir = "asc" | "desc";

function compareSchools(
  a: PlatformSubscriptionSchool,
  b: PlatformSubscriptionSchool,
  field: SortField,
  dir: SortDir
) {
  let cmp = 0;
  switch (field) {
    case "nombre":
      cmp = a.nombre.localeCompare(b.nombre, "es-CO");
      break;
    case "capacidadPct":
      cmp = a.capacidadPct - b.capacidadPct;
      break;
    case "alumnosTotal":
      cmp = a.alumnosTotal - b.alumnosTotal;
      break;
    case "sedesActivas":
      cmp = a.sedesActivas - b.sedesActivas;
      break;
  }
  return dir === "asc" ? cmp : -cmp;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60 ${className ?? ""}`}
    />
  );
}

function KpiCard({
  label,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  loading,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  loading: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/70 p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-zinc-900/50">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        <div className={`rounded-xl p-2 ${iconBg} ${iconColor}`}>{icon}</div>
      </div>
      <p className="mt-3 text-3xl font-black text-zinc-900 dark:text-white">
        {loading ? "-" : value}
      </p>
      {subtitle && <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">{subtitle}</p>}
    </div>
  );
}

function PlanBreakdownCard({
  breakdown,
  loading,
}: {
  breakdown: PlatformSubscriptionPlanBreakdown;
  loading: boolean;
}) {
  const descriptor = getSchoolPlanDescriptor(breakdown.plan);
  if (!descriptor) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${descriptor.panelClassName}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${descriptor.badgeClassName}`}
        >
          {descriptor.badge}
        </span>
        <span className={`text-sm font-bold ${descriptor.accentClassName}`}>
          {loading ? "-" : breakdown.schoolCount}
        </span>
      </div>

      <h3 className={`mt-4 text-lg font-bold ${descriptor.accentClassName}`}>{descriptor.label}</h3>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {breakdown.summary || descriptor.summary}
      </p>

      <div className="mt-5 space-y-2 text-xs">
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>Activas</span>
          <span className="font-semibold">{loading ? "-" : breakdown.activeCount}</span>
        </div>

        {breakdown.suspendedCount > 0 && (
          <div className="flex justify-between text-rose-600 dark:text-rose-400">
            <span>Suspendidas</span>
            <span className="font-semibold">{breakdown.suspendedCount}</span>
          </div>
        )}

        {breakdown.withoutAdminCount > 0 && (
          <div className="flex justify-between text-amber-600 dark:text-amber-400">
            <span>Sin admin</span>
            <span className="font-semibold">{breakdown.withoutAdminCount}</span>
          </div>
        )}
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
          <span>Capacidad promedio</span>
          <span className="font-semibold">
            {loading ? "-" : `${breakdown.averageCapacityPct}%`}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/60 dark:bg-zinc-700/40">
          <div
            className={`h-full rounded-full transition-all duration-500 ${descriptor.progressClassName}`}
            style={{ width: `${Math.min(loading ? 0 : breakdown.averageCapacityPct, 100)}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-400 dark:text-zinc-500">
          {breakdown.capacityGuide || descriptor.capacityGuide}
        </p>
      </div>
    </div>
  );
}

function HealthBadge({ health, label }: { health: PlatformSubscriptionHealth; label: string }) {
  const styles =
    health === "risk"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
      : health === "attention"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles}`}>
      {label}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: PlatformSubscriptionSchool["estado"] }) {
  const styles =
    estado === "activa"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
      : estado === "suspendida"
        ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400";

  const labels: Record<string, string> = {
    activa: "Activa",
    inactiva: "Inactiva",
    suspendida: "Suspendida",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${styles}`}
    >
      {labels[estado] ?? estado}
    </span>
  );
}

function PlanBadge({ plan }: { plan: PlanEscuela }) {
  const descriptor = getSchoolPlanDescriptor(plan);
  if (!descriptor) return <span className="text-xs">{plan}</span>;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${descriptor.badgeClassName}`}
    >
      {descriptor.label}
    </span>
  );
}

function CapacityBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full max-w-[100px] min-w-[60px] overflow-hidden rounded-full bg-zinc-200/60 dark:bg-zinc-700/40">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-zinc-600 tabular-nums dark:text-zinc-400">
        {pct}%
      </span>
    </div>
  );
}

function FlagChips({ flags }: { flags: string[] }) {
  if (flags.length === 0) {
    return <span className="text-xs text-zinc-400 dark:text-zinc-600">--</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((flag) => (
        <span
          key={flag}
          className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
        >
          <AlertTriangle size={10} />
          {flag}
        </span>
      ))}
    </div>
  );
}

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
  onSort: (field: SortField) => void;
}) {
  const active = currentField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
    >
      {label}
      <ArrowUpDown
        size={12}
        className={active ? "text-blue-500" : "text-zinc-300 dark:text-zinc-600"}
      />
      {active && (
        <span className="text-[10px] text-blue-500">
          {currentDir === "asc" ? "\u2191" : "\u2193"}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  FilterDropdown                                                     */
/* ------------------------------------------------------------------ */

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-zinc-200 bg-white py-2 pr-8 pl-3 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:border-white/20 dark:focus:border-blue-500 dark:focus:ring-blue-500"
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-zinc-400"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function SuscripcionesPage() {
  const { perfil } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<PlatformSubscriptionStats>({
    totalSchools: 0,
    activeSchools: 0,
    paidSchools: 0,
    suspendedSchools: 0,
    riskSchools: 0,
    averageCapacityPct: 0,
    enterpriseSchools: 0,
  });
  const [planBreakdown, setPlanBreakdown] = useState<PlatformSubscriptionPlanBreakdown[]>([]);
  const [schools, setSchools] = useState<PlatformSubscriptionSchool[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterHealth, setFilterHealth] = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  // Sort
  const [sortField, setSortField] = useState<SortField>("capacidadPct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* ---------- fetch ------------------------------------------------ */

  useEffect(() => {
    if (!perfil) return;

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchJsonWithRetry<PlatformSubscriptionsResponse>("/api/suscripciones");

        if (!active) return;
        setStats(data.stats);
        setPlanBreakdown(data.planBreakdown);
        setSchools(data.schools);
      } catch (err) {
        if (!active) return;
        console.error("Error al cargar suscripciones:", err);
        setError(err instanceof Error ? err.message : "No se pudieron cargar las suscripciones.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [perfil]);

  /* ---------- filtering + sorting ---------------------------------- */

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField]
  );

  const filteredSchools = useMemo(() => {
    let result = schools;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((s) => s.nombre.toLowerCase().includes(q));
    }

    if (filterPlan) {
      result = result.filter((s) => s.plan === filterPlan);
    }

    if (filterHealth) {
      result = result.filter((s) => s.health === filterHealth);
    }

    if (filterEstado) {
      result = result.filter((s) => s.estado === filterEstado);
    }

    return [...result].sort((a, b) => compareSchools(a, b, sortField, sortDir));
  }, [schools, search, filterPlan, filterHealth, filterEstado, sortField, sortDir]);

  const hasActiveFilters = search || filterPlan || filterHealth || filterEstado;

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterPlan("");
    setFilterHealth("");
    setFilterEstado("");
  }, []);

  /* ---------- plan filter options ---------------------------------- */

  const planFilterOptions = useMemo(
    () =>
      SCHOOL_PLAN_ORDER.map((plan) => ({
        value: plan,
        label: SCHOOL_PLAN_DESCRIPTORS[plan].label,
      })),
    []
  );

  const healthFilterOptions = [
    { value: "healthy", label: "Estable" },
    { value: "attention", label: "Atenci\u00f3n" },
    { value: "risk", label: "Riesgo alto" },
  ];

  const estadoFilterOptions = [
    { value: "activa", label: "Activa" },
    { value: "inactiva", label: "Inactiva" },
    { value: "suspendida", label: "Suspendida" },
  ];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 pb-12 dark:bg-[#09090b]">
      {/* ---- Hero ---- */}
      <div className="relative overflow-hidden bg-white px-6 py-12 lg:px-12 dark:bg-[#09090b]">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-[50%] -left-[10%] h-[150%] w-[120%] rotate-12 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-600/10 via-zinc-900/0 to-transparent dark:from-emerald-600/20" />
          <div className="absolute top-[20%] -right-[20%] h-[100%] w-[100%] -rotate-12 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-zinc-900/0 to-transparent dark:from-blue-600/15" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/50 bg-emerald-50/50 px-3 py-1 text-xs font-medium text-emerald-700 backdrop-blur-md dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CreditCard size={14} />
            Control de suscripciones
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 lg:text-5xl dark:text-white">
            Suscripciones y Facturaci&oacute;n
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Supervisa planes activos, cobertura, capacidad y salud operativa de cada escuela
            afiliada a la plataforma.
          </p>
        </div>
      </div>

      <div className="relative z-20 mx-auto mt-[-2rem] max-w-7xl px-4 lg:px-12">
        {/* ---- Error Banner ---- */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
            <XCircle size={20} className="shrink-0 text-rose-500" />
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        )}

        {/* ============================================================ */}
        {/*  SECTION 1 — KPI Stats Bar                                   */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="Total Escuelas"
            value={stats.totalSchools.toLocaleString("es-CO")}
            subtitle="Registradas en plataforma"
            icon={<Building2 size={18} />}
            iconBg="bg-blue-100 dark:bg-blue-500/20"
            iconColor="text-blue-600 dark:text-blue-400"
            loading={loading}
          />
          <KpiCard
            label="Escuelas Activas"
            value={stats.activeSchools.toLocaleString("es-CO")}
            subtitle="Con servicio habilitado"
            icon={<Sparkles size={18} />}
            iconBg="bg-emerald-100 dark:bg-emerald-500/20"
            iconColor="text-emerald-600 dark:text-emerald-400"
            loading={loading}
          />
          <KpiCard
            label="Planes de Pago"
            value={stats.paidSchools.toLocaleString("es-CO")}
            subtitle="Con plan basico, pro o enterprise"
            icon={<CreditCard size={18} />}
            iconBg="bg-indigo-100 dark:bg-indigo-500/20"
            iconColor="text-indigo-600 dark:text-indigo-400"
            loading={loading}
          />
          <KpiCard
            label="Suspendidas"
            value={stats.suspendedSchools.toLocaleString("es-CO")}
            subtitle="Servicio deshabilitado"
            icon={<ShieldAlert size={18} />}
            iconBg="bg-rose-100 dark:bg-rose-500/20"
            iconColor="text-rose-600 dark:text-rose-400"
            loading={loading}
          />
          <KpiCard
            label="En Riesgo"
            value={stats.riskSchools.toLocaleString("es-CO")}
            subtitle="Requieren atenci\u00f3n inmediata"
            icon={<AlertTriangle size={18} />}
            iconBg="bg-amber-100 dark:bg-amber-500/20"
            iconColor="text-amber-600 dark:text-amber-400"
            loading={loading}
          />
          <KpiCard
            label="Capacidad Promedio"
            value={`${stats.averageCapacityPct}%`}
            subtitle="Uso promedio de cupos"
            icon={<TrendingUp size={18} />}
            iconBg="bg-teal-100 dark:bg-teal-500/20"
            iconColor="text-teal-600 dark:text-teal-400"
            loading={loading}
          />
        </div>

        {/* ============================================================ */}
        {/*  SECTION 2 — Plan Breakdown Cards                            */}
        {/* ============================================================ */}
        <div className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Distribuci&oacute;n por plan
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Resumen de cada plan activo en la plataforma.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonBlock key={i} className="h-64" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {planBreakdown.map((bd) => (
                <PlanBreakdownCard key={bd.plan} breakdown={bd} loading={loading} />
              ))}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/*  SECTION 3 — Schools Table                                   */}
        {/* ============================================================ */}
        <div className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Escuelas afiliadas
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Listado completo con estado de suscripci&oacute;n, capacidad y alertas.
            </p>
          </div>

          {/* ---- Filters bar ---- */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                placeholder="Buscar escuela..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-white/10 dark:bg-zinc-900/70 dark:text-white dark:placeholder:text-zinc-500 dark:hover:border-white/20 dark:focus:border-blue-500 dark:focus:ring-blue-500"
              />
            </div>

            <FilterDropdown
              label="Todos los planes"
              value={filterPlan}
              options={planFilterOptions}
              onChange={setFilterPlan}
            />
            <FilterDropdown
              label="Toda salud"
              value={filterHealth}
              options={healthFilterOptions}
              onChange={setFilterHealth}
            />
            <FilterDropdown
              label="Todo estado"
              value={filterEstado}
              options={estadoFilterOptions}
              onChange={setFilterEstado}
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-white"
              >
                <XCircle size={14} />
                Limpiar filtros
              </button>
            )}
          </div>

          {/* ---- Table container ---- */}
          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#121214]">
            {loading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <SkeletonBlock key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredSchools.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                  <Search className="text-zinc-400" size={24} />
                </div>
                <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-white">
                  {hasActiveFilters
                    ? "No se encontraron escuelas con esos filtros"
                    : "No hay escuelas registradas a\u00fan"}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-white/5">
                        <th className="px-5 py-3">
                          <SortableHeader
                            label="Escuela"
                            field="nombre"
                            currentField={sortField}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                          Plan
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                          Salud
                        </th>
                        <th className="px-4 py-3">
                          <SortableHeader
                            label="Capacidad"
                            field="capacidadPct"
                            currentField={sortField}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="px-4 py-3">
                          <SortableHeader
                            label="Alumnos"
                            field="alumnosTotal"
                            currentField={sortField}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="px-4 py-3">
                          <SortableHeader
                            label="Sedes"
                            field="sedesActivas"
                            currentField={sortField}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                          Alertas
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-white/5">
                      {filteredSchools.map((school) => (
                        <tr
                          key={school.id}
                          className="transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.03]"
                        >
                          <td className="px-5 py-4">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                              {school.nombre}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <PlanBadge plan={school.plan} />
                          </td>
                          <td className="px-4 py-4">
                            <EstadoBadge estado={school.estado} />
                          </td>
                          <td className="px-4 py-4">
                            <HealthBadge health={school.health} label={school.healthLabel} />
                          </td>
                          <td className="px-4 py-4">
                            <CapacityBar pct={school.capacidadPct} />
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-xs font-medium text-zinc-700 tabular-nums dark:text-zinc-300">
                              {school.alumnosTotal}
                              <span className="text-zinc-400 dark:text-zinc-500">
                                /{school.max_alumnos}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-xs font-medium text-zinc-700 tabular-nums dark:text-zinc-300">
                              {school.sedesActivas}
                              <span className="text-zinc-400 dark:text-zinc-500">
                                /{school.max_sedes}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <FlagChips flags={school.flags} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="divide-y divide-zinc-100 lg:hidden dark:divide-white/5">
                  {filteredSchools.map((school) => (
                    <div key={school.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {school.nombre}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <PlanBadge plan={school.plan} />
                            <EstadoBadge estado={school.estado} />
                            <HealthBadge health={school.health} label={school.healthLabel} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-500">Capacidad</p>
                          <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-white">
                            {school.capacidadPct}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-500">Alumnos</p>
                          <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-white">
                            {school.alumnosTotal}
                            <span className="text-xs font-normal text-zinc-400">
                              /{school.max_alumnos}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-500">Sedes</p>
                          <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-white">
                            {school.sedesActivas}
                            <span className="text-xs font-normal text-zinc-400">
                              /{school.max_sedes}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="w-full">
                        <CapacityBar pct={school.capacidadPct} />
                      </div>

                      {school.flags.length > 0 && <FlagChips flags={school.flags} />}
                    </div>
                  ))}
                </div>

                {/* Footer count */}
                <div className="border-t border-zinc-100 px-5 py-3 dark:border-white/5">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Mostrando{" "}
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {filteredSchools.length}
                    </span>{" "}
                    de{" "}
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {schools.length}
                    </span>{" "}
                    escuelas
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
