"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/dashboard/Modal";
import {
  CALE_BANK_LABEL,
  CALE_BANK_SOURCE,
  formatElapsedTime,
  getCaleDifficultyLabel,
  getCaleDifficultyTone,
} from "@/lib/cale";
import type {
  CaleAdminAnalyticsResponse,
  CaleBankAdminResponse,
  CaleQuestionMutationInput,
} from "@/lib/cale-admin";
import {
  AlertCircle,
  BarChart2,
  BookOpenCheck,
  Brain,
  CheckCircle,
  Clock3,
  Image as ImageIcon,
  Landmark,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Target,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

const MONTH_FILTER_OPTIONS = [
  { value: "all", label: "Todo el año" },
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const inputCls = "apple-input";
const labelCls = "apple-label";

const emptyQuestionForm: CaleQuestionMutationInput = {
  categoria_id: "",
  pregunta: "",
  imagen_url: "",
  opcion_a: "",
  opcion_b: "",
  opcion_c: "",
  opcion_d: "",
  respuesta_correcta: "a",
  explicacion: "",
  fundamento_legal: "",
  tipo_permiso: "comun",
  dificultad: "media",
  activa: true,
  codigo_externo: "",
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [{ value: "all", label: "Todo histórico" }];
  for (let year = currentYear; year >= 2024; year -= 1) {
    years.push({ value: String(year), label: String(year) });
  }
  return years;
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-[1.75rem] bg-white p-4 shadow-sm dark:bg-[#1d1d1f]">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{value}</p>
      <p className="text-xs text-[#86868b]">{label}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
      {message}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="apple-panel-muted p-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0071e3]/10">
        {icon}
      </div>
      <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[#86868b]">{description}</p>
    </div>
  );
}

function Spinner({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${compact ? "h-20" : "h-40"}`}>
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#0071e3] border-t-transparent" />
    </div>
  );
}

export function CaleAnalyticsAdminView() {
  const yearOptions = useMemo(() => buildYearOptions(), []);
  const currentYear = String(new Date().getFullYear());
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState("all");
  const [report, setReport] = useState<CaleAdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({
          year,
          month,
        });

        const response = await fetch(`/api/examenes/cale/admin/analytics?${params.toString()}`, {
          credentials: "include",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        } & Partial<CaleAdminAnalyticsResponse>;

        if (!response.ok || !payload.summary) {
          throw new Error(payload.error || "No se pudieron cargar las analíticas CALE.");
        }

        setReport(payload as CaleAdminAnalyticsResponse);
        setError("");
      } catch (loadError) {
        console.error("[CaleAnalyticsAdminView] Error:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar las analíticas CALE."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [month, year]
  );

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (loading) return <Spinner />;
  if (error && !report) return <ErrorState message={error} />;
  if (!report || report.summary.totalAttempts === 0) {
    return (
      <EmptyState
        icon={<ShieldAlert size={18} className="text-[#0071e3]" />}
        title="Aún no hay simulacros CALE finalizados"
        description="Cuando los alumnos empiecen a presentar evaluaciones, aquí verás tendencias, preguntas más falladas y estudiantes que requieren refuerzo."
      />
    );
  }

  const maxTrendAttempts = Math.max(...report.trend.map((item) => item.attempts), 1);
  const maxQuestionErrors = Math.max(...report.toughestQuestions.map((item) => item.wrongCount), 1);

  return (
    <div className="space-y-5">
      <div className="apple-panel-muted p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Analítica ejecutiva de evaluaciones
            </p>
            <p className="mt-1 text-xs text-[#86868b]">
              Pensada para alto volumen: resumen agregado, tendencias y focos de refuerzo sin
              recorrer intento por intento en el navegador.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.9fr_0.9fr_auto]">
            <select
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className={inputCls}
            >
              {yearOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className={inputCls}
              disabled={year === "all"}
            >
              {MONTH_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => void loadAnalytics(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0071e3] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard
          icon={<Target size={18} />}
          label="Simulacros"
          value={String(report.summary.totalAttempts)}
          tone="text-[#0071e3] bg-[#0071e3]/10"
        />
        <StatCard
          icon={<CheckCircle size={18} />}
          label="Aprobación"
          value={`${report.summary.passRate}%`}
          tone="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300"
        />
        <StatCard
          icon={<Brain size={18} />}
          label="Promedio"
          value={`${report.summary.averageScore}%`}
          tone="text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300"
        />
        <StatCard
          icon={<Clock3 size={18} />}
          label="Tiempo medio"
          value={formatElapsedTime(report.summary.averageTimeSeconds)}
          tone="text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300"
        />
        <StatCard
          icon={<Users size={18} />}
          label="Alumnos evaluados"
          value={String(report.summary.uniqueStudents)}
          tone="text-fuchsia-600 bg-fuchsia-100 dark:bg-fuchsia-900/30 dark:text-fuchsia-300"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="apple-panel-muted p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-[#0071e3]" />
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Tendencia del periodo
            </p>
          </div>

          <div className="space-y-3">
            {report.trend.length === 0 ? (
              <p className="text-sm text-[#86868b]">No hay puntos de tendencia para este corte.</p>
            ) : (
              report.trend.map((point) => (
                <div key={point.bucket}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {point.label}
                    </span>
                    <span className="text-[#86868b]">
                      {point.attempts} intentos · {point.averageScore}% · {point.passRate}% aprueban
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-[#0071e3]"
                      style={{
                        width: `${Math.max(8, Math.round((point.attempts / maxTrendAttempts) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="apple-panel-muted p-5">
          <div className="mb-4 flex items-center gap-2">
            <Landmark size={16} className="text-[#0071e3]" />
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Distribución de resultados
            </p>
          </div>

          <div className="space-y-3">
            {report.distribution.map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/80 px-4 py-3 dark:bg-[#0a0a0a]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {item.label}
                  </p>
                  <span className="rounded-full bg-[#0071e3]/10 px-2.5 py-1 text-xs font-semibold text-[#0071e3]">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-[#0071e3]/15 bg-[#0071e3]/5 px-4 py-3 text-xs text-[#0b63c7] dark:border-[#0071e3]/25 dark:bg-[#0071e3]/10 dark:text-[#69a9ff]">
              Preguntas servidas en el periodo:{" "}
              {report.summary.trackedQuestions.toLocaleString("es-CO")}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="apple-panel-muted p-5">
          <div className="mb-4 flex items-center gap-2">
            <BookOpenCheck size={16} className="text-[#0071e3]" />
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Precisión por núcleo
              </p>
              <p className="text-xs text-[#86868b]">
                Calculada combinando la distribución del simulacro CALE y las respuestas falladas
                guardadas.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {report.categories.map((item) => (
              <div key={item.name}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {item.name}
                  </span>
                  <span className="text-[#86868b]">
                    {item.accuracy}% · {item.wrongCount} fallos · {item.omittedCount} omitidas
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={`h-full rounded-full ${
                      item.accuracy >= 80
                        ? "bg-emerald-500"
                        : item.accuracy >= 60
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${Math.max(6, item.accuracy)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="apple-panel-muted p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-[#0071e3]" />
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Preguntas con más fallo
            </p>
          </div>

          {report.toughestQuestions.length === 0 ? (
            <p className="text-sm text-[#86868b]">
              Todavía no hay suficiente historial para detectar preguntas críticas.
            </p>
          ) : (
            <div className="space-y-3">
              {report.toughestQuestions.map((item) => (
                <div
                  key={`${item.preguntaId}-${item.codigoExterno}`}
                  className="rounded-2xl bg-white/80 px-4 py-3 dark:bg-[#0a0a0a]"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#0071e3]/10 px-2.5 py-1 text-xs font-semibold text-[#0071e3]">
                      {item.categoriaNombre}
                    </span>
                    {item.codigoExterno && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-[#1d1d1f] dark:bg-gray-800 dark:text-[#f5f5f7]">
                        {item.codigoExterno}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {item.pregunta}
                  </p>
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-[#86868b]">
                        {item.wrongCount} fallos · {item.omittedCount} omitidas · {item.totalSeen}{" "}
                        exposiciones
                      </span>
                      <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {item.errorRate}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{
                          width: `${Math.max(8, Math.round((item.wrongCount / maxQuestionErrors) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="apple-panel-muted p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users size={16} className="text-[#0071e3]" />
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Estudiantes a reforzar
            </p>
          </div>

          {report.studentsToCoach.length === 0 ? (
            <p className="text-sm text-[#86868b]">Aún no hay alumnos para seguimiento.</p>
          ) : (
            <div className="space-y-2">
              {report.studentsToCoach.map((item) => (
                <div
                  key={item.alumnoId}
                  className="rounded-2xl bg-white/80 px-4 py-3 dark:bg-[#0a0a0a]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {item.alumnoNombre}
                      </p>
                      <p className="text-xs text-[#86868b]">
                        {item.attempts} intentos · promedio {item.averageScore}% · último{" "}
                        {item.lastScore}%
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.recentFailures >= 2
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      }`}
                    >
                      {item.recentFailures >= 2 ? "Prioritario" : "Seguimiento"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="apple-panel-muted p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 size={16} className="text-[#0071e3]" />
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Últimos simulacros
            </p>
          </div>

          <div className="space-y-2">
            {report.recentAttempts.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-2xl bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-[#0a0a0a]"
              >
                <div>
                  <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {item.alumnoNombre}
                  </p>
                  <p className="text-xs text-[#86868b]">
                    {item.totalPreguntas} preguntas · {formatElapsedTime(item.tiempoSegundos)} ·{" "}
                    {formatDateTime(item.fechaPresentacion)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#0071e3]/10 px-2.5 py-1 text-xs font-semibold text-[#0071e3]">
                    {item.porcentaje}%
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.resultado === "aprobado"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    }`}
                  >
                    {item.resultado === "aprobado" ? "Aprobado" : "Suspendido"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CaleBankManagerView() {
  const [report, setReport] = useState<CaleBankAdminResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [form, setForm] = useState<CaleQuestionMutationInput>(emptyQuestionForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const pageSize = 12;

  const loadBank = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchTerm) params.set("search", searchTerm);
      if (categoryId !== "all") params.set("categoryId", categoryId);
      if (difficulty !== "all") params.set("difficulty", difficulty);
      if (includeInactive) params.set("includeInactive", "true");

      const response = await fetch(`/api/examenes/cale/admin/questions?${params.toString()}`, {
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      } & Partial<CaleBankAdminResponse>;

      if (!response.ok || !payload.stats || !payload.categories || !payload.questions) {
        throw new Error(payload.error || "No se pudo cargar el banco CALE.");
      }

      setReport(payload as CaleBankAdminResponse);
      setError("");
    } catch (loadError) {
      console.error("[CaleBankManagerView] Error:", loadError);
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el banco CALE.");
    } finally {
      setLoading(false);
    }
  }, [categoryId, difficulty, includeInactive, page, searchTerm]);

  useEffect(() => {
    void loadBank();
  }, [loadBank]);

  const totalPages =
    report && report.total > 0 ? Math.ceil(report.total / (report.pageSize || pageSize)) : 1;

  const openCreate = () => {
    setEditingQuestionId(null);
    setForm({
      ...emptyQuestionForm,
      categoria_id: report?.categories[0]?.id || "",
    });
    setNotice("");
    setError("");
    setModalOpen(true);
  };

  const openEdit = (question: CaleBankAdminResponse["questions"][number]) => {
    setEditingQuestionId(question.id);
    setForm({
      categoria_id: question.categoria_id || "",
      pregunta: question.pregunta,
      imagen_url: question.imagen_url || "",
      opcion_a: question.opcion_a,
      opcion_b: question.opcion_b,
      opcion_c: question.opcion_c,
      opcion_d: question.opcion_d || "",
      respuesta_correcta: question.respuesta_correcta,
      explicacion: question.explicacion || "",
      fundamento_legal: question.fundamento_legal || "",
      tipo_permiso: question.tipo_permiso,
      dificultad: question.dificultad,
      activa: question.activa,
      codigo_externo: question.codigo_externo || "",
    });
    setNotice("");
    setError("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.categoria_id) {
      setError("Selecciona un núcleo para la pregunta.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const endpoint = editingQuestionId
        ? `/api/examenes/cale/admin/questions/${editingQuestionId}`
        : "/api/examenes/cale/admin/questions";
      const method = editingQuestionId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo guardar la pregunta.");
      }

      setModalOpen(false);
      setNotice(
        editingQuestionId ? "Pregunta actualizada correctamente." : "Pregunta creada correctamente."
      );
      if (!editingQuestionId && page !== 0) {
        setPage(0);
      } else {
        await loadBank();
      }
    } catch (saveError) {
      console.error("[CaleBankManagerView] Error guardando pregunta:", saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la pregunta.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (questionId: string, questionLabel: string) => {
    if (
      !window.confirm(
        `¿Eliminar permanentemente la pregunta "${questionLabel.slice(0, 80)}…"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setDeletingId(questionId);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/examenes/cale/admin/questions/${questionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo eliminar la pregunta.");
      }

      setNotice("Pregunta eliminada correctamente.");
      await loadBank();
    } catch (deleteError) {
      console.error("[CaleBankManagerView] Error eliminando pregunta:", deleteError);
      setError(
        deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la pregunta."
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <Spinner />;
  if (error && !report) return <ErrorState message={error} />;
  if (!report) return null;

  return (
    <div className="space-y-5">
      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard
          icon={<BookOpenCheck size={18} />}
          label="Total banco"
          value={String(report.stats.total)}
          tone="text-[#0071e3] bg-[#0071e3]/10"
        />
        <StatCard
          icon={<CheckCircle size={18} />}
          label="Activas"
          value={String(report.stats.active)}
          tone="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300"
        />
        <StatCard
          icon={<XCircle size={18} />}
          label="Inactivas"
          value={String(report.stats.inactive)}
          tone="text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300"
        />
        <StatCard
          icon={<ImageIcon size={18} />}
          label="Con imagen"
          value={String(report.stats.withImage)}
          tone="text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300"
        />
        <StatCard
          icon={<Landmark size={18} />}
          label="Fundamento legal"
          value={String(report.stats.withLegalBasis)}
          tone="text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="apple-panel-muted p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-[#0071e3]" />
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Estado editorial del banco
            </p>
          </div>

          <div className="space-y-3">
            {[
              { label: "Baja", value: report.stats.facil, tone: "bg-emerald-500" },
              { label: "Media", value: report.stats.media, tone: "bg-amber-500" },
              { label: "Alta", value: report.stats.dificil, tone: "bg-red-500" },
            ].map((item) => {
              const percentage =
                report.stats.total > 0 ? Math.round((item.value / report.stats.total) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {item.label}
                    </span>
                    <span className="text-[#86868b]">
                      {item.value} · {percentage}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full ${item.tone}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-[#0071e3]/15 bg-[#0071e3]/5 px-4 py-3 text-xs text-[#0b63c7] dark:border-[#0071e3]/25 dark:bg-[#0071e3]/10 dark:text-[#69a9ff]">
            Fuente activa: {CALE_BANK_LABEL} ({CALE_BANK_SOURCE})<br />
            Última actualización detectada: {formatDateTime(report.stats.updatedAt)}
          </div>
        </div>

        <div className="apple-panel-muted p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Núcleos cargados
              </p>
              <p className="text-xs text-[#86868b]">
                Resumen operativo del banco para revisar cobertura antes de editar.
              </p>
            </div>
            {report.canEdit && (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0071e3] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED]"
              >
                <Plus size={16} />
                Nueva pregunta
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {report.categories.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/80 px-4 py-3 dark:bg-[#0a0a0a]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {item.nombre}
                    </p>
                    <p className="text-xs text-[#86868b]">
                      {item.descripcion || "Sin descripción adicional."}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#0071e3]">{item.activeCount}</p>
                    <p className="text-[11px] text-[#86868b]">de {item.questionCount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="apple-panel-muted p-5">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Administrar preguntas del banco
            </p>
            <p className="text-xs text-[#86868b]">
              Búsqueda paginada, revisión editorial y alta directa desde el dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_0.9fr_0.8fr_auto]">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#86868b]"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setPage(0);
                    setSearchTerm(searchInput.trim());
                  }
                }}
                placeholder="Buscar por código, pregunta, explicación o norma"
                className="apple-input pl-10"
              />
            </div>
            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setPage(0);
              }}
              className={inputCls}
            >
              <option value="all">Todos los núcleos</option>
              {report.categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
            <select
              value={difficulty}
              onChange={(event) => {
                setDifficulty(event.target.value);
                setPage(0);
              }}
              className={inputCls}
            >
              <option value="all">Toda dificultad</option>
              <option value="facil">Baja</option>
              <option value="media">Media</option>
              <option value="dificil">Alta</option>
            </select>
            <button
              onClick={() => {
                setPage(0);
                setSearchTerm(searchInput.trim());
              }}
              className="rounded-2xl bg-[#0071e3] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0077ED]"
            >
              Buscar
            </button>
          </div>
        </div>

        {report.canEdit && (
          <label className="mb-4 inline-flex items-center gap-2 text-sm text-[#86868b]">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => {
                setIncludeInactive(event.target.checked);
                setPage(0);
              }}
              className="h-4 w-4 rounded border-gray-300 text-[#0071e3] focus:ring-[#0071e3]"
            />
            Mostrar también preguntas inactivas
          </label>
        )}

        {report.questions.length === 0 ? (
          <EmptyState
            icon={<AlertCircle size={18} className="text-[#0071e3]" />}
            title="No hay preguntas para este filtro"
            description="Ajusta la búsqueda o cambia núcleo y dificultad para volver a cargar resultados."
          />
        ) : (
          <div className="space-y-3">
            {report.questions.map((question) => (
              <div
                key={question.id}
                className="rounded-[1.75rem] bg-white/80 p-4 dark:bg-[#0a0a0a]"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#0071e3]/10 px-2.5 py-1 text-xs font-semibold text-[#0071e3]">
                    {question.categoria_nombre || "General"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getCaleDifficultyTone(question.dificultad)}`}
                  >
                    {getCaleDifficultyLabel(question.dificultad)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      question.activa
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-gray-100 text-[#86868b] dark:bg-gray-800 dark:text-[#d2d2d7]"
                    }`}
                  >
                    {question.activa ? "Activa" : "Inactiva"}
                  </span>
                  {question.codigo_externo && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-[#1d1d1f] dark:bg-gray-800 dark:text-[#f5f5f7]">
                      {question.codigo_externo}
                    </span>
                  )}
                </div>

                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {question.pregunta}
                    </p>
                    <p className="mt-2 text-xs text-[#86868b]">
                      Actualizada: {formatDateTime(question.updated_at || question.created_at)}
                    </p>
                  </div>
                  {report.canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(question)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
                      >
                        <PencilLine size={14} />
                        Editar
                      </button>
                      <button
                        onClick={() => void handleDelete(question.id, question.pregunta)}
                        disabled={deletingId === question.id}
                        className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20"
                      >
                        {deletingId === question.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {(
                    [
                      ["a", question.opcion_a],
                      ["b", question.opcion_b],
                      ["c", question.opcion_c],
                      ["d", question.opcion_d || ""],
                    ] as const
                  ).map(([option, text]) => {
                    if (!text) return null;
                    const isCorrect = question.respuesta_correcta === option;
                    return (
                      <div
                        key={option}
                        className={`rounded-2xl border px-3 py-2 text-sm ${
                          isCorrect
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                            : "border-gray-200 bg-white text-[#1d1d1f] dark:border-gray-800 dark:bg-[#111] dark:text-[#f5f5f7]"
                        }`}
                      >
                        <span className="mr-2 font-semibold">{option.toUpperCase()}.</span>
                        {text}
                      </div>
                    );
                  })}
                </div>

                {(question.explicacion || question.fundamento_legal) && (
                  <div className="mt-4 space-y-2">
                    {question.explicacion && (
                      <p className="text-sm text-[#3a3a3c] dark:text-[#d2d2d7]">
                        <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                          Explicación:
                        </span>{" "}
                        {question.explicacion}
                      </p>
                    )}
                    {question.fundamento_legal && (
                      <p className="text-xs text-[#86868b]">
                        <span className="font-semibold">Fundamento legal:</span>{" "}
                        {question.fundamento_legal}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
              <p className="text-sm text-[#86868b]">
                Página {Math.min(page + 1, totalPages)} de {totalPages} · {report.total} resultado
                {report.total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page === 0}
                  className="rounded-2xl border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                  disabled={page + 1 >= totalPages}
                  className="rounded-2xl border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
        }}
        title={editingQuestionId ? "Editar pregunta CALE" : "Crear pregunta CALE"}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-5">
          {error && modalOpen && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className={labelCls}>Núcleo</label>
              <select
                value={form.categoria_id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, categoria_id: event.target.value }))
                }
                className={inputCls}
              >
                <option value="">Selecciona...</option>
                {report.categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Dificultad</label>
              <select
                value={form.dificultad}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dificultad: event.target.value as CaleQuestionMutationInput["dificultad"],
                  }))
                }
                className={inputCls}
              >
                <option value="facil">Baja</option>
                <option value="media">Media</option>
                <option value="dificil">Alta</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Tipo permiso</label>
              <select
                value={form.tipo_permiso}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tipo_permiso: event.target.value }))
                }
                className={inputCls}
              >
                {["comun", "AM", "A1", "A2", "A", "B", "C", "D"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Código externo</label>
              <input
                value={form.codigo_externo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, codigo_externo: event.target.value }))
                }
                className={inputCls}
                placeholder="CALE-MANUAL-..."
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Pregunta</label>
            <textarea
              value={form.pregunta}
              onChange={(event) =>
                setForm((current) => ({ ...current, pregunta: event.target.value }))
              }
              className={`${inputCls} min-h-[110px]`}
              placeholder="Redacta una pregunta clara, no una afirmación."
            />
          </div>

          <div>
            <label className={labelCls}>URL de imagen</label>
            <input
              value={form.imagen_url}
              onChange={(event) =>
                setForm((current) => ({ ...current, imagen_url: event.target.value }))
              }
              className={inputCls}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(
              [
                ["opcion_a", "Opción A"],
                ["opcion_b", "Opción B"],
                ["opcion_c", "Opción C"],
                ["opcion_d", "Opción D"],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className={labelCls}>{label}</label>
                <input
                  value={form[field]}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [field]: event.target.value }))
                  }
                  className={inputCls}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Respuesta correcta</label>
              <select
                value={form.respuesta_correcta}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    respuesta_correcta: event.target
                      .value as CaleQuestionMutationInput["respuesta_correcta"],
                  }))
                }
                className={inputCls}
              >
                <option value="a">A</option>
                <option value="b">B</option>
                <option value="c">C</option>
                <option value="d">D</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-[#86868b]">
                <input
                  type="checkbox"
                  checked={form.activa}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, activa: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-[#0071e3] focus:ring-[#0071e3]"
                />
                Pregunta activa en el banco
              </label>
            </div>
          </div>

          <div>
            <label className={labelCls}>Explicación</label>
            <textarea
              value={form.explicacion}
              onChange={(event) =>
                setForm((current) => ({ ...current, explicacion: event.target.value }))
              }
              className={`${inputCls} min-h-[110px]`}
              placeholder="Explica por qué la respuesta correcta es la válida."
            />
          </div>

          <div>
            <label className={labelCls}>Fundamento legal</label>
            <textarea
              value={form.fundamento_legal}
              onChange={(event) =>
                setForm((current) => ({ ...current, fundamento_legal: event.target.value }))
              }
              className={`${inputCls} min-h-[90px]`}
              placeholder="Norma, manual o referencia legal aplicable."
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end dark:border-gray-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {saving
                ? "Guardando..."
                : editingQuestionId
                  ? "Actualizar pregunta"
                  : "Crear pregunta"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
