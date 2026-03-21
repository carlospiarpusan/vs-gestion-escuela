"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { fetchJsonWithRetry } from "@/lib/retry";
import {
  getDashboardListCached,
  invalidateDashboardClientCaches,
} from "@/lib/dashboard-client-cache";
import type { CategoriaExamen, Examen, PreguntaExamen, RespuestaExamen } from "@/types/database";
import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Target,
  XCircle,
} from "lucide-react";
import {
  CALE_PASSING_PERCENTAGE,
  CALE_QUESTION_COUNT_OPTIONS,
  formatElapsedTime,
  normalizeCaleAnswer,
  parseCaleExamNotes,
  type CaleExamNotes,
  type RespuestaCale,
} from "@/lib/cale";

const CaleAnalyticsAdminView = dynamic(
  () =>
    import("@/components/dashboard/examenes/CaleAdminViews").then(
      (module) => module.CaleAnalyticsAdminView
    ),
  { loading: () => <Spinner compact /> }
);

const CaleBankManagerView = dynamic(
  () =>
    import("@/components/dashboard/examenes/CaleAdminViews").then(
      (module) => module.CaleBankManagerView
    ),
  { loading: () => <Spinner compact /> }
);

type CategoriaResumen = CategoriaExamen & {
  questionCount: number;
};

type IntentoCale = Examen & {
  alumno_nombre: string;
  meta: CaleExamNotes;
};

type PracticeQuestion = Pick<
  PreguntaExamen,
  | "id"
  | "categoria_id"
  | "pregunta"
  | "imagen_url"
  | "opcion_a"
  | "opcion_b"
  | "opcion_c"
  | "opcion_d"
> & {
  categoria_nombre: string;
};

type OptionedQuestion = Pick<PreguntaExamen, "opcion_a" | "opcion_b" | "opcion_c" | "opcion_d">;

type PracticeResult = PracticeQuestion & {
  selectedAnswer: RespuestaCale | null;
  correctAnswer: RespuestaCale | null;
  isCorrect: boolean;
  explicacion: string | null;
  fundamento_legal: string | null;
};

type PracticeSummary = {
  source: string;
  result: "aprobado" | "suspendido";
  passingPercentage: number;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  percentage: number;
  elapsedSeconds: number;
  savedAt: string;
};

type PracticeResultPayload = {
  examId: string;
  summary: PracticeSummary;
  results: PracticeResult[];
};

type StoredPracticeResponse = Pick<
  RespuestaExamen,
  | "pregunta_id"
  | "orden_pregunta"
  | "respuesta_alumno"
  | "respuesta_omitida"
  | "es_correcta"
  | "categoria_nombre"
  | "pregunta_texto"
  | "imagen_url"
  | "opcion_a"
  | "opcion_b"
  | "opcion_c"
  | "opcion_d"
  | "respuesta_correcta"
  | "explicacion"
  | "fundamento_legal"
>;
type StoredReviewPayload = {
  exam: Examen;
  rows: StoredPracticeResponse[];
};
type ExamenesDashboardResponse = {
  categories: CategoriaResumen[];
  history: Examen[];
  review: StoredReviewPayload | null;
};

function isIntentoCale(value: IntentoCale | null): value is IntentoCale {
  return Boolean(value);
}

function getOptionText(question: OptionedQuestion, option: RespuestaCale) {
  switch (option) {
    case "a":
      return question.opcion_a;
    case "b":
      return question.opcion_b;
    case "c":
      return question.opcion_c;
    case "d":
      return question.opcion_d || "";
    default:
      return "";
  }
}

function getAnswerBadge(option: RespuestaCale) {
  return option.toUpperCase();
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function coalesceOptionText(value: string | null | undefined) {
  return typeof value === "string" ? value : "";
}

function buildStoredPracticeResult(
  exam: Examen,
  rows: StoredPracticeResponse[]
): PracticeResultPayload | null {
  const meta = parseCaleExamNotes(exam.notas);
  if (!meta) return null;

  const orderedRows = [...rows].sort((left, right) => {
    const leftOrder = left.orden_pregunta ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.orden_pregunta ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.pregunta_id.localeCompare(right.pregunta_id);
  });

  const results: PracticeResult[] = orderedRows.map((row) => ({
    id: row.pregunta_id,
    categoria_id: null,
    categoria_nombre: row.categoria_nombre || "General",
    pregunta: row.pregunta_texto || "Pregunta no disponible",
    imagen_url: row.imagen_url,
    opcion_a: coalesceOptionText(row.opcion_a),
    opcion_b: coalesceOptionText(row.opcion_b),
    opcion_c: coalesceOptionText(row.opcion_c),
    opcion_d: row.opcion_d,
    selectedAnswer: normalizeCaleAnswer(row.respuesta_alumno),
    correctAnswer: normalizeCaleAnswer(row.respuesta_correcta),
    isCorrect: row.es_correcta,
    explicacion: row.explicacion,
    fundamento_legal: row.fundamento_legal,
  }));

  const omittedCount = orderedRows.filter((item) => item.respuesta_omitida).length;
  const wrongAnsweredCount = orderedRows.length - omittedCount;

  return {
    examId: exam.id,
    summary: {
      source: meta.source,
      result: exam.resultado === "aprobado" ? "aprobado" : "suspendido",
      passingPercentage: CALE_PASSING_PERCENTAGE,
      questionCount: meta.questionCount,
      answeredCount: Math.min(meta.questionCount, meta.correctCount + wrongAnsweredCount),
      correctCount: meta.correctCount,
      incorrectCount: Math.max(meta.questionCount - meta.correctCount, 0),
      percentage: meta.percentage,
      elapsedSeconds: meta.elapsedSeconds,
      savedAt: meta.submittedAt,
    },
    results,
  };
}

function mapIntentosCale(exams: Examen[]): IntentoCale[] {
  return (exams || [])
    .map((exam): IntentoCale | null => {
      const meta = parseCaleExamNotes(exam.notas);
      if (!meta) return null;

      return {
        ...exam,
        alumno_nombre: "",
        meta,
      };
    })
    .filter(isIntentoCale);
}

export default function ExamenesPage() {
  const { perfil } = useAuth();
  const searchParams = useSearchParams();
  const isAlumno = perfil?.rol === "alumno";
  const adminSection = useMemo(
    () => (searchParams.get("section") === "banco" ? "banco" : "analiticas"),
    [searchParams]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Evaluación CALE
          </h2>
          <p className="mt-1 text-sm text-[#86868b]">
            {isAlumno
              ? "Entrena con simulacros reales, revisa explicaciones y mejora antes del examen."
              : "Controla el banco CALE activo y sigue el rendimiento de los simulacros con analítica para alto volumen."}
          </p>
        </div>
      </div>

      {isAlumno ? (
        <AlumnoEntrenamientoView />
      ) : adminSection === "analiticas" ? (
        <AnaliticsView />
      ) : (
        <BancoCaleView />
      )}
    </div>
  );
}

function AnaliticsView() {
  return <CaleAnalyticsAdminView />;
}

function BancoCaleView() {
  return <CaleBankManagerView />;
}

function AlumnoEntrenamientoView() {
  const { perfil } = useAuth();
  const [categories, setCategories] = useState<CategoriaResumen[]>([]);
  const [history, setHistory] = useState<IntentoCale[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [questionCount, setQuestionCount] =
    useState<(typeof CALE_QUESTION_COUNT_OPTIONS)[number]>(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionQuestions, setSessionQuestions] = useState<PracticeQuestion[]>([]);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, RespuestaCale>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PracticeResultPayload | null>(null);
  const [reviewingExamId, setReviewingExamId] = useState<string | null>(null);

  const currentQuestion = sessionQuestions[currentIndex] || null;
  const answeredCount = sessionQuestions.filter((question) => Boolean(answers[question.id])).length;
  const unansweredCount = Math.max(sessionQuestions.length - answeredCount, 0);
  const inSession = sessionQuestions.length > 0 && sessionStartedAt !== null;

  const loadDashboard = useCallback(
    async ({
      examId,
      fresh = false,
    }: {
      examId?: string;
      fresh?: boolean;
    } = {}) => {
      if (!perfil?.id) {
        return {
          categories: [],
          history: [],
          review: null,
        } satisfies ExamenesDashboardResponse;
      }

      const params = new URLSearchParams();
      if (examId) params.set("examId", examId);
      if (fresh) params.set("fresh", "1");

      return getDashboardListCached<ExamenesDashboardResponse>({
        name: "examenes-dashboard",
        scope: {
          id: perfil.id,
          rol: perfil.rol,
          escuelaId: perfil.escuela_id,
          sedeId: perfil.sede_id,
        },
        params,
        forceFresh: fresh,
        loader: () =>
          fetchJsonWithRetry<ExamenesDashboardResponse>(
            `/api/examenes/dashboard${params.toString() ? `?${params.toString()}` : ""}`
          ),
      });
    },
    [perfil?.escuela_id, perfil?.id, perfil?.rol, perfil?.sede_id]
  );

  useEffect(() => {
    if (!perfil?.id) return;
    let active = true;

    const load = async () => {
      try {
        const payload = await loadDashboard();

        if (!active) return;
        setCategories(payload.categories || []);
        setHistory(mapIntentosCale(payload.history || []));
        setError("");
      } catch (loadError) {
        console.error("[ExamenesPage] Error preparando práctica CALE:", loadError);
        if (active) setError("No se pudo preparar la práctica CALE.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [loadDashboard, perfil?.id]);

  useEffect(() => {
    if (!inSession || !sessionStartedAt) return undefined;

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [inSession, sessionStartedAt]);

  const startPractice = async () => {
    setError("");

    try {
      const params = new URLSearchParams({
        count: String(questionCount),
      });
      if (selectedCategoryId !== "all") {
        params.set("categoryId", selectedCategoryId);
      }

      const response = await fetch(`/api/examenes/cale/practica?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        questions?: PracticeQuestion[];
      };

      if (!response.ok || !payload.questions) {
        throw new Error(payload.error || "No se pudo iniciar la práctica.");
      }

      setSessionQuestions(payload.questions);
      setSessionStartedAt(Date.now());
      setCurrentIndex(0);
      setAnswers({});
      setElapsedSeconds(0);
      setResult(null);
    } catch (startError) {
      console.error("[ExamenesPage] Error iniciando práctica:", startError);
      setError(
        startError instanceof Error ? startError.message : "No se pudo iniciar la práctica."
      );
    }
  };

  const finishPractice = async () => {
    if (!inSession) return;

    if (answeredCount === 0) {
      setError("Responde al menos una pregunta antes de enviar el simulacro.");
      return;
    }

    if (unansweredCount > 0) {
      const confirmed = window.confirm(
        `Aún tienes ${unansweredCount} pregunta${unansweredCount !== 1 ? "s" : ""} sin responder. Si continúas, se marcarán como incorrectas.`
      );
      if (!confirmed) return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/examenes/cale/practica", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionIds: sessionQuestions.map((item) => item.id),
          answers,
          elapsedSeconds,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      } & Partial<PracticeResultPayload>;

      if (!response.ok || !payload.summary || !payload.results || !payload.examId) {
        throw new Error(payload.error || "No se pudo calificar el simulacro.");
      }

      setResult(payload as PracticeResultPayload);
      setSessionQuestions([]);
      setSessionStartedAt(null);
      setCurrentIndex(0);
      setAnswers({});
      setElapsedSeconds(0);
      invalidateDashboardClientCaches("dashboard-list:examenes-dashboard:");
      const refreshed = await loadDashboard({ fresh: true });
      setHistory(mapIntentosCale(refreshed.history || []));
    } catch (submitError) {
      console.error("[ExamenesPage] Error enviando práctica:", submitError);
      setError(
        submitError instanceof Error ? submitError.message : "No se pudo calificar el simulacro."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openStoredReview = async (examId: string) => {
    setReviewingExamId(examId);
    setError("");

    try {
      const payload = await loadDashboard({ examId, fresh: true });
      const review = payload.review
        ? buildStoredPracticeResult(payload.review.exam, payload.review.rows)
        : null;

      if (!review) {
        throw new Error("No se pudo recuperar la revisión guardada de este simulacro.");
      }

      setResult(review);
      setSessionQuestions([]);
      setSessionStartedAt(null);
      setCurrentIndex(0);
      setAnswers({});
      setElapsedSeconds(0);
    } catch (reviewError) {
      console.error("[ExamenesPage] Error cargando revisión guardada:", reviewError);
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "No se pudo cargar la revisión del simulacro."
      );
    } finally {
      setReviewingExamId(null);
    }
  };

  if (loading) return <Spinner />;

  if (error && !inSession && !result && categories.length === 0) {
    return <ErrorState message={error} />;
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={<AlertCircle size={18} className="text-[#0071e3]" />}
        title="El banco CALE aún no está disponible"
        description="En cuanto el administrador cargue las preguntas activas, podrás iniciar tus simulacros desde aquí."
      />
    );
  }

  if (!inSession && !result) {
    return (
      <div className="space-y-5">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="apple-panel-muted p-5">
            <div className="mb-4 flex items-center gap-2">
              <PlayCircle size={16} className="text-[#0071e3]" />
              <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Configura tu simulacro
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Núcleo a practicar
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategoryId("all")}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      selectedCategoryId === "all"
                        ? "bg-[#0071e3] text-white"
                        : "bg-white text-[#1d1d1f] hover:bg-gray-100 dark:bg-[#111] dark:text-[#f5f5f7] dark:hover:bg-gray-800"
                    }`}
                  >
                    Simulacro mixto
                  </button>
                  {categories.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedCategoryId(item.id)}
                      className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                        selectedCategoryId === item.id
                          ? "bg-[#0071e3] text-white"
                          : "bg-white text-[#1d1d1f] hover:bg-gray-100 dark:bg-[#111] dark:text-[#f5f5f7] dark:hover:bg-gray-800"
                      }`}
                    >
                      {item.nombre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Cantidad de preguntas
                </p>
                <div className="flex flex-wrap gap-2">
                  {CALE_QUESTION_COUNT_OPTIONS.map((count) => (
                    <button
                      key={count}
                      onClick={() => setQuestionCount(count)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        questionCount === count
                          ? "bg-[#1d1d1f] text-white dark:bg-[#f5f5f7] dark:text-[#1d1d1f]"
                          : "bg-white text-[#1d1d1f] hover:bg-gray-100 dark:bg-[#111] dark:text-[#f5f5f7] dark:hover:bg-gray-800"
                      }`}
                    >
                      {count} preguntas
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <InfoPill
                  label="Banco activo"
                  value={`${categories.reduce((accumulator, item) => accumulator + item.questionCount, 0)} preguntas`}
                />
                <InfoPill label="Objetivo sugerido" value={`${CALE_PASSING_PERCENTAGE}% o más`} />
                <InfoPill label="Explicaciones" value="Incluidas al final" />
              </div>

              <button
                onClick={startPractice}
                className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED]"
              >
                <PlayCircle size={16} />
                Iniciar simulacro
              </button>
            </div>
          </div>

          <div className="apple-panel-muted p-5">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#0071e3]" />
              <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Tu historial guardado
              </p>
            </div>

            {history.length === 0 ? (
              <p className="rounded-2xl bg-white/80 px-4 py-6 text-sm text-[#86868b] dark:bg-[#0a0a0a]">
                Todavía no has presentado simulacros CALE. Empieza con uno de 10 o 20 preguntas para
                medir tu nivel.
              </p>
            ) : (
              <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-white/80 px-4 py-3 dark:bg-[#0a0a0a]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {item.meta.percentage}% de acierto
                        </p>
                        <p className="text-xs text-[#86868b]">
                          {item.meta.questionCount} preguntas ·{" "}
                          {formatElapsedTime(item.meta.elapsedSeconds)} ·{" "}
                          {formatDateTime(item.meta.submittedAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.meta.percentage >= CALE_PASSING_PERCENTAGE
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        }`}
                      >
                        {item.meta.percentage >= CALE_PASSING_PERCENTAGE ? "Listo" : "Sigue"}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => void openStoredReview(item.id)}
                        disabled={reviewingExamId === item.id}
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-[#1d1d1f] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
                      >
                        {reviewingExamId === item.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <BookOpenCheck size={14} />
                        )}
                        Ver revisión
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (inSession && currentQuestion) {
    return (
      <div className="space-y-5">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.34fr]">
          <div className="apple-panel-muted p-5">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Pregunta {currentIndex + 1} de {sessionQuestions.length}
                </p>
                <p className="text-xs text-[#86868b]">{currentQuestion.categoria_nombre}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-[#1d1d1f] dark:bg-gray-800 dark:text-[#f5f5f7]">
                  {answeredCount} respondidas
                </span>
                <span className="rounded-full bg-[#0071e3]/10 px-3 py-1 text-xs font-semibold text-[#0071e3]">
                  {formatElapsedTime(elapsedSeconds)}
                </span>
              </div>
            </div>

            <div className="mb-5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-[#0071e3]"
                style={{
                  width: `${Math.round(((currentIndex + 1) / sessionQuestions.length) * 100)}%`,
                }}
              />
            </div>

            <p className="mb-4 text-lg leading-7 font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              {currentQuestion.pregunta}
            </p>

            {currentQuestion.imagen_url && (
              <Image
                src={currentQuestion.imagen_url}
                alt="Imagen de apoyo para la pregunta"
                width={1200}
                height={640}
                sizes="(max-width: 768px) 100vw, 960px"
                unoptimized
                className="mb-5 h-56 w-full rounded-[1.5rem] bg-[#f5f5f7] object-contain p-4 dark:bg-[#111]"
              />
            )}

            <div className="grid grid-cols-1 gap-3">
              {(["a", "b", "c", "d"] as RespuestaCale[]).map((option) => {
                const optionText = getOptionText(currentQuestion, option);
                if (!optionText) return null;
                const isSelected = answers[currentQuestion.id] === option;

                return (
                  <button
                    key={option}
                    onClick={() =>
                      setAnswers((current) => ({
                        ...current,
                        [currentQuestion.id]: option,
                      }))
                    }
                    className={`rounded-[1.5rem] border px-4 py-3 text-left text-sm transition-colors ${
                      isSelected
                        ? "border-[#0071e3] bg-[#0071e3]/8 text-[#1d1d1f] dark:text-[#f5f5f7]"
                        : "border-gray-200 bg-white text-[#1d1d1f] hover:border-[#0071e3]/50 hover:bg-[#0071e3]/4 dark:border-gray-800 dark:bg-[#111] dark:text-[#f5f5f7]"
                    }`}
                  >
                    <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.04] text-xs font-bold dark:bg-white/[0.06]">
                      {getAnswerBadge(option)}
                    </span>
                    {optionText}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
                >
                  <ChevronLeft size={16} />
                  Anterior
                </button>
                <button
                  onClick={() =>
                    setCurrentIndex((current) => Math.min(sessionQuestions.length - 1, current + 1))
                  }
                  disabled={currentIndex + 1 >= sessionQuestions.length}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
                >
                  Siguiente
                  <ChevronRight size={16} />
                </button>
              </div>

              <button
                onClick={finishPractice}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                {submitting ? "Calificando..." : "Finalizar simulacro"}
              </button>
            </div>
          </div>

          <div className="apple-panel-muted p-5">
            <div className="mb-4 flex items-center gap-2">
              <Target size={16} className="text-[#0071e3]" />
              <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Navegación rápida
              </p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {sessionQuestions.map((question, index) => {
                const isCurrent = index === currentIndex;
                const isAnswered = Boolean(answers[question.id]);
                return (
                  <button
                    key={question.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-11 rounded-2xl text-sm font-semibold transition-colors ${
                      isCurrent
                        ? "bg-[#0071e3] text-white"
                        : isAnswered
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-white text-[#1d1d1f] hover:bg-gray-100 dark:bg-[#111] dark:text-[#f5f5f7] dark:hover:bg-gray-800"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-2 text-xs text-[#86868b]">
              <p>Respondidas: {answeredCount}</p>
              <p>Pendientes: {unansweredCount}</p>
              <p>Meta recomendada: {CALE_PASSING_PERCENTAGE}% o más.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-5">
        <div className="apple-panel-muted p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Resultado del simulacro
              </p>
              <p className="mt-1 text-xs text-[#86868b]">
                Guardado el {formatDateTime(result.summary.savedAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#0071e3]/10 px-3 py-1.5 text-sm font-semibold text-[#0071e3]">
                {result.summary.percentage}% de acierto
              </span>
              <span
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  result.summary.result === "aprobado"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                {result.summary.result === "aprobado" ? "Objetivo alcanzado" : "Sigue practicando"}
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              icon={<CheckCircle size={18} />}
              label="Correctas"
              value={String(result.summary.correctCount)}
              tone="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300"
            />
            <StatCard
              icon={<XCircle size={18} />}
              label="Incorrectas"
              value={String(result.summary.incorrectCount)}
              tone="text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300"
            />
            <StatCard
              icon={<Target size={18} />}
              label="Respondidas"
              value={String(result.summary.answeredCount)}
              tone="text-[#0071e3] bg-[#0071e3]/10"
            />
            <StatCard
              icon={<Clock3 size={18} />}
              label="Tiempo"
              value={formatElapsedTime(result.summary.elapsedSeconds)}
              tone="text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={startPractice}
              className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED]"
            >
              <RefreshCw size={16} />
              Hacer otro simulacro
            </button>
            <button
              onClick={() => setResult(null)}
              className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] border border-gray-200 px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
            >
              Volver al inicio
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {result.results.length === 0 && result.summary.incorrectCount === 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
              Este simulacro no tuvo errores. Por eso no hay preguntas falladas guardadas para
              revisar.
            </div>
          )}

          {result.results.length === 0 && result.summary.incorrectCount > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              Este intento ya tenía el resultado final guardado, pero no conservaba el detalle de
              preguntas falladas. Desde ahora los nuevos simulacros sí guardarán cada error con su
              respuesta correcta y explicación.
            </div>
          )}

          {result.results.length > 0 && result.results.length < result.summary.questionCount && (
            <div className="rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/5 px-4 py-4 text-sm text-[#005bb5] dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10 dark:text-[#6cb6ff]">
              Se muestran únicamente las preguntas respondidas mal o dejadas sin responder.
            </div>
          )}

          {result.results.map((question, index) => (
            <div key={question.id} className="apple-panel-muted p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#0071e3]/10 px-2.5 py-1 text-xs font-semibold text-[#0071e3]">
                  {index + 1}. {question.categoria_nombre}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    question.isCorrect
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  }`}
                >
                  {question.isCorrect ? "Correcta" : "Incorrecta"}
                </span>
              </div>

              <p className="mb-4 text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                {question.pregunta}
              </p>

              {question.imagen_url && (
                <Image
                  src={question.imagen_url}
                  alt="Imagen de apoyo de la pregunta"
                  width={1200}
                  height={640}
                  sizes="(max-width: 768px) 100vw, 960px"
                  unoptimized
                  className="mb-4 h-48 w-full rounded-[1.5rem] bg-[#f5f5f7] object-contain p-4 dark:bg-[#111]"
                />
              )}

              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {(["a", "b", "c", "d"] as RespuestaCale[]).map((option) => {
                  const optionText = getOptionText(question, option);
                  if (!optionText) return null;

                  const isCorrect = question.correctAnswer === option;
                  const isSelected = question.selectedAnswer === option;

                  return (
                    <div
                      key={option}
                      className={`rounded-2xl border px-3 py-2 text-sm ${
                        isCorrect
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                          : isSelected
                            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
                            : "border-gray-200 bg-white text-[#1d1d1f] dark:border-gray-800 dark:bg-[#111] dark:text-[#f5f5f7]"
                      }`}
                    >
                      <span className="mr-2 font-semibold">{getAnswerBadge(option)}.</span>
                      {optionText}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-sm text-[#3a3a3c] dark:text-[#d2d2d7]">
                  <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Tu respuesta:
                  </span>{" "}
                  {question.selectedAnswer
                    ? getAnswerBadge(question.selectedAnswer)
                    : "Sin respuesta"}
                </p>
                <p className="text-sm text-[#3a3a3c] dark:text-[#d2d2d7]">
                  <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Respuesta correcta:
                  </span>{" "}
                  {question.correctAnswer
                    ? getAnswerBadge(question.correctAnswer)
                    : "No disponible"}
                </p>
                <p className="text-sm text-[#3a3a3c] dark:text-[#d2d2d7]">
                  <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Explicación:
                  </span>{" "}
                  {question.explicacion || "No hay explicación adicional para esta pregunta."}
                </p>
                {question.fundamento_legal && (
                  <p className="text-xs text-[#86868b]">
                    <span className="font-semibold">Fundamento legal:</span>{" "}
                    {question.fundamento_legal}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <Spinner />;
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

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/80 px-4 py-3 dark:bg-[#0a0a0a]">
      <p className="text-xs tracking-[0.18em] text-[#86868b] uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{value}</p>
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

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
      {message}
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
