"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Users, Calendar, FileText, DollarSign, CreditCard, CheckCircle, Clock, BookOpen } from "lucide-react";

/* ─────────────────── tipos ─────────────────── */
interface Stats {
  alumnos: number;
  clasesHoy: number;
  examenesPendientes: number;
  ingresosMes: number;
}

interface AlumnoInfo {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  email: string;
  estado: string;
  valor_total: number | null;
}

interface MatriculaInfo {
  id: string;
  numero_contrato: string | null;
  categorias: string[];
  valor_total: number | null;
  fecha_inscripcion: string | null;
  estado: "activo" | "cerrado" | "cancelado";
}

interface Ingreso {
  id: string;
  matricula_id: string | null;
  concepto: string;
  monto: number;
  metodo_pago: string;
  fecha: string;
  estado: string;
  categoria: string;
}

interface ExamenRealizado {
  id: string;
  tipo: "teorico" | "practico";
  fecha: string;
  hora: string | null;
  resultado: "pendiente" | "aprobado" | "suspendido";
  intentos: number;
  notas: string | null;
  total_respuestas: number;
  respuestas_correctas: number;
}

/* ─────────────────── helpers ─────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const ESTADO_PAGO: Record<string, string> = {
  cobrado: "Pagado",
  pendiente: "Pendiente",
  anulado: "Anulado",
};

const ESTADO_COLOR: Record<string, string> = {
  cobrado: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
  pendiente: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  anulado: "text-gray-400 bg-gray-100 dark:bg-gray-800",
};

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  datafono: "Datáfono",
  nequi: "Nequi",
  sistecredito: "Sistecrédito",
  otro: "Otro",
};

const TIPO_EXAMEN: Record<ExamenRealizado["tipo"], string> = {
  teorico: "Teórico",
  practico: "Práctico",
};

const RESULTADO_LABEL: Record<ExamenRealizado["resultado"], string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  suspendido: "Suspendido",
};

const RESULTADO_COLOR: Record<ExamenRealizado["resultado"], string> = {
  pendiente: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  aprobado: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
  suspendido: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
};

/* ─────────────────── vista alumno ─────────────────── */
function AlumnoDashboard() {
  const { user, perfil } = useAuth();
  const [alumno, setAlumno] = useState<AlumnoInfo | null>(null);
  const [matriculas, setMatriculas] = useState<MatriculaInfo[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [examenes, setExamenes] = useState<ExamenRealizado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const supabase = createClient();

      const { data: alumnoData } = await supabase
        .from("alumnos")
        .select("id, nombre, apellidos, dni, email, estado, valor_total")
        .eq("user_id", user.id)
        .maybeSingle();

      if (alumnoData) {
        setAlumno(alumnoData);
        const [matriculasRes, ingresosRes, examenesRes, respuestasRes] = await Promise.all([
          supabase
            .from("matriculas_alumno")
            .select("id, numero_contrato, categorias, valor_total, fecha_inscripcion, estado")
            .eq("alumno_id", alumnoData.id)
            .order("fecha_inscripcion", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase
            .from("ingresos")
            .select("id, matricula_id, concepto, monto, metodo_pago, fecha, estado, categoria")
            .eq("alumno_id", alumnoData.id)
            .order("fecha", { ascending: false }),
          supabase
            .from("examenes")
            .select("id, tipo, fecha, hora, resultado, intentos, notas")
            .eq("alumno_id", alumnoData.id)
            .order("fecha", { ascending: false }),
          supabase
            .from("respuestas_examen")
            .select("examen_id, es_correcta")
            .eq("alumno_id", alumnoData.id),
        ]);

        const respuestasPorExamen = new Map<string, { total: number; correctas: number }>();
        for (const respuesta of respuestasRes.data ?? []) {
          if (!respuesta.examen_id) continue;
          const actual = respuestasPorExamen.get(respuesta.examen_id) ?? { total: 0, correctas: 0 };
          actual.total += 1;
          if (respuesta.es_correcta) actual.correctas += 1;
          respuestasPorExamen.set(respuesta.examen_id, actual);
        }

        setMatriculas((matriculasRes.data as MatriculaInfo[]) ?? []);
        setIngresos(ingresosRes.data ?? []);
        setExamenes(
          (examenesRes.data ?? []).map((examen) => {
            const resumen = respuestasPorExamen.get(examen.id) ?? { total: 0, correctas: 0 };
            return {
              ...examen,
              total_respuestas: resumen.total,
              respuestas_correctas: resumen.correctas,
            };
          })
        );
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

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
  const porcentajePagado = valorTotal > 0 ? Math.min(100, Math.round((totalPagado / valorTotal) * 100)) : 0;
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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Bienvenida */}
      <div className="mb-8">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
          Hola, {nombre}
        </h2>
        <p className="text-[#86868b] mt-2 text-lg font-medium">Tu estado de cuenta</p>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Valor total curso */}
        <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#86868b]">Valor del curso</span>
            <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
              <BookOpen size={15} className="text-[#0071e3]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
            {valorTotal > 0 ? fmt(valorTotal) : "—"}
          </p>
        </div>

        {/* Pagado */}
        <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#86868b]">Total pagado</span>
            <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle size={15} className="text-green-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(totalPagado)}</p>
        </div>

        {/* Pendiente */}
        <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#86868b]">Saldo pendiente</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock size={15} className="text-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {totalPendiente > 0 ? fmt(totalPendiente) : "Al día"}
          </p>
        </div>
      </div>

      {/* Barra de progreso de pago */}
      {valorTotal > 0 && (
        <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Progreso de pago</span>
            <span className="text-sm font-semibold text-[#0071e3]">{porcentajePagado}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0071e3] rounded-full transition-all duration-700"
              style={{ width: `${porcentajePagado}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-[#86868b]">{fmt(totalPagado)} pagado</span>
            <span className="text-xs text-[#86868b]">{fmt(valorTotal)} total</span>
          </div>
        </div>
      )}

      {resumenMatriculas.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-[#0071e3]" />
            <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Tus cursos</h3>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {resumenMatriculas.map((matricula) => (
              <div
                key={matricula.id}
                className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {matricula.numero_contrato ? `Contrato ${matricula.numero_contrato}` : "Curso sin contrato"}
                    </p>
                    <p className="text-xs text-[#86868b]">
                      {matricula.fecha_inscripcion
                        ? new Date(matricula.fecha_inscripcion + "T00:00:00").toLocaleDateString("es-CO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Fecha no disponible"}
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#0071e3]/10 text-[#0071e3]">
                    {matricula.estado}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(matricula.categorias ?? []).map((categoria) => (
                    <span
                      key={`${matricula.id}-${categoria}`}
                      className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 dark:bg-gray-800 text-[#1d1d1f] dark:text-[#f5f5f7] font-medium"
                    >
                      {categoria}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-gray-50 dark:bg-[#0a0a0a] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#86868b] mb-1">Valor</p>
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {matricula.valor_total ? fmt(Number(matricula.valor_total)) : "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-green-600 dark:text-green-400 mb-1">Abonos</p>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                      {fmt(matricula.total_pagado)}
                    </p>
                  </div>
                  <div className={`rounded-2xl p-3 ${matricula.saldo_pendiente <= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20"}`}>
                    <p className={`text-[10px] uppercase tracking-wider mb-1 ${matricula.saldo_pendiente <= 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {matricula.saldo_pendiente <= 0 ? "Al día" : "Pendiente"}
                    </p>
                    <p className={`text-sm font-semibold ${matricula.saldo_pendiente <= 0 ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
                      {fmt(matricula.saldo_pendiente)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historial de abonos */}
        <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <CreditCard size={16} className="text-[#0071e3]" />
            <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Historial de abonos</h3>
          </div>
          {ingresos.length === 0 ? (
            <p className="text-center text-sm text-[#86868b] py-10">Sin registros de abonos</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
              {ingresos.map((ing) => (
                <div key={ing.id} className="px-6 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate">{ing.concepto}</p>
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
                            if (matricula.numero_contrato) return ` · Contrato ${matricula.numero_contrato}`;
                            if ((matricula.categorias ?? []).length > 0) return ` · ${(matricula.categorias ?? []).join(", ")}`;
                            return "";
                          })()
                        : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{fmt(Number(ing.monto))}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[ing.estado]}`}>
                      {ESTADO_PAGO[ing.estado] ?? ing.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evaluaciones realizadas */}
        <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <FileText size={16} className="text-[#0071e3]" />
            <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Evaluaciones realizadas</h3>
          </div>
          {examenes.length === 0 ? (
            <p className="text-center text-sm text-[#86868b] py-10">Aún no tienes evaluaciones registradas</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
              {examenes.map((examen) => (
                <div key={examen.id} className="px-6 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {TIPO_EXAMEN[examen.tipo]}
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${RESULTADO_COLOR[examen.resultado]}`}>
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
                      <p className="text-xs text-[#86868b] truncate">{examen.notas}</p>
                    )}
                  </div>
                  <span className="text-xs font-medium text-[#0071e3] shrink-0">
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

/* ─────────────────── vista admin/instructor ─────────────────── */
function AdminDashboard() {
  const { perfil } = useAuth();
  const [stats, setStats] = useState<Stats>({
    alumnos: 0,
    clasesHoy: 0,
    examenesPendientes: 0,
    ingresosMes: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!perfil) return;
    const fetchStats = async () => {
      try {
        const supabase = createClient();
        const hoy = new Date().toISOString().split("T")[0];
        const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split("T")[0];
        const primerDiaSiguienteMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          .toISOString()
          .split("T")[0];

        const [matriculasRes, alumnosLegacyRes, clasesRes, examenesRes, ingresosRes] = await Promise.all([
          supabase
            .from("matriculas_alumno")
            .select("alumno_id")
            .gte("fecha_inscripcion", primerDiaMes)
            .lt("fecha_inscripcion", primerDiaSiguienteMes),
          supabase
            .from("alumnos")
            .select("id")
            .gte("fecha_inscripcion", primerDiaMes)
            .lt("fecha_inscripcion", primerDiaSiguienteMes),
          supabase.from("clases").select("id", { count: "exact", head: true }).eq("fecha", hoy),
          supabase.from("examenes").select("id", { count: "exact", head: true }).eq("resultado", "pendiente"),
          supabase.from("ingresos").select("monto").gte("fecha", primerDiaMes).eq("estado", "cobrado"),
        ]);

        const alumnosDelMes = new Set<string>();
        for (const matricula of matriculasRes.data ?? []) {
          if (matricula.alumno_id) alumnosDelMes.add(matricula.alumno_id);
        }
        for (const alumno of alumnosLegacyRes.data ?? []) {
          alumnosDelMes.add(alumno.id);
        }

        const totalIngresos =
          ingresosRes.data?.reduce((sum, i) => {
            const parsed = Number(i.monto);
            return sum + (isNaN(parsed) ? 0 : parsed);
          }, 0) ?? 0;

        setStats({
          alumnos: alumnosDelMes.size,
          clasesHoy: clasesRes.count ?? 0,
          examenesPendientes: examenesRes.count ?? 0,
          ingresosMes: totalIngresos,
        });
      } catch (error) {
        console.error("Error al obtener estadísticas:", error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [perfil]);

  const nombre = perfil?.nombre || "Usuario";

  const statCards = [
    { label: "Alumnos del Mes", value: stats.alumnos.toString(), icon: <Users size={20} />, color: "#0071e3" },
    { label: "Clases Hoy", value: stats.clasesHoy.toString(), icon: <Calendar size={20} />, color: "#28c840" },
    { label: "Exámenes Pendientes", value: stats.examenesPendientes.toString(), icon: <FileText size={20} />, color: "#ff9f0a" },
    {
      label: "Ingresos del Mes",
      value: `$${stats.ingresosMes.toLocaleString("es-CO")}`,
      icon: <DollarSign size={20} />,
      color: "#bf5af2",
    },
  ];

  return (
    <div>
      <div className="mb-8 animate-fade-in">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
          Hola, {nombre}
        </h2>
        <p className="text-[#86868b] mt-2 text-lg font-medium">Resumen de tu escuela de conducción</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 animate-fade-in delay-100">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-6 hover:scale-[1.02] transition-transform duration-300 shadow-sm border border-gray-100 dark:border-gray-800"
          >
            {loadingStats ? (
              <div className="h-9 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                <div className="p-2 rounded-xl" style={{ backgroundColor: stat.color + "15" }}>
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                </div>
              </div>
            )}
            <p className="text-xs text-[#86868b] mt-2">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-10 text-center animate-fade-in delay-200 border border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-2">Panel de Gestión</h3>
        <p className="text-sm text-[#86868b] max-w-md mx-auto">
          Usa el menú lateral para navegar entre los módulos: alumnos, instructores, vehículos, clases, exámenes y
          finanzas.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── página principal ─────────────────── */
export default function DashboardPage() {
  const { perfil } = useAuth();

  if (perfil?.rol === "alumno") return <AlumnoDashboard />;
  return <AdminDashboard />;
}
