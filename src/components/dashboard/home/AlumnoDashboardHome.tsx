"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle, Clock, CreditCard, FileText } from "lucide-react";
import {
  type AlumnoDashboardExamen as ExamenRealizado,
  type AlumnoDashboardIngreso as Ingreso,
  type AlumnoDashboardMatricula as MatriculaInfo,
  type AlumnoDashboardResponse,
  type AlumnoDashboardStudent as AlumnoInfo,
} from "@/lib/dashboard-admin-summary";
import {
  getDashboardSummaryCached,
  readDashboardSummaryCache,
} from "@/lib/dashboard-client-cache";
import HomePriorityActions from "@/components/dashboard/HomePriorityActions";
import PageScaffold from "@/components/dashboard/PageScaffold";
import SummaryRow from "@/components/dashboard/SummaryRow";
import { useIsMobileVariant } from "@/hooks/useDeviceVariant";
import { useAuth } from "@/hooks/useAuth";
import {
  DashboardLoadingState,
  ESTADO_COLOR,
  ESTADO_PAGO,
  fmt,
  METODO_LABEL,
  RESULTADO_COLOR,
  RESULTADO_LABEL,
  TIPO_EXAMEN,
} from "@/components/dashboard/home/dashboard-home-shared";

export default function AlumnoDashboardHome() {
  const { perfil } = useAuth();
  const isMobile = useIsMobileVariant();
  const [alumno, setAlumno] = useState<AlumnoInfo | null>(null);
  const [matriculas, setMatriculas] = useState<MatriculaInfo[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [examenes, setExamenes] = useState<ExamenRealizado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!perfil?.id) return;

    let isActive = true;
    const cacheScope = {
      id: perfil.id,
      rol: perfil.rol,
      escuelaId: perfil.escuela_id,
      sedeId: perfil.sede_id,
    };

    const cachedSnapshot = readDashboardSummaryCache<AlumnoDashboardResponse>("alumno", cacheScope);
    if (cachedSnapshot) {
      setAlumno(cachedSnapshot.alumno);
      setMatriculas(cachedSnapshot.matriculas);
      setIngresos(cachedSnapshot.ingresos);
      setExamenes(cachedSnapshot.examenes);
      setLoading(false);
    }

    const fetchData = async () => {
      try {
        const snapshot = await getDashboardSummaryCached<AlumnoDashboardResponse>({
          kind: "alumno",
          scope: cacheScope,
          loader: async () => {
            const response = await fetch("/api/dashboard/alumno-summary", {
              cache: "default",
            });
            const payload = await response.json();

            if (!response.ok) {
              throw new Error(payload?.error || "No se pudo cargar el resumen del alumno.");
            }

            return payload as AlumnoDashboardResponse;
          },
        });

        if (!isActive) return;

        setAlumno(snapshot.alumno);
        setMatriculas(snapshot.matriculas);
        setIngresos(snapshot.ingresos);
        setExamenes(snapshot.examenes);
      } catch (error) {
        console.error("Error al obtener el dashboard del alumno:", error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isActive = false;
    };
  }, [perfil?.escuela_id, perfil?.id, perfil?.rol, perfil?.sede_id]);

  const nombre = alumno?.nombre || perfil?.nombre || "Alumno";
  const ingresosCobrados = useMemo(
    () => ingresos.filter((ingreso) => ingreso.estado === "cobrado"),
    [ingresos]
  );
  const totalPagado = useMemo(
    () => ingresosCobrados.reduce((sum, ingreso) => sum + Number(ingreso.monto), 0),
    [ingresosCobrados]
  );
  const valorTotal = useMemo(() => {
    if (matriculas.length === 0) return alumno?.valor_total ?? 0;
    return matriculas
      .filter((matricula) => matricula.estado !== "cancelado")
      .reduce((sum, matricula) => sum + Number(matricula.valor_total || 0), 0);
  }, [alumno?.valor_total, matriculas]);
  const totalPendiente = Math.max(valorTotal - totalPagado, 0);
  const porcentajePagado =
    valorTotal > 0 ? Math.min(100, Math.round((totalPagado / valorTotal) * 100)) : 0;
  const resumenMatriculas = useMemo(
    () =>
      matriculas.map((matricula) => {
        const valor = Number(matricula.valor_total || 0);
        const pagado = ingresosCobrados
          .filter((ingreso) => ingreso.matricula_id === matricula.id)
          .reduce((sum, ingreso) => sum + Number(ingreso.monto), 0);

        return {
          ...matricula,
          total_pagado: pagado,
          saldo_pendiente: Math.max(valor - pagado, 0),
        };
      }),
    [ingresosCobrados, matriculas]
  );
  const matriculasById = useMemo(
    () => new Map(resumenMatriculas.map((matricula) => [matricula.id, matricula])),
    [resumenMatriculas]
  );

  if (loading) {
    return <DashboardLoadingState />;
  }

  return (
    <div className="animate-fade-in">
      <PageScaffold
        eyebrow="Panel del alumno"
        title={`Hola, ${nombre}`}
        description="Consulta tu estado de cuenta, el avance de pago y tus cursos activos desde una sola vista clara."
        aside={
          <div className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white/72 px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#66707a]">
              Avance general
            </p>
            <p className="mt-3 text-3xl font-semibold text-[#111214] dark:text-[#f5f5f7]">
              {porcentajePagado}%
            </p>
            <p className="mt-2 text-sm leading-6 text-[#66707a] dark:text-[#aeb6bf]">
              {fmt(totalPagado)} pagados de {valorTotal > 0 ? fmt(valorTotal) : "—"}.
            </p>
          </div>
        }
      >
        <SummaryRow
          columns={3}
          items={[
            {
              id: "valor-total",
              label: "Valor del curso",
              value: valorTotal > 0 ? fmt(valorTotal) : "—",
              detail: "Total comprometido en matrículas activas.",
              icon: <BookOpen size={18} />,
              tone: "primary",
            },
            {
              id: "pagado",
              label: "Total pagado",
              value: fmt(totalPagado),
              detail: "Abonos confirmados y conciliados.",
              icon: <CheckCircle size={18} />,
              tone: "success",
            },
            {
              id: "pendiente",
              label: "Saldo pendiente",
              value: totalPendiente > 0 ? fmt(totalPendiente) : "Al día",
              detail: "Saldo faltante para cerrar el proceso.",
              icon: <Clock size={18} />,
              tone: "warning",
            },
          ]}
        />
      </PageScaffold>

      <div className="mt-6">
        <HomePriorityActions
          rol={perfil?.rol}
          title="Siguiente paso recomendado"
          description="Entradas rápidas a lo que normalmente sigue en tu proceso."
        />
      </div>

      {valorTotal > 0 && (
        <div className="mb-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              Progreso de pago
            </span>
            <span className="text-sm font-semibold text-[#0071e3]">{porcentajePagado}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-[#0071e3] transition-all duration-700"
              style={{ width: `${porcentajePagado}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-xs text-[#86868b]">{fmt(totalPagado)} pagado</span>
            <span className="text-xs text-[#86868b]">{fmt(valorTotal)} total</span>
          </div>
        </div>
      )}

      {resumenMatriculas.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen size={16} className="text-[#0071e3]" />
            <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Tus cursos</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {resumenMatriculas.map((matricula) => (
              <div
                key={matricula.id}
                className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {matricula.numero_contrato
                        ? `Contrato ${matricula.numero_contrato}`
                        : "Curso sin contrato"}
                    </p>
                    <p className="text-xs text-[#86868b]">
                      {matricula.fecha_inscripcion
                        ? new Date(matricula.fecha_inscripcion + "T00:00:00").toLocaleDateString(
                            "es-CO",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "Fecha no disponible"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-[10px] font-medium text-[#0071e3]">
                    {matricula.estado}
                  </span>
                </div>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {(matricula.categorias ?? []).map((categoria) => (
                    <span
                      key={`${matricula.id}-${categoria}`}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-[#1d1d1f] dark:bg-gray-800 dark:text-[#f5f5f7]"
                    >
                      {categoria}
                    </span>
                  ))}
                </div>
                <div
                  className={`grid text-center ${
                    isMobile ? "grid-cols-1 gap-2 sm:grid-cols-3" : "grid-cols-3 gap-3"
                  }`}
                >
                  <div className="rounded-2xl bg-gray-50 p-3 dark:bg-[#0a0a0a]">
                    <p className="mb-1 text-[10px] tracking-wider text-[#86868b] uppercase">
                      Valor
                    </p>
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {matricula.valor_total ? fmt(Number(matricula.valor_total)) : "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-green-50 p-3 dark:bg-green-900/20">
                    <p className="mb-1 text-[10px] tracking-wider text-green-600 uppercase dark:text-green-400">
                      Abonos
                    </p>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                      {fmt(matricula.total_pagado)}
                    </p>
                  </div>
                  <div
                    className={`rounded-2xl p-3 ${
                      matricula.saldo_pendiente <= 0
                        ? "bg-green-50 dark:bg-green-900/20"
                        : "bg-amber-50 dark:bg-amber-900/20"
                    }`}
                  >
                    <p
                      className={`mb-1 text-[10px] tracking-wider uppercase ${
                        matricula.saldo_pendiente <= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {matricula.saldo_pendiente <= 0 ? "Al día" : "Pendiente"}
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        matricula.saldo_pendiente <= 0
                          ? "text-green-700 dark:text-green-400"
                          : "text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {fmt(matricula.saldo_pendiente)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
            <CreditCard size={16} className="text-[#0071e3]" />
            <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Historial de abonos
            </h3>
          </div>
          {ingresos.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#86868b]">Sin registros de abonos</p>
          ) : (
            <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
              {ingresos.map((ing) => (
                <div
                  key={ing.id}
                  className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {ing.concepto}
                    </p>
                    <p className="text-xs text-[#86868b]">
                      {new Date(ing.fecha + "T00:00:00").toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {METODO_LABEL[ing.metodo_pago] ?? ing.metodo_pago}
                      {ing.matricula_id
                        ? (() => {
                            const matricula = matriculasById.get(ing.matricula_id);
                            if (!matricula) return "";
                            if (matricula.numero_contrato) {
                              return ` · Contrato ${matricula.numero_contrato}`;
                            }
                            if ((matricula.categorias ?? []).length > 0) {
                              return ` · ${(matricula.categorias ?? []).join(", ")}`;
                            }
                            return "";
                          })()
                        : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {fmt(Number(ing.monto))}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ESTADO_COLOR[ing.estado]}`}
                    >
                      {ESTADO_PAGO[ing.estado] ?? ing.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
            <FileText size={16} className="text-[#0071e3]" />
            <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Evaluaciones realizadas
            </h3>
          </div>
          {examenes.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#86868b]">
              Aún no tienes evaluaciones registradas
            </p>
          ) : (
            <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
              {examenes.map((examen) => (
                <div
                  key={examen.id}
                  className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {TIPO_EXAMEN[examen.tipo]}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${RESULTADO_COLOR[examen.resultado]}`}
                      >
                        {RESULTADO_LABEL[examen.resultado]}
                      </span>
                    </div>
                    <p className="text-xs text-[#86868b]">
                      {new Date(examen.fecha + "T00:00:00").toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {examen.hora ? ` · ${examen.hora}` : ""}
                    </p>
                    {examen.total_respuestas > 0 && (
                      <p className="text-xs text-[#86868b]">
                        {examen.respuestas_correctas}/{examen.total_respuestas} respuestas correctas
                      </p>
                    )}
                    {examen.notas && (
                      <p className="truncate text-xs text-[#86868b]">{examen.notas}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-medium text-[#0071e3]">
                    Intento {examen.intentos}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
